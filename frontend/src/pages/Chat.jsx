import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [activeSessions, setActiveSessions] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get('/contacts'),
      api.get('/messages/sessions/active/count'),
    ])
      .then(([c, s]) => {
        setContacts(c.data)
        setActiveSessions(s.data.count)
      })
      .catch(err => { console.error('Failed to load dashboard:', err) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold text-white mb-1">Hello, {user?.username} 👋</h1>
        <p className="text-gray-400 text-sm mb-8">Your messages are private and encrypted.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Contacts', value: contacts.length, path: '/contacts' },
            { label: 'Private Sessions', value: activeSessions, path: '/chat' },
          ].map(s => (
            <button key={s.label} onClick={() => navigate(s.path)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:border-gray-700 cursor-pointer w-full">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Contacts */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Contacts</h2>
          <button onClick={() => navigate('/contacts')} className="text-cyan-400 text-sm bg-transparent border-none cursor-pointer font-sans">View all</button>
        </div>

        {contacts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-3">No contacts yet</p>
            <button onClick={() => navigate('/contacts')}
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm border-none cursor-pointer font-sans">
              Find People
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contacts.slice(0, 8).map(c => (
              <button key={c._id} onClick={() => navigate('/chat/' + c._id)}
                className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5 hover:border-gray-700 cursor-pointer">
                <span className="w-2 h-2 rounded-full bg-gray-600" style={{ background: c.isOnline ? '#34d399' : undefined }} />
                <span className="text-white text-sm">{c.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}