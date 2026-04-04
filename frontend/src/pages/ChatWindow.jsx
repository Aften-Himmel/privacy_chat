import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'

const getConvId = (a, b) => [a, b].sort().join('_')

export default function ChatWindow() {
  const { userId } = useParams()
  const { user } = useAuth()
  const { notifications, clearNotificationsForUser } = useSocket()
  const navigate = useNavigate()

  const [contact, setContact]           = useState(null)
  const [normalMessages, setNormal]     = useState([])
  const [privateMessages, setPrivate]   = useState([])
  const [text, setText]                 = useState('')
  const [file, setFile]                 = useState(null)
  const [mode, setMode]                 = useState('normal')
  const fileInputRef                    = useRef(null)
  const [sessionId, setSessionId]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [sending, setSending]           = useState(false)
  const [selectedMsgs, setSelectedMsgs] = useState(new Set())
  const [deleting, setDeleting]         = useState(false)
  const [showDeleteOpts, setShowDeleteOpts] = useState(false)
  const bottomRef = useRef(null)
  const processedRef = useRef(new Set())
  const convId = user ? getConvId(user.id || user._id, userId) : null

  // Load contact + normal message history + check for active session on open
  useEffect(() => {
    setMode('normal')
    setSessionId(null)
    setPrivate([])
    setNormal([])
    setLoading(true)

    const load = async () => {
      try {
        const [contactsRes, msgsRes, sessionRes] = await Promise.all([
          api.get('/contacts'),
          api.get(`/messages/${userId}`),
          api.get(`/messages/${userId}/session/active`),
        ])
        const found = contactsRes.data.find(c => c._id === userId)
        if (found) {
          setContact(found)
        } else {
          try {
            const fallbackRes = await api.get(`/contacts/user/${userId}`)
            setContact(fallbackRes.data)
          } catch {
            setContact({ _id: userId, username: '', isOnline: false })
          }
        }
        setNormal(msgsRes.data)

        if (sessionRes.data) {
          setMode('private')
          setSessionId(sessionRes.data._id)
          const privateRes = await api.get(`/messages/${userId}/private/messages`)
          setPrivate(privateRes.data)
        }
      } catch (err) {
        console.error('Failed to load chat:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  // Listen for real-time events
  useEffect(() => {
    for (const n of notifications) {
      if (processedRef.current.has(n.id)) continue
      processedRef.current.add(n.id)

      if (n.type === 'new_message' && n.conversationId === convId)
        setNormal(p => [...p, n.message])

      if (n.type === 'new_private_message' && n.conversationId === convId)
        setPrivate(p => [...p, n.message])

      if (n.type === 'private_session_started' && n.conversationId === convId) {
        setMode('private')
        setSessionId(n.sessionId)
        setPrivate([])
      }

      if (n.type === 'private_session_ended' && n.conversationId === convId) {
        setMode('normal')
        setSessionId(null)
        setPrivate([])
      }

      if (n.type === 'message_deleted' && n.conversationId === convId) {
        setNormal(p => p.filter(m => (m._id || m.id) !== n.messageId))
      }

      if (n.type === 'messages_deleted_everyone' && n.conversationId === convId) {
        setNormal(p => p.filter(m => !n.messageIds.includes(m._id || m.id)))
      }

      if (n.type === 'contact_removed' && n.removedBy === userId) {
        navigate('/chat')
      }
    }

    // BUG FIX 5: clearNotificationsForUser was listed as a dependency of this
    // effect, but it's a useCallback that is stable — however including it with
    // `notifications` caused the effect to re-run (and re-process) on every
    // notifications change AND any time the callback identity changed.  The
    // real fix is to call the clear function in a separate, targeted effect so
    // it doesn't entangle with the notification-processing loop above.
  }, [notifications, convId, userId, navigate])

  // Separate effect: clear notifications for this user when the window is open.
  // BUG FIX 5 (continued): using a separate effect with only [userId] prevents
  // clearNotificationsForUser from triggering the notification-processing loop.
  useEffect(() => {
    clearNotificationsForUser(userId)
  }, [userId, clearNotificationsForUser])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [normalMessages, privateMessages])

  // Auto-end private session on tab close (beforeunload) using sendBeacon
  useEffect(() => {
    if (!sessionId) return
    const handler = () => {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      navigator.sendBeacon(
        `${apiBase}/messages/${userId}/private/end-beacon`,
        new Blob([JSON.stringify({ sessionId })], { type: 'application/json' })
      )
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [sessionId, userId])

  // BUG FIX 6: the original visibilitychange handler ended the private session
  // whenever the tab became hidden — this fired on ANY tab switch, window
  // minimize, alt-tab, phone screen-off, etc., making private sessions
  // impossible to use in practice.  We now only end the session when the page
  // is being fully unloaded (beforeunload above handles the true tab-close case)
  // and remove the visibilitychange session-ending entirely. If you want to keep
  // some form of it, a safer pattern would be a timeout that cancels if the user
  // returns quickly — but that adds complexity without clear benefit here.

  const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed', 'application/gzip',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'video/ogg',
  ])
  const MAX_FILE_SIZE = 100 * 1024 * 1024

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    if (!ALLOWED_TYPES.has(selected.type)) {
      alert('This file type is not allowed. Please upload images, documents, audio, or video files only.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      alert('File is too large. Maximum size is 100 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(selected)
  }

  const sendMessage = async e => {
    e.preventDefault()
    if ((!text.trim() && !file) || sending) return
    setSending(true)
    try {
      if (file) {
        const formData = new FormData()
        formData.append('mode', mode)
        if (text.trim()) formData.append('text', text)
        if (mode === 'private') formData.append('sessionId', sessionId)
        formData.append('file', file)

        const res = await api.post(`/messages/${userId}/file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        if (mode === 'normal') setNormal(p => [...p, res.data])
        else setPrivate(p => [...p, res.data])

        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        if (mode === 'normal') {
          const res = await api.post(`/messages/${userId}`, { text })
          setNormal(p => [...p, res.data])
        } else {
          const res = await api.post(`/messages/${userId}/private/message`, { text, sessionId })
          setPrivate(p => [...p, res.data])
        }
      }
      setText('')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert(err.response?.data?.message || 'Failed to send file. Is it too large?')
    } finally {
      setSending(false)
    }
  }

  const startPrivate = async () => {
    try {
      const res = await api.post(`/messages/${userId}/private/start`)
      setMode('private')
      setSessionId(res.data._id)
      setPrivate([])
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to start session')
    }
  }

  const endPrivate = async () => {
    try {
      await api.post(`/messages/${userId}/private/end`, { sessionId })
      setMode('normal')
      setSessionId(null)
      setPrivate([])
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  const myId = user?.id || user?._id

  const toggleSelect = (msgId) => {
    setSelectedMsgs(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  const cancelSelection = () => {
    setSelectedMsgs(new Set())
    setShowDeleteOpts(false)
  }

  const deleteSelected = async (type) => {
    if (deleting || selectedMsgs.size === 0) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedMsgs)
      await api.post(`/messages/${userId}/messages/delete`, { messageIds: ids, type })
      setNormal(p => p.filter(m => !selectedMsgs.has(m._id)))
      setSelectedMsgs(new Set())
      setShowDeleteOpts(false)
    } catch (err) {
      console.error('Failed to delete messages:', err)
      alert(err.response?.data?.message || 'Failed to delete some messages')
    } finally {
      setDeleting(false)
    }
  }

  const canDeleteForEveryone = Array.from(selectedMsgs).every(id => {
    const msg = normalMessages.find(m => m._id === id)
    return msg && (msg.sender?._id || msg.sender) === myId
  })

  const visibleMessages = mode === 'normal' ? normalMessages : privateMessages

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">

      {/* Header */}
      <div className="bg-[#f0f2f5] border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/chat')}
            className="md:hidden text-gray-500 hover:text-gray-800 bg-transparent border-none cursor-pointer text-xl p-1">←</button>

          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
            {contact?.username?.charAt(0).toUpperCase() || '?'}
          </div>

          <div>
            <p className="text-gray-900 font-medium text-base">{contact?.username || ''}</p>
            <p className="text-gray-500 text-xs">{contact?.isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'normal' ? (
            <button onClick={startPrivate}
              className="text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-medium px-3 py-1.5 rounded-lg cursor-pointer transition">
              🔒 Start Private Session
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg">
                🔒 Private Session Active
              </span>
              <button onClick={endPrivate}
                className="text-xs bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium px-3 py-1.5 rounded-lg cursor-pointer transition">
                End Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Private mode banner */}
      {mode === 'private' && (
        <div className="bg-purple-50 border-b border-purple-100 px-4 py-2 text-center shadow-sm z-0">
          <p className="text-purple-800 text-xs font-medium">
            🔒 Private session active — messages exist only in memory and will be permanently deleted when this session ends
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-2 lg:space-y-3 w-full bg-[#f0f7ff] relative">

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f0f7ff]/50 z-20">
            <span className="bg-white text-gray-600 text-sm font-medium px-4 py-2 rounded-full shadow-md">Loading chat...</span>
          </div>
        )}

        {!loading && visibleMessages.length === 0 && mode === 'normal' && (
          <div className="flex justify-center py-10">
            <span className="bg-[#fff9c4] text-gray-800 text-xs px-4 py-2 rounded-lg shadow-sm">
              Messages are end-to-end encrypted. No one outside of this chat, not even PrivacyChat, can read them.
            </span>
          </div>
        )}

        {!loading && visibleMessages.length === 0 && mode === 'private' && (
          <div className="flex justify-center py-10">
            <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs px-4 py-2 rounded-lg shadow-sm">
              🔒 Private session started. Messages here will not be saved.
            </span>
          </div>
        )}

        {visibleMessages.map((msg, i) => {
          const mine = (msg.sender?._id || msg.sender) === myId
          const isSelected = selectedMsgs.has(msg._id)
          const canSelect = mode === 'normal'
          return (
            <div key={msg._id || i}
              className={`flex ${mine ? 'justify-end' : 'justify-start'} ${canSelect ? 'cursor-pointer' : ''}`}
              onClick={() => canSelect && toggleSelect(msg._id)}>
              <div className={`flex items-center gap-2 max-w-[85%] md:max-w-md ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                {canSelect && (
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border ${
                    isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-400 opacity-50'
                  } transition-all`}>
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                )}
                <div className={`px-3 py-1.5 rounded-lg text-[15px] shadow-sm relative transition-all ${
                  isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50 opacity-90' :
                  mine
                    ? mode === 'private'
                      ? 'bg-purple-100 text-gray-900 border border-purple-200'
                      : 'bg-[#dbeafe] text-blue-950 border border-blue-200'
                    : mode === 'private'
                      ? 'bg-white text-gray-900 border border-purple-200'
                      : 'bg-white text-gray-900 border border-gray-100'
                }`}>
                  {msg.fileUrl && (
                    <div className="mb-1 mt-1">
                      {msg.fileType?.startsWith('image/') ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="block" onClick={e => e.stopPropagation()}>
                          <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-64 rounded-lg object-cover" />
                        </a>
                      ) : (
                        <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                           className="flex items-center gap-3 bg-black/5 p-2 rounded-lg border border-black/5 hover:bg-black/10 transition">
                          <svg className="w-8 h-8 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.fileName}</p>
                            <p className="text-xs text-gray-500">{(msg.fileSize / 1024).toFixed(1)} KB</p>
                          </div>
                          <span className="p-1 rounded-full text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                  {msg.text && <p className="leading-snug pr-12 text-gray-800 break-words">{msg.text}</p>}
                  <div className="absolute right-2 bottom-1 flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {mine && (
                      <svg viewBox="0 0 18 18" width="14" height="14" className="text-blue-500"><path fill="currentColor" d="m17.394 5.035-.57-.444a.434.434 0 0 0-.609.076l-6.39 8.198a.38.38 0 0 1-.577.039l-.427-.388a.381.381 0 0 0-.578.038l-.451.576a.497.497 0 0 0 .043.645l1.575 1.51a.38.38 0 0 0 .577-.039l7.483-9.602a.436.436 0 0 0-.076-.609zm-4.892 0-.57-.444a.434.434 0 0 0-.609.076l-4.665 5.986-1.127-1.146a.382.382 0 0 0-.547-.008l-.513.491a.382.382 0 0 0 .004.544l2.254 2.292a.382.382 0 0 0 .546.009l5.303-6.816a.436.436 0 0 0-.076-.609z"></path><path fill="currentColor" d="m8.544 14.512-1.996-1.921A.382.382 0 0 0 6.001 12.6l-.513.491a.382.382 0 0 0 .005.544l2.502 2.408a.38.38 0 0 0 .577-.039l.451-.577a.494.494 0 0 0-.022-.647z"></path></svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Selection Action Bar */}
      {selectedMsgs.size > 0 && !showDeleteOpts && (
        <div className="px-4 py-2.5 bg-indigo-50 border-t border-indigo-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{selectedMsgs.size}</span>
            <span className="text-sm font-medium text-indigo-800">selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancelSelection}
              className="text-xs bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg cursor-pointer transition">
              Cancel
            </button>
            <button onClick={() => setShowDeleteOpts(true)}
              className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-1.5 rounded-lg cursor-pointer transition shadow-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete options
            </button>
          </div>
        </div>
      )}

      {/* Delete Options Modal */}
      {showDeleteOpts && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-5 mb-10 min-w-[300px]">
            <h3 className="text-gray-900 font-semibold mb-3">Delete {selectedMsgs.size} message{selectedMsgs.size > 1 ? 's' : ''}?</h3>
            <div className="flex flex-col gap-2">
              <button onClick={() => deleteSelected('me')} disabled={deleting}
                className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium transition cursor-pointer disabled:opacity-50">
                Delete for me
              </button>
              {canDeleteForEveryone && (
                <button onClick={() => deleteSelected('everyone')} disabled={deleting}
                  className="w-full text-left px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition cursor-pointer disabled:opacity-50">
                  Delete for everyone
                </button>
              )}
              {!canDeleteForEveryone && (
                <p className="text-xs text-gray-500 px-1 mt-1">
                  You can only delete for everyone if you sent all selected messages.
                </p>
              )}
              <button onClick={() => setShowDeleteOpts(false)}
                className="w-full text-center px-4 py-2.5 mt-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value='' }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition">
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className={`px-4 py-3 flex items-center z-10 ${mode === 'private' ? 'bg-purple-50 border-t border-purple-200' : 'bg-[#f0f2f5]'}`}>
        <form onSubmit={sendMessage} className="flex gap-2 w-full max-w-5xl mx-auto items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition cursor-pointer">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <div className="flex-1 bg-white rounded-lg flex items-center shadow-sm border border-gray-200 overflow-hidden">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={500}
              placeholder={mode === 'private' ? '🔒 Type a private message...' : 'Type a message'}
              className={`w-full px-4 py-3 text-[15px] outline-none ${
                mode === 'private'
                  ? 'text-purple-900 placeholder-purple-300'
                  : 'text-gray-800 placeholder-gray-400'
              }`}
            />
            {text.length > 400 && (
              <span className={`text-[10px] pr-3 transition-colors ${text.length >= 500 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {text.length}/500
              </span>
            )}
          </div>
          <button type="submit" disabled={sending || (!text.trim() && !file) || text.length > 500}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-600 transition disabled:opacity-50 disabled:bg-blue-300 cursor-pointer shadow-sm ml-1">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}