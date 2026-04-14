import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  // Fetch the main email
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead,webLink,conversationId`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "Failed to fetch email", detail: err },
      { status: res.status }
    );
  }

  const email = await res.json();

  // Fetch conversation thread from ALL mail folders
  // Using /me/messages (no folder) searches across all folders
  let thread: any[] = [];
  if (email.conversationId) {
    const convId = encodeURIComponent(email.conversationId);
    const fields = "id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead";

    try {
      // Try the top-level /me/messages endpoint which searches all folders
      const threadRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${email.conversationId}'&$select=${fields}&$orderby=receivedDateTime desc&$top=25`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (threadRes.ok) {
        const threadData = await threadRes.json();
        thread = threadData.value || [];
      } else {
        // Fallback: search inbox + sentItems separately
        const [inboxRes, sentRes] = await Promise.all([
          fetch(
            `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=conversationId eq '${email.conversationId}'&$select=${fields}&$orderby=receivedDateTime desc&$top=15`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ),
          fetch(
            `https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages?$filter=conversationId eq '${email.conversationId}'&$select=${fields}&$orderby=receivedDateTime desc&$top=15`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ),
        ]);

        const inboxData = inboxRes.ok ? await inboxRes.json() : { value: [] };
        const sentData = sentRes.ok ? await sentRes.json() : { value: [] };
        const allMessages = [...(inboxData.value || []), ...(sentData.value || [])];

        // Deduplicate and sort
        const seen = new Set<string>();
        thread = allMessages
          .filter((m: any) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .sort((a: any, b: any) =>
            new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
          );
      }
    } catch {
      // Thread fetch is optional
    }
  }

  return NextResponse.json({ ...email, thread });
}
