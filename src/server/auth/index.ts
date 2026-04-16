import NextAuth from "next-auth";
import { authConfig } from "./config";

// Ensure required env vars exist to avoid NextAuth constructing invalid URLs
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kyvex-iynn8ll5q-daniels-projects-f2299921.vercel.app";
}
if (!process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

const nextAuth = NextAuth(authConfig);
const { handlers, auth } = nextAuth;

export const { GET, POST } = handlers;
export { auth };
export { authConfig as authOptions };

