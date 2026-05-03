import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Send HttpOnly cookies automatically
})

// Handle 401 responses by redirecting, but avoid infinite loops on the login page or auth check
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAuthCheck = err.config.url.endsWith('/auth/me')
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      
      if (!isAuthCheck && !isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api