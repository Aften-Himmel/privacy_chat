import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/register', form)
      login(res.data.user, res.data.token)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PrivacyChat</h1>
          <p className="text-gray-500 text-sm mt-1">Encrypted messaging for the web</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Create account</h2>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">{error}</p>}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">Username</label>
              <input name="username" type="text" required value={form.username} onChange={onChange}
                placeholder="john_doe"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">Email</label>
              <input name="email" type="email" required value={form.email} onChange={onChange}
                placeholder="you@example.com"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">Password</label>
              <input name="password" type="password" required value={form.password} onChange={onChange}
                placeholder="Min. 6 characters"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm mt-2 shadow-sm disabled:opacity-50 transition cursor-pointer">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Have an account? <Link to="/login" className="text-blue-500 hover:text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}