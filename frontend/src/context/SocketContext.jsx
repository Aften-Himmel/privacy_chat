import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!user) return

    // Connect to socket server
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket'],
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      // Register this user with their userId
      socket.emit('user:register', user.id)
    })

    // Update online users list
    socket.on('users:online', (userIds) => {
      setOnlineUsers(userIds)
    })

    // Receive real-time notifications
    socket.on('notification:receive', (notification) => {
      setNotifications(prev => [
        { ...notification, id: Date.now(), read: false },
        ...prev
      ])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const isUserOnline = (userId) => onlineUsers.includes(userId)

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      onlineUsers,
      notifications,
      markAllRead,
      clearNotification,
      isUserOnline,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)