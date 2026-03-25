import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')

    // Connect to socket server with JWT authentication
    socketRef.current = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      auth: { token },
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Update online users list
    socket.on('users:online', (userIds) => {
      setOnlineUsers(userIds)
    })

    // Receive real-time notifications
    socket.on('notification:receive', (notification) => {
      setNotifications(prev => [
        { ...notification, id: Date.now() + Math.random(), read: false },
        ...prev
      ])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const hasUnread = prev.some(n => !n.read)
      if (!hasUnread) return prev
      return prev.map(n => ({ ...n, read: true }))
    })
  }, [])

  const clearNotification = useCallback((id) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id)
      return filtered.length === prev.length ? prev : filtered
    })
  }, [])

  const clearNotificationsForUser = useCallback((userId) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => {
        const senderId = n.message?.sender?._id || n.message?.sender || n.startedBy
        return senderId !== userId
      })
      return filtered.length === prev.length ? prev : filtered
    })
  }, [])

  const isUserOnline = (userId) => onlineUsers.includes(userId)

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      onlineUsers,
      notifications,
      markAllRead,
      clearNotification,
      clearNotificationsForUser,
      isUserOnline,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)