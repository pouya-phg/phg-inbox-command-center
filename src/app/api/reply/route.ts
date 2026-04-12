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

  const { messageId, comment, replyAll } = await req.json();

  if (!messageId || !comment) {
    return NextResponse.json(
      { error: "messageId and comment required" },
      { status: 400 }
    );
  }

  const endpoint = replyAll ? "replyAll" : "reply";
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: comment,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "Failed to send reply", detail: err },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
