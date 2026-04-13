import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("index_state")
    .select("*")
    .limit(1)
    .single();

  return NextResponse.json(data || { status: "idle", total_documents: 0, total_chunks: 0 });
}
