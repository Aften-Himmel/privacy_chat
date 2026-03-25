import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'

export default function NotificationBell() {
  const { notifications, markAllRead, clearNotification } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = () => { setOpen(p => !p); if (!open) markAllRead() }

  const openChat = (n, userId) => {
    clearNotification(n.id)
    setOpen(false)
    if (userId) navigate(`/chat/${userId}`)
  }

  const renderNotificationText = (n) => {
    if (typeof n.message === 'string' && n.type === 'notification') return n.message
    
    // For direct message notifications
    if (n.type === 'new_message') {
      const senderName = n.message?.sender?.username || 'Someone'
      return `New message from ${senderName}`
    }
    
    if (n.type === 'new_private_message') {
      const senderName = n.message?.sender?.username || 'Someone'
      return `🔒 New private message from ${senderName}`
    }

    if (n.type === 'private_session_started') {
      return '🔒 A new private session has started'
    }

    if (n.type === 'private_session_ended') {
      return 'A private session has ended'
    }

    return 'New notification'
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200">
            <span className="text-gray-800 text-sm font-semibold">Notifications</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : notifications.map(n => (
              <div key={n.id} className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex flex-col gap-2 transition">
                <p className={`text-sm ${n.type.includes('private') ? 'text-purple-700 font-medium' : 'text-gray-800'}`}>
                  {renderNotificationText(n)}
                </p>

                {/* Chat message notifications — show Open Chat button */}
                {(n.type === 'new_message' || n.type === 'new_private_message' || n.type === 'private_session_started') && (
                  <button
                    onClick={() => {
                      const senderId = n.message?.sender?._id || n.message?.sender || n.startedBy
                      if (senderId) openChat(n, senderId)
                      else clearNotification(n.id) // Fallback if we can't determine ID
                    }}
                    className={`w-full text-xs font-semibold rounded-lg py-1.5 cursor-pointer font-sans mt-1 transition ${
                      n.type.includes('private') 
                        ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200' 
                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    }`}>
                    Open Chat →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}