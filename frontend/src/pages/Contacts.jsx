import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const useDebounce = (v, d) => {
  const [val, setVal] = useState(v)
  useEffect(() => { const t = setTimeout(() => setVal(v), d); return () => clearTimeout(t) }, [v, d])
  return val
}

export default function Contacts() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('list')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const debounced = useDebounce(query, 400)

  const fetchContacts = useCallback(async () => {
    const res = await api.get('/contacts')
    setContacts(res.data)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return }
    setLoading(true)
    api.get(`/contacts/search?username=${debounced.trim()}`)
      .then(r => setResults(r.data))
      .catch(err => { console.error('Search failed:', err); setResults([]) })
      .finally(() => setLoading(false))
  }, [debounced])

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const handleAdd = async id => {
    try { await api.post(`/contacts/add/${id}`); showToast('ok', 'Contact added!'); fetchContacts() }
    catch (e) { showToast('err', e.response?.data?.message || 'Failed') }
  }

  const handleRemove = async id => {
    try { await api.delete(`/contacts/remove/${id}`); showToast('ok', 'Removed'); fetchContacts() }
    catch (err) { console.error('Remove contact failed:', err); showToast('err', 'Failed') }
  }

  const isContact = id => contacts.some(c => c._id === id)

  const tabBtn = (id, label) =>
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
        <h1 className="text-2xl font-bold text-white mb-1">Contacts</h1>
        <p className="text-gray-400 text-sm mb-6">Manage your friends</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mb-6">
          <button className={tabBtn('list', 'My Contacts')} onClick={() => setTab('list')}>
            My Contacts ({contacts.length})
          </button>
          <button className={tabBtn('search', 'Find People')} onClick={() => setTab('search')}>
            Find People
          </button>
        </div>

        {/* My Contacts */}
        {tab === 'list' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {contacts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No contacts yet. Use "Find People" to add friends.</p>
            ) : contacts.map(c => (
              <div key={c._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.isOnline ? '#34d399' : '#374151' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{c.username}</p>
                  <p className="text-gray-500 text-xs truncate">{c.email}</p>
                </div>
                <button onClick={() => navigate(`/chat/${c._id}`)}
                  className="text-xs text-cyan-400 bg-transparent border border-gray-700 hover:border-cyan-500 rounded-lg px-3 py-1 cursor-pointer font-sans">
                  Message
                </button>
                <button onClick={() => handleRemove(c._id)}
                  className="text-xs text-gray-500 hover:text-red-400 bg-transparent border border-gray-700 rounded-lg px-3 py-1 cursor-pointer font-sans">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Find People */}
        {tab === 'search' && (
          <>
            <input type="text" placeholder="Search by username..." value={query}
              onChange={e => setQuery(e.target.value)} autoFocus
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500 mb-4" />
            {query.length < 2 && <p className="text-gray-500 text-sm text-center py-4">Type at least 2 characters</p>}
            {loading && <p className="text-gray-500 text-sm text-center py-4">Searching...</p>}
            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No users found</p>
            )}
            {results.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {results.map(r => (
                  <div key={r._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.isOnline ? '#34d399' : '#374151' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{r.username}</p>
                      <p className="text-gray-500 text-xs truncate">{r.email}</p>
                    </div>
                    {isContact(r._id) ? (
                      <span className="text-xs text-green-400 bg-green-900/30 border border-green-800 rounded-lg px-3 py-1">Added</span>
                    ) : (
                      <button onClick={() => handleAdd(r._id)}
                        className="text-xs text-cyan-400 bg-transparent border border-cyan-800 hover:border-cyan-500 rounded-lg px-3 py-1 cursor-pointer font-sans">
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}