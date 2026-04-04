import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
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

// ── Ensure uploads directory exists ──
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api/auth',        authRoutes)
app.use('/api/contacts',    contactRoutes)
app.use('/api/groups',      groupRoutes)
app.use('/api/invitations', invitationRoutes)

app.use('/api/messages', messageRoutes)

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