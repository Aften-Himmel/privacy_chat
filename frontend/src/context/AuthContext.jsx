import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

// BUG FIX 4: decode the JWT expiry claim without a library and reject tokens
// that have already expired. Previously, an expired token would keep the user
// "logged in" in the UI (user state was set from localStorage) but every API
// call would fail with 401, leading to confusing broken behaviour.
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // exp is in seconds; Date.now() is in ms
    return payload.exp * 1000 < Date.now()
  } catch {
    return true // malformed token → treat as expired
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      if (isTokenExpired(token)) {
        // Clear stale credentials so the user is redirected to login
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } else {
        setUser(JSON.parse(savedUser))
      }
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)