import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Compass, MessageSquare, Plus, User, LogOut, ChevronUp, Gift, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCharacters } from '../context/CharacterContext'
import { getUserChats, getUserAura } from '../lib/db'
import AuraIcon from './AuraIcon'

export default function DesktopSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { getCharacter } = useCharacters()
  const path = location.pathname
  const isActive = (route) => path === route || path.startsWith(route + '/')

  const [chats, setChats] = useState([])
  const [aura, setAura] = useState(0)
  const [auraOpen, setAuraOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserChats(user.id)
      .then(data => setChats(data))
      .catch(err => console.error('Sidebar: failed to load chats:', err))
    getUserAura(user.id)
      .then(val => setAura(val))
      .catch(() => {})
  }, [user, path])

  return (
    <div className="flex flex-col h-full w-full" style={{
      background: '#0D0D0F',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div className="px-6 pt-8 pb-5 cursor-pointer" onClick={() => navigate('/home')}>
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
      <div className="px-3 flex-1 overflow-y-auto">
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

      {/* Aura + Logout */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Aura Card */}
        <div className="relative mb-2">
          <button
            onClick={() => setAuraOpen(o => !o)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all"
            style={{ background: auraOpen ? '#7C3AED18' : 'transparent', border: auraOpen ? '1px solid #7C3AED33' : '1px solid transparent' }}
          >
            <div className="flex items-center gap-2.5">
              <AuraIcon size={18} />
              <span className="text-sm font-semibold" style={{ color: '#A78BFA' }}>{aura.toLocaleString()} Aura</span>
            </div>
            <ChevronUp
              size={14}
              color="#6B7280"
              className="transition-transform"
              style={{ transform: auraOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </button>

          {/* Aura Popover */}
          {auraOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl p-4 flex flex-col gap-3"
              style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)' }}
            >
              {/* What is Aura */}
              <div className="flex items-start gap-2.5">
                <Info size={14} color="#6B7280" className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">What is Aura?</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                    Share Worlds to Discover. When others try your worlds, you earn Aura. Redeem for Pro access.
                  </p>
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* Rewards */}
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#6B7280' }}>Redeem</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: '1 Day Pro', cost: 500 },
                    { label: '1 Week Pro', cost: 2000 },
                    { label: '1 Month Pro', cost: 6000 },
                  ].map(reward => {
                    const canAfford = aura >= reward.cost
                    return (
                      <button
                        key={reward.label}
                        disabled={!canAfford}
                        className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                        style={{
                          background: canAfford ? '#7C3AED18' : '#0D0D0F',
                          border: canAfford ? '1px solid #7C3AED44' : '1px solid rgba(255,255,255,0.04)',
                          opacity: canAfford ? 1 : 0.5,
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Gift size={13} color={canAfford ? '#A78BFA' : '#4B5563'} />
                          <span className="text-xs font-medium" style={{ color: canAfford ? 'white' : '#6B7280' }}>{reward.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AuraIcon size={12} color={canAfford ? '#A78BFA' : '#4B5563'} />
                          <span className="text-[11px] font-medium" style={{ color: canAfford ? '#A78BFA' : '#4B5563' }}>
                            {reward.cost.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Earn more */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#7C3AED11' }}>
                <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  +10 per try on your worlds · Bonuses at 50 & 200 tries
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all hover:opacity-80"
          style={{ color: '#6B7280' }}
        >
          <LogOut size={17} strokeWidth={1.8} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  )
}
