import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Compass, MessageSquare, Plus, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCharacters } from '../context/CharacterContext'
import { getUserChats } from '../lib/db'

export default function DesktopSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { getCharacter } = useCharacters()
  const path = location.pathname
  const isActive = (route) => path === route || path.startsWith(route + '/')

  const [chats, setChats] = useState([])

  useEffect(() => {
    if (!user) return
    getUserChats(user.id)
      .then(data => setChats(data))
      .catch(err => console.error('Sidebar: failed to load chats:', err))
  }, [user, path]) // refetch when navigating (e.g. after creating a new chat)

  return (
    <div className="flex flex-col h-full w-full" style={{
      background: '#0D0D0F',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div className="px-6 pt-8 pb-5">
        <span className="text-xl font-bold text-white tracking-tight">
          dweebs<span style={{ color: '#7C3AED' }}>.ai</span>
        </span>
        <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Your characters are waiting</p>
      </div>

      {/* New Chat CTA */}
      <div className="px-4 mb-5">
        <button
          onClick={() => navigate('/new-chat')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: '#7C3AED' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      {/* Nav links — Discover & Profile */}
      <div className="px-3 mb-2">
        {[
          { Icon: Compass, label: 'Discover', route: '/home' },
          { Icon: MessageSquare, label: 'My Worlds', route: '/my-worlds' },
          { Icon: User, label: 'Profile', route: '/profile' },
        ].map(({ Icon, label, route }) => (
          <button
            key={route}
            onClick={() => navigate(route)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all"
            style={{
              color: isActive(route) ? '#A78BFA' : '#6B7280',
              background: isActive(route) ? '#7C3AED22' : 'transparent',
            }}
          >
            <Icon size={17} strokeWidth={isActive(route) ? 2.5 : 1.8} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px mx-5 mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Chat list */}
      <div className="px-3 flex-1 overflow-y-auto pb-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase px-2 mb-2" style={{ color: '#4B5563' }}>
          My Worlds
        </p>
        <div className="flex flex-col gap-0.5">
          {chats.map(chat => {
            const chars = (chat.character_ids || []).map(id => getCharacter(id)).filter(Boolean)
            const active = path === `/chat/${chat.id}`
            return (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all"
                style={{ background: active ? '#7C3AED22' : 'transparent' }}
              >
                {/* Avatar cluster */}
                <div className="relative flex-shrink-0" style={{ width: Math.min(chars.length, 2) * 12 + 26, height: 28 }}>
                  {chars.slice(0, 2).map((char, i) => (
                    <div
                      key={char.id}
                      className="absolute rounded-full overflow-hidden flex items-center justify-center text-xs"
                      style={{
                        width: 26, height: 26,
                        left: i * 12,
                        background: char.color + '33',
                        border: `1.5px solid ${char.color}55`,
                        zIndex: 2 - i,
                      }}
                    >
                      {char.avatar
                        ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                        : char.emoji}
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: active ? '#A78BFA' : '#E5E7EB' }}>
                    {chat.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#4B5563' }}>
                    {chars.map(c => c.name.split(' ')[0]).join(', ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
