import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Check for cached signature (cached for 7 days)
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

  // Extract from most recent sent email
  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages?$top=5&$select=body&$orderby=sentDateTime desc",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ signature: null });
  }

  const data = await res.json();
  const sentEmails = data.value || [];

  // Try to extract signature from the most recent sent emails
  // Look for common signature patterns in HTML
  let signature: string | null = null;
  for (const email of sentEmails) {
    const html = email.body?.content || "";
    // Common signature separators
    const separators = [
      // Outlook signature div
      /<div[^>]*id="?Signature"?[^>]*>([\s\S]*?)(?=<\/body|$)/i,
      // Outlook signature class
      /<div[^>]*class="?MsoSignature"?[^>]*>([\s\S]*?)(?=<\/div>\s*<\/body|$)/i,
      // Common "-- " separator
      /(?:<p[^>]*>|<div[^>]*>)\s*--\s*(?:<\/p>|<br[^>]*>|<\/div>)([\s\S]*?)(?=<\/body|$)/i,
      // Signature after last <br> block with typical signature content (phone, email, address)
      /<div[^>]*>([\s\S]*?(?:(?:\d{3}[.\-)\s]){2}\d{4}|@pacifichospitality)[\s\S]*?)(?=<\/body|$)/i,
    ];

    for (const regex of separators) {
      const match = html.match(regex);
      if (match) {
        const extracted = match[0];
        // Basic validation — signature should be between 50 and 2000 chars
        if (extracted.length > 50 && extracted.length < 2000) {
          signature = extracted;
          break;
        }
      }
    }
    if (signature) break;
  }

  // Cache it for 7 days — delete old sig cache, insert new
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
