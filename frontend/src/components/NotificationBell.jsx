import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

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

  const toggle = () => {
    setOpen(p => !p)
    if (!open) markAllRead()
  }

  const accept = async n => {
    try {
      const invId = n?.invitation?._id
      const fromId = n?.invitation?.from?._id || n?.invitation?.from
      if (!invId) return
      await api.patch(`/invitations/${invId}/respond`, { action: 'accepted' })
      clearNotification(n.id)
      setOpen(false)
      if (fromId) navigate(`/chat/${fromId}`)
    } catch {}
  }

  const decline = async n => {
    try {
      const invId = n?.invitation?._id
      if (!invId) return
      await api.patch(`/invitations/${invId}/respond`, { action: 'declined' })
      clearNotification(n.id)
    } catch {}
  }

  const openChat = (n) => {
    if (n?.toUserId) {
      clearNotification(n.id)
      setOpen(false)
      navigate(`/chat/${n.toUserId}`)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white cursor-pointer"
      >
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
        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Notifications</span>
            <span className="text-gray-500 text-xs">{notifications.length}</span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : (
              notifications.map(n => {
                if (!n) return null
                return (
                  <div key={n.id} className="px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800">
                    <p className="text-white text-sm mb-2">{n.message || 'New notification'}</p>

                    {n.type === 'invitation' && n.invitation && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => accept(n)}
                          className="flex-1 text-xs text-green-400 border border-green-800 hover:border-green-500 bg-transparent rounded-lg py-1 cursor-pointer font-sans"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => decline(n)}
                          className="flex-1 text-xs text-gray-400 border border-gray-700 hover:border-red-700 bg-transparent rounded-lg py-1 cursor-pointer font-sans"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {n.type === 'invitation_response' && n.action === 'accepted' && (
                      <button
                        onClick={() => openChat(n)}
                        className="w-full text-xs text-cyan-400 border border-cyan-800 hover:border-cyan-500 bg-transparent rounded-lg py-1 cursor-pointer font-sans mt-1"
                      >
                        Open Chat →
                      </button>
                    )}

                    {n.type === 'invitation_response' && n.action === 'declined' && (
                      <p className="text-xs text-gray-500">Declined</p>
                    )}

                    {n.type === 'group_added' && (
                      <button
                        onClick={() => { clearNotification(n.id); setOpen(false); navigate('/groups') }}
                        className="w-full text-xs text-cyan-400 border border-cyan-800 hover:border-cyan-500 bg-transparent rounded-lg py-1 cursor-pointer font-sans mt-1"
                      >
                        View Group →
                      </button>
                    )}

                    {n.type === 'private_session_started' && (
                      <p className="text-xs text-purple-400">🔒 Private session started</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}