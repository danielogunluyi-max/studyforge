import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

// Ensure required env vars exist to avoid NextAuth constructing invalid URLs
if (!process.env.NEXTAUTH_URL) {
	// Prefer public app URL if available, otherwise fallback to known production hostname
	process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kyvex.vercel.app";
}

if (!process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET) {
	process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

let uncachedAuth: any;
let handlers: any;
let signIn: any;
let signOut: any;

try {
	const nextAuthResult = NextAuth(authConfig);
	uncachedAuth = nextAuthResult.auth;
	handlers = nextAuthResult.handlers;
	signIn = nextAuthResult.signIn;
	signOut = nextAuthResult.signOut;
} catch (err) {
	// Diagnostic logging for Vercel logs (don't print secrets)
	console.error("NextAuth initialization error:", err instanceof Error ? err.message : err);
	console.error("Env presence: NEXTAUTH_URL=", process.env.NEXTAUTH_URL ? "set" : "unset", "NEXTAUTH_SECRET=", process.env.NEXTAUTH_SECRET ? "set" : "unset", "DATABASE_URL=", process.env.DATABASE_URL ? "set" : "unset");
	throw err;
}

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };

