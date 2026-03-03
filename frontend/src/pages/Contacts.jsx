import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ── small reusable avatar ──────────────────────────────────────────────────
const Avatar = ({ name = '?', size = 38, color = '#63caff' }) => {
  const colors = ['#63caff', '#00f5d4', '#a78bfa', '#f472b6', '#fb923c']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${bg}, ${bg}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#080f1e',
      textTransform: 'uppercase', flexShrink: 0,
      boxShadow: `0 0 12px ${bg}40`,
    }}>
      {name[0]}
    </div>
  )
}

// ── online indicator dot ───────────────────────────────────────────────────
const OnlineDot = ({ online }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: online ? '#00f5d4' : 'rgba(255,255,255,0.15)',
    boxShadow: online ? '0 0 6px #00f5d4' : 'none',
    flexShrink: 0,
  }} />
)

// ── debounce hook ──────────────────────────────────────────────────────────
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ══════════════════════════════════════════════════════════════════════════
export default function Contacts() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [contacts,       setContacts]       = useState([])
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [loadingSearch,  setLoadingSearch]  = useState(false)
  const [loadingContacts,setLoadingContacts]= useState(true)
  const [addingId,       setAddingId]       = useState(null)
  const [removingId,     setRemovingId]     = useState(null)
  const [notification,   setNotification]   = useState(null) // {type, message}
  const [activeTab,      setActiveTab]      = useState('contacts') // contacts | search
  const [mounted,        setMounted]        = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 400)

  // ── fetch my contacts on load ────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const res = await api.get('/contacts')
      setContacts(res.data)
    } catch {
      showNotification('error', 'Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
    setTimeout(() => setMounted(true), 50)
  }, [fetchContacts])

  // ── search whenever debounced query changes ──────────────────────────
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const search = async () => {
      setLoadingSearch(true)
      try {
        const res = await api.get(`/contacts/search?username=${debouncedQuery.trim()}`)
        setSearchResults(res.data)
      } catch {
        setSearchResults([])
      } finally {
        setLoadingSearch(false)
      }
    }
    search()
  }, [debouncedQuery])

  // ── helpers ──────────────────────────────────────────────────────────
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3500)
  }

  const isContact = (id) => contacts.some(c => c._id === id)

  const handleAdd = async (userId) => {
    setAddingId(userId)
    try {
      await api.post(`/contacts/add/${userId}`)
      showNotification('success', 'Contact added successfully!')
      fetchContacts()
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to add contact')
    } finally {
      setAddingId(null)
    }
  }

  const handleRemove = async (userId) => {
    setRemovingId(userId)
    try {
      await api.delete(`/contacts/remove/${userId}`)
      showNotification('success', 'Contact removed')
      fetchContacts()
    } catch {
      showNotification('error', 'Failed to remove contact')
    } finally {
      setRemovingId(null)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg-base:    #080f1e;
          --bg-card:    rgba(13,24,52,0.75);
          --bg-hover:   rgba(99,202,255,0.05);
          --accent:     #63caff;
          --accent-b:   #a8e6ff;
          --cyan:       #00f5d4;
          --purple:     #a78bfa;
          --text-1:     #e8f4ff;
          --text-2:     rgba(180,210,240,0.65);
          --text-3:     rgba(140,175,210,0.4);
          --border:     rgba(99,202,255,0.15);
          --border-h:   rgba(99,202,255,0.35);
          --font-brand: 'Orbitron', sans-serif;
          --font-ui:    'DM Sans', sans-serif;
        }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background: var(--bg-base); font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,202,255,0.2); border-radius:2px; }

        /* ── page ── */
        .page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,202,255,0.09) 0%, transparent 60%),
            #080f1e;
          position: relative;
        }
        .page::before {
          content:''; position:fixed; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(99,202,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,202,255,0.035) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ── navbar ── */
        .navbar {
          position:sticky; top:0; z-index:50;
          display:flex; align-items:center; justify-content:space-between;
          padding: 0 28px; height:64px;
          background: rgba(8,15,30,0.9);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px);
        }
        .nav-left  { display:flex; align-items:center; gap:12px; }
        .nav-logo  {
          width:36px; height:36px; border-radius:10px;
          background: linear-gradient(135deg,rgba(99,202,255,.15),rgba(0,245,212,.1));
          border: 1px solid rgba(99,202,255,.25);
          display:flex; align-items:center; justify-content:center;
        }
        .nav-logo svg { width:18px; height:18px; stroke:var(--accent); fill:none; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
        .nav-title { font-family:var(--font-brand); font-size:15px; font-weight:700; color:var(--text-1); letter-spacing:1.5px; }
        .nav-title span { color:var(--accent); }
        .nav-right { display:flex; align-items:center; gap:10px; }
        .nav-link {
          display:flex; align-items:center; gap:6px;
          padding:7px 14px; border-radius:8px; border:none;
          background:transparent; color:var(--text-2); font-family:var(--font-ui);
          font-size:13px; font-weight:500; cursor:pointer; transition:all .2s;
        }
        .nav-link:hover { background:var(--bg-hover); color:var(--text-1); }
        .nav-link svg { width:15px; height:15px; stroke:currentColor; fill:none; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
        .nav-link.active { background:rgba(99,202,255,.1); color:var(--accent); }
        .user-pill {
          display:flex; align-items:center; gap:8px;
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:20px; padding:5px 14px 5px 8px;
        }
        .user-pill span { font-size:14px; font-weight:500; color:var(--text-1); }
        .logout-btn {
          display:flex; align-items:center; gap:5px;
          background:transparent; border:1px solid rgba(255,100,120,.22);
          border-radius:8px; color:rgba(255,130,145,.65);
          padding:7px 13px; font-family:var(--font-ui); font-size:13px; font-weight:500;
          cursor:pointer; transition:all .25s;
        }
        .logout-btn:hover { border-color:rgba(255,100,120,.5); color:#ff8090; background:rgba(255,80,100,.07); }
        .logout-btn svg { width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

        /* ── layout ── */
        .layout {
          max-width: 860px; margin: 0 auto;
          padding: 36px 24px;
          position:relative; z-index:10;
          opacity:0; transform:translateY(20px);
          transition: opacity .5s ease, transform .5s ease;
        }
        .layout.visible { opacity:1; transform:translateY(0); }

        /* ── page header ── */
        .page-header { margin-bottom:28px; }
        .page-title { font-size:26px; font-weight:600; color:var(--text-1); letter-spacing:-.3px; margin-bottom:5px; }
        .page-sub { font-size:14px; color:var(--text-2); }

        /* ── tabs ── */
        .tabs {
          display:flex; gap:4px;
          background:rgba(255,255,255,0.03);
          border:1px solid var(--border);
          border-radius:12px; padding:4px;
          margin-bottom:24px; width:fit-content;
        }
        .tab-btn {
          display:flex; align-items:center; gap:7px;
          padding:9px 18px; border-radius:9px; border:none;
          font-family:var(--font-ui); font-size:14px; font-weight:500;
          cursor:pointer; transition:all .2s; color:var(--text-3);
          background:transparent;
        }
        .tab-btn svg { width:15px; height:15px; stroke:currentColor; fill:none; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
        .tab-btn:hover { color:var(--text-2); }
        .tab-btn.active {
          background:rgba(99,202,255,.12);
          color:var(--accent);
          box-shadow: 0 0 0 1px rgba(99,202,255,.2);
        }
        .tab-count {
          background:rgba(99,202,255,.15); color:var(--accent);
          font-size:11px; font-weight:600; padding:1px 7px;
          border-radius:10px; min-width:20px; text-align:center;
        }

        /* ── search box ── */
        .search-wrap {
          position:relative; margin-bottom:20px;
        }
        .search-icon {
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          width:18px; height:18px; stroke:var(--text-3); fill:none;
          stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round;
          pointer-events:none; transition:stroke .25s;
        }
        .search-wrap:focus-within .search-icon { stroke:var(--accent); }
        .search-input {
          width:100%;
          background:rgba(255,255,255,.04); border:1px solid var(--border);
          border-radius:12px; color:var(--text-1);
          padding:14px 16px 14px 46px;
          font-family:var(--font-ui); font-size:15px; outline:none;
          transition:all .25s; caret-color:var(--accent);
        }
        .search-input::placeholder { color:var(--text-3); }
        .search-input:focus {
          border-color:var(--border-h);
          background:rgba(99,202,255,.05);
          box-shadow:0 0 0 3px rgba(99,202,255,.08);
        }
        .search-spinner {
          position:absolute; right:14px; top:50%; transform:translateY(-50%);
          width:16px; height:16px;
          border:2px solid rgba(99,202,255,.2); border-top-color:var(--accent);
          border-radius:50%; animation:spin .7s linear infinite;
        }
        @keyframes spin { to { transform:translateY(-50%) rotate(360deg); } }
        .search-hint {
          font-size:13px; color:var(--text-3); text-align:center; padding:12px 0;
        }

        /* ── card ── */
        .card {
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:16px; overflow:hidden;
          backdrop-filter:blur(16px);
        }

        /* ── user row ── */
        .user-row {
          display:flex; align-items:center; gap:14px;
          padding:16px 20px;
          border-bottom:1px solid rgba(99,202,255,.06);
          transition:background .2s;
        }
        .user-row:last-child { border-bottom:none; }
        .user-row:hover { background:var(--bg-hover); }
        .user-info { flex:1; min-width:0; }
        .user-name  { font-size:15px; font-weight:600; color:var(--text-1); margin-bottom:3px; }
        .user-meta  { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-3); }
        .user-email { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; }

        /* ── buttons ── */
        .btn {
          display:flex; align-items:center; gap:6px;
          padding:8px 16px; border-radius:9px;
          font-family:var(--font-ui); font-size:13px; font-weight:500;
          cursor:pointer; transition:all .22s; white-space:nowrap; border:1px solid;
          flex-shrink:0;
        }
        .btn svg { width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .btn:disabled { opacity:.45; cursor:not-allowed; }

        .btn-add {
          background:rgba(99,202,255,.1); border-color:rgba(99,202,255,.3); color:var(--accent);
        }
        .btn-add:hover:not(:disabled) { background:rgba(99,202,255,.18); border-color:rgba(99,202,255,.6); box-shadow:0 0 16px rgba(99,202,255,.15); }

        .btn-added {
          background:rgba(0,245,212,.08); border-color:rgba(0,245,212,.25); color:var(--cyan); cursor:default;
        }

        .btn-remove {
          background:rgba(255,80,100,.07); border-color:rgba(255,80,100,.22); color:rgba(255,110,130,.7);
        }
        .btn-remove:hover:not(:disabled) { background:rgba(255,80,100,.14); border-color:rgba(255,80,100,.5); color:#ff8090; }

        .btn-msg {
          background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.3); color:var(--purple);
        }
        .btn-msg:hover:not(:disabled) { background:rgba(167,139,250,.18); border-color:rgba(167,139,250,.55); }

        /* ── empty state ── */
        .empty {
          padding:56px 24px; text-align:center;
        }
        .empty-icon {
          width:56px; height:56px; margin:0 auto 16px;
          background:rgba(99,202,255,.06); border:1px solid var(--border);
          border-radius:16px; display:flex; align-items:center; justify-content:center;
        }
        .empty-icon svg { width:26px; height:26px; stroke:var(--text-3); fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
        .empty-title { font-size:16px; font-weight:600; color:var(--text-2); margin-bottom:6px; }
        .empty-sub   { font-size:14px; color:var(--text-3); }

        /* ── skeleton loader ── */
        .skeleton { animation:shimmer 1.5s ease-in-out infinite; }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
        .skel-row { display:flex; align-items:center; gap:14px; padding:16px 20px; border-bottom:1px solid rgba(99,202,255,.06); }
        .skel-circle { width:38px; height:38px; border-radius:50%; background:rgba(99,202,255,.08); flex-shrink:0; }
        .skel-lines { flex:1; display:flex; flex-direction:column; gap:7px; }
        .skel-line { height:10px; border-radius:5px; background:rgba(99,202,255,.07); }

        /* ── notification toast ── */
        .toast {
          position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
          z-index:999; padding:12px 20px; border-radius:12px;
          display:flex; align-items:center; gap:10px;
          font-size:14px; font-weight:500;
          backdrop-filter:blur(16px);
          animation:slideUp .3s ease;
          white-space:nowrap;
        }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }
        .toast.success { background:rgba(0,245,212,.12); border:1px solid rgba(0,245,212,.3); color:var(--cyan); }
        .toast.error   { background:rgba(255,80,100,.1);  border:1px solid rgba(255,80,100,.3); color:#ff8090; }
        .toast svg { width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      `}</style>

      {/* Toast */}
      {notification && (
        <div className={`toast ${notification.type}`}>
          {notification.type === 'success'
            ? <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          {notification.message}
        </div>
      )}

      <div className="page">
        {/* Navbar */}
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
            <button className="nav-link active">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Contacts
            </button>
            <div className="user-pill">
              <Avatar name={user?.username || '?'} size={26} />
              <span>{user?.username}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </nav>

        {/* Main */}
        <div className={`layout ${mounted ? 'visible' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">Contacts</h1>
            <p className="page-sub">Manage your friends and start private conversations</p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              My Contacts
              <span className="tab-count">{contacts.length}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Find People
            </button>
          </div>

          {/* ── MY CONTACTS TAB ── */}
          {activeTab === 'contacts' && (
            <div className="card">
              {loadingContacts
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div className="skel-row skeleton" key={i}>
                      <div className="skel-circle" />
                      <div className="skel-lines">
                        <div className="skel-line" style={{ width: '40%' }} />
                        <div className="skel-line" style={{ width: '60%' }} />
                      </div>
                    </div>
                  ))
                : contacts.length === 0
                  ? (
                    <div className="empty">
                      <div className="empty-icon">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div className="empty-title">No contacts yet</div>
                      <div className="empty-sub">Switch to "Find People" to search and add friends</div>
                    </div>
                  )
                  : contacts.map(contact => (
                    <div className="user-row" key={contact._id}>
                      <Avatar name={contact.username} size={40} />
                      <div className="user-info">
                        <div className="user-name">{contact.username}</div>
                        <div className="user-meta">
                          <OnlineDot online={contact.isOnline} />
                          <span>{contact.isOnline ? 'Online' : 'Offline'}</span>
                          <span>·</span>
                          <span className="user-email">{contact.email}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-msg"
                        onClick={() => navigate('/chat')}
                      >
                        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Message
                      </button>
                      <button
                        className="btn btn-remove"
                        onClick={() => handleRemove(contact._id)}
                        disabled={removingId === contact._id}
                      >
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        {removingId === contact._id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  ))
              }
            </div>
          )}

          {/* ── FIND PEOPLE TAB ── */}
          {activeTab === 'search' && (
            <>
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search by username…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {loadingSearch && <div className="search-spinner" />}
              </div>

              {searchQuery.trim().length < 2 && (
                <div className="search-hint">Type at least 2 characters to search</div>
              )}

              {!loadingSearch && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="card">
                  <div className="empty">
                    <div className="empty-icon">
                      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <div className="empty-title">No users found</div>
                    <div className="empty-sub">Try a different username</div>
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="card">
                  {searchResults.map(result => {
                    const already = isContact(result._id)
                    return (
                      <div className="user-row" key={result._id}>
                        <Avatar name={result.username} size={40} />
                        <div className="user-info">
                          <div className="user-name">{result.username}</div>
                          <div className="user-meta">
                            <OnlineDot online={result.isOnline} />
                            <span>{result.isOnline ? 'Online' : 'Offline'}</span>
                            <span>·</span>
                            <span className="user-email">{result.email}</span>
                          </div>
                        </div>
                        {already
                          ? <button className="btn btn-added" disabled>
                              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              Added
                            </button>
                          : <button
                              className="btn btn-add"
                              onClick={() => handleAdd(result._id)}
                              disabled={addingId === result._id}
                            >
                              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              {addingId === result._id ? 'Adding…' : 'Add Contact'}
                            </button>
                        }
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}