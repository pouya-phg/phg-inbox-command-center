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

  // Fetch the full conversation thread (up to 20 messages)
  let thread: any[] = [];
  if (email.conversationId) {
    try {
      const threadRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${email.conversationId}'&$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead&$orderby=receivedDateTime desc&$top=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        thread = threadData.value || [];
      }
    } catch {
      // Thread fetch is optional — don't fail the whole request
    }
  }

  return NextResponse.json({ ...email, thread });
}
