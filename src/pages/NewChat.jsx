import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X, Sparkles } from 'lucide-react'
import { characters } from '../data/mockData'
import { SCENE_TEMPLATES } from '../data/sceneTemplates'
import { useAuth } from '../context/AuthContext'
import { createChat } from '../lib/db'
import CharacterAvatar from '../components/CharacterAvatar'
import BottomSheet from '../components/BottomSheet'

const MAX_SCENE = 200

export default function NewChat() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [selectedIds, setSelectedIds] = useState([])
  const [groupName, setGroupName] = useState('')
  const [scene, setScene] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [creating, setCreating] = useState(false)

  const selectedChars = selectedIds.map(id => characters.find(c => c.id === id))
  const available = characters.filter(c => !selectedIds.includes(c.id))

  const autoName = (ids) => {
    const names = ids.map(id => characters.find(c => c.id === id)?.name.split(' ')[0])
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

  const surpriseMe = () => {
    const names = selectedIds.map(id => characters.find(c => c.id === id)?.name.split(' ')[0])
    const template = SCENE_TEMPLATES[Math.floor(Math.random() * SCENE_TEMPLATES.length)]
    let result = template
    names.forEach((name, i) => {
      result = result.replace(new RegExp(`\\{char${i + 1}\\}`, 'g'), name)
    })
    result = result.replace(/\{char\d\}/g, names[names.length - 1] || '')
    setScene(result.slice(0, MAX_SCENE))
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
              onClick={surpriseMe}
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
      <BottomSheet isOpen={showPicker} onClose={() => setShowPicker(false)}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-white mb-4">Add Character</h2>
          <div className="flex flex-col gap-3">
            {available.map(char => (
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
    </div>
  )
}
