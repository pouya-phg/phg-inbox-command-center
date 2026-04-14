import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Check for cached signature
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
  if (!accessToken) {
    return NextResponse.json({ signature: null });
  }

  // Fetch 5 recent sent emails
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages?$top=5&$select=body&$orderby=sentDateTime desc",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ signature: null });
  }

  const data = await res.json();
  const sentEmails = data.value || [];

  let signature: string | null = null;
  for (const email of sentEmails) {
    const html = email.body?.content || "";
    if (!html) continue;

    // Strategy 1: Look for Outlook signature div by id
    const sigIdMatch = html.match(/<div[^>]*id=["']?Signature["']?[^>]*>[\s\S]*$/i);
    if (sigIdMatch && sigIdMatch[0].length > 30 && sigIdMatch[0].length < 3000) {
      signature = sigIdMatch[0];
      break;
    }

    // Strategy 2: Look for MsoSignature class
    const msoMatch = html.match(/<div[^>]*class=["'][^"']*MsoSignature[^"']*["'][^>]*>[\s\S]*$/i);
    if (msoMatch && msoMatch[0].length > 30 && msoMatch[0].length < 3000) {
      signature = msoMatch[0];
      break;
    }

    // Strategy 3: Look for signature-like content near the end
    // Common patterns: phone numbers, company name, title after double line break
    const lines = html.split(/<br\s*\/?>/i);
    if (lines.length > 5) {
      // Take the last ~15 lines, check for phone/email patterns
      const tail = lines.slice(-15).join("<br>");
      if (
        tail.match(/\d{3}[.\-)\s]\d{3}[.\-)\s]\d{4}/) || // phone
        tail.match(/pacific\s*hospitality/i) || // company name
        tail.match(/@pacifichospitality\.com/i) // company email
      ) {
        // Find where the signature likely starts (after a blank line)
        for (let i = lines.length - 15; i < lines.length; i++) {
          if (i < 0) continue;
          const line = lines[i].replace(/<[^>]+>/g, "").trim();
          if (line === "" || line === "&nbsp;") {
            const sigBlock = lines.slice(i + 1).join("<br>");
            if (sigBlock.length > 30 && sigBlock.length < 2000) {
              signature = sigBlock;
              break;
            }
          }
        }
        if (signature) break;
      }
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

  return NextResponse.json({ signature, debug: signature ? null : "No signature pattern found in recent sent emails" });
}
