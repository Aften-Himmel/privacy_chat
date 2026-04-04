import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useMatch } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import NotificationBell from './NotificationBell'
import InvitationsDropdown from './InvitationsDropdown'
import CreateGroupModal from '../pages/CreateGroupModal'
import api from '../api/axios'

const useDebounce = (v, d) => {
  const [val, setVal] = useState(v)
  useEffect(() => { const t = setTimeout(() => setVal(v), d); return () => clearTimeout(t) }, [v, d])
  return val
}

export default function ChatLayout() {
  const { user, logout } = useAuth()
  const { notifications } = useSocket()
  const navigate = useNavigate()
  const dmMatch    = useMatch('/chat/:userId')
  const groupMatch = useMatch('/chat/group/:groupId')
  const activeUserId  = dmMatch?.params.userId
  const activeGroupId = groupMatch?.params.groupId

  const [contacts, setContacts]         = useState([])
  const [groups, setGroups]             = useState([])
  const [results, setResults]           = useState([])
  const [query, setQuery]               = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [tab, setTab]                   = useState('chats')   // 'chats' | 'groups'
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent]         = useState([])

  const debounced = useDebounce(query, 400)

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get('/contacts')
      setContacts(res.data)
    } catch (err) {
      console.error('Failed to load contacts', err)
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/groups')
      setGroups(res.data)
    } catch (err) {
      console.error('Failed to load groups', err)
    }
  }, [])

  const fetchPendingInvites = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        api.get('/invitations/pending'),
        api.get('/invitations/sent')
      ])
      setPendingReceived(r.data)
      setPendingSent(s.data)
    } catch (e) {
      console.error('Failed to load pending invites', e)
    }
  }, [])

  useEffect(() => { fetchContacts(); fetchGroups(); fetchPendingInvites() }, [fetchContacts, fetchGroups, fetchPendingInvites])

  // Handle invitation & contact real-time updates
  useEffect(() => {
    const hasInviteUpdate = notifications.some(n => 
      n.type === 'invitation' || 
      n.type === 'invitation_response' || 
      n.type === 'contact_removed'
    )
    if (hasInviteUpdate) {
      fetchPendingInvites()
      fetchContacts()
    }
  }, [notifications, fetchPendingInvites, fetchContacts])

  // Handle group-related real-time updates in sidebar
  useEffect(() => {
    for (const n of notifications) {
      if (n.type === 'group_added') {
        setGroups(prev => {
          const already = prev.some(g => g._id === n.group._id)
          return already ? prev : [n.group, ...prev]
        })
      }
      if (n.type === 'group_updated') {
        setGroups(prev => prev.map(g => g._id === n.group._id ? n.group : g))
      }
      if (n.type === 'group_deleted') {
        setGroups(prev => prev.filter(g => g._id !== n.groupId))
        if (activeGroupId === n.groupId) navigate('/chat')
      }
      if (n.type === 'group_removed') {
        setGroups(prev => prev.filter(g => g._id !== n.groupId))
        if (activeGroupId === n.groupId) navigate('/chat')
      }
    }
  }, [notifications, activeGroupId, navigate])

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
      await api.post('/invitations/send', { toUserId: id, type: 'contact_request' })
      fetchPendingInvites()
      alert('Invitation sent!')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to send invitation')
    }
  }

  const handleRespond = async (inviteId, action) => {
    try {
      await api.patch(`/invitations/${inviteId}/respond`, { action })
      fetchPendingInvites()
      if (action === 'accepted') fetchContacts()
      alert(`Invitation ${action}`)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to respond')
    }
  }

  const handleRemove = async id => {
    try {
      await api.delete(`/contacts/remove/${id}`)
      fetchContacts()
      // If we are actively viewing the chat of the person we just removed, kick ourselves out too!
      if (activeUserId === id) {
        navigate('/chat')
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to remove contact')
    }
  }

  const isContact = id => contacts.some(c => c._id === id)

  const handleGroupCreated = (group) => {
    setShowCreateGroup(false)
    setGroups(prev => {
      const already = prev.some(g => g._id === group._id)
      return already ? prev : [group, ...prev]
    })
    setTab('groups')
    navigate(`/chat/group/${group._id}`)
  }

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">

        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#f0f2f5] border-b border-gray-200 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-gray-800 hidden sm:block">{user?.username}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            {/* INVITATIONS DROPDOWN */}
            <InvitationsDropdown pending={pendingReceived} onRespond={handleRespond} />

            <NotificationBell />
            {/* New Group button */}
            <button
              id="new-group-button"
              onClick={() => setShowCreateGroup(true)}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              title="New Group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            {/* Add contact / search toggle */}
            <button
              onClick={() => { setIsSearchMode(!isSearchMode); setQuery(''); setResults([]) }}
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
              placeholder={isSearchMode ? 'Search global users...' : 'Search or start new chat'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-gray-800 px-3 outline-none"
            />
            {isSearchMode && (
              <button onClick={() => { setIsSearchMode(false); setQuery(''); setResults([]) }}
                className="text-sm text-blue-500 font-medium">Cancel</button>
            )}
          </div>
        </div>

        {/* Chats / Groups Tabs */}
        {!isSearchMode && (
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button
              id="tab-chats"
              onClick={() => setTab('chats')}
              className={`flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
                tab === 'chats' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Chats
            </button>
            <button
              id="tab-groups"
              onClick={() => setTab('groups')}
              className={`flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
                tab === 'groups' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Groups {groups.length > 0 && <span className="ml-1 text-xs text-gray-400">({groups.length})</span>}
            </button>
          </div>
        )}

        {/* List Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {isSearchMode ? (
            /* Global Search Results */
            <div className="py-2">
              <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Global Search</h3>
              {loading && <p className="px-4 text-sm text-gray-500">Searching...</p>}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="px-4 text-sm text-gray-500">No users found</p>
              )}
              {results.map(r => {
                const isC = isContact(r._id)
                const recInvite = pendingReceived.find(i => i.from._id === r._id && i.status === 'pending')
                const sentInvite = pendingSent.find(i => i.to._id === r._id && i.status === 'pending')

                return (
                  <div key={r._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 font-medium">{r.username}</p>
                      <p className="text-sm text-gray-500 truncate">{r.email}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isC ? (
                        <>
                          <button onClick={() => { setIsSearchMode(false); setQuery(''); setResults([]); navigate(`/chat/${r._id}`) }}
                            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full px-4 py-1.5 transition whitespace-nowrap font-medium">
                            Message
                          </button>
                          <button onClick={() => handleRemove(r._id)}
                            className="text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-full px-4 py-1.5 transition whitespace-nowrap">
                            Remove
                          </button>
                        </>
                      ) : recInvite ? (
                        <>
                          <button onClick={() => handleRespond(recInvite._id, 'accepted')}
                            className="text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full px-3 py-1.5 transition whitespace-nowrap">
                            Accept
                          </button>
                          <button onClick={() => handleRespond(recInvite._id, 'declined')}
                            className="text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full px-3 py-1.5 transition whitespace-nowrap">
                            Decline
                          </button>
                        </>
                      ) : sentInvite ? (
                        <span className="text-xs text-gray-500 px-2 py-1.5 whitespace-nowrap font-medium">Pending...</span>
                      ) : (
                        <button onClick={() => handleAdd(r._id)}
                          className="text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-full px-4 py-1.5 transition whitespace-nowrap">
                          Invite
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          ) : tab === 'chats' ? (
            /* Contacts / DMs */
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
                    id={`contact-${c._id}`}
                    onClick={() => navigate(`/chat/${c._id}`)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {c.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                        style={{ background: c.isOnline ? '#25D366' : '#d1d5db' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 font-medium truncate">{c.username}</p>
                      <p className="text-sm text-gray-500 truncate">{c.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                )
              })
            )

          ) : (
            /* Groups Tab */
            groups.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <p className="mb-3">No groups yet.</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs text-white bg-emerald-500 hover:bg-emerald-600 rounded-full px-4 py-2 transition"
                >
                  Create a Group
                </button>
              </div>
            ) : (
              groups.map(g => {
                const isActive = g._id === activeGroupId
                return (
                  <div
                    key={g._id}
                    id={`group-${g._id}`}
                    onClick={() => navigate(`/chat/group/${g._id}`)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 font-medium truncate">{g.name}</p>
                      <p className="text-sm text-gray-500 truncate">{g.members?.length} member{g.members?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div className="hidden md:flex flex-1 flex-col bg-[#efeae2] relative z-0">
        <Outlet />
      </div>

      {/* Mobile: show Outlet only when a chat/group is open */}
      {(activeUserId || activeGroupId) && (
        <div className="md:hidden absolute inset-0 z-50 flex flex-col bg-[#efeae2]">
          <Outlet />
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  )
}
