import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";

const ALLOWED_EMAIL = "phonari@pacifichospitality.com";

// Store last error for the debug endpoint
let lastAuthError: { code: string; detail: string; time: string } | null = null;
export function getLastAuthError() {
  return lastAuthError;
}

export const authOptions: NextAuthOptions = {
  debug: true,
  logger: {
    error(code, metadata) {
      const detail = JSON.stringify(metadata, Object.getOwnPropertyNames(metadata), 2);
      lastAuthError = { code: String(code), detail, time: new Date().toISOString() };
      console.error("NEXTAUTH_FULL_ERROR:", code);
      console.error("NEXTAUTH_FULL_ERROR_DETAIL:", detail.substring(0, 500));
      console.error("NEXTAUTH_FULL_ERROR_DETAIL2:", detail.substring(500, 1000));
    },
    warn(code) {
      console.warn("NEXTAUTH_WARN:", code);
    },
    debug(code, metadata) {
      console.log("NEXTAUTH_DEBUG:", code);
    },
  },
  providers: [
    {
      id: "azure-ad",
      name: "Microsoft",
      type: "oauth",
      wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      // Only use state check — nonce and PKCE cause cookie issues on serverless
      checks: ["state"],
      idToken: true,
      authorization: {
        params: {
          scope:
            "openid profile email Mail.Read Mail.ReadWrite offline_access User.Read",
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
    async signIn({ user, profile }) {
      const email =
        user.email?.toLowerCase() ||
        (profile as any)?.preferred_username?.toLowerCase() ||
        (profile as any)?.upn?.toLowerCase();
      console.log("SIGNIN_CALLBACK email:", email);
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
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (token.email && session.user) {
        session.user.email = token.email as string;
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
