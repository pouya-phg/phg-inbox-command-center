import { getAuthSession, isAuthorized } from "./auth";

/**
 * Check if the request is authenticated — either via NextAuth session
 * or via the addon API key header (for Outlook add-in requests).
 * Returns true if authenticated, false otherwise.
 */
export async function isAuthenticated(req?: Request): Promise<boolean> {
  // Check NextAuth session first
  const session = await getAuthSession();
  if (session && isAuthorized(session.user?.email)) {
    return true;
  }

  // Check addon API key header
  if (req) {
    const apiKey = req.headers.get("x-addon-key");
    const expectedKey = process.env.ADDON_API_KEY;
    if (apiKey && expectedKey && apiKey === expectedKey) {
      return true;
    }
  }

  return false;
}
