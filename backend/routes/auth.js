import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'
import VerificationCode from '../models/VerificationCode.js'
import { sendVerificationEmail } from '../utils/sendEmail.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Multer config for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `avatar_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`),
})
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

// ─── SEND VERIFICATION CODE ───────────────────────────────
router.post('/send-code', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be 3-20 characters' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already taken' })
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await VerificationCode.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, returnDocument: 'after' }
    )
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
    if (!username || !email || !password || !code) {
      return res.status(400).json({ message: 'All fields including verification code are required' })
    }
    const verificationRecord = await VerificationCode.findOne({ email: email.toLowerCase(), code })
    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' })
    }
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already taken' })
    }
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({ username, email, password: hashedPassword })
    await VerificationCode.deleteOne({ _id: verificationRecord._id })
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(400).json({ message: 'Invalid email or password' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
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

// ─── UPDATE PROFILE (protected) ─────────────────────────
router.patch('/profile', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const updates = {}
    if (req.body.username) {
      const name = req.body.username.trim()
      if (name.length < 3 || name.length > 20) {
        return res.status(400).json({ message: 'Username must be 3-20 characters' })
      }
      const taken = await User.findOne({ username: name, _id: { $ne: req.user.id } })
      if (taken) return res.status(400).json({ message: 'Username already taken' })
      updates.username = name
    }
    if (req.file) {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000'
      updates.avatar = `${serverUrl}/uploads/${req.file.filename}`
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes to update' })
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password')
    res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── CHANGE PASSWORD (protected) ────────────────────────
router.patch('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }
    const user = await User.findById(req.user.id)
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' })
    user.password = await bcrypt.hash(newPassword, 12)
    await user.save()
    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router