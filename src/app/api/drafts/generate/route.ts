import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { isAuthenticated } from "@/lib/addon-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateDraftForEmail } from "@/lib/draft-helpers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await getAuthSession();

  const accessToken = session?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const { messageId } = await req.json();
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  // Fetch the full email from Graph to get conversationId
  const graphRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=subject,from,conversationId`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!graphRes.ok) {
    return NextResponse.json({ error: "Failed to fetch email" }, { status: 502 });
  }

  const email = await graphRes.json();
  const subject = email.subject || "(No Subject)";
  const sender = email.from?.emailAddress?.address || "unknown";
  const conversationId = email.conversationId;

  // Generate draft
  const { draftBody, docContext } = await generateDraftForEmail({
    accessToken,
    messageId,
    subject,
    sender,
    conversationId,
  });

  // Upsert to Supabase
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("draft_replies")
    .upsert(
      {
        email_id: messageId,
        subject,
        draft_body: draftBody,
        edited_body: null,
        status: "draft",
        doc_context: docContext || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft: data });
}
