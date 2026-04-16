import nodemailer from 'nodemailer'

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Creating SMTP transporter with:', {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      // Don't log the password, just confirm it exists
      passSet: !!process.env.SMTP_PASS,
    })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Verify the SMTP connection works
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified successfully')
    } catch (verifyErr) {
      console.error('❌ SMTP connection verification FAILED:', verifyErr.message)
      throw verifyErr
    }

    return transporter
  } else {
    console.warn('⚠️  SMTP env vars missing! SMTP_HOST:', !!process.env.SMTP_HOST,
      'SMTP_USER:', !!process.env.SMTP_USER, 'SMTP_PASS:', !!process.env.SMTP_PASS)
    // Fall back to Ethereal (test email) — emails won't reach real inboxes
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

    // Use the authenticated SMTP user as the from address
    // Gmail ignores custom from addresses and replaces with the authenticated user
    const fromAddress = process.env.SMTP_USER || 'no-reply@privacychat.local'

    console.log(`📧 Sending verification email to: ${to}`)

    const info = await transporter.sendMail({
      from: `"PrivacyChat" <${fromAddress}>`,
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

    console.log('✅ Verification email sent:', info.messageId)
    console.log('   Accepted:', info.accepted)
    console.log('   Rejected:', info.rejected)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log('📧 Preview URL (Ethereal):', previewUrl)
    }
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending verification email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    })
    return { success: false, error: error.message || error.toString() }
  }
}
