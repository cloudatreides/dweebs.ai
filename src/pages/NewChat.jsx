import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Plus, X, Sparkles, Search, RefreshCw } from 'lucide-react'
import { SCENE_TEMPLATES, MOODS } from '../data/sceneTemplates'
import { useAuth } from '../context/AuthContext'
import { useCharacters } from '../context/CharacterContext'
import { createChat } from '../lib/db'
import CharacterAvatar from '../components/CharacterAvatar'
import BottomSheet from '../components/BottomSheet'

const MAX_SCENE = 200

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function resolveTemplate(template, names) {
  let result = template
  names.forEach((name, i) => {
    result = result.replace(new RegExp(`\\{char${i + 1}\\}`, 'g'), name)
  })
  result = result.replace(/\{char\d\}/g, names[names.length - 1] || '')
  return result.slice(0, MAX_SCENE)
}

function SurpriseSheet({ isOpen, onClose, names, onSelect }) {
  const [activeMood, setActiveMood] = useState('all')
  const [suggestions, setSuggestions] = useState([])
  const [rolling, setRolling] = useState(false)

  const roll = (mood, animate = false) => {
    const pool = mood === 'all'
      ? SCENE_TEMPLATES
      : SCENE_TEMPLATES.filter(t => t.mood === mood)
    if (animate) {
      setRolling(true)
      setSuggestions([])
      setTimeout(() => {
        setSuggestions(pickRandom(pool, 3))
        setRolling(false)
      }, 900)
    } else {
      setSuggestions(pickRandom(pool, 3))
    }
  }

  useEffect(() => {
    if (isOpen) roll(activeMood)
  }, [isOpen])

  const handleMood = (id) => {
    setActiveMood(id)
    roll(id)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pb-8 pt-2 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Surprise Me</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Pick a vibe, tap a scene to use it</p>
          </div>
          <button
            onClick={() => roll(activeMood, true)}
            disabled={rolling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA', opacity: rolling ? 0.6 : 1 }}
          >
            <RefreshCw size={11} className={rolling ? 'animate-spin' : ''} />
            {rolling ? 'Rolling...' : 'Roll Again'}
          </button>
        </div>

        {/* Mood pills */}
        <div className="flex gap-2 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => handleMood(m.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={activeMood === m.id
                ? { background: m.color + '28', border: `1px solid ${m.color}66`, color: m.color }
                : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Scene cards */}
        <div className="flex flex-col gap-3">
          {rolling && [0, 1, 2].map(i => (
            <div key={i} className="p-4 rounded-2xl flex flex-col gap-2 animate-pulse" style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="h-3 w-16 rounded-full" style={{ background: '#2D2D35' }} />
              <div className="h-3 w-full rounded-full" style={{ background: '#2D2D35' }} />
              <div className="h-3 w-4/5 rounded-full" style={{ background: '#2D2D35' }} />
            </div>
          ))}
          {!rolling && suggestions.map((t, i) => {
            const resolved = resolveTemplate(t.text, names)
            const mood = MOODS.find(m => m.id === t.mood)
            return (
              <button
                key={i}
                onClick={() => { onSelect(resolved); onClose() }}
                className="text-left p-4 rounded-2xl flex flex-col gap-2 transition-all active:scale-[0.98]"
                style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                  style={{ background: mood?.color + '20', color: mood?.color }}
                >
                  {mood?.label}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>{resolved}</p>
                <span className="text-xs" style={{ color: '#4B5563' }}>Tap to use →</span>
              </button>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}

export default function NewChat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { allCharacters, getCharacter } = useCharacters()

  const preselectedId = location.state?.preselectedCharId
  const [selectedIds, setSelectedIds] = useState(preselectedId ? [preselectedId] : [])
  const [groupName, setGroupName] = useState('')
  const [scene, setScene] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [showSurprise, setShowSurprise] = useState(false)
  const [creating, setCreating] = useState(false)
  const [charSearch, setCharSearch] = useState('')

  useEffect(() => {
    if (preselectedId) {
      const char = getCharacter(preselectedId)
      if (char) setGroupName(char.name.split(' ')[0])
    }
  }, [])

  const selectedChars = selectedIds.map(id => getCharacter(id)).filter(Boolean)
  const available = allCharacters.filter(c => !selectedIds.includes(c.id))
  const charNames = selectedIds.map(id => getCharacter(id)?.name.split(' ')[0]).filter(Boolean)

  const autoName = (ids) => {
    const names = ids.map(id => getCharacter(id)?.name.split(' ')[0]).filter(Boolean)
    return names.join(' × ')
  }

  const toggleChar = (id) => {
    const newIds = selectedIds.filter(i => i !== id)
    setSelectedIds(newIds)
    setGroupName(autoName(newIds))
  }

  const addChar = (id) => {
    const newIds = [...selectedIds, id]
    setSelectedIds(newIds)
    setGroupName(autoName(newIds))
    setShowPicker(false)
  }

  const canStart = selectedIds.length >= 1

  const handleStart = async () => {
    if (creating) return
    setCreating(true)
    try {
      const newChat = await createChat({
        userId: user.id,
        name: groupName || autoName(selectedIds),
        scene: scene || '',
        characterIds: selectedIds,
      })
      navigate(`/chat/${newChat.id}`)
    } catch (err) {
      console.error('Failed to create chat:', err)
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 md:pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate(-1)}>
          <ChevronLeft size={22} color="#9CA3AF" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 text-center mr-7">New Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        {/* Choose Characters */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: '#6B7280' }}>
            Choose Characters
          </p>
          <div className="flex gap-3 flex-wrap">
            {selectedChars.map(char => char && (
              <div key={char.id} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-2xl"
                    style={{ background: char.color + '33', border: `1.5px solid ${char.color}55` }}
                  >
                    {char.avatar
                      ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                      : char.emoji}
                  </div>
                  <button
                    onClick={() => toggleChar(char.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#374151' }}
                  >
                    <X size={10} color="white" />
                  </button>
                </div>
                <span className="text-[11px] text-white font-medium">{char.name.split(' ')[0]}</span>
              </div>
            ))}
            {selectedIds.length < 5 && (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setShowPicker(true)}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ border: '1.5px dashed rgba(255,255,255,0.15)', background: 'transparent' }}
                >
                  <Plus size={20} color="#6B7280" />
                </button>
                <span className="text-[11px]" style={{ color: '#6B7280' }}>Add</span>
              </div>
            )}
          </div>
        </div>

        {/* Group Name */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#6B7280' }}>
            Group Name
          </p>
          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="e.g. Miku × Ariana — Late Night Session"
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#374151]"
            style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
          />
        </div>

        {/* Set the Scene */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#6B7280' }}>
              Set the Scene
            </p>
            <button
              onClick={() => setShowSurprise(true)}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-opacity"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.35)',
                color: selectedIds.length === 0 ? '#4B5563' : '#A78BFA',
                opacity: selectedIds.length === 0 ? 0.5 : 1,
              }}
            >
              <Sparkles size={11} />
              Surprise Me
            </button>
          </div>
          <div className="relative">
            <textarea
              value={scene}
              onChange={e => setScene(e.target.value.slice(0, MAX_SCENE))}
              rows={4}
              placeholder="Describe where they are and what's happening. The more specific, the better."
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none placeholder:text-[#374151]"
              style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            {scene.length > 0 && (
              <span className="absolute bottom-3 right-3 text-[11px]" style={{ color: scene.length > 180 ? '#F87171' : '#6B7280' }}>
                {scene.length} / {MAX_SCENE}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={handleStart}
          disabled={!canStart || creating}
          className="w-full py-4 rounded-full font-semibold text-white text-[15px] transition-opacity"
          style={{ background: '#7C3AED', opacity: (canStart && !creating) ? 1 : 0.4 }}
        >
          {creating ? 'Creating...' : 'Start Chatting →'}
        </button>
      </div>

      {/* Character Picker Sheet */}
      <BottomSheet isOpen={showPicker} onClose={() => { setShowPicker(false); setCharSearch('') }}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-white mb-3">Add Character</h2>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search characters..."
              value={charSearch}
              onChange={e => setCharSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none"
              style={{ background: '#1A1A1F' }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {available.filter(c => {
              if (!charSearch.trim()) return true
              const q = charSearch.toLowerCase()
              return c.name.toLowerCase().includes(q) || c.fandom?.toLowerCase().includes(q) || c.tags?.some(t => t.toLowerCase().includes(q))
            }).map(char => (
              <button
                key={char.id}
                onClick={() => addChar(char.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: '#1A1A1F' }}
              >
                <CharacterAvatar character={char} size={40} />
                <div>
                  <p className="font-semibold text-sm text-white">{char.name}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{char.fandom}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Surprise Me Sheet */}
      <SurpriseSheet
        isOpen={showSurprise}
        onClose={() => setShowSurprise(false)}
        names={charNames}
        onSelect={setScene}
      />
    </div>
  )
}
