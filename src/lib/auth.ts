import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";

const ALLOWED_EMAIL = "phonari@pacifichospitality.com";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID!,
          client_secret: process.env.AZURE_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken as string,
          scope:
            "openid profile email Mail.Read Mail.ReadWrite Mail.Send offline_access User.Read",
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || "Refresh failed");

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "azure-ad",
      name: "Microsoft",
      type: "oauth",
      wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      checks: ["state"],
      idToken: true,
      authorization: {
        params: {
          scope:
            "openid profile email Mail.Read Mail.ReadWrite Mail.Send offline_access User.Read",
          prompt: "consent",
        },
      },
      profile(profile) {
        return {
          id: profile.sub || profile.oid,
          name: profile.name || profile.preferred_username,
          email:
            profile.email || profile.preferred_username || profile.upn,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const email =
        user.email?.toLowerCase() ||
        (profile as any)?.preferred_username?.toLowerCase() ||
        (profile as any)?.upn?.toLowerCase();
      return email === ALLOWED_EMAIL;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      if (profile) {
        token.email =
          token.email ||
          (profile as any).preferred_username ||
          (profile as any).upn;
      }

      // Refresh token if expired (with 5 min buffer)
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number) - 300) {
        return refreshAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      if (token.error) {
        (session as any).error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export function isAuthorized(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ALLOWED_EMAIL;
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
