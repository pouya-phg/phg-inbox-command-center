import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const ALLOWED_EMAIL = "phonari@pacifichospitality.com";

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
      authorization: {
        params: {
          scope:
            "openid profile email Mail.Read Mail.ReadWrite offline_access User.Read",
        },
      },
    }),
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
