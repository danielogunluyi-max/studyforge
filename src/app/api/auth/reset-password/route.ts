import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { hashResetToken } from "~/lib/email";
import { db } from "~/server/db";

const INVALID = "This reset link is invalid or has expired.";

export async function POST(request: Request) {
  try {
    let body: { token?: unknown; password?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must be 8–72 characters." },
        { status: 400 },
      );
    }

    if (!token) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: {
        resetToken: hashResetToken(token),
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: "Password updated. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 },
    );
  }
}
