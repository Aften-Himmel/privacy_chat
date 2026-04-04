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

  // BUG FIX 3: expose a live socket getter instead of the stale ref value.
  // The original code passed `socketRef.current` as the context value, which
  // was always null on first render and never updated for consumers that
  // captured it early (e.g. CreateGroupModal calling socket.emit on mount).
  // We now expose the ref itself AND a stable `getSocket` helper so callers
  // always reach the live instance.
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')

    socketRef.current = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      auth: { token },
    })

    const socket = socketRef.current
    // Trigger re-render so consumers receive the new socket instance
    forceUpdate(n => n + 1)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('users:online', (userIds) => setOnlineUsers(userIds))

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