import express from 'express'
import crypto from 'crypto'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Message from '../models/Message.js'
import Session from '../models/Session.js'
import authMiddleware from '../middleware/auth.js'
import { sendNotification } from '../socket/socketManager.js'
import { storePrivateMessage, getPrivateMessages, clearPrivateMessages } from '../socket/privateStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// ── Allowed MIME types whitelist ──
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/gzip',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  // Video
  'video/mp4', 'video/webm', 'video/ogg',
])

// ── Sanitize filenames — strip path traversal chars ──
const sanitizeFilename = (name) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.')
}

// ── Multer configuration ──
const uploadsDir = path.join(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext
    cb(null, safeName)
  }
})

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Only images, documents, audio, and video are accepted.`), false)
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter,
})

// ── MongoDB ObjectId format validator ──
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id)

const getConvId = (a, b) => [a, b].sort().join('_')

// ── Track files uploaded during private sessions for cleanup ──
const privateSessionFiles = new Map() // sessionId -> [filePath]

const trackPrivateFile = (sessionId, filePath) => {
  if (!privateSessionFiles.has(sessionId)) privateSessionFiles.set(sessionId, [])
  privateSessionFiles.get(sessionId).push(filePath)
}

const cleanupPrivateFiles = (sessionId) => {
  const files = privateSessionFiles.get(sessionId) || []
  for (const filePath of files) {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Failed to delete private file:', err.message)
    })
  }
  privateSessionFiles.delete(sessionId)
}

// ── Handle multer errors ──
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum size is 50 MB.' })
      }
      return res.status(400).json({ message: err.message })
    }
    if (err) {
      return res.status(400).json({ message: err.message })
    }
    next()
  })
}

// ── Beacon endpoint for tab-close cleanup (no auth header — sendBeacon limitation)
router.post('/:userId/private/end-beacon', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' })

    const session = await Session.findById(sessionId)
    if (!session || session.status === 'ended') return res.status(200).end()

    session.status = 'ended'
    await session.save()
    clearPrivateMessages(sessionId)
    cleanupPrivateFiles(sessionId)

    // Notify other participants
    const io = req.app.get('io')
    for (const pId of session.participants) {
      sendNotification(io, pId.toString(), {
        type: 'private_session_ended',
        conversationId: session.conversationId,
        sessionId,
        reason: 'tab_close',
      })
    }

    res.status(200).end()
  } catch (err) {
    console.error('Beacon cleanup error:', err.message)
    res.status(500).end()
  }
})

// ── All routes below require authentication
router.use(authMiddleware)

// ── GET count of active sessions for the current user (for dashboard)
// NOTE: This MUST be before /:userId routes or Express matches 'sessions' as a userId
router.get('/sessions/active/count', async (req, res) => {
  try {
    const count = await Session.countDocuments({
      participants: req.user.id,
      status: 'active',
    })
    res.json({ count })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Param validation middleware for :userId routes ──
router.param('userId', (req, res, next, id) => {
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user ID format' })
  }
  next()
})

// ── GET normal message history (always available, like WhatsApp)
router.get('/:userId', async (req, res) => {
  try {
    const convId = getConvId(req.user.id, req.params.userId)
    const messages = await Message.find({ 
      conversationId: convId,
      deletedFor: { $ne: req.user.id }
    })
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .limit(100)
    res.json(messages)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST send normal message (text only)
router.post('/:userId', async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' })

    const convId = getConvId(req.user.id, req.params.userId)

    const message = await Message.create({
      conversationId: convId,
      sender: req.user.id,
      text,
    })
    const populated = await message.populate('sender', 'username')

    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'new_message',
      message: populated,
      conversationId: convId,
    })

    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST send file (normal or private mode)
router.post('/:userId/file', handleUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    const { mode, sessionId, text } = req.body

    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000'
    const fileUrl = `${serverUrl}/uploads/${req.file.filename}`
    const fileData = {
      fileUrl,
      fileName: sanitizeFilename(req.file.originalname),
      fileType: req.file.mimetype,
      fileSize: req.file.size
    }

    const convId = getConvId(req.user.id, req.params.userId)
    const io = req.app.get('io')

    if (mode === 'private') {
      if (!sessionId) return res.status(400).json({ message: 'Session ID required for private file' })
      const session = await Session.findOne({ _id: sessionId, status: 'active' })
      if (!session) return res.status(400).json({ message: 'No active session' })

      // Track file for cleanup when session ends
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
      sendNotification(io, req.params.userId, { type: 'new_private_message', message: messageObj, conversationId: convId, sessionId })
      return res.status(201).json(messageObj)
    }

    // Normal mode file
    const message = await Message.create({
      conversationId: convId,
      sender: req.user.id,
      text: text || '',
      ...fileData
    })
    const populated = await message.populate('sender', 'username')
    sendNotification(io, req.params.userId, { type: 'new_message', message: populated, conversationId: convId })
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST bulk delete messages (WhatsApp style)
router.post('/:userId/messages/delete', async (req, res) => {
  try {
    const { messageIds, type } = req.body // type: 'me' | 'everyone'
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'No messages provided' })
    }

    const convId = getConvId(req.user.id, req.params.userId)

    if (type === 'everyone') {
      // Validate all messages belong to user and are in this conv
      const msgs = await Message.find({ _id: { $in: messageIds }, conversationId: convId })
      
      const unauthorized = msgs.some(m => m.sender.toString() !== req.user.id)
      if (unauthorized || msgs.length !== messageIds.length) {
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' })
      }

      // Hard delete from DB and Disk
      for (const m of msgs) {
        if (m.fileUrl) {
          const filename = m.fileUrl.split('/').pop()
          const filePath = path.join(uploadsDir, filename)
          fs.unlink(filePath, () => {})
        }
      }
      await Message.deleteMany({ _id: { $in: messageIds } })

      // Notify other user
      const io = req.app.get('io')
      sendNotification(io, req.params.userId, {
        type: 'messages_deleted_everyone',
        messageIds,
        conversationId: convId,
      })

    } else if (type === 'me') {
      // Soft delete: just add user ID to deletedFor
      await Message.updateMany(
        { _id: { $in: messageIds }, conversationId: convId },
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

// ── GET active session for a conversation
router.get('/:userId/session/active', async (req, res) => {
  try {
    const convId = getConvId(req.user.id, req.params.userId)
    const session = await Session.findOne({ conversationId: convId, status: 'active' })
    res.json(session) // null if none
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST start private session
router.post('/:userId/private/start', async (req, res) => {
  try {
    const convId = getConvId(req.user.id, req.params.userId)

    const existing = await Session.findOne({ conversationId: convId, status: 'active' })
    if (existing) return res.status(400).json({ message: 'Session already active' })

    const session = await Session.create({
      conversationId: convId,
      participants: [req.user.id, req.params.userId],
      startedBy: req.user.id,
    })

    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'private_session_started',
      conversationId: convId,
      sessionId: session._id,
      startedBy: req.user.id,
    })

    res.status(201).json(session)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── GET private messages for active session — from RAM only
router.get('/:userId/private/messages', async (req, res) => {
  try {
    const convId = getConvId(req.user.id, req.params.userId)
    const session = await Session.findOne({ conversationId: convId, status: 'active' })
    if (!session) return res.json([])
    const msgs = getPrivateMessages(session._id.toString())
    res.json(msgs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST send private message — RAM only, never touches MongoDB
router.post('/:userId/private/message', async (req, res) => {
  try {
    const { text, sessionId } = req.body
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' })

    const session = await Session.findOne({ _id: sessionId, status: 'active' })
    if (!session) return res.status(400).json({ message: 'No active session' })

    const message = {
      _id: crypto.randomUUID(),
      sender: { _id: req.user.id, username: req.user.username },
      text,
      isPrivate: true,
      createdAt: new Date().toISOString(),
    }

    storePrivateMessage(sessionId, message)

    const convId = getConvId(req.user.id, req.params.userId)
    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'new_private_message',
      message,
      conversationId: convId,
      sessionId,
    })

    res.status(201).json(message)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST end private session — clears RAM, marks session ended
router.post('/:userId/private/end', async (req, res) => {
  try {
    const { sessionId } = req.body
    const convId = getConvId(req.user.id, req.params.userId)

    await Session.findByIdAndUpdate(sessionId, { status: 'ended' })
    clearPrivateMessages(sessionId)
    cleanupPrivateFiles(sessionId)

    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'private_session_ended',
      conversationId: convId,
      sessionId,
    })

    res.json({ message: 'Session ended, messages cleared from memory' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router