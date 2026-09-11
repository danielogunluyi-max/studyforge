import { createHash } from "crypto";
import { Resend } from "resend";

import { safeInternalUrl } from "~/lib/auth-redirect";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const PASSWORD_RESET_TTL_MINUTES = 60;

/**
 * The test domain only delivers to the Resend account owner — which is why
 * resets used to reach the founder instead of students. In production set:
 *   RESEND_FROM="Kyvex <noreply@yourdomain.com>"
 * after verifying the domain in the Resend dashboard (SPF/DKIM records).
 */
const FROM = process.env.RESEND_FROM ?? "Kyvex <onboarding@resend.dev>";

if (process.env.NODE_ENV === "production" && FROM.includes("onboarding@resend.dev")) {
  console.warn(
    "[email] Using Resend sandbox sender — mail only reaches the account owner. " +
      "Verify your domain and set RESEND_FROM before students use this.",
  );
}

/** Store this, never the plaintext token. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SendPasswordResetInput = {
  email: string;
  resetToken: string;
  callbackUrl?: string | null;
};

export type SendPasswordResetResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendPasswordResetEmail(
  input: SendPasswordResetInput,
): Promise<SendPasswordResetResult> {
  const { email, resetToken } = input;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const params = new URLSearchParams({ token: resetToken });
  const returnTo = input.callbackUrl ? safeInternalUrl(input.callbackUrl) : null;
  if (returnTo) params.set("callbackUrl", returnTo);
  const resetUrl = `${baseUrl}/reset-password?${params.toString()}`;

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY missing in production — reset email NOT sent");
      return { ok: false, error: "email transport not configured" };
    }
    console.log("=".repeat(60));
    console.log("PASSWORD RESET EMAIL (dev mode — no RESEND_API_KEY)");
    console.log("To:", email);
    console.log("Reset URL:", resetUrl);
    console.log("=".repeat(60));
    return { ok: true, id: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Reset your Kyvex password",
      html: renderResetEmailHtml(resetUrl),
      text: renderResetEmailText(resetUrl),
    });

    if (error) {
      console.error("[email] Resend API error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

function renderResetEmailHtml(resetUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;">
        <tr><td style="padding:32px 32px 0;font-size:18px;font-weight:700;color:#0f172a;">Kyvex</td></tr>
        <tr><td style="padding:12px 32px 0;font-size:22px;font-weight:600;color:#0f172a;">Reset your password</td></tr>
        <tr><td style="padding:12px 32px 0;font-size:14px;line-height:21px;color:#334155;">
          We received a request to reset the password for your Kyvex account.
          Click the button below to choose a new one.
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <a href="${resetUrl}" style="display:inline-block;background:#06b6d4;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
            Reset password
          </a>
        </td></tr>
        <tr><td style="padding:0 32px;font-size:13px;line-height:19px;color:#64748b;">
          This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.
          If it expires, just request a new one.
        </td></tr>
        <tr><td style="padding:16px 32px 32px;font-size:13px;line-height:19px;color:#64748b;">
          Button not working? Copy this link into your browser:<br />
          <a href="${resetUrl}" style="color:#0891b2;word-break:break-all;">${resetUrl}</a>
        </td></tr>
      </table>
      <div style="max-width:480px;padding-top:16px;font-size:12px;line-height:18px;color:#94a3b8;">
        If you didn't request a reset, ignore this email — your password won't change.
      </div>
    </td></tr></table>
  </body>
</html>`;
}

function renderResetEmailText(resetUrl: string): string {
  return [
    "Reset your Kyvex password",
    "",
    `Open this link to choose a new password (expires in ${PASSWORD_RESET_TTL_MINUTES} minutes, single use):`,
    resetUrl,
    "",
    "If you didn't request this, ignore this email — your password won't change.",
  ].join("\n");
}
