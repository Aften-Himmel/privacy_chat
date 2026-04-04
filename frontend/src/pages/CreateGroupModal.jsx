import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useSocket } from '../context/SocketContext'

export default function CreateGroupModal({ onClose, onCreated }) {
  const { socket } = useSocket()
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [contacts, setContacts]       = useState([])
  const [selected, setSelected]       = useState(new Set())
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Load contacts to pick from
  useEffect(() => {
    api.get('/contacts')
      .then(r => setContacts(r.data))
      .catch(() => {})
  }, [])

  const toggleMember = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Group name is required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        memberIds: Array.from(selected),
      })
      // Tell the socket to join the new group room
      if (socket) socket.emit('group:join', res.data._id)
      onCreated(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Group</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 py-4 space-y-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Group Name *</label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter group name"
                maxLength={60}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                maxLength={200}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* Add participants */}
          <div className="px-5 pt-3 pb-1 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Add Participants{selected.size > 0 ? ` (${selected.size} selected)` : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No contacts available.<br/>Add contacts first to invite them.</p>
            ) : (
              <div className="space-y-1">
                {contacts.map(c => {
                  const isSelected = selected.has(c._id)
                  return (
                    <div
                      key={c._id}
                      id={`member-select-${c._id}`}
                      onClick={() => toggleMember(c._id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50'}`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {c.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: c.isOnline ? '#25D366' : '#d1d5db' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.username}</p>
                        <p className="text-xs text-gray-400">{c.isOnline ? 'Online' : 'Offline'}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              id="create-group-submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition cursor-pointer disabled:opacity-50 disabled:bg-emerald-300 shadow-sm">
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
