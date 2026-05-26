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
} satisfies NextAuthConfig;
