import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import authRoutes       from './routes/auth.js'
import contactRoutes    from './routes/contacts.js'
import invitationRoutes from './routes/invitations.js'
import { setupSocket }  from './socket/socketManager.js'

dotenv.config()

const app        = express()
const httpServer = createServer(app)
const io         = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
})

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io)

app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

// Routes
app.use('/api/auth',        authRoutes)
app.use('/api/contacts',    contactRoutes)
app.use('/api/invitations', invitationRoutes)

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
  .catch(err => console.error('❌ MongoDB error:', err.message))

export { io }