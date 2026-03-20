import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import MyWorlds from './pages/MyWorlds'
import Discover from './pages/Discover'
import NewChat from './pages/NewChat'
import ChatView from './pages/ChatView'
import Profile from './pages/Profile'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected app routes */}
        <Route path="/home" element={<ProtectedRoute><AppLayout><Discover /></AppLayout></ProtectedRoute>} />
        <Route path="/my-worlds" element={<ProtectedRoute><AppLayout><MyWorlds /></AppLayout></ProtectedRoute>} />
        <Route path="/new-chat" element={<ProtectedRoute><AppLayout><NewChat /></AppLayout></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><AppLayout><ChatView /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
