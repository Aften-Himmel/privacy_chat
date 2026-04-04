import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'
import VerificationCode from '../models/VerificationCode.js'
import { sendVerificationEmail } from '../utils/sendEmail.js'

const router = express.Router()

// ─── SEND VERIFICATION CODE ───────────────────────────────
router.post('/send-code', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be 3-20 characters' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already taken' })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Save/Update code in DB — always reset expiresAt so the timer restarts
    await VerificationCode.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, returnDocument: 'after' }
    )

    // Send the email
    const emailResult = await sendVerificationEmail(email.toLowerCase(), code)
    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send verification email', error: emailResult.error })
    }

    res.status(200).json({ message: 'Verification code sent successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, code } = req.body

    // Validate required fields
    if (!username || !email || !password || !code) {
      return res.status(400).json({ message: 'All fields including verification code are required' })
    }

    // Check the verification code first
    const verificationRecord = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code: code
    })

    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' })
    }

    // Check if user already exists (lowercase email for checking)
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already taken' })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    })

    // Delete verification code after successful registration
    await VerificationCode.deleteOne({ _id: verificationRecord._id })

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email (lowercase for matching)
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── GET CURRENT USER (protected) ───────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router