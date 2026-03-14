import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Pause, ChevronLeft, Plus } from 'lucide-react'
import { mockChats, characters, seedMessages } from '../data/mockData'
import { getResponse } from '../data/mockResponses'
import { getCharacterResponses } from '../lib/chatApi'
import BottomSheet from '../components/BottomSheet'
import CharacterAvatar from '../components/CharacterAvatar'

// Parse @mentions from message text — returns characterId or null
function parseMention(text, charIds) {
  const lower = text.toLowerCase()
  for (const id of charIds) {
    const char = characters.find(c => c.id === id)
    if (!char) continue
    const firstName = char.name.split(' ')[0].toLowerCase()
    if (lower.includes(`@${firstName}`) || lower.includes(`@${id}`)) return id
  }
  return null
}

// Highlight @mentions in message text
function renderWithMentions(text) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={{ color: '#A78BFA' }}>{part}</span>
      : part
  )
}

export default function ChatView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const chat = mockChats.find(c => c.id === id) || {
    id: 'solo-miku',
    name: 'Miku',
    characterIds: ['miku'],
    scene: 'A solo chat with Hatsune Miku.',
    isSolo: true,
  }

  const isSolo = chat.isSolo || chat.characterIds.length === 1

  const [messages, setMessages] = useState(() => seedMessages[id] || [])
  const [input, setInput] = useState('')
  const [typingChar, setTypingChar] = useState(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [chatCharIds, setChatCharIds] = useState(chat.characterIds)
  const [mentionSuggestions, setMentionSuggestions] = useState([])

  const chatCharacters = chatCharIds.map(cid => characters.find(c => c.id === cid)).filter(Boolean)
  const availableToAdd = characters.filter(c => !chatCharIds.includes(c.id))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingChar])

  // Detect @mention typing to show suggestions
  useEffect(() => {
    const atMatch = input.match(/@(\w*)$/)
    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      const matches = chatCharacters.filter(c =>
        c.name.toLowerCase().startsWith(query) ||
        c.id.toLowerCase().startsWith(query)
      )
      setMentionSuggestions(matches)
    } else {
      setMentionSuggestions([])
    }
  }, [input, chatCharIds])

  const insertMention = (char) => {
    const newInput = input.replace(/@(\w*)$/, `@${char.name.split(' ')[0]} `)
    setInput(newInput)
    setMentionSuggestions([])
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    if (!input.trim() || typingChar) return
    const text = input.trim()
    const userMsg = { id: Date.now(), type: 'user', text, timestamp: 'now' }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setMentionSuggestions([])

    const mentionedId = parseMention(text, chatCharIds)
    const respondingChars = mentionedId
      ? chatCharacters.filter(c => c.id === mentionedId)
      : chatCharacters

    // Show typing indicator on first responding character immediately
    setTypingChar(respondingChars[0])

    try {
      // One API call — returns all responses
      const responses = await getCharacterResponses({
        characters: chatCharacters,
        scene: chat.scene,
        messages: updatedMessages,
        mentionedId,
      })

      // Reveal each character's response one at a time
      for (let i = 0; i < responses.length; i++) {
        const { characterId, text: responseText } = responses[i]
        const char = chatCharacters.find(c => c.id === characterId)
        setTypingChar(char || null)
        if (i > 0) await delay(800)
        await delay(600)
        setTypingChar(null)
        setMessages(prev => [...prev, {
          id: Date.now() + i, type: 'character', characterId, text: responseText, timestamp: 'now'
        }])
        if (i < responses.length - 1) {
          setTypingChar(chatCharacters.find(c => c.id === responses[i + 1].characterId) || null)
        }
      }
    } catch (err) {
      console.warn('API call failed, using mock response:', err.message)
      // Fallback to mock responses
      setTypingChar(null)
      for (let i = 0; i < respondingChars.length; i++) {
        const char = respondingChars[i]
        if (i > 0) await delay(600)
        setTypingChar(char)
        await delay(1400)
        setTypingChar(null)
        setMessages(prev => [...prev, {
          id: Date.now() + i, type: 'character', characterId: char.id,
          text: randomResponse(char.id), timestamp: 'now'
        }])
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAddCharacter = (charId) => {
    const char = characters.find(c => c.id === charId)
    setChatCharIds(prev => [...prev, charId])
    setShowAddSheet(false)
    // System message: "[Name] has joined"
    setMessages(prev => [...prev, {
      id: Date.now(), type: 'system', text: `${char.name} has joined the chat`, timestamp: 'now'
    }])
  }

  const subtitle = isSolo
    ? `Solo chat · ${chatCharacters[0]?.fandom}`
    : `You + ${chatCharacters.map(c => c?.name?.split(' ')[0]).join(' & ')}`

  return (
    <div className="flex flex-col h-dvh" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 md:pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate(-1)}>
          <ChevronLeft size={22} color="#9CA3AF" />
        </button>
        {/* Avatar cluster */}
        <div className="relative flex-shrink-0" style={{ width: Math.min(chatCharacters.length, 3) * 14 + 20, height: 36 }}>
          {chatCharacters.map((char, i) => char && (
            <div
              key={char.id}
              className="absolute rounded-full flex items-center justify-center text-sm overflow-hidden"
              style={{
                width: 34, height: 34,
                left: i * 14,
                background: char.color + '33',
                border: `1.5px solid ${char.color}55`,
                zIndex: chatCharacters.length - i,
              }}
            >
              {char.avatar
                ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                : char.emoji}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{chat.name}</p>
          <p className="text-[11px] truncate" style={{ color: '#6B7280' }}>{subtitle}</p>
        </div>
        {isSolo ? (
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white flex-shrink-0"
            style={{ background: '#7C3AED' }}
          >
            <Plus size={12} /> Add
          </button>
        ) : (
          <button onClick={() => setShowAddSheet(true)}>
            <Plus size={20} color="#7C3AED" />
          </button>
        )}
        <button className="ml-1">
          <Pause size={18} color="#6B7280" />
        </button>
      </div>

      {/* Scene badge */}
      {!isSolo && (
        <div className="flex justify-center px-4 py-2 flex-shrink-0">
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED44' }}>
            ✦ {chat.name.includes('Miku') ? 'Summer Festival Tour 2087' : chat.name}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3" style={{ paddingBottom: 80 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'} gap-2`}
            >
              {/* System message */}
              {msg.type === 'system' && (
                <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: '#1A1A1F', color: '#6B7280' }}>
                  {msg.text}
                </span>
              )}

              {/* Character message */}
              {msg.type === 'character' && (() => {
                const char = characters.find(c => c.id === msg.characterId)
                return char ? (
                  <div className="flex flex-col gap-1 max-w-[78%]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs overflow-hidden" style={{ background: char.color + '33' }}>
                        {char.avatar
                          ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                          : char.emoji}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: char.color }}>{char.name}</span>
                    </div>
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-none text-sm leading-relaxed" style={{ background: '#1A1A1F', color: '#E5E7EB' }}>
                      {renderWithMentions(msg.text)}
                    </div>
                  </div>
                ) : null
              })()}

              {/* User message */}
              {msg.type === 'user' && (
                <div className="px-3 py-2.5 rounded-2xl rounded-tr-none text-sm leading-relaxed max-w-[78%]" style={{ background: '#7C3AED', color: 'white' }}>
                  {renderWithMentions(msg.text)}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {typingChar && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 overflow-hidden" style={{ background: typingChar.color + '33' }}>
                {typingChar.avatar
                  ? <img src={typingChar.avatar} alt={typingChar.name} className="w-full h-full object-cover" />
                  : typingChar.emoji}
              </div>
              <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-none" style={{ background: '#1A1A1F' }}>
                <span className="text-xs mr-1" style={{ color: '#6B7280' }}>{typingChar.name.split(' ')[0]} is typing</span>
                {[0,1,2].map(i => (
                  <motion.span key={i} className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#6B7280' }}
                    animate={{ opacity: [0.3,1,0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Add another character bar (solo only) */}
      {isSolo && (
        <div className="px-4 py-2 flex items-center justify-between flex-shrink-0" style={{ background: '#111115', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-xs" style={{ color: '#6B7280' }}>Add another character to the chat</span>
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED44' }}
          >
            <Plus size={11} /> Add
          </button>
        </div>
      )}

      {/* @mention suggestions */}
      <AnimatePresence>
        {mentionSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-1 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {mentionSuggestions.map(char => (
              <button
                key={char.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(char) }}
                onTouchStart={(e) => { e.preventDefault(); insertMention(char) }}
                className="flex items-center gap-3 w-full px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: char.color + '33' }}>
                  {char.avatar ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" /> : char.emoji}
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-white">@{char.name.split(' ')[0]}</span>
                  <span className="text-xs ml-2" style={{ color: '#6B7280' }}>{char.fandom}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 flex items-center gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0D0D0F' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isSolo ? `Message ${chatCharacters[0]?.name}...` : 'Message or @mention a character...'}
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-600 text-white px-4 py-3 rounded-full"
          style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !!typingChar}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{ background: '#7C3AED', opacity: (!input.trim() || typingChar) ? 0.4 : 1 }}
        >
          <ArrowUp size={18} color="white" />
        </button>
      </div>

      {/* Add to Chat Sheet */}
      <BottomSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-white mb-0.5">Add to Chat</h2>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Who joins {chatCharacters[0]?.name}'s conversation?
          </p>
          <div className="flex flex-col gap-3">
            {availableToAdd.map(char => (
              <div key={char.id} className="flex items-center gap-3">
                <CharacterAvatar character={char} size={40} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-white">{char.name}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{char.fandom}</p>
                </div>
                {char.isPro ? (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: '#242429', color: '#6B7280' }}
                  >
                    PRO
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddCharacter(char.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: '#7C3AED' }}
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl p-3" style={{ background: '#1A1A1F' }}>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>✦ Unlock unlimited characters with Pro — $7.99/month</span>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-3 px-3 py-1.5 rounded-full text-xs font-semibold text-white flex-shrink-0"
              style={{ background: '#7C3AED' }}
            >
              Upgrade
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Upgrade Modal */}
      <BottomSheet isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}>
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      </BottomSheet>
    </div>
  )
}

function UpgradeModal({ onClose }) {
  return (
    <div className="px-5 pb-8 pt-2">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-white">Upgrade to Pro</h2>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Unlock unlimited characters and chats</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-4 rounded-2xl" style={{ background: '#1A1A1F' }}>
          <p className="text-sm font-semibold text-white mb-3">Free</p>
          {['1 active chat', 'Up to 2 characters', 'No chat history'].map(f => (
            <div key={f} className="flex items-center gap-2 mb-2">
              <span className="text-xs" style={{ color: '#4B5563' }}>✕</span>
              <span className="text-xs" style={{ color: '#6B7280' }}>{f}</span>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-2xl" style={{ background: '#1A1A1F', border: '1.5px solid #7C3AED' }}>
          <p className="text-sm font-bold mb-3" style={{ color: '#A78BFA' }}>Pro</p>
          {['Unlimited chats', 'Up to 5 characters', 'Unlimited history'].map(f => (
            <div key={f} className="flex items-center gap-2 mb-2">
              <span className="text-xs" style={{ color: '#22C55E' }}>✓</span>
              <span className="text-xs text-white">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-white">$7.99 <span className="text-lg font-normal">/ month</span></p>
        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Cancel anytime</p>
      </div>
      <button className="w-full py-4 rounded-full font-semibold text-white text-[15px] mb-3" style={{ background: '#7C3AED' }}>
        Upgrade to Pro →
      </button>
      <button onClick={onClose} className="w-full text-center text-sm" style={{ color: '#6B7280' }}>
        Maybe later
      </button>
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomResponse(characterId) {
  return getResponse(characterId)
}
