import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Check cache
  const { data: cached } = await supabase
    .from("tone_profiles")
    .select("*")
    .eq("hash", "email_signature")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (cached?.profile_text) {
    return NextResponse.json({ signature: cached.profile_text });
  }

  const accessToken = session.accessToken;
  if (!accessToken) return NextResponse.json({ signature: null });

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages?$top=15&$select=body&$orderby=sentDateTime desc",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return NextResponse.json({ signature: null });

  const data = await res.json();
  let signature: string | null = null;

  for (const email of data.value || []) {
    const html = email.body?.content || "";
    if (!html || html.length < 100) continue;

    // Pattern 1: Outlook mobile signature div
    const mobileMatch = html.match(/<div\s+id=["']ms-outlook-mobile-signature["'][^>]*>[\s\S]*?(?=<\/body|$)/i);
    if (mobileMatch && mobileMatch[0].length > 50) {
      signature = mobileMatch[0];
      break;
    }

    // Pattern 2: Outlook desktop signature div
    const desktopMatch = html.match(/<div\s+id=["']?Signature["']?[^>]*>[\s\S]*?(?=<\/body|$)/i);
    if (desktopMatch && desktopMatch[0].length > 50) {
      signature = desktopMatch[0];
      break;
    }

    // Pattern 3: Outlook web signature
    const webMatch = html.match(/<div\s+id=["']?x_Signature["']?[^>]*>[\s\S]*?(?=<\/body|$)/i);
    if (webMatch && webMatch[0].length > 50) {
      signature = webMatch[0];
      break;
    }

    // Pattern 4: MsoSignature class
    const msoMatch = html.match(/<div[^>]*class=["'][^"']*MsoSignature[^"']*["'][^>]*>[\s\S]*?(?=<\/body|$)/i);
    if (msoMatch && msoMatch[0].length > 50) {
      signature = msoMatch[0];
      break;
    }
  }

  // Cache for 7 days
  if (signature) {
    await supabase.from("tone_profiles").delete().eq("hash", "email_signature");
    await supabase.from("tone_profiles").insert({
      profile_text: signature,
      sample_count: 1,
      hash: "email_signature",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return NextResponse.json({ signature });
}
