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

  // Send via Graph API
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${emailId}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyBody }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "Failed to send", detail: err },
      { status: res.status }
    );
  }

  // Update draft status
  await supabase
    .from("draft_replies")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("email_id", emailId);

  return NextResponse.json({ success: true });
}
