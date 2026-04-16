import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatLayout from './components/ChatLayout'
import ChatWindow from './pages/ChatWindow'
import GroupWindow from './pages/GroupWindow'
import ProfilePage from './pages/ProfilePage'
import EmptyChat from './pages/EmptyChat'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>}>
              <Route index element={<EmptyChat />} />
              <Route path=":userId" element={<ChatWindow />} />
              <Route path="group/:groupId" element={<GroupWindow />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}