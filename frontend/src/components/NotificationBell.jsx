import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const NotificationBell = () => {
  const { notifications, markAllRead, clearNotification } = useSocket()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const unread = notifications.filter(n => !n.read).length

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    setOpen(p => !p)
    if (!open) markAllRead()
  }

  const handleAccept = async (notification) => {
    try {
      await api.patch(`/invitations/${notification.invitation._id}/respond`, {
        action: 'accepted'
      })
      clearNotification(notification.id)
      navigate('/chat')
    } catch (err) {
      console.error('Failed to accept invitation', err)
    }
  }

  const handleDecline = async (notification) => {
    try {
      await api.patch(`/invitations/${notification.invitation._id}/respond`, {
        action: 'declined'
      })
      clearNotification(notification.id)
    } catch (err) {
      console.error('Failed to decline invitation', err)
    }
  }

  return (
    <>
      <style>{`
        .bell-wrap { position: relative; }

        .bell-btn {
          position: relative;
          width: 38px; height: 38px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(99,202,255,0.18);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.22s;
          color: rgba(140,175,210,0.6);
        }
        .bell-btn:hover { background: rgba(99,202,255,0.08); border-color: rgba(99,202,255,0.35); color: #63caff; }
        .bell-btn svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

        .bell-badge {
          position: absolute; top: -5px; right: -5px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #ff6b8a;
          border: 2px solid #080f1e;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
          animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }

        .bell-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 340px;
          background: rgba(10,18,38,0.97);
          border: 1px solid rgba(99,202,255,0.2);
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,202,255,0.05);
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 200;
          animation: dropDown 0.2s ease;
        }
        @keyframes dropDown { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }

        .dropdown-header {
          padding: 16px 18px 12px;
          border-bottom: 1px solid rgba(99,202,255,0.08);
          display: flex; align-items: center; justify-content: space-between;
        }
        .dropdown-title { font-size: 14px; font-weight: 600; color: #e8f4ff; }
        .dropdown-count { font-size: 12px; color: rgba(140,175,210,0.5); }

        .notif-list { max-height: 360px; overflow-y: auto; }

        .notif-item {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(99,202,255,0.05);
          transition: background 0.2s;
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: rgba(99,202,255,0.04); }

        .notif-top {
          display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;
        }
        .notif-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #080f1e;
          flex-shrink: 0; text-transform: uppercase;
        }
        .notif-text { flex: 1; }
        .notif-msg { font-size: 13.5px; color: #e8f4ff; font-weight: 500; line-height: 1.4; margin-bottom: 3px; }
        .notif-time { font-size: 11px; color: rgba(140,175,210,0.4); }

        .notif-actions { display: flex; gap: 8px; }
        .notif-btn {
          flex: 1; padding: 7px 12px; border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; border: 1px solid;
        }
        .notif-btn.accept {
          background: rgba(0,245,212,0.1); border-color: rgba(0,245,212,0.3); color: #00f5d4;
        }
        .notif-btn.accept:hover { background: rgba(0,245,212,0.2); border-color: rgba(0,245,212,0.6); }
        .notif-btn.decline {
          background: rgba(255,80,100,0.07); border-color: rgba(255,80,100,0.22); color: rgba(255,120,140,0.8);
        }
        .notif-btn.decline:hover { background: rgba(255,80,100,0.14); border-color: rgba(255,80,100,0.5); }

        .notif-response {
          padding: 12px 18px;
          font-size: 13px;
          color: rgba(140,175,210,0.6);
          display: flex; align-items: center; gap: 8px;
        }
        .notif-response svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

        .empty-notif {
          padding: 36px 18px; text-align: center;
          font-size: 13px; color: rgba(140,175,210,0.4);
        }
        .empty-notif svg { width: 28px; height: 28px; stroke: currentColor; fill: none; stroke-width: 1.5; display: block; margin: 0 auto 10px; opacity: 0.4; }
      `}</style>

      <div className="bell-wrap" ref={dropdownRef}>
        <button className="bell-btn" onClick={handleOpen}>
          <svg viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>

        {open && (
          <div className="bell-dropdown">
            <div className="dropdown-header">
              <span className="dropdown-title">Notifications</span>
              <span className="dropdown-count">{notifications.length} total</span>
            </div>

            <div className="notif-list">
              {notifications.length === 0
                ? (
                  <div className="empty-notif">
                    <svg viewBox="0 0 24 24">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    No notifications yet
                  </div>
                )
                : notifications.map(notif => {
                    const colors = ['#63caff','#00f5d4','#a78bfa','#f472b6','#fb923c']
                    const name = notif.invitation?.from?.username || notif.from || '?'
                    const bg = colors[name.charCodeAt(0) % colors.length]

                    return (
                      <div className="notif-item" key={notif.id}>
                        <div className="notif-top">
                          <div className="notif-avatar" style={{ background: `linear-gradient(135deg,${bg},${bg}99)` }}>
                            {name[0]}
                          </div>
                          <div className="notif-text">
                            <div className="notif-msg">{notif.message}</div>
                            <div className="notif-time">Just now</div>
                          </div>
                        </div>

                        {notif.type === 'invitation' && (
                          <div className="notif-actions">
                            <button className="notif-btn accept" onClick={() => handleAccept(notif)}>
                              Accept
                            </button>
                            <button className="notif-btn decline" onClick={() => handleDecline(notif)}>
                              Decline
                            </button>
                          </div>
                        )}

                        {notif.type === 'invitation_response' && (
                          <div className="notif-response">
                            {notif.action === 'accepted'
                              ? <><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Invitation accepted</>
                              : <><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Invitation declined</>
                            }
                          </div>
                        )}
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default NotificationBell