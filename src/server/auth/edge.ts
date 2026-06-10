import NextAuth, { type NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration used ONLY by the Next.js middleware to
 * verify the JWT session cookie on protected routes.
 *
 * It deliberately omits the Credentials provider (and therefore `bcryptjs`
 * and the Prisma client), which are NOT compatible with the Edge runtime
 * that middleware executes in. Sign-in / sign-out continue to use the full
 * configuration in `~/server/auth`.
 *
 * Both instances share the same `AUTH_SECRET` and the same default cookie
 * names + JWT session strategy, so the token written during sign-in is
 * readable here for verification.
 */
export const edgeAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  // No providers are required to *verify* an existing JWT; providers are only
  // used for the sign-in flow, which runs in the Node runtime via the full
  // config. Keeping this empty avoids bundling bcryptjs / Prisma into the Edge.
  providers: [],
  callbacks: {
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

export const { auth: edgeAuth } = NextAuth(edgeAuthConfig);
