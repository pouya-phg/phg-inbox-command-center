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

  const { messageId, toRecipients, comment } = await req.json();
  if (!messageId || !toRecipients || toRecipients.length === 0) {
    return NextResponse.json({ error: "messageId and toRecipients required" }, { status: 400 });
  }

  // Load signature
  let signatureHtml = "";
  try {
    const supabase = getSupabaseAdmin();
    const { data: sigData } = await supabase
      .from("tone_profiles")
      .select("profile_text")
      .eq("hash", "email_signature_manual")
      .limit(1)
      .single();
    if (sigData?.profile_text) signatureHtml = sigData.profile_text;
  } catch {}

  const noteHtml = comment
    ? `<div>${comment.replace(/\n/g, "<br>")}</div><br>`
    : "";
  const fullBody = signatureHtml
    ? `${noteHtml}<div>${signatureHtml}</div>`
    : noteHtml || " ";

  // Step 1: Create forward draft
  const draftRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/createForward`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          toRecipients: toRecipients.map((email: string) => ({
            emailAddress: { address: email.trim() },
          })),
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
    console.error("Forward draft failed:", draftRes.status, err);
    return NextResponse.json(
      { error: "Failed to create forward draft", detail: err },
      { status: draftRes.status }
    );
  }

  const draft = await draftRes.json();

  // Step 2: Send the draft
  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("Forward send failed:", sendRes.status, err);
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to send forward", detail: err },
      { status: sendRes.status }
    );
  }

  return NextResponse.json({ success: true });
}
