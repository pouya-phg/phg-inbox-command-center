import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/addon-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Priority } from "@/types";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const priority = req.nextUrl.searchParams.get("priority") as Priority | null;
  const search = req.nextUrl.searchParams.get("search");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = limitParam ? parseInt(limitParam) : 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("emails")
    .select("*", { count: "exact" })
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (priority) {
    query = query.eq("priority", priority);
  }

  if (search) {
    query = query.ilike("subject", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ emails: data, total: count, page, limit });
}
