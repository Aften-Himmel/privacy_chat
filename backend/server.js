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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { setupSocket }  from './socket/socketManager.js'
import messageRoutes   from './routes/messages.js'

dotenv.config()

const app        = express()
const httpServer = createServer(app)
const io         = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
})

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io)

// ── Security middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin file downloads
}))
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

// ── Rate limiting for auth routes ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

// ── Ensure uploads directory exists ──
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api/auth',        authLimiter, authRoutes)
app.use('/api/contacts',    contactRoutes)
app.use('/api/groups',      groupRoutes)
app.use('/api/invitations', invitationRoutes)

app.use('/api/messages', messageRoutes)

// ── Email health-check (temporary diagnostic) ──
app.get('/api/health/email', async (req, res) => {
  try {
    const nodemailer = await import('nodemailer')
    const config = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS ? '***SET***' : '***MISSING***',
      },
    }
    console.log('📧 Email health check — config:', config)

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ status: 'FAIL', reason: 'SMTP env vars missing', config })
    }

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transporter.verify()
    res.json({ status: 'OK', message: 'SMTP connection verified', config })
  } catch (err) {
    console.error('❌ Email health check failed:', err.message)
    res.status(500).json({ status: 'FAIL', error: err.message, code: err.code })
  }
})

app.get('/', (req, res) => res.json({ message: 'Privacy Chat Server running!' }))

// Setup socket handlers
setupSocket(io)

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    httpServer.listen(process.env.PORT, () => {
      console.log(`✅ Server running on port ${process.env.PORT}`)
    })
  })
  .catch(err => console.error(' MongoDB error:', err.message))

export { io }