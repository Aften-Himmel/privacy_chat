import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'

const Avatar = ({ name = '?', size = 38 }) => {
  const colors = ['#63caff', '#00f5d4', '#a78bfa', '#f472b6', '#fb923c']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg,${bg},${bg}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#080f1e',
      textTransform: 'uppercase', flexShrink: 0,
      boxShadow: `0 0 12px ${bg}40`,
    }}>{name[0]}</div>
  )
}

export default function Invitations() {
  const { user, logout }   = useAuth()
  const { notifications }  = useSocket()
  const navigate           = useNavigate()

  const [pending,   setPending]   = useState([])
  const [sent,      setSent]      = useState([])
  const [contacts,  setContacts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(null)
  const [responding,setResponding]= useState(null)
  const [activeTab, setActiveTab] = useState('received')
  const [toast,     setToast]     = useState(null)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => {
    fetchAll()
    setTimeout(() => setMounted(true), 50)
  }, [])

  // Refresh pending invitations when a new notification arrives
  useEffect(() => {
    const hasInvite = notifications.some(n => n.type === 'invitation')
    if (hasInvite) fetchAll()
  }, [notifications])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pendingRes, sentRes, contactsRes] = await Promise.all([
        api.get('/invitations/pending'),
        api.get('/invitations/sent'),
        api.get('/contacts'),
      ])
      setPending(pendingRes.data)
      setSent(sentRes.data)
      setContacts(contactsRes.data)
    } catch {
      showToast('error', 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSend = async (toUserId, type = 'normal') => {
    setSending(toUserId)
    try {
      await api.post('/invitations/send', { toUserId, type })
      showToast('success', 'Invitation sent!')
      fetchAll()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setSending(null)
    }
  }

  const handleRespond = async (inviteId, action) => {
    setResponding(inviteId)
    try {
      await api.patch(`/invitations/${inviteId}/respond`, { action })
      showToast('success', action === 'accepted' ? 'Invitation accepted!' : 'Invitation declined')
      fetchAll()
    } catch {
      showToast('error', 'Failed to respond')
    } finally {
      setResponding(null)
    }
  }

  const sentIds = new Set(sent.filter(i => i.status === 'pending').map(i => i.to._id))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --bg-base:#080f1e; --bg-card:rgba(13,24,52,0.75); --bg-hover:rgba(99,202,255,0.05);
          --accent:#63caff; --cyan:#00f5d4; --purple:#a78bfa;
          --text-1:#e8f4ff; --text-2:rgba(180,210,240,0.65); --text-3:rgba(140,175,210,0.4);
          --border:rgba(99,202,255,0.15); --border-h:rgba(99,202,255,0.35);
          --font-brand:'Orbitron',sans-serif; --font-ui:'DM Sans',sans-serif;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg-base);font-family:var(--font-ui);-webkit-font-smoothing:antialiased;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(99,202,255,.2);border-radius:2px}

        .page{min-height:100vh;background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(99,202,255,.09) 0%,transparent 60%),#080f1e;position:relative;}
        .page::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(99,202,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,202,255,.035) 1px,transparent 1px);background-size:48px 48px;}

        .navbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:64px;background:rgba(8,15,30,.9);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);}
        .nav-left{display:flex;align-items:center;gap:12px;}
        .nav-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(99,202,255,.15),rgba(0,245,212,.1));border:1px solid rgba(99,202,255,.25);display:flex;align-items:center;justify-content:center;}
        .nav-logo svg{width:18px;height:18px;stroke:var(--accent);fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;}
        .nav-title{font-family:var(--font-brand);font-size:15px;font-weight:700;color:var(--text-1);letter-spacing:1.5px;}
        .nav-title span{color:var(--accent);}
        .nav-right{display:flex;align-items:center;gap:10px;}
        .nav-link{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:none;background:transparent;color:var(--text-2);font-family:var(--font-ui);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
        .nav-link:hover{background:var(--bg-hover);color:var(--text-1);}
        .nav-link.active{background:rgba(99,202,255,.1);color:var(--accent);}
        .nav-link svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;}
        .user-pill{display:flex;align-items:center;gap:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:5px 14px 5px 8px;}
        .user-pill span{font-size:14px;font-weight:500;color:var(--text-1);}
        .logout-btn{display:flex;align-items:center;gap:5px;background:transparent;border:1px solid rgba(255,100,120,.22);border-radius:8px;color:rgba(255,130,145,.65);padding:7px 13px;font-family:var(--font-ui);font-size:13px;cursor:pointer;transition:all .25s;}
        .logout-btn:hover{border-color:rgba(255,100,120,.5);color:#ff8090;background:rgba(255,80,100,.07);}
        .logout-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

        .layout{max-width:780px;margin:0 auto;padding:36px 24px;position:relative;z-index:10;opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease;}
        .layout.visible{opacity:1;transform:translateY(0);}

        .page-title{font-size:26px;font-weight:600;color:var(--text-1);margin-bottom:5px;}
        .page-sub{font-size:14px;color:var(--text-2);margin-bottom:28px;}

        .tabs{display:flex;gap:4px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:4px;margin-bottom:24px;width:fit-content;}
        .tab-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:9px;border:none;font-family:var(--font-ui);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;color:var(--text-3);background:transparent;}
        .tab-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;}
        .tab-btn:hover{color:var(--text-2);}
        .tab-btn.active{background:rgba(99,202,255,.12);color:var(--accent);box-shadow:0 0 0 1px rgba(99,202,255,.2);}
        .tab-count{background:rgba(99,202,255,.15);color:var(--accent);font-size:11px;font-weight:600;padding:1px 7px;border-radius:10px;}
        .tab-count.red{background:rgba(255,107,138,.15);color:#ff6b8a;}

        .card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;backdrop-filter:blur(16px);}

        .inv-row{display:flex;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(99,202,255,.06);transition:background .2s;}
        .inv-row:last-child{border-bottom:none;}
        .inv-row:hover{background:var(--bg-hover);}
        .inv-info{flex:1;min-width:0;}
        .inv-name{font-size:15px;font-weight:600;color:var(--text-1);margin-bottom:3px;}
        .inv-meta{font-size:13px;color:var(--text-3);}

        .status-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;border:1px solid;}
        .status-chip.pending{background:rgba(99,202,255,.08);border-color:rgba(99,202,255,.2);color:var(--accent);}
        .status-chip.accepted{background:rgba(0,245,212,.08);border-color:rgba(0,245,212,.2);color:var(--cyan);}
        .status-chip.declined{background:rgba(255,80,100,.07);border-color:rgba(255,80,100,.2);color:#ff8090;}

        .btn-row{display:flex;gap:8px;flex-shrink:0;}
        .btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-family:var(--font-ui);font-size:13px;font-weight:500;cursor:pointer;transition:all .22s;border:1px solid;white-space:nowrap;}
        .btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
        .btn:disabled{opacity:.45;cursor:not-allowed;}
        .btn-accept{background:rgba(0,245,212,.1);border-color:rgba(0,245,212,.3);color:var(--cyan);}
        .btn-accept:hover:not(:disabled){background:rgba(0,245,212,.18);border-color:rgba(0,245,212,.6);box-shadow:0 0 16px rgba(0,245,212,.15);}
        .btn-decline{background:rgba(255,80,100,.07);border-color:rgba(255,80,100,.22);color:rgba(255,120,140,.8);}
        .btn-decline:hover:not(:disabled){background:rgba(255,80,100,.14);border-color:rgba(255,80,100,.5);color:#ff8090;}
        .btn-invite{background:rgba(99,202,255,.1);border-color:rgba(99,202,255,.3);color:var(--accent);}
        .btn-invite:hover:not(:disabled){background:rgba(99,202,255,.18);border-color:rgba(99,202,255,.6);box-shadow:0 0 16px rgba(99,202,255,.15);}
        .btn-sent{background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.2);color:var(--purple);cursor:default;}
        .btn-private{background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.3);color:var(--purple);}
        .btn-private:hover:not(:disabled){background:rgba(167,139,250,.18);border-color:rgba(167,139,250,.55);}

        .empty{padding:52px 24px;text-align:center;}
        .empty-icon{width:52px;height:52px;margin:0 auto 14px;background:rgba(99,202,255,.06);border:1px solid var(--border);border-radius:14px;display:flex;align-items:center;justify-content:center;}
        .empty-icon svg{width:24px;height:24px;stroke:var(--text-3);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
        .empty-title{font-size:15px;font-weight:600;color:var(--text-2);margin-bottom:5px;}
        .empty-sub{font-size:13px;color:var(--text-3);}

        .skel-row{display:flex;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(99,202,255,.05);}
        .skel-circle{width:42px;height:42px;border-radius:50%;background:rgba(99,202,255,.07);flex-shrink:0;animation:shimmer 1.5s ease-in-out infinite;}
        .skel-lines{flex:1;display:flex;flex-direction:column;gap:8px;}
        .skel-line{height:10px;border-radius:5px;background:rgba(99,202,255,.06);animation:shimmer 1.5s ease-in-out infinite;}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.9}}

        .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:999;padding:12px 20px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;backdrop-filter:blur(16px);animation:slideUp .3s ease;white-space:nowrap;}
        @keyframes slideUp{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
        .toast.success{background:rgba(0,245,212,.12);border:1px solid rgba(0,245,212,.3);color:var(--cyan);}
        .toast.error{background:rgba(255,80,100,.1);border:1px solid rgba(255,80,100,.3);color:#ff8090;}
        .toast svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

        .section-label{font-size:12px;font-weight:600;color:var(--text-3);letter-spacing:.5px;text-transform:uppercase;padding:14px 20px 8px;border-bottom:1px solid rgba(99,202,255,.06);}
      `}</style>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          {toast.message}
        </div>
      )}

      <div className="page">
        <nav className="navbar">
          <div className="nav-left">
            <div className="nav-logo">
              <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            </div>
            <span className="nav-title">Privacy<span>Chat</span></span>
          </div>
          <div className="nav-right">
            <button className="nav-link" onClick={() => navigate('/chat')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
            <button className="nav-link" onClick={() => navigate('/contacts')}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Contacts
            </button>
            <button className="nav-link active">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Invitations
            </button>
            <div className="user-pill">
              <Avatar name={user?.username || '?'} size={26} />
              <span>{user?.username}</span>
            </div>
            <button className="logout-btn" onClick={() => { logout(); navigate('/login') }}>
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </nav>

        <div className={`layout ${mounted ? 'visible' : ''}`}>
          <h1 className="page-title">Invitations</h1>
          <p className="page-sub">Send chat invitations to your contacts and respond to incoming ones</p>

          <div className="tabs">
            <button className={`tab-btn ${activeTab==='received'?'active':''}`} onClick={()=>setActiveTab('received')}>
              <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z"/></svg>
              Received
              {pending.length > 0 && <span className="tab-count red">{pending.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab==='sent'?'active':''}`} onClick={()=>setActiveTab('sent')}>
              <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Sent
              {sent.length > 0 && <span className="tab-count">{sent.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab==='invite'?'active':''}`} onClick={()=>setActiveTab('invite')}>
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Invitation
            </button>
          </div>

          {/* RECEIVED */}
          {activeTab === 'received' && (
            <div className="card">
              {loading
                ? Array.from({length:3}).map((_,i)=>(
                    <div className="skel-row" key={i}>
                      <div className="skel-circle"/>
                      <div className="skel-lines">
                        <div className="skel-line" style={{width:'35%'}}/>
                        <div className="skel-line" style={{width:'55%'}}/>
                      </div>
                    </div>
                  ))
                : pending.length === 0
                  ? <div className="empty">
                      <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                      <div className="empty-title">No pending invitations</div>
                      <div className="empty-sub">When someone invites you to chat, it will appear here</div>
                    </div>
                  : pending.map(inv => (
                      <div className="inv-row" key={inv._id}>
                        <Avatar name={inv.from.username} size={42} />
                        <div className="inv-info">
                          <div className="inv-name">{inv.from.username}</div>
                          <div className="inv-meta">Wants to {inv.type === 'private' ? 'start a private session' : 'chat with you'}</div>
                        </div>
                        <div className="btn-row">
                          <button className="btn btn-accept"
                            disabled={responding === inv._id}
                            onClick={() => handleRespond(inv._id, 'accepted')}>
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            {responding === inv._id ? 'Accepting…' : 'Accept'}
                          </button>
                          <button className="btn btn-decline"
                            disabled={responding === inv._id}
                            onClick={() => handleRespond(inv._id, 'declined')}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
              }
            </div>
          )}

          {/* SENT */}
          {activeTab === 'sent' && (
            <div className="card">
              {sent.length === 0
                ? <div className="empty">
                    <div className="empty-icon"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
                    <div className="empty-title">No sent invitations</div>
                    <div className="empty-sub">Go to "New Invitation" to invite a contact</div>
                  </div>
                : sent.map(inv => (
                    <div className="inv-row" key={inv._id}>
                      <Avatar name={inv.to.username} size={42} />
                      <div className="inv-info">
                        <div className="inv-name">{inv.to.username}</div>
                        <div className="inv-meta">{inv.type === 'private' ? 'Private session invite' : 'Normal chat invite'}</div>
                      </div>
                      <span className={`status-chip ${inv.status}`}>{inv.status}</span>
                    </div>
                  ))
              }
            </div>
          )}

          {/* NEW INVITATION */}
          {activeTab === 'invite' && (
            <div className="card">
              {contacts.length === 0
                ? <div className="empty">
                    <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                    <div className="empty-title">No contacts yet</div>
                    <div className="empty-sub">Add contacts first before sending invitations</div>
                  </div>
                : <>
                    <div className="section-label">Choose a contact to invite</div>
                    {contacts.map(contact => (
                      <div className="inv-row" key={contact._id}>
                        <Avatar name={contact.username} size={42} />
                        <div className="inv-info">
                          <div className="inv-name">{contact.username}</div>
                          <div className="inv-meta">{contact.email}</div>
                        </div>
                        <div className="btn-row">
                          {sentIds.has(contact._id)
                            ? <button className="btn btn-sent" disabled>
                                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                Invited
                              </button>
                            : <>
                                <button className="btn btn-invite"
                                  disabled={sending === contact._id}
                                  onClick={() => handleSend(contact._id, 'normal')}>
                                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  {sending === contact._id ? 'Sending…' : 'Invite to Chat'}
                                </button>
                                <button className="btn btn-private"
                                  disabled={sending === contact._id}
                                  onClick={() => handleSend(contact._id, 'private')}>
                                  <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                                  Private
                                </button>
                              </>
                          }
                        </div>
                      </div>
                    ))}
                  </>
              }
            </div>
          )}
        </div>
      </div>
    </>
  )
}