import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function ProfilePage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [username, setUsername] = useState(user?.username || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setLoading(true); setMessage(''); setError('')
    try {
      const formData = new FormData()
      if (username !== user?.username) formData.append('username', username)
      if (avatarFile) formData.append('avatar', avatarFile)

      const res = await api.patch('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Update auth context with new user data
      const token = localStorage.getItem('token')
      login(res.data, token)
      setMessage('Profile updated successfully!')
      setAvatarFile(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwLoading(true); setPwMessage(''); setPwError('')
    try {
      await api.patch('/auth/password', { currentPassword, newPassword })
      setPwMessage('Password changed successfully!')
      setCurrentPassword(''); setNewPassword('')
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const initial = user?.username?.charAt(0).toUpperCase() || '?'

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8] overflow-y-auto">
      {/* Header */}
      <div className="bg-[#f0f2f5] border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate('/chat')}
          className="text-gray-500 hover:text-gray-800 bg-transparent border-none cursor-pointer text-xl p-1">←</button>
        <h1 className="text-gray-900 font-semibold text-lg">Profile Settings</h1>
      </div>

      <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full cursor-pointer group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-3xl border-4 border-white shadow-lg">
                {initial}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
          <p className="text-xs text-gray-400 mt-2">Click to change avatar</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfileSave} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Profile</h2>

          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              maxLength={20} minLength={3}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">Email</label>
            <input
              type="email" value={user?.email || ''} disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-500 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          {message && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || (!avatarFile && username === user?.username)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm shadow-sm disabled:opacity-50 transition cursor-pointer">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Password Change */}
        <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Change Password</h2>

          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">Current Password</label>
            <input
              type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-medium block mb-1">New Password</label>
            <input
              type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {pwMessage && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwMessage}</p>}
          {pwError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>}

          <button type="submit" disabled={pwLoading || !currentPassword || newPassword.length < 6}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2.5 rounded-lg text-sm shadow-sm disabled:opacity-50 transition cursor-pointer">
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
