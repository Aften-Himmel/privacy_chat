import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import api from '../api/axios'

const useDebounce = (v, d) => {
  const [val, setVal] = useState(v)
  useEffect(() => { const t = setTimeout(() => setVal(v), d); return () => clearTimeout(t) }, [v, d])
  return val
}

export default function ChatLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { userId: activeUserId } = useParams() // To highlight active chat
  
  const [contacts, setContacts] = useState([])
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [loading, setLoading] = useState(false)

  const debounced = useDebounce(query, 400)

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get('/contacts')
      setContacts(res.data)
    } catch (err) {
      console.error('Failed to load contacts', err)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    if (!isSearchMode) return
    if (debounced.trim().length < 2) { setResults([]); return }
    setLoading(true)
    api.get(`/contacts/search?username=${debounced.trim()}`)
      .then(r => setResults(r.data))
      .catch(err => { console.error('Search failed:', err); setResults([]) })
      .finally(() => setLoading(false))
  }, [debounced, isSearchMode])

  const handleAdd = async id => {
    try {
      await api.post(`/contacts/add/${id}`);
      fetchContacts()
      setIsSearchMode(false) // return to normal list after adding
      setQuery('')
      navigate(`/chat/${id}`) // instantly open their chat
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add contact')
    }
  }

  const isContact = id => contacts.some(c => c._id === id)

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      {/* LEFT SIDEBAR (roughly 30-35% width on desktop) */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#f0f2f5] border-b border-gray-200 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-gray-800 hidden sm:block">{user?.username}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <NotificationBell />
            <button 
              onClick={() => { setIsSearchMode(!isSearchMode); setQuery(''); setResults([]); }}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              title="Find People"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              onClick={() => { logout(); navigate('/login') }}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="relative flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5 overflow-hidden">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder={isSearchMode ? "Search global users..." : "Search or start new chat"}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => { if (!isSearchMode) setQuery('') }} // allow local filtering if we add it, for now it does global
              className="w-full bg-transparent border-none text-sm text-gray-800 px-3 outline-none"
            />
            {isSearchMode && (
              <button onClick={() => { setIsSearchMode(false); setQuery(''); setResults([]); }} className="text-sm text-blue-500 font-medium">Cancel</button>
            )}
          </div>
        </div>

        {/* Contact List Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {!isSearchMode ? (
            /* My Contacts */
            contacts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No chats yet. Click the + icon to find people.
              </div>
            ) : (
              contacts.map(c => {
                const isActive = c._id === activeUserId
                return (
                  <div 
                    key={c._id} 
                    onClick={() => navigate(`/chat/${c._id}`)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {c.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: c.isOnline ? '#25D366' : '#d1d5db' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="text-base text-gray-900 font-medium truncate">{c.username}</p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{c.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            /* Search Results */
            <div className="py-2">
              <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Global Search</h3>
              {loading && <p className="px-4 text-sm text-gray-500">Searching...</p>}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="px-4 text-sm text-gray-500">No users found</p>
              )}
              {results.map(r => (
                <div key={r._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-900 font-medium">{r.username}</p>
                    <p className="text-sm text-gray-500 truncate">{r.email}</p>
                  </div>
                  {isContact(r._id) ? (
                    <span className="text-xs text-green-600 font-medium">Added</span>
                  ) : (
                    <button onClick={() => handleAdd(r._id)}
                      className="text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-full px-4 py-1.5 transition">
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT MAIN CONTENT (Chat Window or Empty State) */}
      <div className="hidden md:flex flex-1 flex-col bg-[#efeae2] relative z-0">
        <Outlet />
      </div>

      {/* Mobile view handling: only show Outlet if activeUserId exists */}
      {activeUserId && (
        <div className="md:hidden absolute inset-0 z-50 flex flex-col bg-[#efeae2]">
          <Outlet />
        </div>
      )}
    </div>
  )
}
