import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET — load saved signature
export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tone_profiles")
    .select("profile_text")
    .eq("hash", "email_signature_manual")
    .limit(1)
    .single();

  return NextResponse.json({ signature: data?.profile_text || null });
}

// PUT — save signature (rich text HTML from the editor)
export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signature } = await req.json();
  const supabase = getSupabaseAdmin();

  // Delete old, insert new
  await supabase.from("tone_profiles").delete().eq("hash", "email_signature_manual");

  if (signature && signature.trim()) {
    await supabase.from("tone_profiles").insert({
      profile_text: signature,
      sample_count: 1,
      hash: "email_signature_manual",
      expires_at: new Date("2099-01-01").toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}
