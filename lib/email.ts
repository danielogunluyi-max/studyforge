import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  try {
    console.log('=== About to send password reset email via Resend ===', { email, resetUrl });
    const { data, error } = await resend.emails.send({
      from: 'Kyvex <onboarding@resend.dev>', // Resend test domain
      to: email,
      subject: 'Reset Your Kyvex Password (Test Update)',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .button { 
              display: inline-block;
              padding: 12px 24px;
              background: #f0b429;
              color: #0a0e1a;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Your Kyvex Password</h1>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${resetUrl}</p>
            
            <p><strong>⏰ This link expires in 1 hour.</strong></p>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
            
            <div class="footer">
              <p>Kyvex - AI Study Platform for Ontario Students</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log('=== Resend API response ===', { data, error });
    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    console.log('✅ Password reset email sent successfully');
    console.log('   To:', email);
    console.log('   Email ID:', data?.id);
    console.log('   Reset URL:', resetUrl);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email. Please try again later.');
  }
}
