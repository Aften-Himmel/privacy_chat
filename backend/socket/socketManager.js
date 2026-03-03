// Keeps track of which userId maps to which socketId
// so we can send real-time messages to specific users
const onlineUsers = new Map()

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`)

    // User registers themselves when they connect
    socket.on('user:register', (userId) => {
      onlineUsers.set(userId, socket.id)
      console.log(`✅ User ${userId} registered with socket ${socket.id}`)

      // Broadcast updated online users list to everyone
      io.emit('users:online', Array.from(onlineUsers.keys()))
    })

    // Send a real-time notification to a specific user
    socket.on('notification:send', ({ toUserId, notification }) => {
      const targetSocketId = onlineUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('notification:receive', notification)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      // Find and remove the disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId)
          console.log(`❌ User ${userId} disconnected`)
          break
        }
      }
      // Broadcast updated online list
      io.emit('users:online', Array.from(onlineUsers.keys()))
    })
  })
}

// Helper to send a notification from anywhere in the backend
export const sendNotification = (io, toUserId, notification) => {
  const targetSocketId = onlineUsers.get(toUserId)
  if (targetSocketId) {
    io.to(targetSocketId).emit('notification:receive', notification)
  }
}