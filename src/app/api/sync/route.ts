import { NextResponse } from "next/server";
import { getAuthSession, isAuthorized } from "@/lib/auth";

export async function POST() {
  const session = await getAuthSession();
  if (!session || !isAuthorized(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  // Trigger the n8n delta sync workflow
  const res = await fetch(`${webhookUrl}webhook/delta-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger: "manual", timestamp: new Date().toISOString() }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "triggered" });
}
