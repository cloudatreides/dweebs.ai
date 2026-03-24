import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ArrowLeft, MessageSquarePlus, Brain, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAllUserWorldMemories, getUserFacts, getUserChats, deleteMemoryEntry, deleteUserFact, clearWorldMemory } from '../lib/db'
import BottomNav from '../components/BottomNav'
import AuraIcon from '../components/AuraIcon'
import FeedbackModal from '../components/FeedbackModal'

export default function Profile() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [showFeedback, setShowFeedback] = useState(false)

  const [username, setUsername] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [worldMemories, setWorldMemories] = useState([])
  const [userFactsData, setUserFactsData] = useState(null)
  const [worldNames, setWorldNames] = useState({})
  const [memoryLoading, setMemoryLoading] = useState(true)
  const [clearConfirm, setClearConfirm] = useState(null) // worldId being confirmed

  // Sync from profile when it loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.display_name || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadMemories() {
      setMemoryLoading(true)
      try {
        const [memories, facts, chats] = await Promise.all([
          getAllUserWorldMemories(user.id),
          getUserFacts(),
          getUserChats(user.id),
        ])
        if (cancelled) return
        setWorldMemories(memories || [])
        setUserFactsData(facts)
        setWorldNames(Object.fromEntries((chats || []).map(c => [c.id, c.name])))
      } catch (err) {
        console.error('Failed to load memories:', err)
      } finally {
        if (!cancelled) setMemoryLoading(false)
      }
    }
    loadMemories()
    return () => { cancelled = true }
  }, [user])

  function parseFacts(facts) {
    if (!facts) return []
    return typeof facts === 'string' ? JSON.parse(facts) : facts
  }

  async function handleDeleteWorldFact(worldId, factIndex) {
    setWorldMemories(prev => prev.map(m =>
      m.world_id === worldId
        ? { ...m, facts: parseFacts(m.facts).filter((_, i) => i !== factIndex) }
        : m
    ))
    try {
      await deleteMemoryEntry(worldId, factIndex)
    } catch (err) {
      console.error('Failed to delete memory:', err)
    }
  }

  async function handleDeleteUserFact(factIndex) {
    setUserFactsData(prev => {
      if (!prev) return prev
      const updated = parseFacts(prev.facts).filter((_, i) => i !== factIndex)
      return { ...prev, facts: updated }
    })
    try {
      await deleteUserFact(factIndex)
    } catch (err) {
      console.error('Failed to delete user fact:', err)
    }
  }

  async function handleClearWorld(worldId) {
    setClearConfirm(null)
    setWorldMemories(prev => prev.filter(m => m.world_id !== worldId))
    try {
      await clearWorldMemory(worldId)
    } catch (err) {
      console.error('Failed to clear world memory:', err)
    }
  }

  const initials = (profile?.display_name || user?.email || 'U').charAt(0).toUpperCase()

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = profile?.avatar_url ?? null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('profile-avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('profile-avatars')
          .getPublicUrl(path)
        avatarUrl = publicUrl
      }

      await updateProfile({
        displayName: username.trim() || profile?.display_name,
        avatarUrl,
      })
      setSaved(true)
      setAvatarFile(null)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: '#0D0D0F' }}>
      <div className="page-container">
        <div className="max-w-xl mx-auto px-5 py-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="md:hidden p-2 -ml-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ color: '#6B7280' }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">Profile</h1>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: '#1A1A1F', border: '2px solid rgba(255,255,255,0.1)' }}
                onClick={() => fileRef.current?.click()}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  : <span style={{ color: '#A78BFA' }}>{initials}</span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: '#7C3AED', border: '2px solid #0D0D0F' }}
              >
                <Camera size={14} color="white" />
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#4B5563' }}>Tap to change photo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Aura stat */}
          {profile?.aura > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6"
              style={{ background: '#7C3AED11', border: '1px solid #7C3AED22' }}
            >
              <AuraIcon size={16} />
              <span className="text-sm font-semibold" style={{ color: '#A78BFA' }}>
                {(profile.aura).toLocaleString()} Aura
              </span>
              <span className="text-xs ml-auto" style={{ color: '#6B7280' }}>earned from shared worlds</span>
            </div>
          )}

          {/* Username */}
          <div className="mb-5">
            <label className="text-xs font-semibold tracking-widest uppercase block mb-2" style={{ color: '#4B5563' }}>
              Username
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your display name"
              maxLength={32}
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
              style={{
                background: '#1A1A1F',
                border: '1px solid rgba(255,255,255,0.08)',
                caretColor: '#A78BFA',
              }}
              onFocus={e => e.target.style.borderColor = '#7C3AED55'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#4B5563' }}>
              Shown as "Created by [username]" on your character cards.
            </p>
          </div>

          {/* Email (read-only) */}
          <div className="mb-8">
            <label className="text-xs font-semibold tracking-widest uppercase block mb-2" style={{ color: '#4B5563' }}>
              Email
            </label>
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)', color: '#6B7280' }}
            >
              {user?.email}
            </div>
          </div>

          {error && (
            <p className="text-xs mb-4 px-1" style={{ color: '#EF4444' }}>{error}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: saved ? '#16A34A' : '#7C3AED',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saved
              ? <><Check size={16} /> Saved</>
              : saving ? 'Saving...' : 'Save Changes'
            }
          </button>

          {/* Feedback */}
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full mt-3 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)', color: '#A78BFA' }}
          >
            <MessageSquarePlus size={16} />
            Share feedback or ideas
          </button>

          {/* Divider */}
          <div className="my-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Memory Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} style={{ color: '#A78BFA' }} />
              <label
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: '#4B5563' }}
              >
                Your Memories
              </label>
            </div>

            {memoryLoading ? (
              <p className="text-sm" style={{ color: '#6B7280' }}>Loading memories...</p>
            ) : (
              <>
                {/* Global User Facts */}
                <div className="mb-6">
                  <label
                    className="text-xs font-semibold tracking-widest uppercase block mb-2"
                    style={{ color: '#4B5563' }}
                  >
                    About You
                  </label>
                  <div
                    className="rounded-xl p-3 space-y-1"
                    style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {parseFacts(userFactsData?.facts).length > 0 ? (
                      <AnimatePresence>
                        {parseFacts(userFactsData?.facts).map((fact, index) => (
                          <motion.div
                            key={`user-${index}-${fact.fact}`}
                            initial={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl group hover:bg-white/[0.02]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{fact.fact}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: '#4B5563' }}>
                                  {fact.category}{fact.source ? ` — "${fact.source}"` : ''}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteUserFact(index)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                style={{ color: '#6B7280' }}
                                title="Delete this memory"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    ) : (
                      <p className="text-sm px-3 py-2" style={{ color: '#6B7280' }}>No memories yet</p>
                    )}
                  </div>
                </div>

                {/* Per-World Memories */}
                {worldMemories.length > 0 ? (
                  worldMemories.map(memory => {
                    const facts = parseFacts(memory.facts)
                    const worldName = worldNames[memory.world_id] || 'Unknown World'
                    return (
                      <div key={memory.world_id} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-white">{worldName}</h3>
                          {clearConfirm === memory.world_id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px]" style={{ color: '#6B7280' }}>Are you sure?</span>
                              <button
                                onClick={() => handleClearWorld(memory.world_id)}
                                className="text-[11px] px-2 py-0.5 rounded"
                                style={{ color: '#EF4444' }}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setClearConfirm(null)}
                                className="text-[11px] px-2 py-0.5 rounded"
                                style={{ color: '#6B7280' }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setClearConfirm(memory.world_id)}
                              className="text-[11px] px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                              style={{ color: '#EF4444' }}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div
                          className="rounded-xl p-3 space-y-1"
                          style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          {facts.length > 0 ? (
                            <AnimatePresence>
                              {facts.map((fact, index) => (
                                <motion.div
                                  key={`${memory.world_id}-${index}-${fact.fact}`}
                                  initial={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl group hover:bg-white/[0.02]">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white">{fact.fact}</p>
                                      <p className="text-[11px] mt-0.5" style={{ color: '#4B5563' }}>
                                        {fact.category}{fact.source ? ` — "${fact.source}"` : ''}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteWorldFact(memory.world_id, index)}
                                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      style={{ color: '#6B7280' }}
                                      title="Delete this memory"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          ) : (
                            <p className="text-sm px-3 py-2" style={{ color: '#6B7280' }}>No memories yet</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  /* Only show this if user facts are also empty — truly no memories at all */
                  parseFacts(userFactsData?.facts).length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: '#6B7280' }}>
                      No memories yet. Chat in a world and characters will start remembering you.
                    </p>
                  )
                )}
              </>
            )}
          </div>

        </div>
      </div>
      <BottomNav />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  )
}
