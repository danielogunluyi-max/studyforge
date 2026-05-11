import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/config";

const nextAuth = NextAuth(authConfig);
export const { GET, POST } = nextAuth.handlers;
export const runtime = "nodejs";
