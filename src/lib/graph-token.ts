import { getAuthSession } from "./auth";
import { getSupabaseAdmin } from "./supabase";

/**
 * Get a valid MS Graph access token.
 * First tries the NextAuth session. If unavailable (e.g., addon API key auth),
 * falls back to the refresh token stored in Supabase (same as n8n workflows use).
 */
export async function getGraphAccessToken(): Promise<string | null> {
  // Try NextAuth session first
  const session = await getAuthSession();
  if (session?.accessToken) {
    return session.accessToken;
  }

  // Fallback: use refresh token from Supabase
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("sync_state")
      .select("refresh_token")
      .limit(1)
      .single();

    if (!data?.refresh_token) return null;

    const res = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID!,
          client_secret: process.env.AZURE_CLIENT_SECRET!,
          refresh_token: data.refresh_token,
          grant_type: "refresh_token",
          scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
        }),
      }
    );

    if (!res.ok) return null;

    const tokenData = await res.json();

    // Save the rotated refresh token
    if (tokenData.refresh_token) {
      await supabase
        .from("sync_state")
        .update({ refresh_token: tokenData.refresh_token })
        .not("id", "is", null);
    }

    return tokenData.access_token;
  } catch {
    return null;
  }
}
