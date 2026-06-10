import bcrypt from "bcryptjs";
import { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";
import { authConfig as edgeAuthConfig } from "~/server/auth.config";

/**
 * Server-side NextAuth configuration.
 * This file imports the edge-safe config and adds database providers and Node.js-specific modules.
 * This should only be imported in server-side contexts, not in Edge middleware.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  ...edgeAuthConfig,
  pages: {
    signIn: "/login",
    error: "/error",
  },
  debug: true,
  // Add database providers here (Node.js-specific)
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user?.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    // After sign-in/sign-out NextAuth defaults to the dashboard, but honors any
    // safe, same-origin callbackUrl (e.g. the deep link our middleware appends
    // when it bounces an unauthenticated user to /login). Absolute external URLs
    // are never followed, which closes off open-redirect attacks.
    redirect: ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Malformed URL — fall through to the safe default.
      }
      return `${baseUrl}/dashboard`;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
      },
    }),
  },
} satisfies NextAuthConfig;
