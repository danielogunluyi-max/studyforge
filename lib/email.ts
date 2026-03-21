// lib/email.ts - Temporary console logging version

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  // TEMPORARY: Log to console instead of sending email
  // You can see this in Vercel Function logs
  console.log('='.repeat(80));
  console.log('📧 PASSWORD RESET EMAIL');
  console.log('To:', email);
  console.log('Reset Link:', resetUrl);
  console.log('Token:', resetToken);
  console.log('='.repeat(80));

  // TODO: Replace with real email service when ready (Resend, SendGrid, etc.)
  // For now, you'll copy the link from Vercel logs and send to your friend manually
}
