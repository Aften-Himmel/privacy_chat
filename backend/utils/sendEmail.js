import { Resend } from 'resend';

// Lazily initialized Resend client
let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY is not set in environment variables!');
      // Return a dummy client if missing, preventing crashes but warning the user
      return {
        emails: {
          send: async () => {
             console.error('❌ Cannot send email: RESEND_API_KEY missing.');
             throw new Error('RESEND_API_KEY is missing');
          }
        }
      };
    }
    // Initialize standard client
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend client initialized');
  }
  return resendClient;
}

export const sendVerificationEmail = async (to, code) => {
  try {
    const resend = getResendClient();

    // From address must be verified in Resend dashboard
    // typically onboarding@resend.dev works for testing only to the registered email
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    console.log(`📧 Sending verification email via Resend to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: `PrivacyChat <${fromAddress}>`,
      to: [to],
      subject: 'Your PrivacyChat Verification Code',
      text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #3b82f6;">Welcome to PrivacyChat!</h2>
          <p>Please use the verification code below to complete your registration:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Error from Resend API:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Verification email sent successfully via Resend. ID:', data?.id);
    return { success: true, data };
    
  } catch (err) {
    console.error('❌ Exception in sendVerificationEmail:', err);
    return { success: false, error: err.message || err.toString() };
  }
};
