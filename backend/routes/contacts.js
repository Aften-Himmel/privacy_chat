import express from 'express'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'

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

// ─── GET MY CONTACTS ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('contacts', 'username email avatar isOnline')

    res.json(user.contacts)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── ADD CONTACT ─────────────────────────────────────────
router.post('/add/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot add yourself' })
    }

    // Check the user to add actually exists
    const userToAdd = await User.findById(userId)
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' })
    }

    const currentUser = await User.findById(req.user.id)

    // Check if already a contact
    if (currentUser.contacts.includes(userId)) {
      return res.status(400).json({ message: 'Already in your contacts' })
    }

    // Add to both users' contact lists (mutual friendship)
    await User.findByIdAndUpdate(req.user.id, {
      $push: { contacts: userId }
    })
    await User.findByIdAndUpdate(userId, {
      $push: { contacts: req.user.id }
    })

    res.json({ message: 'Contact added successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── REMOVE CONTACT ──────────────────────────────────────
router.delete('/remove/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Remove from both sides
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { contacts: userId }
    })
    await User.findByIdAndUpdate(userId, {
      $pull: { contacts: req.user.id }
    })

    res.json({ message: 'Contact removed' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router