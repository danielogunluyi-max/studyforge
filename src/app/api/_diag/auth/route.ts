import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  const env = {
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  let userCount = null;
  let sessionCount = null;
  let dbError = null;

  try {
    userCount = await db.user.count();
    sessionCount = await db.session.count();
  } catch (err: any) {
    dbError = String(err.message ?? err);
  }

  return NextResponse.json({ env, userCount, sessionCount, dbError });
}
