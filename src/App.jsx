import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import MyWorlds from './pages/MyWorlds'
import Discover from './pages/Discover'
import NewChat from './pages/NewChat'
import ChatView from './pages/ChatView'
import AppLayout from './layouts/AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing — full screen, no sidebar */}
        <Route path="/" element={<Landing />} />

        {/* App routes — sidebar on desktop */}
        <Route path="/home" element={<AppLayout><MyWorlds /></AppLayout>} />
        <Route path="/discover" element={<AppLayout><Discover /></AppLayout>} />
        <Route path="/new-chat" element={<AppLayout><NewChat /></AppLayout>} />
        <Route path="/chat/:id" element={<AppLayout><ChatView /></AppLayout>} />
        <Route path="/profile" element={<AppLayout><MyWorlds /></AppLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
