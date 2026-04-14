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

  const { messageIds, markAll } = await req.json();
  if (!messageIds && !markAll) {
    return NextResponse.json({ error: "messageIds or markAll required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let ids: string[] = messageIds || [];
  if (markAll) {
    const { data } = await supabase
      .from("emails")
      .select("message_id")
      .eq("priority", "noise")
      .eq("is_read", false);
    ids = (data || []).map((e) => e.message_id);
  }

  if (ids.length === 0) {
    return NextResponse.json({ marked: 0, failed: 0 });
  }

  let marked = 0;
  let failed = 0;
  const failedIds: string[] = [];

  // Individual PATCH for each email — more reliable than $batch
  // Process in parallel groups of 5 for speed
  for (let i = 0; i < ids.length; i += 5) {
    const chunk = ids.slice(i, i + 5);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isRead: true }),
          }
        );
        if (!res.ok) {
          throw new Error(`${res.status}: ${await res.text().catch(() => "unknown")}`);
        }
        return id;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        marked++;
      } else {
        failed++;
        // Log the actual error
        console.error("Mark-read failed:", r.reason?.message || r.reason);
      }
    }
  }

  // Update Supabase for successfully marked IDs
  const successIds = ids.filter((id) => !failedIds.includes(id));
  if (successIds.length > 0) {
    // Supabase .in() has a limit, chunk at 100
    for (let i = 0; i < successIds.length; i += 100) {
      await supabase
        .from("emails")
        .update({ is_read: true })
        .in("message_id", successIds.slice(i, i + 100));
    }
  }

  return NextResponse.json({ marked, failed, total: ids.length });
}
