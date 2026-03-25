import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatLayout from './components/ChatLayout'
import ChatWindow from './pages/ChatWindow'
import EmptyChat from './pages/EmptyChat'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>}>
              <Route index element={<EmptyChat />} />
              <Route path=":userId" element={<ChatWindow />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}