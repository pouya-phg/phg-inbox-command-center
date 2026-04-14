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

  const { emailId } = await req.json();
  if (!emailId) {
    return NextResponse.json({ error: "emailId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load draft
  const { data: draft } = await supabase
    .from("draft_replies")
    .select("*")
    .eq("email_id", emailId)
    .single();

  if (!draft) {
    return NextResponse.json({ error: "No draft found" }, { status: 404 });
  }

  const replyBody = draft.edited_body || draft.draft_body;

  // Load signature
  let signatureHtml = "";
  try {
    const { data: sigData } = await supabase
      .from("tone_profiles")
      .select("profile_text")
      .eq("hash", "email_signature_manual")
      .limit(1)
      .single();
    if (sigData?.profile_text) signatureHtml = sigData.profile_text;
  } catch {}

  const fullBody = signatureHtml
    ? `<div>${replyBody.replace(/\n/g, "<br>")}</div><br><div>${signatureHtml}</div>`
    : replyBody;

  // Step 1: Create reply draft with full body
  const draftRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${emailId}/createReply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          body: { contentType: "HTML", content: fullBody },
        },
      }),
    }
  );

  if (!draftRes.ok) {
    const err = await draftRes.text();
    return NextResponse.json(
      { error: "Failed to create reply", detail: err },
      { status: draftRes.status }
    );
  }

  const replyDraft = await draftRes.json();

  // Step 2: Send the draft
  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${replyDraft.id}/send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!sendRes.ok) {
    const err = await sendRes.text();
    // Clean up failed draft
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${replyDraft.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to send", detail: err },
      { status: sendRes.status }
    );
  }

  // Update draft status
  await supabase
    .from("draft_replies")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("email_id", emailId);

  return NextResponse.json({ success: true });
}
