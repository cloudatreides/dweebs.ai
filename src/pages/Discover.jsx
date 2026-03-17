import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X, ChevronLeft, Camera, Lock, Globe, MessageCircle, ArrowUpDown, Sparkles, Pencil, Shuffle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCharacters } from '../context/CharacterContext'
import { useAuth } from '../context/AuthContext'
import { createChat, getUserChats, getChatMessages, addMessage } from '../lib/db'
import { trendingWorlds } from '../data/mockData'
import { generateCharacterProfile, generateCatchUpMessages, fetchCharacterImage } from '../lib/chatApi'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import CharacterAvatar from '../components/CharacterAvatar'

const FILTERS = ['All', 'K-pop', 'Anime', 'Music', 'Custom']

function formatCount(n) {
  if (!n) return null
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function CharacterCard({ char, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-2xl text-left w-full"
      style={{ background: '#1A1A1F', border: `1px solid ${char.isCustom ? '#7C3AED33' : 'rgba(255,255,255,0.04)'}` }}
    >
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: char.color + '33', border: `1.5px solid ${char.color}55` }}>
        {char.avatar && !imgFailed
          ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          : <span className="text-xl">{char.emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{char.name}</p>
            {char.isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#7C3AED22', color: '#A78BFA' }}>
                Custom
              </span>
            )}
            {char.isCustom && !char.isPublic && (
              <Lock size={11} color="#6B7280" className="flex-shrink-0" />
            )}
          </div>
          {formatCount(char.chatCount) && (
            <span className="flex items-center gap-1 text-[10px] flex-shrink-0" style={{ color: '#4B5563' }}>
              <MessageCircle size={10} />
              {formatCount(char.chatCount)}
            </span>
          )}
        </div>
        <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}>{char.fandom}</p>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {char.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: char.color + '22', color: char.color }}>
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs italic truncate" style={{ color: '#6B7280' }}>"{char.quote}"</p>
      </div>
    </button>
  )
}

function CharDetailContent({ char, navigate, onClose, userId }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [starting, setStarting] = useState(false)

  const handleSoloChat = async () => {
    if (starting) return
    setStarting(true)
    try {
      const newChat = await createChat({
        userId,
        name: char.name,
        scene: '',
        characterIds: [char.id],
      })
      onClose()
      navigate(`/chat/${newChat.id}`)
    } catch (err) {
      console.error('Failed to create solo chat:', err)
      setStarting(false)
    }
  }

  const handleAddToGroup = () => {
    onClose()
    navigate('/new-chat', { state: { preselectedCharId: char.id } })
  }

  return (
    <div className="px-5 pb-8 pt-2 text-center">
      <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-4xl mx-auto mb-3"
        style={{ background: char.color + '33', border: `2px solid ${char.color}55` }}>
        {char.avatar && !imgFailed
          ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          : <span>{char.emoji}</span>}
      </div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <h2 className="text-xl font-bold text-white">{char.name}</h2>
        {char.isCustom && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#7C3AED22', color: '#A78BFA' }}>Custom</span>
        )}
        {char.isCustom && !char.isPublic && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#6B728018', color: '#9CA3AF' }}>
            <Lock size={9} />Private
          </span>
        )}
      </div>
      <span className="inline-block mt-1 mb-3 text-xs px-3 py-1 rounded-full" style={{ background: '#242429', color: '#9CA3AF' }}>
        {char.fandom}
      </span>
      {char.chatCount && (
        <div className="flex items-center justify-center gap-1 mb-3 text-xs" style={{ color: '#4B5563' }}>
          <MessageCircle size={12} />
          <span>{formatCount(char.chatCount)} chats</span>
        </div>
      )}
      <div className="flex justify-center flex-wrap gap-2 mb-4">
        {char.tags.map(tag => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: char.color + '22', color: char.color }}>
            {tag}
          </span>
        ))}
      </div>
      <p className="text-sm italic leading-relaxed mb-6" style={{ color: '#9CA3AF' }}>"{char.bio}"</p>
      <div className="flex gap-3">
        <button
          onClick={handleSoloChat}
          disabled={starting}
          className="flex-1 py-3.5 rounded-full font-semibold text-sm transition-opacity"
          style={{ border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', background: 'transparent', opacity: starting ? 0.5 : 1 }}
        >
          {starting ? 'Creating...' : 'Solo Chat'}
        </button>
        <button
          onClick={handleAddToGroup}
          className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white"
          style={{ background: '#7C3AED' }}
        >
          Add to Group
        </button>
      </div>
    </div>
  )
}

function WorldCard({ world, characters, onClick }) {
  const chars = world.characterIds.map(id => characters.find(c => c.id === id)).filter(Boolean)
  const tagColors = { 'Hot': '#EF4444', 'Trending': '#F59E0B', 'Most Remixed': '#7C3AED', 'Classic': '#06B6D4' }
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[260px] p-4 rounded-2xl text-left flex flex-col gap-3"
      style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {chars.map((char, i) => (
            <div key={char.id} className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm border-2"
              style={{ background: char.color + '33', borderColor: '#1A1A1F', zIndex: chars.length - i }}>
              {char.avatar
                ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                : char.emoji}
            </div>
          ))}
        </div>
        {world.tag && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: (tagColors[world.tag] || '#6B7280') + '22', color: tagColors[world.tag] || '#6B7280' }}>
            {world.tag}
          </span>
        )}
      </div>
      <div>
        <p className="font-semibold text-sm text-white mb-1">{world.name}</p>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#9CA3AF' }}>{world.description}</p>
      </div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: '#4B5563' }}>
        <Shuffle size={10} />
        <span>{formatCount(world.remixCount)} remixes</span>
      </div>
    </button>
  )
}

const COLOR_OPTIONS = ['#00E5FF','#FF69B4','#FF8C00','#FFD700','#A78BFA','#FF4444','#22C55E','#F59E0B','#EC4899','#06B6D4','#8B5CF6','#EF4444']

const TRAIT_SUGGESTIONS = ['Dreamy','Fierce','Determined','Loyal','Chaotic','Soft','Mysterious','Energetic','Wise','Funny','Emotional','Fearless']

const DEFAULT_FORM = {
  name: '',
  fandom: '',
  category: 'Custom',
  avatarUrl: null,
  color: '#A78BFA',
  tags: [],
  tagInput: '',
  quote: '',
  bio: '',
  personality: '',
  emoji: '',
  isPublic: true,
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
  { value: 'newest', label: 'Newest' },
]

export default function Discover() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allCharacters, saveCustomCharacter, getCharacter } = useCharacters()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('popular')
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedChar, setSelectedChar] = useState(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [createStep, setCreateStep] = useState(1)
  const [createMode, setCreateMode] = useState('ai') // 'ai' or 'manual'
  const [aiName, setAiName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedWorld, setSelectedWorld] = useState(null)
  const [remixing, setRemixing] = useState(false)
  const [activeWorldIdx, setActiveWorldIdx] = useState(0)
  const worldsRef = useRef(null)
  const fileInputRef = useRef(null)

  // On login/mount: pre-generate catch-up messages for idle chats
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function checkCatchUps() {
      try {
        const chats = await getUserChats(user.id)
        for (const chat of chats) {
          if (cancelled) break
          if (chat.character_ids.length < 2) continue

          const msgs = await getChatMessages(chat.id)
          if (msgs.length === 0) continue

          const lastMsg = msgs[msgs.length - 1]
          const lastTime = new Date(lastMsg.created_at).getTime()
          const hoursAway = (Date.now() - lastTime) / (1000 * 60 * 60)
          if (hoursAway < 0.5) continue // less than 30 min

          const chars = chat.character_ids.map(cid => getCharacter(cid)).filter(Boolean)
          if (chars.length < 2) continue

          const recentMapped = msgs.slice(-6).map(m => ({
            type: m.sender_type,
            characterId: m.sender_id,
            text: m.content,
          }))

          const responses = await generateCatchUpMessages({
            characters: chars,
            scene: chat.scene,
            recentMessages: recentMapped,
            hoursAway,
          })

          if (cancelled || responses.length === 0) continue

          for (const { characterId, text } of responses) {
            await addMessage({
              groupChatId: chat.id,
              senderType: 'character',
              senderId: characterId,
              content: text,
            })
          }
        }
      } catch (err) {
        console.warn('Login catch-up failed:', err.message)
      }
    }

    checkCatchUps()
    return () => { cancelled = true }
  }, [user?.id])

  const filtered = allCharacters
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.fandom.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'All' || c.category === filter
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      if (a.isCustom && !b.isCustom) return 1
      if (!a.isCustom && b.isCustom) return -1
      if (sort === 'popular') return (b.chatCount || 0) - (a.chatCount || 0)
      if (sort === 'az') return a.name.localeCompare(b.name)
      if (sort === 'za') return b.name.localeCompare(a.name)
      if (sort === 'newest') return b.id.localeCompare(a.id)
      return 0
    })

  const handleCreateOpen = () => {
    setForm(DEFAULT_FORM)
    setCreateStep(1)
    setCreateMode('ai')
    setAiName('')
    setGenError('')
    setShowCreateSheet(true)
  }

  const handleCreateClose = () => {
    setShowCreateSheet(false)
    setCreateStep(1)
    setGenError('')
  }

  const handleRemix = async (world) => {
    if (remixing) return
    setRemixing(true)
    try {
      const charNames = world.characterIds.map(id => {
        const c = allCharacters.find(ch => ch.id === id)
        return c?.name.split(' ')[0]
      }).filter(Boolean)
      const newChat = await createChat({
        userId: user?.id,
        name: charNames.join(' × '),
        scene: world.scene,
        characterIds: world.characterIds,
      })
      setSelectedWorld(null)
      navigate(`/chat/${newChat.id}`)
    } catch (err) {
      console.error('Remix failed:', err)
    } finally {
      setRemixing(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!aiName.trim() || generating) return
    setGenerating(true)
    setGenError('')
    try {
      // Run profile generation and image fetch in parallel
      const [profile, imageUrl] = await Promise.all([
        generateCharacterProfile(aiName.trim()),
        fetchCharacterImage(aiName.trim()),
      ])
      setForm(f => ({
        ...f,
        name: profile.name || aiName.trim(),
        fandom: profile.fandom || '',
        category: profile.category || 'Custom',
        color: profile.color || '#A78BFA',
        tags: (profile.tags || []).slice(0, 4),
        quote: profile.quote || '',
        bio: profile.bio || '',
        personality: profile.personality || '',
        emoji: profile.emoji || '',
        avatarUrl: imageUrl || null,
        isPublic: true,
      }))
      setCreateStep(2) // jump to personality/review step
    } catch (err) {
      console.error('AI generation failed:', err)
      setGenError('Generation failed. Try again or switch to manual.')
    } finally {
      setGenerating(false)
    }
  }

  const addTag = (tag) => {
    const trimmed = tag.trim()
    if (trimmed && !form.tags.includes(trimmed) && form.tags.length < 4) {
      setForm(f => ({ ...f, tags: [...f.tags, trimmed], tagInput: '' }))
    }
  }

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm(f => ({ ...f, avatarUrl: url }))
  }

  const handleSaveCharacter = async () => {
    if (saving) return
    setSaving(true)
    try {
      const savedChar = await saveCustomCharacter({
        name: form.name,
        fandom: form.fandom || 'Custom',
        color: form.color,
        avatarUrl: form.avatarUrl || null,
        tags: form.tags,
        quote: form.quote || `Hi, I'm ${form.name}!`,
        bio: form.bio || `${form.name} — a character created just for you.`,
        personality: form.personality || '',
        emoji: form.emoji || '',
        isPublic: form.isPublic,
      })
      handleCreateClose()
      setSelectedChar(savedChar)
    } catch (err) {
      console.error('Failed to save character:', err)
    } finally {
      setSaving(false)
    }
  }

  const step1Valid = form.name.trim().length > 0
  const step2Valid = form.bio.trim().length > 0

  return (
    <div className="flex flex-col min-h-dvh md:h-dvh md:overflow-y-auto pb-24 md:pb-8" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 md:pt-8 pb-3">
        <h1 className="text-xl font-bold text-white">Discover</h1>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#1A1A1F' }}>
          <Search size={15} color="#6B7280" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search characters, fandoms..."
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-600"
          />
        </div>
      </div>

      {/* Filter pills + sort */}
      <div className="flex items-center gap-2 px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto flex-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={filter === f
                ? { background: '#7C3AED', color: 'white' }
                : { background: '#1A1A1F', color: '#9CA3AF' }
              }
            >
              {f}
            </button>
          ))}
        </div>
        {/* Sort dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{ background: sortOpen ? '#7C3AED22' : '#1A1A1F', color: sortOpen ? '#A78BFA' : '#9CA3AF', border: sortOpen ? '1px solid #7C3AED44' : '1px solid transparent' }}
          >
            <ArrowUpDown size={13} />
            {SORT_OPTIONS.find(o => o.value === sort)?.label}
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 min-w-[140px]"
              style={{ background: '#1E1E26', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{ color: sort === opt.value ? '#A78BFA' : '#9CA3AF', background: sort === opt.value ? '#7C3AED18' : 'transparent' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trending Worlds Carousel */}
      <div className="mb-5">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-sm font-semibold text-white">Trending Worlds</h2>
          <span className="text-[11px]" style={{ color: '#6B7280' }}>Tap to remix</span>
        </div>
        <div
          ref={worldsRef}
          className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          onScroll={(e) => {
            const el = e.target
            const cardWidth = el.firstChild?.offsetWidth || 260
            const gap = 16
            const idx = Math.round(el.scrollLeft / (cardWidth + gap))
            setActiveWorldIdx(Math.min(idx, trendingWorlds.length - 1))
          }}
        >
          {trendingWorlds.map(world => (
            <div key={world.id} className="snap-start">
              <WorldCard world={world} characters={allCharacters} onClick={() => setSelectedWorld(world)} />
            </div>
          ))}
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-2">
          {trendingWorlds.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeWorldIdx ? 16 : 6,
                height: 6,
                background: i === activeWorldIdx ? '#7C3AED' : '#374151',
              }}
            />
          ))}
        </div>
      </div>

      {/* Create your own card */}
      <div className="px-5 mb-3">
        <button
          onClick={handleCreateOpen}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
          style={{ background: 'linear-gradient(135deg, #7C3AED22, #1A1A1F)', border: '1px dashed #7C3AED55' }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#7C3AED22', border: '1.5px solid #7C3AED55' }}>
            <Plus size={20} color="#A78BFA" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">Create your own character</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Design a persona, set their vibe, add them to any chat</p>
          </div>
        </button>
      </div>

      {/* Character list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-5">
        {filtered.map(char => (
          <CharacterCard key={char.id} char={char} onClick={() => setSelectedChar(char)} />
        ))}
      </div>

      {/* Character Detail Sheet */}
      <BottomSheet isOpen={!!selectedChar} onClose={() => setSelectedChar(null)}>
        {selectedChar && <CharDetailContent char={selectedChar} navigate={navigate} onClose={() => setSelectedChar(null)} userId={user?.id} />}
      </BottomSheet>

      {/* Create Character Sheet */}
      <BottomSheet isOpen={showCreateSheet} onClose={handleCreateClose}>
        <div className="px-5 pb-8 pt-1">
          {/* Sheet header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {createStep > 1 && (
                <button onClick={() => setCreateStep(s => s - 1)}>
                  <ChevronLeft size={20} color="#9CA3AF" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-white">Create Character</h2>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {createMode === 'ai' && createStep === 1 ? 'Choose a mode' :
                   createMode === 'ai' && createStep === 2 ? 'Review & edit' :
                   createMode === 'ai' && createStep === 3 ? 'Preview' :
                   `Step ${createStep} of 3`}
                </p>
              </div>
            </div>
            {/* Step dots */}
            <div className="flex gap-1.5">
              {[1,2,3].map(s => (
                <div key={s} className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: s <= createStep ? '#7C3AED' : '#374151' }} />
              ))}
            </div>
          </div>

          {/* Step 1 — Identity */}
          <AnimatePresence mode="wait">
            {createStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                {/* Mode toggle */}
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#1A1A1F' }}>
                  <button
                    onClick={() => setCreateMode('ai')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={createMode === 'ai'
                      ? { background: '#7C3AED', color: 'white' }
                      : { background: 'transparent', color: '#6B7280' }}
                  >
                    <Sparkles size={14} />
                    AI Generate
                  </button>
                  <button
                    onClick={() => setCreateMode('manual')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={createMode === 'manual'
                      ? { background: '#7C3AED', color: 'white' }
                      : { background: 'transparent', color: '#6B7280' }}
                  >
                    <Pencil size={14} />
                    Manual
                  </button>
                </div>

                {/* AI Generate mode */}
                {createMode === 'ai' && (
                  <div className="flex flex-col gap-4">
                    <div className="text-center py-2">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: '#7C3AED22', border: '1.5px solid #7C3AED44' }}>
                        <Sparkles size={24} color="#A78BFA" />
                      </div>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        Type any character name and AI will generate their full profile
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Character Name</p>
                      <input
                        value={aiName}
                        onChange={e => { setAiName(e.target.value); setGenError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="e.g. Shadow the Hedgehog, Gojo Satoru, Billie Eilish..."
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                        style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                        maxLength={60}
                        disabled={generating}
                      />
                    </div>

                    {genError && (
                      <p className="text-xs text-center" style={{ color: '#F87171' }}>{genError}</p>
                    )}

                    <button
                      onClick={handleAiGenerate}
                      disabled={!aiName.trim() || generating}
                      className="w-full py-4 rounded-full font-semibold text-white text-[15px] transition-opacity flex items-center justify-center gap-2"
                      style={{ background: '#7C3AED', opacity: (aiName.trim() && !generating) ? 1 : 0.4 }}
                    >
                      {generating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generate Character
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Manual mode */}
                {createMode === 'manual' && (
                  <div className="flex flex-col gap-4">
                    {/* Avatar upload */}
                    <div className="flex flex-col items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                        style={{ background: form.color + '22', border: `2px dashed ${form.color}66` }}
                      >
                        {form.avatarUrl ? (
                          <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera size={22} color={form.color} />
                            <span className="text-[10px] font-medium" style={{ color: form.color }}>Upload</span>
                          </div>
                        )}
                        {form.avatarUrl && (
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <Camera size={20} color="white" />
                          </div>
                        )}
                      </button>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Tap to upload a photo</p>

                      {/* Accent color */}
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-center" style={{ color: '#6B7280' }}>Accent Color</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {COLOR_OPTIONS.map(c => (
                            <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                              className="w-7 h-7 rounded-full transition-all"
                              style={{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Name</p>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Shadow the Hedgehog"
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                        style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                        maxLength={40}
                      />
                    </div>

                    {/* Fandom */}
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Fandom / Universe</p>
                      <input
                        value={form.fandom}
                        onChange={e => setForm(f => ({ ...f, fandom: e.target.value }))}
                        placeholder="e.g. Sonic · Video Games"
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                        style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                        maxLength={40}
                      />
                    </div>

                    {/* Visibility */}
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#6B7280' }}>Visibility</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm(f => ({ ...f, isPublic: true }))}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                          style={form.isPublic
                            ? { background: '#7C3AED22', border: '1.5px solid #7C3AED', color: '#A78BFA' }
                            : { background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }}
                        >
                          <Globe size={14} />
                          Public
                        </button>
                        <button
                          onClick={() => setForm(f => ({ ...f, isPublic: false }))}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                          style={!form.isPublic
                            ? { background: '#7C3AED22', border: '1.5px solid #7C3AED', color: '#A78BFA' }
                            : { background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }}
                        >
                          <Lock size={14} />
                          Private
                        </button>
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: '#4B5563' }}>
                        {form.isPublic ? 'Others can discover and chat with this character' : 'Only visible to you'}
                      </p>
                    </div>

                    <button
                      onClick={() => setCreateStep(2)}
                      disabled={!step1Valid}
                      className="w-full py-4 rounded-full font-semibold text-white text-[15px] mt-1 transition-opacity"
                      style={{ background: '#7C3AED', opacity: step1Valid ? 1 : 0.4 }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2 — Personality */}
            {createStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                {/* AI mode: show generated name + fandom (editable) */}
                {createMode === 'ai' && (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#7C3AED11', border: '1px solid #7C3AED33' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
                        style={{ background: form.color + '33', border: `1.5px solid ${form.color}55` }}
                      >
                        {form.avatarUrl
                          ? <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          : (form.emoji || '✨')}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.5)' }}>
                          <Camera size={14} color="white" />
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{form.name}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{form.fandom}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#22C55E22', color: '#22C55E' }}>AI Generated</span>
                    </div>

                    {/* Editable name & fandom */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Name</p>
                        <input
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                          maxLength={40}
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Fandom</p>
                        <input
                          value={form.fandom}
                          onChange={e => setForm(f => ({ ...f, fandom: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                          maxLength={40}
                        />
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#6B7280' }}>Accent Color</p>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map(c => (
                          <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                            className="w-6 h-6 rounded-full transition-all"
                            style={{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Traits */}
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#6B7280' }}>
                    Traits <span style={{ color: '#4B5563' }}>(up to 4)</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {TRAIT_SUGGESTIONS.map(t => {
                      const selected = form.tags.includes(t)
                      return (
                        <button key={t} onClick={() => selected ? removeTag(t) : addTag(t)}
                          className="text-xs px-3 py-1.5 rounded-full transition-all"
                          style={selected
                            ? { background: form.color + '33', color: form.color, border: `1px solid ${form.color}55` }
                            : { background: '#1A1A1F', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }
                          }>
                          {t}
                        </button>
                      )
                    })}
                  </div>
                  {/* Selected tags (includes AI-generated ones not in suggestions) */}
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                          style={{ background: form.color + '22', color: form.color }}>
                          {tag}
                          <button onClick={() => removeTag(tag)}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>
                    Who are they?
                  </p>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 200) }))}
                    placeholder="Describe their personality, backstory, how they speak and what they care about..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                    style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                  <p className="text-right text-[11px] mt-1" style={{ color: form.bio.length > 170 ? '#F87171' : '#4B5563' }}>
                    {form.bio.length}/200
                  </p>
                </div>

                {/* Signature quote */}
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>
                    Signature quote <span style={{ color: '#4B5563' }}>(optional)</span>
                  </p>
                  <input
                    value={form.quote}
                    onChange={e => setForm(f => ({ ...f, quote: e.target.value.slice(0, 80) }))}
                    placeholder={`Something ${form.name || 'they'} would say...`}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </div>

                <button
                  onClick={() => setCreateStep(3)}
                  disabled={!step2Valid}
                  className="w-full py-4 rounded-full font-semibold text-white text-[15px] mt-1 transition-opacity"
                  style={{ background: '#7C3AED', opacity: step2Valid ? 1 : 0.4 }}
                >
                  Preview →
                </button>
              </motion.div>
            )}

            {/* Step 3 — Preview */}
            {createStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-4xl"
                  style={{ background: form.color + '33', border: `2px solid ${form.color}55` }}>
                  {form.avatarUrl
                    ? <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : (form.emoji || '🎤')}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{form.name}</h3>
                  <span className="inline-block text-xs px-3 py-1 rounded-full" style={{ background: '#242429', color: '#9CA3AF' }}>
                    {form.fandom || 'Custom'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                    style={{ background: form.isPublic ? '#22C55E18' : '#6B728018', color: form.isPublic ? '#22C55E' : '#9CA3AF' }}>
                    {form.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                    {form.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: form.color + '22', color: form.color }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm italic leading-relaxed" style={{ color: '#9CA3AF' }}>
                  "{form.bio}"
                </p>
                {form.quote && (
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    ✦ "{form.quote}"
                  </p>
                )}

                <div className="w-full flex flex-col gap-3 mt-2">
                  <button
                    onClick={handleSaveCharacter}
                    disabled={saving}
                    className="w-full py-4 rounded-full font-semibold text-white text-[15px] transition-opacity"
                    style={{ background: '#7C3AED', opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? 'Saving...' : 'Add to Roster →'}
                  </button>
                  <button
                    onClick={() => setCreateStep(2)}
                    className="w-full py-3 text-sm"
                    style={{ color: '#6B7280' }}
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BottomSheet>

      {/* World Detail / Remix Sheet */}
      <BottomSheet isOpen={!!selectedWorld} onClose={() => setSelectedWorld(null)}>
        {selectedWorld && (() => {
          const chars = selectedWorld.characterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean)
          return (
            <div className="px-5 pb-8 pt-2">
              <div className="flex justify-center -space-x-3 mb-4">
                {chars.map((char, i) => (
                  <div key={char.id} className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-2xl border-3"
                    style={{ background: char.color + '33', border: `3px solid #0D0D0F`, zIndex: chars.length - i }}>
                    {char.avatar
                      ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                      : char.emoji}
                  </div>
                ))}
              </div>
              <h2 className="text-xl font-bold text-white text-center mb-1">{selectedWorld.name}</h2>
              <p className="text-xs text-center mb-4" style={{ color: '#6B7280' }}>
                {chars.map(c => c.name).join(' × ')}
              </p>
              <div className="flex items-center justify-center gap-1 mb-4 text-xs" style={{ color: '#4B5563' }}>
                <Shuffle size={12} />
                <span>{formatCount(selectedWorld.remixCount)} remixes</span>
              </div>
              <div className="p-3 rounded-xl mb-5" style={{ background: '#1A1A1F' }}>
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>Scenario</p>
                <p className="text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>{selectedWorld.scene}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {chars.map(char => (
                  <div key={char.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: char.color + '15', border: `1px solid ${char.color}33` }}>
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-xs"
                      style={{ background: char.color + '33' }}>
                      {char.avatar
                        ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                        : char.emoji}
                    </div>
                    <span className="text-xs font-medium" style={{ color: char.color }}>{char.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleRemix(selectedWorld)}
                disabled={remixing}
                className="w-full py-4 rounded-full font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-opacity"
                style={{ background: '#7C3AED', opacity: remixing ? 0.6 : 1 }}
              >
                {remixing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shuffle size={16} />
                    Remix this World
                  </>
                )}
              </button>
            </div>
          )
        })()}
      </BottomSheet>

      <BottomNav />
    </div>
  )
}
