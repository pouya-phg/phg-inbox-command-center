import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { searchDocuments } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, limit, threshold } = await req.json();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const results = await searchDocuments(
    query,
    limit || 5,
    threshold || 0.65
  );

  return NextResponse.json({ results });
}
