import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const statusColor = { pending: 'text-cyan-400', accepted: 'text-green-400', declined: 'text-red-400' }

export default function Invitations() {
  const { notifications } = useSocket()
  const navigate = useNavigate()
  const [pending, setPending] = useState([])
  const [sent, setSent] = useState([])
  const [contacts, setContacts] = useState([])
  const [tab, setTab] = useState('received')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [p, s, c] = await Promise.all([
        api.get('/invitations/pending'),
        api.get('/invitations/sent'),
        api.get('/contacts'),
      ])
      setPending(p.data); setSent(s.data); setContacts(c.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (notifications.some(n => n.type === 'invitation')) fetchAll() }, [notifications])

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const respond = async (id, action) => {
    try { await api.patch(`/invitations/${id}/respond`, { action }); showToast('ok', `Invitation ${action}`); fetchAll() }
    catch (err) { console.error('Invitation respond failed:', err); showToast('err', 'Failed') }
  }

  const send = async (toUserId, type) => {
    try { await api.post('/invitations/send', { toUserId, type }); showToast('ok', 'Invitation sent!'); fetchAll() }
    catch (e) { showToast('err', e.response?.data?.message || 'Failed') }
  }

  const sentIds = new Set(sent.filter(i => i.status === 'pending').map(i => i.to._id))

  const tabBtn = id =>
    `text-sm font-medium px-4 py-1.5 rounded-lg border-none cursor-pointer font-sans ${tab === id ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400 hover:text-white'}`

  return (
    <div className="min-h-screen bg-gray-950">
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 ${toast.type === 'ok' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {toast.msg}
        </div>
      )}
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">Invitations</h1>
        <p className="text-gray-400 text-sm mb-6">Send and respond to chat invitations</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mb-6">
          <button className={tabBtn('received')} onClick={() => setTab('received')}>
            Received {pending.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{pending.length}</span>}
          </button>
          <button className={tabBtn('sent')} onClick={() => setTab('sent')}>Sent</button>
          <button className={tabBtn('new')} onClick={() => setTab('new')}>New Invitation</button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : (
          <>
            {/* Received */}
            {tab === 'received' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {pending.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">No pending invitations</p>
                ) : pending.map(inv => (
                  <div key={inv._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{inv.from.username}</p>
                      <p className="text-gray-500 text-xs">{inv.type === 'private' ? 'Private session invite' : 'Chat invite'}</p>
                    </div>
                    <button onClick={() => respond(inv._id, 'accepted')}
                      className="text-xs text-green-400 border border-green-800 hover:border-green-500 bg-transparent rounded-lg px-3 py-1 cursor-pointer font-sans">
                      Accept
                    </button>
                    <button onClick={() => respond(inv._id, 'declined')}
                      className="text-xs text-gray-500 border border-gray-700 hover:border-red-700 bg-transparent rounded-lg px-3 py-1 cursor-pointer font-sans">
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sent */}
            {tab === 'sent' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {sent.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">No sent invitations</p>
                ) : sent.map(inv => (
                  <div key={inv._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{inv.to.username}</p>
                      <p className="text-gray-500 text-xs capitalize">{inv.type} invite</p>
                    </div>
                    <span className={`text-xs capitalize ${statusColor[inv.status]}`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* New */}
            {tab === 'new' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {contacts.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-400 text-sm mb-3">Add contacts first</p>
                    <button onClick={() => navigate('/contacts')}
                      className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm border-none cursor-pointer font-sans">
                      Go to Contacts
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 text-xs px-4 py-2 border-b border-gray-800 uppercase tracking-wide">Choose a contact</p>
                    {contacts.map(c => (
                      <div key={c._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{c.username}</p>
                          <p className="text-gray-500 text-xs">{c.email}</p>
                        </div>
                        {sentIds.has(c._id) ? (
                          <span className="text-xs text-gray-500">Invited</span>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => send(c._id, 'normal')}
                              className="text-xs text-cyan-400 border border-cyan-800 hover:border-cyan-500 bg-transparent rounded-lg px-3 py-1 cursor-pointer font-sans">
                              Chat
                            </button>
                            <button onClick={() => send(c._id, 'private')}
                              className="text-xs text-purple-400 border border-purple-800 hover:border-purple-500 bg-transparent rounded-lg px-3 py-1 cursor-pointer font-sans">
                              Private
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}