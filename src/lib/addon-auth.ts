import { getAuthSession, isAuthorized } from "./auth";

/**
 * Add-in APIs require the same verified, authorized session as the dashboard.
 * A key shipped in browser JavaScript cannot authenticate a user or service.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getAuthSession();
    return Boolean(session && isAuthorized(session.user?.email));
  } catch {
    return false;
  }
}
