import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  if (!resend) {
    // Local dev fallback — log reset link to console
    console.log("=".repeat(60));
    console.log("PASSWORD RESET EMAIL (dev mode)");
    console.log("To:", email);
    console.log("Reset URL:", resetUrl);
    console.log("=".repeat(60));
    return;
  }

  await resend.emails.send({
    from: "Kyvex <noreply@kyvex.app>",
    to: email,
    subject: "Reset Your Kyvex Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; }
          .button {
            background: #f0b429;
            color: #0a0e1a;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            font-weight: 600;
            font-size: 15px;
          }
          .footer { color: #888; font-size: 13px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 style="margin:0 0 16px;font-size:24px;color:#0a0e1a;">Reset Your Password</h1>
            <p style="color:#555;line-height:1.6;">You requested a password reset for your Kyvex account. Click the button below to set a new password:</p>
            <p style="margin:28px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p style="color:#888;font-size:13px;word-break:break-all;">Or copy this link: ${resetUrl}</p>
            <p style="color:#888;font-size:13px;"><strong>This link expires in 1 hour.</strong></p>
            <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <p class="footer" style="text-align:center;">Kyvex &middot; AI Study Platform</p>
        </div>
      </body>
      </html>
    `,
  });
}
