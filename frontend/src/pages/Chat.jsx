import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import NotificationBell from '../components/NotificationBell'
import api from '../api/axios'

const Avatar = ({ name = '?', size = 38 }) => {
  const colors = ['#63caff', '#00f5d4', '#a78bfa', '#f472b6', '#fb923c']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${bg}, ${bg}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#080f1e',
      textTransform: 'uppercase', flexShrink: 0,
      boxShadow: `0 0 14px ${bg}35`,
    }}>{name[0]}</div>
  )
}

export default function Chat() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [pending, setPending] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p] = await Promise.all([
          api.get('/contacts'),
          api.get('/invitations/pending'),
        ])
        setContacts(c.data)
        setPending(p.data)
      } catch {}
    }
    load()
    setTimeout(() => setMounted(true), 50)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const quickActions = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      label: 'Contacts',
      desc: `${contacts.length} friend${contacts.length !== 1 ? 's' : ''} added`,
      color: '#63caff',
      path: '/contacts',
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
      label: 'Invitations',
      desc: pending.length > 0 ? `${pending.length} pending` : 'No pending invites',
      color: pending.length > 0 ? '#ff6b8a' : '#a78bfa',
      path: '/invitations',
      badge: pending.length,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
      label: 'Private Session',
      desc: 'Zero-trace messaging',
      color: '#00f5d4',
      path: '/invitations',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --bg-base: #080f1e;
          --bg-card: rgba(13,24,52,0.75);
          --bg-hover: rgba(99,202,255,0.05);
          --accent: #63caff;
          --cyan: #00f5d4;
          --text-1: #e8f4ff;
          --text-2: rgba(180,210,240,0.65);
          --text-3: rgba(140,175,210,0.4);
          --border: rgba(99,202,255,0.15);
          --font-brand: 'Orbitron', sans-serif;
          --font-ui: 'DM Sans', sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-base); font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,202,255,0.2); border-radius: 2px; }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 90% 55% at 50% -5%, rgba(99,202,255,0.1) 0%, transparent 60%),
            #080f1e;
          position: relative;
        }
        .page::before {
          content: ''; position: fixed; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(99,202,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,202,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .navbar {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px; height: 64px;
          background: rgba(8,15,30,0.9);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px);
        }
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .nav-logo {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(99,202,255,0.15), rgba(0,245,212,0.1));
          border: 1px solid rgba(99,202,255,0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .nav-logo svg { width: 18px; height: 18px; stroke: var(--accent); fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
        .nav-title { font-family: var(--font-brand); font-size: 15px; font-weight: 700; color: var(--text-1); letter-spacing: 1.5px; }
        .nav-title span { color: var(--accent); }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-link {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          background: transparent; color: var(--text-2);
          font-family: var(--font-ui); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .nav-link:hover { background: var(--bg-hover); color: var(--text-1); }
        .nav-link.active { background: rgba(99,202,255,0.1); color: var(--accent); }
        .nav-link svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
        .user-pill {
          display: flex; align-items: center; gap: 8px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 14px 5px 8px;
        }
        .user-pill span { font-size: 14px; font-weight: 500; color: var(--text-1); }
        .online-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--cyan); box-shadow: 0 0 8px var(--cyan);
          animation: pulse 2s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.6} }
        .logout-btn {
          display: flex; align-items: center; gap: 5px;
          background: transparent; border: 1px solid rgba(255,100,120,0.22);
          border-radius: 8px; color: rgba(255,130,145,0.65);
          padding: 7px 13px; font-family: var(--font-ui); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.25s;
        }
        .logout-btn:hover { border-color: rgba(255,100,120,0.5); color: #ff8090; background: rgba(255,80,100,0.07); }
        .logout-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

        .main {
          max-width: 900px; margin: 0 auto;
          padding: 44px 24px;
          position: relative; z-index: 10;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .main.visible { opacity: 1; transform: translateY(0); }

        /* hero */
        .hero {
          margin-bottom: 44px;
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 20px; flex-wrap: wrap;
        }
        .hero-eyebrow {
          font-size: 13px; color: var(--text-3); font-weight: 400;
          letter-spacing: 0.5px; margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .hero-eyebrow::before {
          content: ''; display: inline-block;
          width: 20px; height: 1px; background: var(--accent); opacity: 0.5;
        }
        .hero-name {
          font-family: var(--font-brand);
          font-size: 36px; font-weight: 700;
          color: var(--text-1); letter-spacing: 0.5px;
          line-height: 1.1; margin-bottom: 10px;
        }
        .hero-name span { color: var(--accent); }
        .hero-sub { font-size: 15px; color: var(--text-2); max-width: 380px; line-height: 1.6; }
        .hero-badge {
          display: flex; align-items: center; gap: 8px;
          background: rgba(0,245,212,0.07);
          border: 1px solid rgba(0,245,212,0.2);
          border-radius: 12px; padding: 14px 20px;
          font-size: 13px; color: var(--cyan); font-weight: 500; white-space: nowrap;
          align-self: flex-start;
        }
        .hero-badge svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

        /* action cards */
        .actions-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; margin-bottom: 40px;
        }
        .action-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 24px 22px;
          cursor: pointer; transition: all 0.25s;
          position: relative; overflow: hidden; backdrop-filter: blur(16px);
        }
        .action-card::before { content: ''; position: absolute; inset: 0; background: var(--bg-hover); opacity: 0; transition: opacity 0.25s; }
        .action-card:hover::before { opacity: 1; }
        .action-card:hover { border-color: rgba(99,202,255,0.32); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .action-card:active { transform: translateY(0); }

        .action-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px; position: relative;
        }
        .action-icon svg { width: 22px; height: 22px; }
        .card-badge {
          position: absolute; top: -5px; right: -5px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #ff6b8a; border: 2px solid #080f1e;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff;
        }
        .action-label { font-size: 16px; font-weight: 600; color: var(--text-1); margin-bottom: 4px; position: relative; }
        .action-desc  { font-size: 13px; color: var(--text-3); position: relative; }
        .action-arrow {
          position: absolute; top: 22px; right: 20px;
          width: 18px; height: 18px; stroke: var(--text-3); fill: none;
          stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
          transition: all 0.25s; opacity: 0;
        }
        .action-card:hover .action-arrow { opacity: 1; transform: translate(2px,-2px); }

        /* contacts section */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-size: 16px; font-weight: 600; color: var(--text-1); }
        .section-link { font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer; font-family: var(--font-ui); font-weight: 500; transition: color 0.2s; padding: 0; }
        .section-link:hover { color: #a8e6ff; }

        .contacts-grid { display: flex; gap: 12px; flex-wrap: wrap; }
        .contact-chip {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 40px; padding: 8px 16px 8px 8px;
          cursor: pointer; transition: all 0.2s;
        }
        .contact-chip:hover { border-color: rgba(99,202,255,0.35); background: rgba(99,202,255,0.06); transform: translateY(-1px); }
        .chip-name { font-size: 14px; font-weight: 500; color: var(--text-1); }
        .chip-status { font-size: 11px; color: var(--text-3); display: flex; align-items: center; gap: 4px; }
        .chip-dot { width: 5px; height: 5px; border-radius: 50%; }

        /* empty */
        .empty-box {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 48px 24px;
          text-align: center; backdrop-filter: blur(16px);
        }
        .empty-icon { width: 48px; height: 48px; margin: 0 auto 14px; background: rgba(99,202,255,0.06); border: 1px solid var(--border); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .empty-icon svg { width: 22px; height: 22px; stroke: var(--text-3); fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
        .empty-title { font-size: 15px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; }
        .empty-sub { font-size: 13px; color: var(--text-3); margin-bottom: 18px; }
        .empty-cta {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(99,202,255,0.1); border: 1px solid rgba(99,202,255,0.3);
          border-radius: 9px; color: var(--accent);
          padding: 9px 18px; font-family: var(--font-ui); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.22s;
        }
        .empty-cta:hover { background: rgba(99,202,255,0.18); border-color: rgba(99,202,255,0.6); }
        .empty-cta svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

        @media (max-width: 640px) {
          .actions-grid { grid-template-columns: 1fr; }
          .hero-name { font-size: 26px; }
          .navbar { padding: 0 16px; }
        }
      `}</style>

      <div className="page">
        <nav className="navbar">
          <div className="nav-left">
            <div className="nav-logo">
              <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            </div>
            <span className="nav-title">Privacy<span>Chat</span></span>
          </div>
          <div className="nav-right">
            <button className="nav-link active">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
            <button className="nav-link" onClick={() => navigate('/contacts')}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Contacts
            </button>
            <button className="nav-link" onClick={() => navigate('/invitations')}>
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Invitations
            </button>
            <NotificationBell />
            <div className="user-pill">
              <span className="online-dot" />
              <Avatar name={user?.username || '?'} size={26} />
              <span>{user?.username}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </nav>

        <main className={`main ${mounted ? 'visible' : ''}`}>

          {/* Hero */}
          <div className="hero">
            <div>
              <div className="hero-eyebrow">Welcome back</div>
              <div className="hero-name">Hello, <span>{user?.username}</span> 👋</div>
              <div className="hero-sub">
                Your messages are private and secure. Start a conversation or manage your contacts below.
              </div>
            </div>
            <div className="hero-badge">
              <span className="online-dot" />
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              End-to-end encrypted
            </div>
          </div>

          {/* Quick Actions */}
          <div className="actions-grid">
            {quickActions.map(a => (
              <div className="action-card" key={a.label} onClick={() => navigate(a.path)}>
                <svg className="action-arrow" viewBox="0 0 24 24">
                  <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                </svg>
                <div className="action-icon" style={{ background: `${a.color}18`, border: `1px solid ${a.color}28` }}>
                  <div style={{ color: a.color }}>{a.icon}</div>
                  {a.badge > 0 && <span className="card-badge">{a.badge}</span>}
                </div>
                <div className="action-label">{a.label}</div>
                <div className="action-desc">{a.desc}</div>
              </div>
            ))}
          </div>

          {/* Contacts */}
          <div className="section-header">
            <span className="section-title">Your Contacts</span>
            <button className="section-link" onClick={() => navigate('/contacts')}>View all →</button>
          </div>

          {contacts.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="empty-title">No contacts yet</div>
              <div className="empty-sub">Search for people and add them to start chatting</div>
              <button className="empty-cta" onClick={() => navigate('/contacts')}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Find People
              </button>
            </div>
          ) : (
            <div className="contacts-grid">
              {contacts.slice(0, 8).map(c => (
                <div className="contact-chip" key={c._id} onClick={() => navigate('/invitations')}>
                  <Avatar name={c.username} size={32} />
                  <div>
                    <div className="chip-name">{c.username}</div>
                    <div className="chip-status">
                      <span className="chip-dot" style={{
                        background: c.isOnline ? '#00f5d4' : 'rgba(255,255,255,0.15)',
                        boxShadow: c.isOnline ? '0 0 5px #00f5d4' : 'none'
                      }} />
                      {c.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
              {contacts.length > 8 && (
                <div className="contact-chip" onClick={() => navigate('/contacts')}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(99,202,255,0.1)', border:'1px solid rgba(99,202,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#63caff', fontWeight:600 }}>
                    +{contacts.length - 8}
                  </div>
                  <div>
                    <div className="chip-name">More</div>
                    <div className="chip-status">View all</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}