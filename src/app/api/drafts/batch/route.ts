import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateDraftForEmail } from "@/lib/draft-helpers";

export const maxDuration = 300;

export async function POST() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const startTime = Date.now();

  // Get P1+P2 emails without drafts
  const { data: emails } = await supabase
    .from("emails")
    .select("message_id, subject, sender")
    .in("priority", ["p1", "p2"])
    .order("received_at", { ascending: false })
    .limit(300);

  if (!emails || emails.length === 0) {
    return NextResponse.json({ generated: 0, remaining: 0, status: "no_emails" });
  }

  // Filter out emails that already have drafts
  const { data: existingDrafts } = await supabase
    .from("draft_replies")
    .select("email_id")
    .in(
      "email_id",
      emails.map((e) => e.message_id)
    )
    .neq("status", "sent");

  const existingIds = new Set((existingDrafts || []).map((d) => d.email_id));
  const needsDraft = emails.filter((e) => !existingIds.has(e.message_id));

  if (needsDraft.length === 0) {
    return NextResponse.json({ generated: 0, remaining: 0, status: "all_drafted" });
  }

  // For each email, fetch conversationId from Graph
  let generated = 0;
  let failed = 0;
  const CONCURRENCY = 5;
  const TIME_LIMIT = 270000; // 270s safety valve

  for (let i = 0; i < needsDraft.length; i += CONCURRENCY) {
    if (Date.now() - startTime > TIME_LIMIT) break;

    const chunk = needsDraft.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (email) => {
        // Fetch conversationId
        const graphRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}?$select=conversationId`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!graphRes.ok) throw new Error("Graph fetch failed");
        const graphData = await graphRes.json();

        const { draftBody, docContext } = await generateDraftForEmail({
          accessToken,
          messageId: email.message_id,
          subject: email.subject || "(No Subject)",
          sender: email.sender || "unknown",
          conversationId: graphData.conversationId,
        });

        await supabase.from("draft_replies").upsert(
          {
            email_id: email.message_id,
            subject: email.subject,
            draft_body: draftBody,
            status: "draft",
            doc_context: docContext || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email_id" }
        );

        return true;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") generated++;
      else failed++;
    }
  }

  const remaining = needsDraft.length - generated - failed;

  return NextResponse.json({
    generated,
    failed,
    remaining,
    total: needsDraft.length,
    status: remaining > 0 ? "partial" : "complete",
  });
}
