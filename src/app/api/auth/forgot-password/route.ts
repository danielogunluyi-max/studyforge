import crypto from "crypto";
import { NextResponse } from "next/server";

// Trigger redeploy: minor comment change

import { db } from "~/server/db";
import { sendPasswordResetEmail } from "~/lib/email";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.toLowerCase().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 },
      );
    }

    // Always return same response to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If that email exists, we sent a reset link",
    });

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return successResponse;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
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
