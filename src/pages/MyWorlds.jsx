import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Sparkles, LogOut, Archive, ArchiveRestore, ChevronDown, MoreVertical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCharacters } from '../context/CharacterContext'
import { getUserChats } from '../lib/db'
import BottomNav from '../components/BottomNav'

function getArchivedIds(userId) {
  try {
    return JSON.parse(localStorage.getItem(`archived_chats_${userId}`) || '[]')
  } catch { return [] }
}

function setArchivedIds(userId, ids) {
  localStorage.setItem(`archived_chats_${userId}`, JSON.stringify(ids))
}

export default function MyWorlds() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, signOut } = useAuth()
  const { getCharacter } = useCharacters()
  const isEmpty = searchParams.get('empty') === '1'

  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [archivedIds, setArchivedIdsState] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    setArchivedIdsState(getArchivedIds(user.id))
    getUserChats(user.id)
      .then(data => setChats(data))
      .catch(err => console.error('Failed to load chats:', err))
      .finally(() => setLoading(false))
  }, [user])

  const getChars = (ids) => ids.map(id => getCharacter(id)).filter(Boolean)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleArchive = (e, chatId) => {
    e.stopPropagation()
    const updated = [...archivedIds, chatId]
    setArchivedIdsState(updated)
    setArchivedIds(user.id, updated)
  }

  const handleUnarchive = (e, chatId) => {
    e.stopPropagation()
    const updated = archivedIds.filter(id => id !== chatId)
    setArchivedIdsState(updated)
    setArchivedIds(user.id, updated)
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  const activeChats = chats.filter(c => !archivedIds.includes(c.id))
  const archivedChats = chats.filter(c => archivedIds.includes(c.id))

  const renderChat = (chat, archived = false) => {
    const chars = getChars(chat.character_ids)
    const isMenuOpen = menuOpenId === chat.id
    return (
      <div key={chat.id} className="relative flex items-center gap-2">
        <button
          onClick={() => navigate(`/chat/${chat.id}`)}
          className="flex items-center gap-3 p-4 rounded-2xl text-left flex-1 min-w-0 transition-opacity"
          style={{
            background: '#1A1A1F',
            border: '1px solid rgba(255,255,255,0.04)',
            opacity: archived ? 0.6 : 1,
          }}
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
            <span className="font-semibold text-sm text-white truncate block">{chat.name}</span>
            <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
              {chars.map(c => c.name.split(' ')[0]).join(', ')}
            </p>
          </div>

          {/* Timestamp */}
          <span className="text-[11px] flex-shrink-0" style={{ color: '#4B5563' }}>
            {formatTime(chat.updated_at)}
          </span>
        </button>

        {/* 3-dot menu */}
        <div className="relative flex-shrink-0" ref={isMenuOpen ? menuRef : null}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : chat.id) }}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: isMenuOpen ? '#242429' : '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <MoreVertical size={15} color="#6B7280" />
          </button>
          {isMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[140px]"
              style={{ background: '#1E1E26', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            >
              <button
                onClick={(e) => { archived ? handleUnarchive(e, chat.id) : handleArchive(e, chat.id); setMenuOpenId(null) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                style={{ color: '#9CA3AF' }}
              >
                {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {archived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto pb-24 md:pb-8" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 md:pt-8 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">My Worlds</h1>
          {profile && (
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{profile.display_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSignOut} title="Sign out">
            <LogOut size={18} color="#6B7280" />
          </button>
          <button
            onClick={() => navigate('/new-chat')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background: '#7C3AED' }}
          >
            <Plus size={13} /> New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
        </div>
      ) : isEmpty || chats.length === 0 ? (
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
        <div className="flex flex-col gap-2 px-5">
          {/* Active chats */}
          {activeChats.map(chat => renderChat(chat, false))}

          {/* Archived section */}
          {archivedChats.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowArchived(o => !o)}
                className="flex items-center gap-2 px-1 py-2 w-full text-left"
              >
                <Archive size={13} color="#4B5563" />
                <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#4B5563' }}>
                  Archived ({archivedChats.length})
                </span>
                <ChevronDown
                  size={13}
                  color="#4B5563"
                  className="transition-transform ml-auto"
                  style={{ transform: showArchived ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {showArchived && (
                <div className="flex flex-col gap-2 mt-1">
                  {archivedChats.map(chat => renderChat(chat, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
