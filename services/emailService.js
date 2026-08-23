import { Resend } from 'resend';
import crypto from 'crypto';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a verification email with a token link.
 * If RESEND_API_KEY is missing, it mocks the sending and logs the link (useful for local dev).
 */
export async function sendVerificationEmail(email, token, req) {
  const host = req.get('host');
  // Use http for localhost, https for production
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const verificationUrl = `${protocol}://${host}/api/auth/verify-email/${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(`\n[EMAIL MOCK] Would send verification email to: ${email}`);
    console.warn(`[EMAIL MOCK] Verification Link: ${verificationUrl}\n`);
    return { success: true, mocked: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'FileGuard <onboarding@resend.dev>', // Update with verified domain later
      to: [email],
      subject: 'Verify your FileGuard Issuer Account',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h2>Verify your FileGuard Issuer Identity</h2>
          <p>Thank you for registering an issuer account. Please verify your institutional email address to continue.</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Verify Email</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send email:', error);
    return { success: false, error };
  }
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}
