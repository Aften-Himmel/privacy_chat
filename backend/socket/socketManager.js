import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Session from '../models/Session.js'
import GroupSession from '../models/GroupSession.js'
import Group from '../models/Group.js'
import { clearPrivateMessages } from './privateStore.js'

const onlineUsers = new Map() // userId -> socketId

export const setupSocket = (io) => {
  io._onlineUsers = onlineUsers

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

    // BUG FIX 11: the original code called onlineUsers.set() and broadcast
    // users:online BEFORE the async group-room join completed. This meant
    // other clients saw the user as online before they had joined their group
    // rooms, so any group notification sent in that brief window would be
    // missed. We now join all group rooms first, then register the user as
    // online and broadcast.
    try {
      const groups = await Group.find({ members: userId }, '_id')
      for (const g of groups) socket.join(`group:${g._id}`)
    } catch (err) {
      console.error('Error joining group rooms:', err.message)
    }

    // Register user as online only after rooms are joined
    onlineUsers.set(userId, socket.id)
    io.emit('users:online', Array.from(onlineUsers.keys()))

    // BUG FIX: persist isOnline to DB so REST reads are accurate
    User.findByIdAndUpdate(userId, { isOnline: true }).catch(err =>
      console.error('Failed to set user online:', err.message)
    )

    socket.on('notification:send', ({ toUserId, notification }) => {
      const target = onlineUsers.get(toUserId)
      if (target) io.to(target).emit('notification:receive', notification)
    })

    // ── Typing indicators ──
    socket.on('typing:start', ({ toUserId, groupId }) => {
      if (toUserId) {
        const target = onlineUsers.get(toUserId)
        if (target) io.to(target).emit('typing:start', { userId, username: socket.username })
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:start', { userId, username: socket.username, groupId })
      }
    })
    socket.on('typing:stop', ({ toUserId, groupId }) => {
      if (toUserId) {
        const target = onlineUsers.get(toUserId)
        if (target) io.to(target).emit('typing:stop', { userId })
      } else if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:stop', { userId, groupId })
      }
    })

    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`)
    })

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      console.log(`User ${userId} disconnected`)
      io.emit('users:online', Array.from(onlineUsers.keys()))

      // BUG FIX: persist isOnline to DB
      User.findByIdAndUpdate(userId, { isOnline: false }).catch(err =>
        console.error('Failed to set user offline:', err.message)
      )

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

export const sendNotification = (io, toUserId, notification) => {
  const target = onlineUsers.get(toUserId)
  if (target) io.to(target).emit('notification:receive', notification)
}