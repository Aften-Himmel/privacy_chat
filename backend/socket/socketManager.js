import jwt from 'jsonwebtoken'
import Session from '../models/Session.js'
import GroupSession from '../models/GroupSession.js'
import Group from '../models/Group.js'
import { clearPrivateMessages } from './privateStore.js'

const onlineUsers = new Map() // userId -> socketId

export const setupSocket = (io) => {
  // Expose onlineUsers on io so route handlers (groups.js) can access it
  io._onlineUsers = onlineUsers

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

  io.on('connection', async (socket) => {
    const userId = socket.userId
    console.log(`Socket connected: ${socket.id} (user: ${userId})`)

    // Register user
    onlineUsers.set(userId, socket.id)
    io.emit('users:online', Array.from(onlineUsers.keys()))

    // Join all group rooms so we can also broadcast to rooms
    try {
      const groups = await Group.find({ members: userId }, '_id')
      for (const g of groups) socket.join(`group:${g._id}`)
    } catch (err) {
      console.error('Error joining group rooms:', err.message)
    }

    // Manual notification send (client-to-client via server)
    socket.on('notification:send', ({ toUserId, notification }) => {
      const target = onlineUsers.get(toUserId)
      if (target) io.to(target).emit('notification:receive', notification)
    })

    // Join a newly created group room on the fly
    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`)
    })

    // Disconnect — clean up active sessions, wipe RAM, notify peers
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      console.log(`User ${userId} disconnected`)
      io.emit('users:online', Array.from(onlineUsers.keys()))

      try {
        // 1:1 private sessions
        const activeSessions = await Session.find({ participants: userId, status: 'active' })
        for (const session of activeSessions) {
          session.status = 'ended'
          await session.save()
          clearPrivateMessages(session._id.toString())
          const otherIds = session.participants.map(p => p.toString()).filter(id => id !== userId)
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

        // Group private sessions
        const activeGroupSessions = await GroupSession.find({ participants: userId, status: 'active' })
        for (const gsession of activeGroupSessions) {
          gsession.status = 'ended'
          await gsession.save()
          clearPrivateMessages(gsession._id.toString())
          const group = await Group.findById(gsession.groupId)
          if (group) {
            for (const memberId of group.members) {
              const id = memberId.toString()
              if (id === userId) continue
              const target = onlineUsers.get(id)
              if (target) {
                io.to(target).emit('notification:receive', {
                  type: 'group_private_session_ended',
                  groupId: gsession.groupId.toString(),
                  sessionId: gsession._id,
                  reason: 'disconnect',
                })
              }
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