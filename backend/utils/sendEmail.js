/**
 * Email delivery via Brevo (Sendinblue) HTTP API.
 * Uses HTTPS (port 443) which is always open on Render,
 * unlike SMTP ports (587/465) which Render blocks.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export const sendVerificationEmail = async (to, code) => {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'anu07aakash@gmail.com'
  const fromName  = process.env.BREVO_FROM_NAME  || 'PrivacyChat'

  if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not set')
    return { success: false, error: 'BREVO_API_KEY environment variable is missing' }
  }

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject: 'Your PrivacyChat Verification Code',
    textContent: `Your verification code is: ${code}. It will expire in 10 minutes.`,
    htmlContent: `
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
  }

  try {
    console.log(`📧 Sending verification email via Brevo to: ${to}`)

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Brevo API error:', response.status, data)
      return { success: false, error: data.message || `HTTP ${response.status}` }
    }

    console.log('✅ Verification email sent via Brevo. MessageId:', data.messageId)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message)
    return { success: false, error: error.message || error.toString() }
  }
}
