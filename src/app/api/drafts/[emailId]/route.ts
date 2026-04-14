import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { isAuthenticated } from "@/lib/addon-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await getAuthSession();

  const { emailId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("draft_replies")
    .select("*")
    .eq("email_id", emailId)
    .neq("status", "sent")
    .single();

  if (error || !data) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({ draft: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await getAuthSession();

  const { emailId } = await params;
  const { edited_body } = await req.json();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("draft_replies")
    .update({
      edited_body,
      status: "edited",
      updated_at: new Date().toISOString(),
    })
    .eq("email_id", emailId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await getAuthSession();

  const { emailId } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from("draft_replies").delete().eq("email_id", emailId);
  return NextResponse.json({ success: true });
}
