import crypto from "crypto";
import { NextResponse } from "next/server";

import {
  hashResetToken,
  PASSWORD_RESET_TTL_MINUTES,
  sendPasswordResetEmail,
} from "~/lib/email";
import { db } from "~/server/db";

const COOLDOWN_MS = 2 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    let body: { email?: string; callbackUrl?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 },
      );
    }

    const successResponse = NextResponse.json({
      message: "If that email exists, we sent a reset link",
    });

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return successResponse;
    }

    const now = Date.now();
    const cooldownCutoff = now + PASSWORD_RESET_TTL_MINUTES * 60_000 - COOLDOWN_MS;
    if (user.resetTokenExpiry && user.resetTokenExpiry.getTime() > cooldownCutoff) {
      return successResponse;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(now + PASSWORD_RESET_TTL_MINUTES * 60_000);

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: hashResetToken(resetToken), resetTokenExpiry },
    });

    const result = await sendPasswordResetEmail({
      email,
      resetToken,
      callbackUrl: typeof body.callbackUrl === "string" ? body.callbackUrl : null,
    });

    if (!result.ok) {
      console.error("[forgot-password] reset email not delivered:", result.error);
    }

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 },
    );
  }
}
