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

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead,webLink,conversationId`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "Failed to fetch email", detail: err },
      { status: res.status }
    );
  }

  const email = await res.json();
  return NextResponse.json(email);
}
