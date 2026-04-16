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
  const [unreadCounts, setUnreadCounts] = useState({}) // conversationId|groupId -> count

  // BUG FIX 3: expose a live socket getter instead of the stale ref value.
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')

    socketRef.current = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      auth: { token },
    })

    const socket = socketRef.current
    forceUpdate(n => n + 1)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('users:online', (userIds) => setOnlineUsers(userIds))

    socket.on('notification:receive', (notification) => {
      setNotifications(prev => [
        { ...notification, id: Date.now() + Math.random(), read: false },
        ...prev
      ])

      // Track unread counts for message notifications
      if (notification.type === 'new_message' && notification.conversationId) {
        setUnreadCounts(prev => ({
          ...prev,
          [notification.conversationId]: (prev[notification.conversationId] || 0) + 1
        }))
      }
      if (notification.type === 'new_group_message' && notification.groupId) {
        setUnreadCounts(prev => ({
          ...prev,
          [notification.groupId]: (prev[notification.groupId] || 0) + 1
        }))
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
      forceUpdate(n => n + 1)
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

  const clearUnread = useCallback((id) => {
    setUnreadCounts(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const getUnreadCount = useCallback((id) => {
    return unreadCounts[id] || 0
  }, [unreadCounts])

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
      clearUnread,
      getUnreadCount,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)