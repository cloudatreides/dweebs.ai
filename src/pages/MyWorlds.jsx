import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Plus, Sparkles } from 'lucide-react'
import { mockChats, characters } from '../data/mockData'
import BottomNav from '../components/BottomNav'

export default function MyWorlds() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEmpty = searchParams.get('empty') === '1'

  const getChars = (ids) => ids.map(id => characters.find(c => c.id === id))

  return (
    <div className="flex flex-col min-h-dvh md:h-dvh md:overflow-y-auto pb-24 md:pb-8" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 md:pt-8 pb-4">
        <h1 className="text-xl font-bold text-white">My Worlds</h1>
        <div className="flex items-center gap-3">
          <button><Bell size={20} color="#6B7280" /></button>
          <button
            onClick={() => navigate('/new-chat')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background: '#7C3AED' }}
          >
            <Plus size={13} /> New
          </button>
        </div>
      </div>

      {isEmpty || mockChats.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#1A1A1F' }}>
            <Sparkles size={28} color="#7C3AED" />
          </div>
          <h2 className="text-lg font-bold text-white">Your worlds are waiting for you</h2>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Start your first group chat. Pick 2 characters and set the scene.
          </p>
          <button
            onClick={() => navigate('/new-chat')}
            className="mt-2 px-6 py-3 rounded-full font-semibold text-sm"
            style={{ border: '1.5px solid #7C3AED', color: '#A78BFA', background: 'transparent' }}
          >
            Build Your World →
          </button>
        </div>
      ) : (
        /* Chat List */
        <div className="flex flex-col gap-2 px-5">
          {mockChats.map((chat) => {
            const chars = getChars(chat.characterIds)
            return (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left w-full"
                style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Avatar cluster */}
                <div className="relative flex-shrink-0 w-12 h-10">
                  {chars[0] && (
                    <div className="absolute left-0 top-0 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-base z-10" style={{ background: chars[0].color + '33', border: `1.5px solid ${chars[0].color}55` }}>
                      {chars[0].avatar ? <img src={chars[0].avatar} alt={chars[0].name} className="w-full h-full object-cover" /> : chars[0].emoji}
                    </div>
                  )}
                  {chars[1] && (
                    <div className="absolute left-5 top-1 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-base" style={{ background: chars[1].color + '33', border: `1.5px solid ${chars[1].color}55` }}>
                      {chars[1].avatar ? <img src={chars[1].avatar} alt={chars[1].name} className="w-full h-full object-cover" /> : chars[1].emoji}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">{chat.name}</span>
                    {chat.isLive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44' }}>
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                    {chat.lastMessage}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-[11px] flex-shrink-0" style={{ color: '#4B5563' }}>
                  {chat.timestamp}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
