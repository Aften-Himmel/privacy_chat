import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const Particles = () => (
  <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    <style>{`
      @keyframes floatUp {
        0%   { transform: translateY(100vh) scale(0); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 0.6; }
        100% { transform: translateY(-10vh) scale(1); opacity: 0; }
      }
      .particle { position: absolute; bottom: -20px; border-radius: 50%; animation: floatUp linear infinite; }
    `}</style>
    {Array.from({ length: 18 }).map((_, i) => (
      <div key={i} className="particle" style={{
        left: `${(i * 5.8) % 100}%`,
        width: `${2 + (i % 3)}px`,
        height: `${2 + (i % 3)}px`,
        animationDuration: `${8 + (i * 1.3) % 10}s`,
        animationDelay: `${(i * 0.7) % 6}s`,
        background: i % 3 === 0 ? '#00f5d4' : '#63caff',
        opacity: 0.25,
      }} />
    ))}
  </div>
)

const strengthConfig = [
  { label: '', color: 'transparent' },
  { label: 'Weak',   color: '#ff6b8a' },
  { label: 'Fair',   color: '#ffaa44' },
  { label: 'Good',   color: '#ffe066' },
  { label: 'Strong', color: '#63caff' },
  { label: 'Great',  color: '#00f5d4' },
]

const calcStrength = pass => {
  let s = 0
  if (pass.length >= 6)  s++
  if (pass.length >= 10) s++
  if (/[A-Z]/.test(pass)) s++
  if (/[0-9]/.test(pass)) s++
  if (/[^A-Za-z0-9]/.test(pass)) s++
  return s
}

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' })
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [strength, setStrength] = useState(0)
  const [mounted, setMounted]   = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const handleChange = e => {
    const updated = { ...formData, [e.target.name]: e.target.value }
    setFormData(updated)
    if (e.target.name === 'password') setStrength(calcStrength(e.target.value))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/register', formData)
      login(res.data.user, res.data.token)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sc = strengthConfig[strength]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg-base: #080f1e;
          --bg-card: rgba(13, 24, 52, 0.82);
          --accent: #63caff;
          --accent-bright: #a8e6ff;
          --cyan: #00f5d4;
          --text-primary: #e8f4ff;
          --text-secondary: rgba(180, 210, 240, 0.65);
          --text-muted: rgba(140, 175, 210, 0.4);
          --border: rgba(99, 202, 255, 0.18);
          --border-focus: rgba(99, 202, 255, 0.55);
          --error: #ff6b8a;
          --error-bg: rgba(255, 80, 100, 0.08);
          --error-border: rgba(255, 80, 100, 0.3);
          --font-brand: 'Orbitron', sans-serif;
          --font-ui: 'DM Sans', sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-base); font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }

        .reg-root {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 70% 55% at 80% 0%, rgba(0,245,212,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 10% 100%, rgba(99,202,255,0.07) 0%, transparent 60%),
            #080f1e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }

        .reg-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(99,202,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,202,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .reg-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 44px 40px 40px;
          backdrop-filter: blur(24px);
          box-shadow: 0 0 0 1px rgba(99,202,255,0.05), 0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(99,202,255,0.05);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .reg-card.visible { opacity: 1; transform: translateY(0); }
        .reg-card::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--cyan), var(--accent), var(--cyan), transparent);
        }

        .live-badge {
          position: absolute;
          top: 20px; right: 20px;
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: var(--cyan);
          font-weight: 500; letter-spacing: 0.5px; opacity: 0.7;
        }
        .live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--cyan); box-shadow: 0 0 6px var(--cyan);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.6} }

        .brand { text-align: center; margin-bottom: 32px; }
        .brand-icon {
          width: 52px; height: 52px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, rgba(0,245,212,0.12), rgba(99,202,255,0.1));
          border: 1px solid rgba(0,245,212,0.3);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px rgba(0,245,212,0.12), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .brand-icon svg { width: 24px; height: 24px; stroke: var(--cyan); fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
        .brand-name { font-family: var(--font-brand); font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: 2px; margin-bottom: 6px; }
        .brand-name span { color: var(--accent); }
        .brand-tagline { font-size: 13px; color: var(--text-muted); }

        .section-heading { font-size: 22px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; letter-spacing: -0.3px; }
        .section-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 26px; }

        .error-msg {
          background: var(--error-bg); border: 1px solid var(--error-border);
          border-radius: 8px; padding: 11px 14px; color: var(--error);
          font-size: 13.5px; margin-bottom: 20px;
          display: flex; align-items: center; gap: 8px;
        }

        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 7px; letter-spacing: 0.2px; }

        .input-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          width: 17px; height: 17px;
          stroke: var(--text-muted); fill: none;
          stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round;
          pointer-events: none; transition: stroke 0.25s;
        }
        .input-wrap:focus-within .input-icon { stroke: var(--accent); }
        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 10px; color: var(--text-primary);
          padding: 13px 16px 13px 44px;
          font-family: var(--font-ui); font-size: 15px;
          outline: none; transition: all 0.25s; caret-color: var(--accent);
        }
        .form-input::placeholder { color: var(--text-muted); font-size: 14px; }
        .form-input:focus {
          border-color: var(--border-focus);
          background: rgba(99,202,255,0.05);
          box-shadow: 0 0 0 3px rgba(99,202,255,0.1);
        }

        /* password strength */
        .strength-row {
          margin-top: 8px;
          display: flex; align-items: center; gap: 10px;
        }
        .strength-bars {
          display: flex; gap: 4px; flex: 1;
        }
        .strength-bar {
          height: 3px; flex: 1;
          background: rgba(255,255,255,0.07);
          border-radius: 2px;
          transition: background 0.3s ease;
        }
        .strength-text {
          font-size: 12px; font-weight: 500;
          min-width: 44px; text-align: right;
          transition: color 0.3s;
        }

        /* features row */
        .features {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .feature-chip {
          display: flex; align-items: center; gap: 5px;
          background: rgba(99,202,255,0.06);
          border: 1px solid rgba(99,202,255,0.12);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 12px; color: var(--text-secondary);
        }
        .feature-chip svg { width: 12px; height: 12px; stroke: var(--accent); fill: none; stroke-width: 2; stroke-linecap: round; }

        .submit-btn {
          width: 100%; padding: 14px; margin-top: 8px;
          background: linear-gradient(135deg, rgba(0,245,212,0.15), rgba(99,202,255,0.12));
          border: 1px solid rgba(0,245,212,0.35);
          border-radius: 10px; color: #b0fff0;
          font-family: var(--font-ui); font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.25s;
          position: relative; overflow: hidden;
        }
        .submit-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,245,212,0.12), rgba(99,202,255,0.08));
          opacity: 0; transition: opacity 0.25s;
        }
        .submit-btn:hover:not(:disabled)::before { opacity: 1; }
        .submit-btn:hover:not(:disabled) {
          border-color: rgba(0,245,212,0.6);
          box-shadow: 0 0 24px rgba(0,245,212,0.18), 0 4px 16px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-inner { position: relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:8px; }
        .spinner { width:16px; height:16px; border: 2px solid rgba(99,202,255,0.25); border-top-color: var(--accent); border-radius:50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .divider { display:flex; align-items:center; gap:12px; margin: 24px 0 18px; }
        .divider-line { flex:1; height:1px; background: var(--border); }
        .divider-text { font-size:12px; color:var(--text-muted); white-space:nowrap; }

        .card-footer { text-align:center; font-size:14px; color:var(--text-secondary); }
        .card-footer a { color:var(--accent); text-decoration:none; font-weight:500; transition:color 0.2s; }
        .card-footer a:hover { color:var(--accent-bright); }
      `}</style>

      <div className="reg-root">
        <Particles />
        <div className={`reg-card ${mounted ? 'visible' : ''}`}>
          <div className="live-badge"><span className="live-dot" />Encrypted</div>

          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div className="brand-name">Privacy<span>Chat</span></div>
            <div className="brand-tagline">End-to-end encrypted messaging</div>
          </div>

          <div className="section-heading">Create an account</div>
          <div className="section-sub">Start chatting privately in seconds</div>

          <div className="features">
            {[
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'E2E Encrypted' },
              { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', label: 'Private Sessions' },
              { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', label: 'No Tracking' },
            ].map(f => (
              <div className="feature-chip" key={f.label}>
                <svg viewBox="0 0 24 24"><path d={f.icon}/></svg>
                {f.label}
              </div>
            ))}
          </div>

          {error && (
            <div className="error-msg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input className="form-input" type="text" name="username"
                  value={formData.username} onChange={handleChange}
                  placeholder="e.g. john_doe" required autoComplete="username" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input className="form-input" type="email" name="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24">
                  <rect x="5" y="11" width="14" height="10" rx="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
                <input className="form-input" type="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Minimum 6 characters" required />
              </div>
              {formData.password.length > 0 && (
                <div className="strength-row">
                  <div className="strength-bars">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="strength-bar"
                        style={{ background: i <= strength ? sc.color : undefined }} />
                    ))}
                  </div>
                  <span className="strength-text" style={{ color: sc.color }}>{sc.label}</span>
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              <span className="btn-inner">
                {loading ? <><div className="spinner" />Creating account...</> : 'Create Account'}
              </span>
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">Already have an account?</span>
            <div className="divider-line" />
          </div>

          <div className="card-footer">
            <Link to="/login">Sign in instead →</Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default Register