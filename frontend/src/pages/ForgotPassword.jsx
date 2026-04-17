import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function ForgotPassword() {
  const [step, setStep] = useState('email') // 'email' | 'code' | 'done'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError(''); setSuccessMsg(''); setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password/send-code', { email })
      setSuccessMsg(res.data.message || 'Verification code sent!')
      setStep('code')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError(''); setSuccessMsg(''); setLoading(true)
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      const res = await api.post('/auth/forgot-password/reset', { email, code, newPassword })
      setSuccessMsg(res.data.message || 'Password reset successfully!')
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">We'll send a code to your email</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">{error}</p>}
          {successMsg && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-center">{successMsg}</p>}

          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Enter your email</h2>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm mt-2 shadow-sm disabled:opacity-50 transition cursor-pointer">
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Reset your password</h2>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Verification Code</label>
                <input type="text" required value={code} onChange={e => setCode(e.target.value)}
                  placeholder="Enter 6-digit code" maxLength="6"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-center tracking-widest text-xl text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                <p className="text-xs text-gray-500 mt-2 text-center">Code sent to <strong>{email}</strong></p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">New Password</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
              </div>
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm mt-2 shadow-sm disabled:opacity-50 transition cursor-pointer">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setError(''); setSuccessMsg('') }} disabled={loading}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm mt-1 shadow-sm disabled:opacity-50 transition cursor-pointer">
                Back
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-4">Your password has been updated successfully.</p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm shadow-sm transition cursor-pointer">
                Go to Login
              </button>
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            Remember your password? <Link to="/login" className="text-blue-500 hover:text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
