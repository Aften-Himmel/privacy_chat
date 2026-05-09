import nodemailer from 'nodemailer'
import dns from 'dns'
import { promisify } from 'util'

const resolve4 = promisify(dns.resolve4)

/**
 * Resolve hostname to an IPv4 address.
 * Render free-tier has no IPv6 outbound, so we must avoid
 * the default dual-stack lookup that may return an AAAA record.
 */
async function resolveIPv4(hostname) {
  try {
    const addresses = await resolve4(hostname)
    console.log(`📧 Resolved ${hostname} → ${addresses[0]} (IPv4)`)
    return addresses[0]
  } catch {
    console.warn(`⚠️  Could not resolve ${hostname} to IPv4, using hostname as-is`)
    return hostname
  }
}

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const originalHost = process.env.SMTP_HOST
    const ipv4Host = await resolveIPv4(originalHost)

    console.log('📧 Creating SMTP transporter with:', {
      host: ipv4Host,
      originalHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      passSet: !!process.env.SMTP_PASS,
    })

    const transporter = nodemailer.createTransport({
      host: ipv4Host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { servername: originalHost },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified successfully')
    } catch (verifyErr) {
      console.error('❌ SMTP verification FAILED:', verifyErr.message)
      throw verifyErr
    }

    return transporter
  } else {
    console.warn('⚠️  SMTP env vars missing! Falling back to Ethereal (test-only)')
    const testAccount = await nodemailer.createTestAccount()
    console.log('Ethereal user:', testAccount.user)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  }
}

let transporterPromise = null

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch(err => {
      transporterPromise = null
      throw err
    })
  }
  return transporterPromise
}

export const sendVerificationEmail = async (to, code) => {
  try {
    const transporter = await getTransporter()
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
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending verification email:', {
      message: error.message,
      code: error.code,
      command: error.command,
    })
    return { success: false, error: error.message || error.toString() }
  }
}
