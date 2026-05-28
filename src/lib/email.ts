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

  console.log("[sendPasswordResetEmail] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  console.log("[sendPasswordResetEmail] resend client initialized:", !!resend);

  if (!resend) {
    // Local dev fallback — log reset link to console
    console.log("=".repeat(60));
    console.log("PASSWORD RESET EMAIL (dev mode - no RESEND_API_KEY)");
    console.log("To:", email);
    console.log("Reset URL:", resetUrl);
    console.log("=".repeat(60));
    return;
  }

  try {
    console.log("[sendPasswordResetEmail] Attempting to send email via Resend to:", email);
    const result = await resend.emails.send({
      from: "Kyvex <onboarding@resend.dev>",
      to: ["daniel.ogunluyi@gmail.com"],
      subject: "Reset Your Kyvex Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); margin: 0; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .card { background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            .logo { font-size: 28px; font-weight: 800; color: #22d3ee; margin-bottom: 8px; letter-spacing: -0.5px; }
            .logo-sub { font-size: 14px; color: #94a3b8; margin-bottom: 32px; }
            h1 { margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #f8fafc; letter-spacing: -0.5px; }
            p { color: #cbd5e1; line-height: 1.7; margin: 0 0 24px; font-size: 15px; }
            .button {
              background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
              color: #0f172a;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 12px;
              display: inline-block;
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 4px 20px rgba(34, 211, 238, 0.3);
              transition: all 0.2s ease;
            }
            .button:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(34, 211, 238, 0.4); }
            .divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 32px 0; }
            .link { color: #22d3ee; word-break: break-all; font-size: 13px; }
            .footer { color: #64748b; font-size: 13px; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
            .footer a { color: #94a3b8; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">Kyvex</div>
              <div class="logo-sub">AI Study Platform</div>
              
              <h1>Reset your password</h1>
              <p>We received a request to reset the password for your Kyvex account. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="divider"></div>
              
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">Or copy and paste this link into your browser:</p>
              <p class="link">${resetUrl}</p>
              
              <div class="divider"></div>
              
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
                <strong style="color: #cbd5e1;">This link expires in 1 hour.</strong>
              </p>
              <p style="font-size: 13px; color: #94a3b8;">
                If you didn't request this password reset, you can safely ignore this email. Your account remains secure.
              </p>
              
              <div class="footer" style="text-align: center;">
                © 2026 Kyvex · Made in Toronto 🍁
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log("[sendPasswordResetEmail] Resend API response:", result);
  } catch (error) {
    console.error("CRITICAL RESEND ERROR:", error);
    throw error;
  }
}
