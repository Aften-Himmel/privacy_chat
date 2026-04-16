import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function NotificationBell() {
  const { notifications, markAllRead, clearNotification } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  // BUG FIX 1: original filtered ALL notifications for unread count, but
  // invitation/invitation_response types are handled by InvitationsDropdown —
  // exclude them here so the badge count is accurate for this bell only.
  const bellNotifications = notifications.filter(
    n => n.type !== 'invitation' && n.type !== 'invitation_response'
  )
  const unread = bellNotifications.filter(n => !n.read).length

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // BUG FIX 2: toggle() read `open` from closure which was always stale on
  // the first click — !open was always !false = true, so markAllRead() was
  // called on close too. Use the functional updater and check the previous value.
  const toggle = () => {
    setOpen(prev => {
      if (!prev) markAllRead()   // only mark read when opening
      return !prev
    })
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
    } catch (err) {
      console.error('Failed to accept invitation:', err)
    }
  }

  const decline = async n => {
    try {
      const invId = n?.invitation?._id
      if (!invId) return
      await api.patch(`/invitations/${invId}/respond`, { action: 'declined' })
      clearNotification(n.id)
    } catch (err) {
      console.error('Failed to decline invitation:', err)
    }
  }

  const openChat = (n) => {
    if (n?.toUserId) {
      clearNotification(n.id)
      setOpen(false)
      navigate(`/chat/${n.toUserId}`)
    }
  }

  const renderMessage = (n) => {
    // BUG FIX 3: n.message is sometimes an object (the full message doc from
    // new_message / new_private_message notifications) not a string — calling
    // it directly as {n.message} renders [object Object] and crashes the
    // text node. Derive a safe display string for every notification type.
    if (typeof n.message === 'string') return n.message

    switch (n.type) {
      case 'new_message':
        return `New message from ${n.message?.sender?.username || 'someone'}`
      case 'new_private_message':
        return `🔒 Private message from ${n.message?.sender?.username || 'someone'}`
      case 'new_group_message':
        return `New group message from ${n.message?.sender?.username || 'someone'}`
      case 'new_group_private_message':
        return `🔒 Private group message from ${n.message?.sender?.username || 'someone'}`
      case 'private_session_started':
        return '🔒 A private session has started'
      case 'private_session_ended':
        return 'A private session has ended'
      case 'group_private_session_started':
        return '🔒 A group private session has started'
      case 'group_private_session_ended':
        return 'A group private session has ended'
      case 'group_added':
        return `You were added to a group`
      case 'group_updated':
        return 'A group was updated'
      case 'group_deleted':
        return 'A group you were in was deleted'
      case 'group_removed':
        return 'You were removed from a group'
      case 'contact_removed':
        return `${n.removerName || 'Someone'} removed you from their contacts`
      default:
        return 'New notification'
    }
  }

  // BUG FIX 4: "View Group" was navigating to '/groups' which doesn't exist
  // as a route — the correct route is '/chat/group/:groupId'.
  const openGroup = (n) => {
    clearNotification(n.id)
    setOpen(false)
    if (n.group?._id) navigate(`/chat/group/${n.group._id}`)
    else if (n.groupId) navigate(`/chat/group/${n.groupId}`)
  }

  const openChatFromMessage = (n) => {
    clearNotification(n.id)
    setOpen(false)
    const senderId = n.message?.sender?._id || n.message?.sender || n.startedBy
    if (senderId) navigate(`/chat/${senderId}`)
  }

  const openGroupFromMessage = (n) => {
    clearNotification(n.id)
    setOpen(false)
    if (n.groupId) navigate(`/chat/group/${n.groupId}`)
  }

  return (
    <div className="relative" ref={ref}>
      {/* BUG FIX 5: button had dark Tailwind classes (bg-gray-900, border-gray-800,
          text-gray-400) hardcoded — making it look like a dark themed button
          regardless of the surrounding light UI. Replaced with the same neutral
          style used by InvitationsDropdown so it matches the sidebar header. */}
      <button
        onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer transition"
        title="Notifications"
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
        <div className="absolute top-full left-0 right-0 mt-2 w-max bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden" style={{minWidth: '280px', maxWidth: 'max(280px, calc(100vw - 2rem))'}}>
          <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between">
            <span className="text-gray-800 text-sm font-semibold">Notifications</span>
            <span className="text-gray-400 text-xs">{bellNotifications.length}</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {bellNotifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : (
              bellNotifications.map(n => {
                if (!n) return null
                return (
                  <div key={n.id} className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                    {/* BUG FIX 3 (applied): always render a string, never the raw object */}
                    <p className={`text-sm mb-1.5 ${n.type?.includes('private') ? 'text-purple-700 font-medium' : 'text-gray-800'}`}>
                      {renderMessage(n)}
                    </p>

                    {/* Invitation accept/decline */}
                    {n.type === 'invitation' && n.invitation && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => accept(n)}
                          className="flex-1 text-xs font-bold rounded-lg py-1.5 text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition">
                          Accept
                        </button>
                        <button onClick={() => decline(n)}
                          className="flex-1 text-xs font-bold rounded-lg py-1.5 text-gray-700 bg-gray-200 hover:bg-gray-300 border-none cursor-pointer transition">
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Invitation accepted — open chat */}
                    {n.type === 'invitation_response' && n.action === 'accepted' && (
                      <button onClick={() => openChat(n)}
                        className="w-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 cursor-pointer transition mt-1">
                        Open Chat →
                      </button>
                    )}

                    {/* Invitation declined */}
                    {n.type === 'invitation_response' && n.action === 'declined' && (
                      <p className="text-xs text-gray-400 mt-1">They declined your invitation.</p>
                    )}

                    {/* DM message — open chat */}
                    {(n.type === 'new_message' || n.type === 'new_private_message' || n.type === 'private_session_started') && (
                      <button onClick={() => openChatFromMessage(n)}
                        className={`w-full text-xs font-semibold rounded-lg py-1.5 cursor-pointer transition mt-1 border ${
                          n.type.includes('private')
                            ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                            : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'
                        }`}>
                        Open Chat →
                      </button>
                    )}

                    {/* Group message — open group */}
                    {(n.type === 'new_group_message' || n.type === 'new_group_private_message' || n.type === 'group_private_session_started') && (
                      <button onClick={() => openGroupFromMessage(n)}
                        className={`w-full text-xs font-semibold rounded-lg py-1.5 cursor-pointer transition mt-1 border ${
                          n.type.includes('private')
                            ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}>
                        Open Group →
                      </button>
                    )}

                    {/* BUG FIX 4: was navigating to '/groups' (doesn't exist) */}
                    {n.type === 'group_added' && (
                      <button onClick={() => openGroup(n)}
                        className="w-full text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg py-1.5 cursor-pointer transition mt-1">
                        View Group →
                      </button>
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