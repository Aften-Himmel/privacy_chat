import { useState } from 'react'
import api from '../api/axios'

export default function GroupInfoPanel({ group, myId, onClose, onGroupUpdated, onGroupLeft, onGroupDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = group.admins?.some(a => (a._id || a).toString() === myId)
  const isCreator = (group.creator?._id || group.creator)?.toString() === myId

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the group?')) return
    setLoading(true)
    setError('')
    try {
      const res = await api.delete(`/groups/${group._id}/members/${userId}`)
      onGroupUpdated(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/groups/${group._id}/leave`)
      onGroupLeft()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave group')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return
    setLoading(true)
    setError('')
    try {
      await api.delete(`/groups/${group._id}`)
      onGroupDeleted()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-[#f0f2f5] sticky top-0 z-10">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg font-bold bg-transparent border-none cursor-pointer">✕</button>
          <h2 className="text-base font-semibold text-gray-900">Group Info</h2>
        </div>

        {/* Group Avatar + Name */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-3xl mb-3">
            {group.name?.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-gray-500 text-center mt-1 max-w-xs">{group.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{group.members?.length} member{group.members?.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Members List */}
        <div className="flex-1 px-4 py-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Members</h4>
          <div className="space-y-1">
            {group.members?.map(member => {
              const memberId = (member._id || member).toString()
              const memberIsAdmin = group.admins?.some(a => (a._id || a).toString() === memberId)
              const memberIsCreator = (group.creator?._id || group.creator)?.toString() === memberId
              const isMe = memberId === myId

              return (
                <div key={memberId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {member.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: member.isOnline ? '#25D366' : '#d1d5db' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.username}{isMe ? ' (You)' : ''}
                      </p>
                      {memberIsCreator && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">Creator</span>
                      )}
                      {memberIsAdmin && !memberIsCreator && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">Admin</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{member.isOnline ? 'Online' : 'Offline'}</p>
                  </div>

                  {/* Remove button — admin can remove non-creator non-self members */}
                  {isAdmin && !memberIsCreator && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(memberId)}
                      disabled={loading}
                      className="text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-full px-3 py-1 transition flex-shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
        )}

        {/* Footer Actions */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-2 sticky bottom-0 bg-white">
          {!isCreator && (
            <button
              onClick={handleLeave}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium text-sm transition cursor-pointer disabled:opacity-50"
            >
              Leave Group
            </button>
          )}
          {isCreator && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm transition cursor-pointer disabled:opacity-50"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
