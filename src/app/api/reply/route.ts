import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const { messageId, comment, replyAll } = await req.json();
  if (!messageId || !comment) {
    return NextResponse.json({ error: "messageId and comment required" }, { status: 400 });
  }

  // Load user's saved signature from Supabase
  let signatureHtml = "";
  try {
    const supabase = getSupabaseAdmin();
    const { data: sigData } = await supabase
      .from("tone_profiles")
      .select("profile_text")
      .eq("hash", "email_signature_manual")
      .limit(1)
      .single();
    if (sigData?.profile_text) {
      signatureHtml = sigData.profile_text;
    }
  } catch {}

  // Build the full reply body with signature
  const fullBody = signatureHtml
    ? `<div>${comment.replace(/\n/g, "<br>")}</div><br><div>${signatureHtml}</div>`
    : comment;

  // Step 1: Create a reply draft (this preserves the thread)
  const endpoint = replyAll ? "createReplyAll" : "createReply";
  const draftRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          body: {
            contentType: "HTML",
            content: fullBody,
          },
        },
      }),
    }
  );

  if (!draftRes.ok) {
    const err = await draftRes.text();
    console.error("Reply draft failed:", draftRes.status, err);
    return NextResponse.json(
      { error: "Failed to create reply draft", detail: err },
      { status: draftRes.status }
    );
  }

  const draft = await draftRes.json();
  const draftId = draft.id;

  // Step 2: Send the draft
  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${draftId}/send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("Send failed:", sendRes.status, err);
    // Clean up the draft if send fails
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draftId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to send reply", detail: err },
      { status: sendRes.status }
    );
  }

  return NextResponse.json({ success: true, draftId });
}
