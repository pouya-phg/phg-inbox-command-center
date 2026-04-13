import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Live counts from documents table
  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });

  const { count: chunkCount } = await supabase
    .from("document_chunks")
    .select("*", { count: "exact", head: true });

  const { data: state } = await supabase
    .from("index_state")
    .select("*")
    .limit(1)
    .single();

  // Most recent indexed doc — helps user see where the indexer is
  const { data: recent } = await supabase
    .from("documents")
    .select("name, path, indexed_at")
    .order("indexed_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    status: state?.status || "idle",
    last_indexed_at: state?.last_indexed_at,
    total_documents: docCount || 0,
    total_chunks: chunkCount || 0,
    recent_documents: recent || [],
  });
}
