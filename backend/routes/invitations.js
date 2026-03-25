import express from 'express'
import Invitation from '../models/Invitation.js'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'
import { sendNotification } from '../socket/socketManager.js'

const router = express.Router()
router.use(authMiddleware)

// SEND INVITATION
router.post('/send', async (req, res) => {
  try {
    const { toUserId, type = 'normal' } = req.body

    if (toUserId === req.user.id)
      return res.status(400).json({ message: 'Cannot invite yourself' })

    const recipient = await User.findById(toUserId)
    if (!recipient)
      return res.status(404).json({ message: 'User not found' })

    const existing = await Invitation.findOne({ from: req.user.id, to: toUserId, status: 'pending' })
    if (existing)
      return res.status(400).json({ message: 'Invitation already sent' })

    const invitation = await Invitation.create({ from: req.user.id, to: toUserId, type })
    const populated = await invitation.populate('from', 'username avatar')

    const io = req.app.get('io')
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

// GET PENDING
router.get('/pending', async (req, res) => {
  try {
    const invitations = await Invitation.find({ to: req.user.id, status: 'pending' })
      .populate('from', 'username avatar isOnline')
      .sort({ createdAt: -1 })
    res.json(invitations)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// RESPOND TO INVITATION
router.patch('/:inviteId/respond', async (req, res) => {
  try {
    const { inviteId } = req.params
    const { action } = req.body

    if (!['accepted', 'declined'].includes(action))
      return res.status(400).json({ message: 'Invalid action' })

    const invitation = await Invitation.findOne({
      _id: inviteId,
      to: req.user.id,
      status: 'pending',
    }).populate('from', 'username').populate('to', 'username')

    if (!invitation)
      return res.status(404).json({ message: 'Invitation not found' })

    invitation.status = action
    await invitation.save()

    const io = req.app.get('io')

    // ✅ Include toUserId so NotificationBell knows who to open chat with
    sendNotification(io, invitation.from._id.toString(), {
      type: 'invitation_response',
      action,
      from: invitation.to.username,
      // This is the person who responded — the inviter should open chat with them
      toUserId: req.user.id,
      message: action === 'accepted'
        ? `${invitation.to.username} accepted your invitation!`
        : `${invitation.to.username} declined your invitation`,
    })

    res.json({ message: `Invitation ${action}`, invitation })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// GET SENT
router.get('/sent', async (req, res) => {
  try {
    const invitations = await Invitation.find({ from: req.user.id })
      .populate('to', 'username avatar isOnline')
      .sort({ createdAt: -1 })
      .limit(20)
    res.json(invitations)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

export default router