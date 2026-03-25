import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const link = (path) => `text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer border-none font-sans ${pathname === path ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400 hover:text-white'}`

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="text-white font-bold text-sm">Privacy<span className="text-cyan-400">Chat</span></span>
        <div className="flex items-center gap-1">
          <button className={link('/chat')} onClick={() => navigate('/chat')}>Dashboard</button>
          <button className={link('/contacts')} onClick={() => navigate('/contacts')}>Contacts</button>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-gray-500 hover:text-red-400 bg-transparent border-none cursor-pointer font-sans">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}