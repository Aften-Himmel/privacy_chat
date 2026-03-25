import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
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