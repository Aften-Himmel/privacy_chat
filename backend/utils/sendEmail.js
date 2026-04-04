import nodemailer from 'nodemailer'

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP if provided in .env
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    // Fall back to Ethereal (test email) — creates a new account on every server start
    const testAccount = await nodemailer.createTestAccount()
    console.log('Using Ethereal Mail for testing. Login at https://ethereal.email')
    console.log('Ethereal user:', testAccount.user)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }
}

// Lazy singleton — initialised once, re-used across requests
let transporterPromise = null

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch(err => {
      // Reset so the next call retries
      transporterPromise = null
      throw err
    })
  }
  return transporterPromise
}

export const sendVerificationEmail = async (to, code) => {
  try {
    const transporter = await getTransporter()

    const info = await transporter.sendMail({
      from: '"PrivacyChat" <no-reply@privacychat.local>',
      to,
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
    })

    console.log('Verification email sent:', info.messageId)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log('📧 Preview URL (Ethereal):', previewUrl)
    }
    return { success: true }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { success: false, error: error.message || error.toString() }
  }
}
