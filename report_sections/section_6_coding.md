## 6) Coding Section

This chapter presents the key implementation modules of Privacy Chat with actual source code from the project repository. Each subsection covers a critical architectural component.

---

### 6.1) Backend Entry Point — `server.js`

The main server file initializes Express, applies security middleware, mounts route modules, integrates Socket.IO for real-time communication, and connects to MongoDB Atlas.

```javascript
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes       from './routes/auth.js'
import contactRoutes    from './routes/contacts.js'
import groupRoutes      from './routes/groups.js'
import invitationRoutes from './routes/invitations.js'
import { setupSocket }  from './socket/socketManager.js'
import messageRoutes    from './routes/messages.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app        = express()
const httpServer = createServer(app)
const io         = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET','POST','PATCH','DELETE'] }
})

app.set('io', io) // Make io accessible in route handlers via req.app.get('io')

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

// Rate limiting for auth routes — 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15  60  1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

// Ensure uploads directory exists and serve static files
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

// Mount API routes
app.use('/api/auth',        authLimiter, authRoutes)
app.use('/api/contacts',    contactRoutes)
app.use('/api/groups',      groupRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/messages',    messageRoutes)

// Setup Socket.IO event handlers
setupSocket(io)

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    httpServer.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`)
    })
  })
  .catch(err => console.error('MongoDB error:', err.message))
```

---

### 6.2) Mongoose Models

#### 6.2.1) User Model — `models/User.js`

```javascript
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true,
                minlength: 3, maxlength: 20 },
    email:    { type: String, required: true, unique: true, trim: true,
                lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    avatar:   { type: String, default: '' },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Cascading delete: remove this user from other users' contacts arrays
userSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('User').updateMany(
      { contacts: doc._id }, { $pull: { contacts: doc._id } }
    )
  }
})

export default mongoose.model('User', userSchema)
```

#### 6.2.2) Message Model — `models/Message.js`

```javascript
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, index: true },           // for DMs
  groupId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  sender:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:           { type: String, default: '' },
  fileUrl:        { type: String },
  fileName:       { type: String },
  fileType:       { type: String },
  fileSize:       { type: Number },
  deletedFor:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status:         { type: String, enum: ['sent','delivered','read'], default: 'sent' },
  readBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // NOTE: isPrivate is NOT stored here — private messages never touch the DB
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)
```

#### 6.2.3) Verification Code Model — `models/VerificationCode.js`

```javascript
import mongoose from 'mongoose'

const verificationCodeSchema = new mongoose.Schema(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    code:      { type: String, required: true },
    expiresAt: { type: Date, required: true,
                 default: () => new Date(Date.now() + 10  60  1000) },
  },
  { timestamps: true }
)

// TTL index — MongoDB auto-deletes documents when expiresAt has passed
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
verificationCodeSchema.index({ email: 1 })

export default mongoose.model('VerificationCode', verificationCodeSchema)
```

---

### 6.3) Authentication Routes — `routes/auth.js`

#### 6.3.1) Email Verification Code Generation

```javascript
router.post('/send-code', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' })
    if (username.length < 3 || username.length > 20)
      return res.status(400).json({ message: 'Username must be 3-20 characters' })
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })
    if (existingUser)
      return res.status(400).json({ message: 'Username or email already taken' })

    // Generate 6-digit OTP and upsert into VerificationCode collection
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await VerificationCode.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, expiresAt: new Date(Date.now() + 10  60  1000) },
      { upsert: true, new: true }
    )

    const emailResult = await sendVerificationEmail(email.toLowerCase(), code)
    if (!emailResult.success)
      return res.status(500).json({ message: 'Failed to send verification email' })
    res.status(200).json({ message: 'Verification code sent successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})
```

#### 6.3.2) User Registration with OTP Verification

```javascript
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, code } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const trimmedCode = String(code).trim()

    // Validate OTP against database record
    const verificationRecord = await VerificationCode.findOne({
      email: normalizedEmail, code: trimmedCode
    })
    if (!verificationRecord)
      return res.status(400).json({ message: 'Invalid verification code' })
    if (verificationRecord.expiresAt < new Date()) {
      await VerificationCode.deleteOne({ _id: verificationRecord._id })
      return res.status(400).json({ message: 'Verification code has expired' })
    }

    // Hash password with bcrypt (12 salt rounds) and create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      username, email: normalizedEmail, password: hashedPassword
    })
    await VerificationCode.deleteOne({ _id: verificationRecord._id })

    // Sign JWT with 7-day expiry and set as HttpOnly cookie
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    )
    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 604800000
    })
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})
```

#### 6.3.3) Login and JWT Token Generation

```javascript
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(400).json({ message: 'Invalid email or password' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    )
    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 604800000
    })
    res.json({
      message: 'Login successful',
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})
```

---

### 6.4) Private Session Architecture — `socket/privateStore.js`

This is the architectural core of Privacy Chat's ephemeral messaging guarantee. All private messages are stored exclusively in server RAM using a JavaScript `Map`:

```javascript
// In-memory store for private session messages
// Messages never touch MongoDB — they live only in server RAM
// When session ends or server restarts, they are gone forever

const privateMessages = new Map() // sessionId -> [messages]

export const storePrivateMessage = (sessionId, message) => {
  if (!privateMessages.has(sessionId)) privateMessages.set(sessionId, [])
  privateMessages.get(sessionId).push(message)
}

export const getPrivateMessages = (sessionId) => {
  return privateMessages.get(sessionId) || []
}

export const clearPrivateMessages = (sessionId) => {
  privateMessages.delete(sessionId)
}
```

#### 6.4.1) Private Session Start — `routes/messages.js`

```javascript
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
```

#### 6.4.2) Private Message Sending (RAM-Only)

```javascript
router.post('/:userId/private/message', async (req, res) => {
  try {
    const { text, sessionId } = req.body
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' })

    const session = await Session.findOne({ _id: sessionId, status: 'active' })
    if (!session) return res.status(400).json({ message: 'No active session' })

    // CRITICAL: Message object is created in RAM only — never written to MongoDB
    const message = {
      _id: crypto.randomUUID(),
      sender: { _id: req.user.id, username: req.user.username },
      text,
      isPrivate: true,
      createdAt: new Date().toISOString(),
    }

    storePrivateMessage(sessionId, message) // Stored in Map, not database

    const convId = getConvId(req.user.id, req.params.userId)
    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'new_private_message', message, conversationId: convId, sessionId,
    })
    res.status(201).json(message)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
```

#### 6.4.3) Private Session End — RAM Cleanup

```javascript
router.post('/:userId/private/end', async (req, res) => {
  try {
    const { sessionId } = req.body
    const session = await Session.findById(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })

    // Verify caller is a participant
    const isParticipant = session.participants.some(p => p.toString() === req.user.id)
    if (!isParticipant)
      return res.status(403).json({ message: 'Not authorized to end this session' })

    if (session.status !== 'ended') {
      session.status = 'ended'
      await session.save()
    }

    clearPrivateMessages(sessionId)  // Irrecoverably delete all RAM messages
    cleanupPrivateFiles(sessionId)   // Delete uploaded files from disk

    const io = req.app.get('io')
    sendNotification(io, req.params.userId, {
      type: 'private_session_ended', conversationId: getConvId(req.user.id, req.params.userId),
      sessionId,
    })
    res.json({ message: 'Session ended, messages cleared from memory' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
```

---

### 6.5) Socket.IO Real-Time Engine — `socket/socketManager.js`

```javascript
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Session from '../models/Session.js'
import GroupSession from '../models/GroupSession.js'
import Group from '../models/Group.js'
import { clearPrivateMessages } from './privateStore.js'

const onlineUsers = new Map() // userId -> socketId

export const setupSocket = (io) => {
  io._onlineUsers = onlineUsers

  // JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      socket.username = decoded.username
      next()
    } catch { next(new Error('Invalid or expired token')) }
  })

  io.on('connection', async (socket) => {
    const userId = socket.userId

    // Join all group rooms before registering as online
    const groups = await Group.find({ members: userId }, '_id')
    for (const g of groups) socket.join(`group:${g._id}`)

    onlineUsers.set(userId, socket.id)
    io.emit('users:online', Array.from(onlineUsers.keys()))
    User.findByIdAndUpdate(userId, { isOnline: true }).catch(() => {})

    // Typing indicators
    socket.on('typing:start', ({ toUserId, groupId }) => {
      if (toUserId) {
        const target = onlineUsers.get(toUserId)
        if (target) io.to(target).emit('typing:start', { userId, username: socket.username })
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:start', { userId, username: socket.username, groupId })
      }
    })

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      io.emit('users:online', Array.from(onlineUsers.keys()))
      User.findByIdAndUpdate(userId, { isOnline: false }).catch(() => {})

      // Clean up active private sessions on disconnect
      const activeSessions = await Session.find({ participants: userId, status: 'active' })
      for (const session of activeSessions) {
        session.status = 'ended'
        await session.save()
        clearPrivateMessages(session._id.toString())
        // Notify other participants
        const otherIds = session.participants.map(p => p.toString()).filter(id => id !== userId)
        for (const otherId of otherIds) {
          const target = onlineUsers.get(otherId)
          if (target) io.to(target).emit('notification:receive', {
            type: 'private_session_ended', conversationId: session.conversationId,
            sessionId: session._id, reason: 'disconnect',
          })
        }
      }
    })
  })
}

export const sendNotification = (io, toUserId, notification) => {
  const target = onlineUsers.get(toUserId)
  if (target) io.to(target).emit('notification:receive', notification)
}
```

---

### 6.6) JWT Authentication Middleware — `middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken'

const authMiddleware = (req, res, next) => {
  // Extract token from HttpOnly cookie
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ message: 'No token provided' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // { id, username, iat, exp }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export default authMiddleware
```

---

### 6.7) Frontend Authentication Context — `context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate session on load using the HttpOnly cookie
    const checkAuthStatus = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, [])

  const login = (userData) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout'); // Clears the HttpOnly cookie
    } catch (err) { console.error(err.message) }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
```

---

### 6.8) Axios API Client with Interceptors — `api/axios.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Send HttpOnly cookies automatically
})

// Handle 401 responses by redirecting to login safely
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAuthCheck = err.config.url.endsWith('/auth/me');
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      
      if (!isAuthCheck && !isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err)
  }
)

export default api
```

---

### 6.9) Contact Removal with Cascading Cleanup — `routes/contacts.js`

```javascript
router.delete('/remove/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const remover = await User.findById(req.user.id).select('username')

    // Remove from both sides (mutual removal)
    await User.findByIdAndUpdate(req.user.id, { $pull: { contacts: userId } })
    await User.findByIdAndUpdate(userId, { $pull: { contacts: req.user.id } })

    // Wipe all mutual chat history and associated files
    const convId = getConvId(req.user.id, userId)
    const msgs = await Message.find({ conversationId: convId })
    for (const m of msgs) {
      if (m.fileUrl) {
        const filename = m.fileUrl.split('/').pop()
        fs.unlink(path.join(uploadsDir, filename), () => {})
      }
    }
    await Message.deleteMany({ conversationId: convId })

    // Real-time notification to the removed user
    const io = req.app.get('io')
    if (io && remover) {
      sendNotification(io, userId, {
        type: 'contact_removed', removedBy: req.user.id, removerName: remover.username
      })
    }
    res.json({ message: 'Contact removed' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})
```
