import { NextResponse } from "next/server";
import { getLastAuthError } from "@/lib/auth";

export async function GET() {
  const lastError = getLastAuthError();
  return NextResponse.json({
    lastError: lastError || "No errors captured yet. Try signing in first.",
    envCheck: {
      hasClientId: !!process.env.AZURE_CLIENT_ID,
      hasTenantId: !!process.env.AZURE_TENANT_ID,
      hasClientSecret: !!process.env.AZURE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      clientIdPrefix: process.env.AZURE_CLIENT_ID?.substring(0, 8),
      tenantIdPrefix: process.env.AZURE_TENANT_ID?.substring(0, 8),
    },
  });
}
