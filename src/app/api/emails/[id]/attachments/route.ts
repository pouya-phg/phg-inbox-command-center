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

  // Check if a specific attachment content is requested
  const attachmentId = req.nextUrl.searchParams.get("attachmentId");

  if (attachmentId) {
    // Fetch the actual attachment content and stream it back
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch attachment" }, { status: res.status });
    }

    const attachment = await res.json();

    if (attachment.contentBytes) {
      const buffer = Buffer.from(attachment.contentBytes, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": attachment.contentType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${attachment.name}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: "No content" }, { status: 404 });
  }

  // List all attachments for the message
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${id}/attachments?$select=id,name,contentType,size,isInline`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch attachments" }, { status: res.status });
  }

  const data = await res.json();
  const attachments = (data.value || [])
    .filter((a: any) => !a.isInline)
    .map((a: any) => ({
      id: a.id,
      name: a.name,
      contentType: a.contentType,
      size: a.size,
    }));

  return NextResponse.json({ attachments });
}
