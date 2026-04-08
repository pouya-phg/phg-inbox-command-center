import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageIds, markAll } = await req.json();

  if (!messageIds && !markAll) {
    return NextResponse.json(
      { error: "messageIds or markAll required" },
      { status: 400 }
    );
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token available" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  // If markAll, fetch all noise message IDs
  let ids: string[] = messageIds || [];
  if (markAll) {
    const { data } = await supabase
      .from("emails")
      .select("message_id")
      .eq("priority", "noise")
      .eq("is_read", false);
    ids = (data || []).map((e) => e.message_id);
  }

  // Mark as read via MS Graph in batches of 20
  const batchSize = 20;
  let markedCount = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const requests = batch.map((id, idx) => ({
      id: `${idx}`,
      method: "PATCH",
      url: `/me/messages/${id}`,
      body: { isRead: true },
      headers: { "Content-Type": "application/json" },
    }));

    const res = await fetch("https://graph.microsoft.com/v1.0/$batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    if (res.ok) {
      markedCount += batch.length;
    }
  }

  // Update Supabase
  if (ids.length > 0) {
    await supabase.from("emails").update({ is_read: true }).in("message_id", ids);
  }

  return NextResponse.json({ marked: markedCount });
}
