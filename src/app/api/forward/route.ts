import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const { messageId, toRecipients, comment } = await req.json();

  if (!messageId || !toRecipients || toRecipients.length === 0) {
    return NextResponse.json(
      { error: "messageId and toRecipients required" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/forward`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: comment || "",
        toRecipients: toRecipients.map((email: string) => ({
          emailAddress: { address: email.trim() },
        })),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "Failed to forward", detail: err },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
