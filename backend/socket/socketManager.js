import jwt from 'jsonwebtoken'
import Session from '../models/Session.js'
import { clearPrivateMessages } from './privateStore.js'

const onlineUsers = new Map() // userId -> socketId

export const setupSocket = (io) => {
  // ── Socket authentication middleware ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      socket.username = decoded.username
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    console.log(`Socket connected: ${socket.id} (user: ${userId})`)

    // Register user using verified identity from token
    onlineUsers.set(userId, socket.id)
    io.emit('users:online', Array.from(onlineUsers.keys()))

    // Manual notification send (client-to-client via server)
    socket.on('notification:send', ({ toUserId, notification }) => {
      const target = onlineUsers.get(toUserId)
      if (target) io.to(target).emit('notification:receive', notification)
    })

    // Disconnect — clean up active sessions, wipe RAM, notify peers
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      console.log(`User ${userId} disconnected`)
      io.emit('users:online', Array.from(onlineUsers.keys()))

      // Find all active private sessions this user is in and end them
      try {
        const activeSessions = await Session.find({
          participants: userId,
          status: 'active',
        })

        for (const session of activeSessions) {
          session.status = 'ended'
          await session.save()
          clearPrivateMessages(session._id.toString())

          // Notify other participants
          const otherIds = session.participants
            .map(p => p.toString())
            .filter(id => id !== userId)

          for (const otherId of otherIds) {
            const target = onlineUsers.get(otherId)
            if (target) {
              io.to(target).emit('notification:receive', {
                type: 'private_session_ended',
                conversationId: session.conversationId,
                sessionId: session._id,
                reason: 'disconnect',
              })
            }
          }
        }
      } catch (err) {
        console.error('Error cleaning up sessions on disconnect:', err.message)
      }
    })
  })
}

// Helper used by route handlers to push to a specific user
export const sendNotification = (io, toUserId, notification) => {
  const target = onlineUsers.get(toUserId)
  if (target) io.to(target).emit('notification:receive', notification)
}