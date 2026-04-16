import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import Message from '../models/Message.js'
import authMiddleware from '../middleware/auth.js'
import { sendNotification } from '../socket/socketManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')

const getConvId = (a, b) => [a.toString(), b.toString()].sort().join('_')

const router = express.Router()

// All routes here require login
router.use(authMiddleware)

// ─── SEARCH USERS ────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { username } = req.query

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: 'Search term too short' })
    }

    // Find users whose username contains the search term
    // Exclude the current logged-in user from results
    const users = await User.find({
      username: { $regex: username.trim(), $options: 'i' },
      _id: { $ne: req.user.id }
    })
    .select('username email avatar isOnline')
    .limit(10)

    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── GET USER INFO (Fallback) ────────────────────────────
router.get('/user/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('username isOnline')
    if (u) res.json(u)
    else res.status(404).json({ message: 'Not found' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET MY CONTACTS ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('contacts', 'username email avatar isOnline')

    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user.contacts)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── ADD CONTACT (DISABLED: Use Invitations API instead) ───
router.post('/add/:userId', async (req, res) => {
  res.status(400).json({ message: 'Direct addition disabled. Please refresh your browser Page to use the new Invite system.' })
})

// ─── REMOVE CONTACT ──────────────────────────────────────
router.delete('/remove/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Get remover's name first for the notification
    const remover = await User.findById(req.user.id).select('username')

    // Remove from both sides
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { contacts: userId }
    })
    await User.findByIdAndUpdate(userId, {
      $pull: { contacts: req.user.id }
    })

    // Wipe all mutual chat history and files
    const convId = getConvId(req.user.id, userId)
    const msgs = await Message.find({ conversationId: convId })
    for (const m of msgs) {
      if (m.fileUrl) {
        const filename = m.fileUrl.split('/').pop()
        const filePath = path.join(uploadsDir, filename)
        fs.unlink(filePath, () => {})
      }
    }
    await Message.deleteMany({ conversationId: convId })

    const io = req.app.get('io')
    if (io && remover) {
      sendNotification(io, userId, {
        type: 'contact_removed',
        removedBy: req.user.id,
        removerName: remover.username
      })
    }

    res.json({ message: 'Contact removed' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router