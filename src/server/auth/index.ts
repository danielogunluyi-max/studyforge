import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

// Ensure required env vars exist to avoid NextAuth constructing invalid URLs
if (!process.env.NEXTAUTH_URL) {
	// Prefer public app URL if available, otherwise fallback to known production hostname
	process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studyforgeapp.vercel.app";
}

if (!process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET) {
	process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
