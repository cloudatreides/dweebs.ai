import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Compass, MessageSquare, Plus, User, MessageSquarePlus } from 'lucide-react'
import FeedbackModal from './FeedbackModal'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const [showFeedback, setShowFeedback] = useState(false)

  const isActive = (route) => path === route || path.startsWith(route + '/')

  return (
    <div
      style={{ background: '#0D0D0F', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] flex items-center justify-around px-4 pb-5 pt-3 z-40"
    >
      <button
        onClick={() => navigate('/home')}
        className="flex flex-col items-center gap-1"
      >
        <Compass
          size={22}
          color={isActive('/home') ? '#7C3AED' : '#6B7280'}
          strokeWidth={isActive('/home') ? 2.5 : 1.8}
        />
        <span
          className="text-[10px]"
          style={{ color: isActive('/home') ? '#7C3AED' : '#6B7280' }}
        >
          Discover
        </span>
      </button>

      <button
        onClick={() => navigate('/my-worlds')}
        className="flex flex-col items-center gap-1"
      >
        <MessageSquare
          size={22}
          color={isActive('/my-worlds') ? '#7C3AED' : '#6B7280'}
          strokeWidth={isActive('/my-worlds') ? 2.5 : 1.8}
        />
        <span
          className="text-[10px]"
          style={{ color: isActive('/my-worlds') ? '#7C3AED' : '#6B7280' }}
        >
          My Worlds
        </span>
      </button>

      <button
        onClick={() => navigate('/new-chat')}
        className="flex flex-col items-center gap-1"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: '#7C3AED' }}>
          <Plus size={22} color="white" strokeWidth={2.5} />
        </div>
        <span className="text-[10px]" style={{ color: '#7C3AED' }}>Create</span>
      </button>

      <button
        onClick={() => navigate('/profile')}
        className="flex flex-col items-center gap-1"
      >
        <User
          size={22}
          color={isActive('/profile') ? '#7C3AED' : '#6B7280'}
          strokeWidth={isActive('/profile') ? 2.5 : 1.8}
        />
        <span
          className="text-[10px]"
          style={{ color: isActive('/profile') ? '#7C3AED' : '#6B7280' }}
        >
          Profile
        </span>
      </button>

      <button
        onClick={() => setShowFeedback(true)}
        className="flex flex-col items-center gap-1"
      >
        <MessageSquarePlus size={22} color="#6B7280" strokeWidth={1.8} />
        <span className="text-[10px]" style={{ color: '#6B7280' }}>Feedback</span>
      </button>

      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  )
}
