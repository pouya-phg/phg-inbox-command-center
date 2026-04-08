import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";

const ALLOWED_EMAIL = "phonari@pacifichospitality.com";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    {
      id: "azure-ad",
      name: "Microsoft",
      type: "oauth",
      wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      idToken: true,
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope:
            "openid profile email Mail.Read Mail.ReadWrite offline_access User.Read",
          prompt: "consent",
        },
      },
      profile(profile) {
        return {
          id: profile.sub || profile.oid,
          name: profile.name || profile.preferred_username,
          email:
            profile.email ||
            profile.preferred_username ||
            profile.upn,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      return user.email?.toLowerCase() === ALLOWED_EMAIL;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
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

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
