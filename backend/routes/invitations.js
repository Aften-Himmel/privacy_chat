import express from 'express'
import Invitation from '../models/Invitation.js'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'
import { sendNotification } from '../socket/socketManager.js'

const router = express.Router()
router.use(authMiddleware)

// ─── SEND INVITATION ─────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { toUserId, type = 'normal' } = req.body

    if (toUserId === req.user.id) {
      return res.status(400).json({ message: 'Cannot invite yourself' })
    }

    // Check recipient exists
    const recipient = await User.findById(toUserId)
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check for existing pending invite between these two users
    const existing = await Invitation.findOne({
      from: req.user.id,
      to: toUserId,
      status: 'pending',
    })
    if (existing) {
      return res.status(400).json({ message: 'Invitation already sent' })
    }

    // Create the invitation
    const invitation = await Invitation.create({
      from: req.user.id,
      to: toUserId,
      type,
    })

    // Populate sender info to send with notification
    const populated = await invitation.populate('from', 'username avatar')

    // Get the io instance attached to the app
    const io = req.app.get('io')

    // Send real-time notification to recipient if online
    sendNotification(io, toUserId, {
      type: 'invitation',
      invitation: populated,
      message: `${populated.from.username} wants to chat with you`,
    })

    res.status(201).json({ message: 'Invitation sent', invitation: populated })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── GET MY PENDING INVITATIONS ──────────────────────────
router.get('/pending', async (req, res) => {
  try {
    const invitations = await Invitation.find({
      to: req.user.id,
      status: 'pending',
    }).populate('from', 'username avatar isOnline')
      .sort({ createdAt: -1 })

    res.json(invitations)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── RESPOND TO INVITATION ───────────────────────────────
router.patch('/:inviteId/respond', async (req, res) => {
  try {
    const { inviteId } = req.params
    const { action } = req.body // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' })
    }

    const invitation = await Invitation.findOne({
      _id: inviteId,
      to: req.user.id,
      status: 'pending',
    }).populate('to', 'username')

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    invitation.status = action
    await invitation.save()

    // Notify the sender of the response
    const io = req.app.get('io')
    sendNotification(io, invitation.from.toString(), {
      type: 'invitation_response',
      action,
      from: invitation.to.username,
      message: action === 'accepted'
        ? `${invitation.to.username} accepted your invitation!`
        : `${invitation.to.username} declined your invitation`,
    })

    res.json({ message: `Invitation ${action}`, invitation })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// ─── GET SENT INVITATIONS ────────────────────────────────
router.get('/sent', async (req, res) => {
  try {
    const invitations = await Invitation.find({
      from: req.user.id,
    }).populate('to', 'username avatar isOnline')
      .sort({ createdAt: -1 })
      .limit(20)

    res.json(invitations)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router