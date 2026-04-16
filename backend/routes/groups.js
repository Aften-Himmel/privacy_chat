import express from 'express'
import crypto from 'crypto'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Group from '../models/Group.js'
import GroupSession from '../models/GroupSession.js'
import Message from '../models/Message.js'
import authMiddleware from '../middleware/auth.js'
import { storePrivateMessage, getPrivateMessages, clearPrivateMessages } from '../socket/privateStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// ── Allowed MIME types whitelist ──
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed', 'application/gzip',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'video/mp4', 'video/webm', 'video/ogg',
])

const sanitizeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.')

const uploadsDir = path.join(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext)
  },
})

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true)
  else cb(new Error(`File type "${file.mimetype}" is not allowed.`), false)
}

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter })

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ message: 'File too large. Maximum size is 100 MB.' })
      return res.status(400).json({ message: err.message })
    }
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

// ── Track private session files for cleanup ──
const privateSessionFiles = new Map()
const trackPrivateFile = (sessionId, filePath) => {
  if (!privateSessionFiles.has(sessionId)) privateSessionFiles.set(sessionId, [])
  privateSessionFiles.get(sessionId).push(filePath)
}
const cleanupPrivateFiles = (sessionId) => {
  const files = privateSessionFiles.get(sessionId) || []
  for (const fp of files) fs.unlink(fp, (err) => { if (err && err.code !== 'ENOENT') console.error('Failed to delete private file:', err.message) })
  privateSessionFiles.delete(sessionId)
}

// ── Helper: send notification to all group members ──
const notifyGroup = (io, group, notification, excludeUserId = null) => {
  const onlineUsers = io._onlineUsers || new Map()
  for (const memberId of group.members) {
    const id = memberId.toString()
    if (excludeUserId && id === excludeUserId) continue
    const socketId = onlineUsers.get(id)
    if (socketId) io.to(socketId).emit('notification:receive', notification)
  }
}

// ── All routes require auth ──
router.use(authMiddleware)

// ──────────────────────────────────────────────
//  CRUD: Groups
// ──────────────────────────────────────────────

// POST /api/groups — create a new group
router.post('/', async (req, res) => {
  try {
    const { name, description, memberIds } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' })

    // Dedupe + ensure creator is included
    const allMembers = [...new Set([req.user.id, ...(memberIds || [])])]

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user.id,
      members: allMembers,
      admins: [req.user.id],
    })

    const populated = await group.populate('members', 'username isOnline')

    // Notify all added members via socket
    const io = req.app.get('io')
    notifyGroup(io, group, {
      type: 'group_added',
      group: populated,
    }, req.user.id)

    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/groups — list groups the user is a member of
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('members', 'username isOnline')
      .sort({ updatedAt: -1 })
    res.json(groups)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/groups/:groupId — detailed group info
router.get('/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'username isOnline')
      .populate('creator', 'username')
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.some(m => m._id.toString() === req.user.id))
      return res.status(403).json({ message: 'Not a member of this group' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/groups/:groupId — edit name/description (admin only)
router.patch('/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.admins.map(a => a.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Only admins can edit group info' })

    if (req.body.name?.trim()) group.name = req.body.name.trim()
    if (req.body.description !== undefined) group.description = req.body.description.trim()
    await group.save()

    const populated = await group.populate('members', 'username isOnline')
    const io = req.app.get('io')
    notifyGroup(io, group, { type: 'group_updated', group: populated }, req.user.id)

    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/groups/:groupId — delete group (creator only)
router.delete('/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (group.creator.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only the creator can delete the group' })

    const io = req.app.get('io')
    notifyGroup(io, group, { type: 'group_deleted', groupId: group._id.toString() }, req.user.id)

    await Message.deleteMany({ groupId: group._id })
    await group.deleteOne()
    res.json({ message: 'Group deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/members — add members (admin only)
router.post('/:groupId/members', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.admins.map(a => a.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Only admins can add members' })

    const { userIds } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ message: 'userIds array required' })

    for (const uid of userIds) {
      if (!group.members.map(m => m.toString()).includes(uid)) group.members.push(uid)
    }
    await group.save()

    const populated = await group.populate('members', 'username isOnline')
    const io = req.app.get('io')
    notifyGroup(io, group, { type: 'group_updated', group: populated })

    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/groups/:groupId/members/:userId — remove member (admin only)
router.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.admins.map(a => a.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Only admins can remove members' })
    if (req.params.userId === group.creator.toString())
      return res.status(400).json({ message: 'Cannot remove the group creator' })

    group.members = group.members.filter(m => m.toString() !== req.params.userId)
    group.admins  = group.admins.filter(a => a.toString() !== req.params.userId)
    await group.save()

    const populated = await group.populate('members', 'username isOnline')
    const io = req.app.get('io')
    notifyGroup(io, group, { type: 'group_updated', group: populated })
    // Notify removed user specifically
    const onlineUsers = io._onlineUsers || new Map()
    const removedSocket = onlineUsers.get(req.params.userId)
    if (removedSocket) io.to(removedSocket).emit('notification:receive', { type: 'group_removed', groupId: group._id.toString() })

    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/leave — leave group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (group.creator.toString() === req.user.id)
      return res.status(400).json({ message: 'Creator cannot leave. Delete the group instead.' })

    group.members = group.members.filter(m => m.toString() !== req.user.id)
    group.admins  = group.admins.filter(a => a.toString() !== req.user.id)
    await group.save()

    res.json({ message: 'Left the group' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ──────────────────────────────────────────────
//  Group Messages (Normal)
// ──────────────────────────────────────────────

// GET /api/groups/:groupId/messages
router.get('/:groupId/messages', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.map(m => m.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Not a member' })

    const messages = await Message.find({
      groupId: req.params.groupId,
      deletedFor: { $ne: req.user.id },
    })
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .limit(100)

    res.json(messages)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/messages — send text
router.post('/:groupId/messages', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.map(m => m.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Not a member' })

    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ message: 'Message text is required' })
    if (text.length > 500) return res.status(400).json({ message: 'Message exceeds 500 characters limit' })

    const message = await Message.create({ groupId: group._id, sender: req.user.id, text })
    const populated = await message.populate('sender', 'username')

    const io = req.app.get('io')
    notifyGroup(io, group, {
      type: 'new_group_message',
      message: populated,
      groupId: group._id.toString(),
    }, req.user.id)

    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/messages/file — send file
router.post('/:groupId/messages/file', handleUpload, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.map(m => m.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Not a member' })
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const { mode, sessionId, text } = req.body
    if (text && text.length > 500) return res.status(400).json({ message: 'Message exceeds 500 characters limit' })
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000'
    const fileUrl = `${serverUrl}/uploads/${req.file.filename}`
    const fileData = {
      fileUrl,
      fileName: sanitizeFilename(req.file.originalname),
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    }

    const io = req.app.get('io')

    if (mode === 'private') {
      if (!sessionId) return res.status(400).json({ message: 'Session ID required for private file' })
      const session = await GroupSession.findOne({ _id: sessionId, status: 'active' })
      if (!session) return res.status(400).json({ message: 'No active session' })

      trackPrivateFile(sessionId, path.join(uploadsDir, req.file.filename))

      const messageObj = {
        _id: crypto.randomUUID(),
        sender: { _id: req.user.id, username: req.user.username },
        text: text || '',
        ...fileData,
        isPrivate: true,
        createdAt: new Date().toISOString(),
      }
      storePrivateMessage(sessionId, messageObj)
      notifyGroup(io, group, {
        type: 'new_group_private_message',
        message: messageObj,
        groupId: group._id.toString(),
        sessionId,
      }, req.user.id)
      return res.status(201).json(messageObj)
    }

    // Normal file
    const message = await Message.create({
      groupId: group._id,
      sender: req.user.id,
      text: text || '',
      ...fileData,
    })
    const populated = await message.populate('sender', 'username')
    notifyGroup(io, group, {
      type: 'new_group_message',
      message: populated,
      groupId: group._id.toString(),
    }, req.user.id)

    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/messages/delete — bulk delete
router.post('/:groupId/messages/delete', async (req, res) => {
  try {
    const { messageIds, type } = req.body
    if (!Array.isArray(messageIds) || messageIds.length === 0)
      return res.status(400).json({ message: 'No messages provided' })

    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.map(m => m.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Not a member' })

    if (type === 'everyone') {
      const msgs = await Message.find({ _id: { $in: messageIds }, groupId: req.params.groupId })
      const unauthorized = msgs.some(m => m.sender.toString() !== req.user.id)
      if (unauthorized || msgs.length !== messageIds.length)
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' })

      for (const m of msgs) {
        if (m.fileUrl) {
          const filename = m.fileUrl.split('/').pop()
          fs.unlink(path.join(uploadsDir, filename), () => {})
        }
      }
      await Message.deleteMany({ _id: { $in: messageIds } })

      const io = req.app.get('io')
      notifyGroup(io, group, {
        type: 'group_messages_deleted_everyone',
        messageIds,
        groupId: req.params.groupId,
      }, req.user.id)
    } else if (type === 'me') {
      await Message.updateMany(
        { _id: { $in: messageIds }, groupId: req.params.groupId },
        { $addToSet: { deletedFor: req.user.id } }
      )
    } else {
      return res.status(400).json({ message: 'Invalid delete type' })
    }

    res.json({ message: 'Messages deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ──────────────────────────────────────────────
//  Group Private Sessions
// ──────────────────────────────────────────────

// GET /api/groups/:groupId/session/active
router.get('/:groupId/session/active', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.members.map(m => m.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Not a member of this group' })

    const session = await GroupSession.findOne({ groupId: req.params.groupId, status: 'active' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/private/start
router.post('/:groupId/private/start', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })
    if (!group.admins.map(a => a.toString()).includes(req.user.id))
      return res.status(403).json({ message: 'Only admins can start a private session' })

    const existing = await GroupSession.findOne({ groupId: req.params.groupId, status: 'active' })
    if (existing) return res.status(400).json({ message: 'Session already active' })

    const session = await GroupSession.create({
      groupId: req.params.groupId,
      participants: group.members,
      startedBy: req.user.id,
    })

    const io = req.app.get('io')
    notifyGroup(io, group, {
      type: 'group_private_session_started',
      groupId: group._id.toString(),
      sessionId: session._id,
      startedBy: req.user.id,
    }, req.user.id)

    res.status(201).json(session)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/groups/:groupId/private/messages
router.get('/:groupId/private/messages', async (req, res) => {
  try {
    const session = await GroupSession.findOne({ groupId: req.params.groupId, status: 'active' })
    if (!session) return res.json([])
    res.json(getPrivateMessages(session._id.toString()))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/private/message
router.post('/:groupId/private/message', async (req, res) => {
  try {
    const { text, sessionId } = req.body
    if (!text?.trim()) return res.status(400).json({ message: 'Message text is required' })
    if (text.length > 500) return res.status(400).json({ message: 'Message exceeds 500 characters limit' })

    const session = await GroupSession.findOne({ _id: sessionId, status: 'active' })
    if (!session) return res.status(400).json({ message: 'No active session' })

    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })

    const message = {
      _id: crypto.randomUUID(),
      sender: { _id: req.user.id, username: req.user.username },
      text,
      isPrivate: true,
      createdAt: new Date().toISOString(),
    }
    storePrivateMessage(sessionId, message)

    const io = req.app.get('io')
    notifyGroup(io, group, {
      type: 'new_group_private_message',
      message,
      groupId: group._id.toString(),
      sessionId,
    }, req.user.id)

    res.status(201).json(message)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/groups/:groupId/private/end
router.post('/:groupId/private/end', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' })

    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: 'Group not found' })

    const session = await GroupSession.findById(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })

    // Only admins or the session starter can end the session
    const isAdmin = group.admins.map(a => a.toString()).includes(req.user.id)
    const isStarter = session.startedBy?.toString() === req.user.id
    if (!isAdmin && !isStarter)
      return res.status(403).json({ message: 'Only admins or the session starter can end the session' })

    if (session.status !== 'ended') {
      session.status = 'ended'
      await session.save()
    }

    clearPrivateMessages(sessionId)
    cleanupPrivateFiles(sessionId)

    const io = req.app.get('io')
    notifyGroup(io, group, {
      type: 'group_private_session_ended',
      groupId: group._id.toString(),
      sessionId,
    }, req.user.id)

    res.json({ message: 'Group private session ended' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
