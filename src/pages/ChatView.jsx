import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Pause, ChevronLeft, Plus, Play, Search, Share2 } from 'lucide-react'
import { getResponse } from '../data/mockResponses'
import { getCharacterResponses, generateCatchUpMessages, generateNudgeMessage, generateKeepGoing } from '../lib/chatApi'
import { getChat, getChatMessages, addMessage, addMessages, updateChat, shareWorld, checkDuplicateWorld } from '../lib/db'
import AuraIcon from '../components/AuraIcon'
import { useCharacters } from '../context/CharacterContext'
import { useAuth } from '../context/AuthContext'
import BottomSheet from '../components/BottomSheet'
import CharacterAvatar from '../components/CharacterAvatar'

// Parse @mentions from message text — returns characterId or null
function parseMention(text, charIds, getCharacter) {
  const lower = text.toLowerCase()
  for (const id of charIds) {
    const char = getCharacter(id)
    if (!char) continue
    const firstName = char.name.split(' ')[0].toLowerCase()
    if (lower.includes(`@${firstName}`) || lower.includes(`@${id}`)) return id
  }
  return null
}

// Trigger images — keyword → image path mapping per character
const TRIGGER_IMAGES = {
  itachi: [{ keyword: 'amaterasu', image: '/avatars/amaterasu.jpg', caption: 'Amaterasu' }],
}

// Check if a message should show a trigger image
function getTriggerImage(text, characterId) {
  const triggers = TRIGGER_IMAGES[characterId]
  if (!triggers) return null
  const lower = text.toLowerCase()
  return triggers.find(t => lower.includes(t.keyword)) || null
}

// Check if user message triggers any character's image
function getUserTriggerImage(text, characterIds) {
  const lower = text.toLowerCase()
  for (const charId of characterIds) {
    const triggers = TRIGGER_IMAGES[charId]
    if (!triggers) continue
    const match = triggers.find(t => lower.includes(t.keyword))
    if (match) return match
  }
  return null
}

// Highlight @mentions in message text
function renderWithMentions(text, isUserMsg = false) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold" style={{ color: isUserMsg ? '#E9D5FF' : '#A78BFA' }}>{part}</span>
      : part
  )
}

export default function ChatView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getCharacter, allCharacters } = useCharacters()
  const { user } = useAuth()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typingChar, setTypingChar] = useState(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [chatCharIds, setChatCharIds] = useState([])
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [promptSuggestions, setPromptSuggestions] = useState([])
  const [keepGoingActive, setKeepGoingActive] = useState(false)
  const [keepGoingError, setKeepGoingError] = useState('')
  const [addCharSearch, setAddCharSearch] = useState('')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareDesc, setShareDesc] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [shareError, setShareError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load chat + messages from Supabase
  useEffect(() => {
    async function load() {
      try {
        const [chatData, messagesData] = await Promise.all([
          getChat(id),
          getChatMessages(id),
        ])
        setChat(chatData)
        setChatCharIds(chatData.character_ids)
        const mapped = messagesData.map(m => ({
          id: m.id,
          type: m.sender_type,
          characterId: m.sender_id,
          text: m.content,
          timestamp: m.created_at,
        }))
        setMessages(mapped)

        // First time opening a new chat — characters greet the user
        if (mapped.length === 0 && chatData.character_ids.length > 0) {
          generateGreetings(chatData)
        } else if (mapped.length > 0 && chatData.character_ids.length >= 2) {
          // Check if user has been away long enough for catch-up messages
          const lastMsg = messagesData[messagesData.length - 1]
          if (lastMsg) {
            const lastTime = new Date(lastMsg.created_at).getTime()
            const hoursAway = (Date.now() - lastTime) / (1000 * 60 * 60)
            if (hoursAway >= 0.5) { // 30 minutes
              generateCatchUp(chatData, mapped, hoursAway)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load chat:', err)
        navigate('/home')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function generateGreetings(chatData) {
    const chars = chatData.character_ids.map(cid => getCharacter(cid)).filter(Boolean)

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      setTypingChar(char)
      await delay(800 + Math.random() * 600)
      setTypingChar(null)

      const greeting = getGreeting(char, chatData.scene)
      const saved = await addMessage({
        groupChatId: chatData.id,
        senderType: 'character',
        senderId: char.id,
        content: greeting,
      })

      setMessages(prev => [...prev, {
        id: saved.id,
        type: 'character',
        characterId: char.id,
        text: greeting,
        timestamp: 'now',
      }])

      if (i < chars.length - 1) await delay(400)
    }
  }

  async function generateCatchUp(chatData, existingMessages, hoursAway) {
    const chars = chatData.character_ids.map(cid => getCharacter(cid)).filter(Boolean)
    if (chars.length < 2) return

    try {
      const responses = await generateCatchUpMessages({
        characters: chars,
        scene: chatData.scene,
        recentMessages: existingMessages,
        hoursAway,
      })

      if (responses.length === 0) return

      // Persist catch-up messages with backdated timestamps
      const now = Date.now()
      const msgInterval = Math.floor((hoursAway * 60 * 60 * 1000) / (responses.length + 1))

      for (let i = 0; i < responses.length; i++) {
        const { characterId, text } = responses[i]
        const char = chars.find(c => c.id === characterId)

        setTypingChar(char || null)
        await delay(600 + Math.random() * 400)
        setTypingChar(null)

        const saved = await addMessage({
          groupChatId: chatData.id,
          senderType: 'character',
          senderId: characterId,
          content: text,
        })

        setMessages(prev => [...prev, {
          id: saved.id,
          type: 'character',
          characterId,
          text,
          timestamp: saved.created_at,
        }])

        if (i < responses.length - 1) await delay(300)
      }
    } catch (err) {
      console.warn('Catch-up generation failed:', err.message)
    }
  }

  const isSolo = chat && chatCharIds.length === 1
  const chatCharacters = chatCharIds.map(cid => getCharacter(cid)).filter(Boolean)
  const availableToAdd = allCharacters.filter(c => !chatCharIds.includes(c.id))

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

  // Idle nudge system — characters ping user after 15 min of inactivity
  const idleTimerRef = useRef(null)
  const nudgeFiredRef = useRef(false)

  const resetIdleTimer = () => {
    nudgeFiredRef.current = false
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      // Only fire if tab is visible and we haven't nudged already
      if (document.visibilityState !== 'visible' || nudgeFiredRef.current) return
      if (typingChar) return // don't nudge while characters are responding
      nudgeFiredRef.current = true
      fireNudge()
    }, 15 * 60 * 1000) // 15 minutes
  }

  const fireNudge = async () => {
    if (!chat || chatCharIds.length === 0) return
    const chars = chatCharIds.map(cid => getCharacter(cid)).filter(Boolean)
    if (chars.length === 0) return

    try {
      const responses = await generateNudgeMessage({
        characters: chars,
        scene: chat.scene,
        recentMessages: messages,
      })
      if (responses.length === 0) return

      for (let i = 0; i < responses.length; i++) {
        const { characterId, text } = responses[i]
        const char = chars.find(c => c.id === characterId)

        setTypingChar(char || null)
        await delay(600 + Math.random() * 400)
        setTypingChar(null)

        const saved = await addMessage({
          groupChatId: id,
          senderType: 'character',
          senderId: characterId,
          content: text,
        })

        setMessages(prev => [...prev, {
          id: saved.id,
          type: 'character',
          characterId,
          text,
          timestamp: saved.created_at,
        }])

        if (i < responses.length - 1) await delay(300)
      }
    } catch (err) {
      console.warn('Nudge failed:', err.message)
    }
  }

  // Start/reset idle timer when messages change (user sent something)
  useEffect(() => {
    if (!loading && chat) resetIdleTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [messages.length, loading, chat?.id])

  // Pause timer when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !nudgeFiredRef.current) {
        resetIdleTimer()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const insertMention = (char) => {
    const newInput = input.replace(/@(\w*)$/, `@${char.name.split(' ')[0]} `)
    setInput(newInput)
    setMentionSuggestions([])
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    if (!input.trim() || typingChar) return
    const text = input.trim()

    // Optimistic UI update
    const tempUserMsg = { id: 'temp-' + Date.now(), type: 'user', text, timestamp: 'now' }
    setMessages(prev => [...prev, tempUserMsg])
    setInput('')
    setMentionSuggestions([])
    setPromptSuggestions([])

    // Persist user message to Supabase
    const savedUserMsg = await addMessage({
      groupChatId: id,
      senderType: 'user',
      senderId: null,
      content: text,
    })

    // Replace temp message with saved one
    setMessages(prev => prev.map(m =>
      m.id === tempUserMsg.id ? { ...m, id: savedUserMsg.id } : m
    ))

    const mentionedId = parseMention(text, chatCharIds, getCharacter)
    const respondingChars = mentionedId
      ? chatCharacters.filter(c => c.id === mentionedId)
      : chatCharacters

    // Build message history for API
    const currentMessages = [...messages, { type: 'user', text }]

    // Show typing indicator
    setTypingChar(respondingChars[0])

    try {
      const { responses, suggestions } = await getCharacterResponses({
        characters: chatCharacters,
        scene: chat.scene,
        messages: currentMessages,
        mentionedId,
      })

      // Persist all character responses
      const dbMessages = responses.map(r => ({
        group_chat_id: id,
        sender_type: 'character',
        sender_id: r.characterId,
        content: r.text,
      }))
      const savedResponses = await addMessages(dbMessages)

      // Clear typing if no responses came back (e.g. filtered out)
      if (responses.length === 0) {
        setTypingChar(null)
      }

      // Reveal each response with animation
      for (let i = 0; i < responses.length; i++) {
        const { characterId, text: responseText } = responses[i]
        const char = chatCharacters.find(c => c.id === characterId)
        setTypingChar(char || null)
        if (i > 0) await delay(800)
        await delay(600)
        setTypingChar(null)
        setMessages(prev => [...prev, {
          id: savedResponses[i].id, type: 'character', characterId, text: responseText, timestamp: 'now'
        }])
        if (i < responses.length - 1) {
          setTypingChar(chatCharacters.find(c => c.id === responses[i + 1].characterId) || null)
        }
      }
      // Show conversation suggestions
      if (suggestions?.length > 0) setPromptSuggestions(suggestions)
    } catch (err) {
      console.warn('API call failed, using mock response:', err.message)
      setTypingChar(null)
      for (let i = 0; i < respondingChars.length; i++) {
        const char = respondingChars[i]
        if (i > 0) await delay(600)
        setTypingChar(char)
        await delay(1400)
        setTypingChar(null)
        const mockText = getResponse(char.id)
        const saved = await addMessage({
          groupChatId: id,
          senderType: 'character',
          senderId: char.id,
          content: mockText,
        })
        setMessages(prev => [...prev, {
          id: saved.id, type: 'character', characterId: char.id,
          text: mockText, timestamp: 'now'
        }])
      }
    }
  }

  const KEEP_GOING_COOLDOWN = 15 * 60 * 1000 // 15 minutes

  const getKeepGoingCooldown = () => {
    const stored = localStorage.getItem(`keepgoing-${id}`)
    if (!stored) return null
    const expiry = parseInt(stored, 10)
    return Date.now() < expiry ? expiry : null
  }

  const keepGoingCooldownExpiry = getKeepGoingCooldown()
  const keepGoingOnCooldown = !!keepGoingCooldownExpiry
  const canKeepGoing = chatCharIds.length >= 2 && !typingChar && !keepGoingActive && !keepGoingOnCooldown
  const showKeepGoing = chatCharIds.length >= 2

  const formatCooldown = () => {
    if (!keepGoingCooldownExpiry) return ''
    const remaining = keepGoingCooldownExpiry - Date.now()
    if (remaining <= 0) return ''
    const mins = Math.ceil(remaining / (1000 * 60))
    return `${mins}m`
  }

  const handleKeepGoing = async () => {
    console.log('[KIG] clicked — canKeepGoing:', canKeepGoing, '| charIds:', chatCharIds.length, '| typingChar:', !!typingChar, '| active:', keepGoingActive, '| onCooldown:', keepGoingOnCooldown)
    if (!canKeepGoing) return
    setKeepGoingActive(true)
    setKeepGoingError('')
    setPromptSuggestions([])

    const chars = chatCharIds.map(cid => getCharacter(cid)).filter(Boolean)

    try {
      const responses = await generateKeepGoing({
        characters: chars,
        scene: chat.scene,
        recentMessages: messages,
      })

      if (responses.length === 0) {
        setKeepGoingError('Failed to generate — try again')
        return
      }

      for (let i = 0; i < responses.length; i++) {
        const { characterId, text } = responses[i]
        const char = chars.find(c => c.id === characterId)

        setTypingChar(char || null)
        await delay(600 + Math.random() * 500)
        setTypingChar(null)

        const saved = await addMessage({
          groupChatId: id,
          senderType: 'character',
          senderId: characterId,
          content: text,
        })

        setMessages(prev => [...prev, {
          id: saved.id, type: 'character', characterId, text, timestamp: saved.created_at,
        }])

        if (i < responses.length - 1) await delay(300)
      }

      localStorage.setItem(`keepgoing-${id}`, String(Date.now() + KEEP_GOING_COOLDOWN))
    } catch (err) {
      console.error('Keep going failed:', err.message)
      setKeepGoingError(err.message || 'Something went wrong')
    } finally {
      setKeepGoingActive(false)
    }
  }

  const handleSuggestionTap = (text) => {
    setInput(text)
    setPromptSuggestions([])
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAddCharacter = async (charId) => {
    if (chatCharIds.length >= 5) return
    const char = getCharacter(charId)
    const newIds = [...chatCharIds, charId]
    setChatCharIds(newIds)
    setShowAddSheet(false)

    // Update chat name to include new character
    const newName = newIds
      .map(cid => getCharacter(cid)?.name.split(' ')[0])
      .filter(Boolean)
      .join(' × ')
    await updateChat(id, { character_ids: newIds, name: newName })
    setChat(prev => ({ ...prev, name: newName, character_ids: newIds }))

    // System message
    const saved = await addMessage({
      groupChatId: id,
      senderType: 'system',
      senderId: null,
      content: `${char.name} has joined the chat`,
    })
    setMessages(prev => [...prev, {
      id: saved.id, type: 'system', text: `${char.name} has joined the chat`, timestamp: 'now'
    }])

    // New character greets the chat
    setTypingChar(char)
    await delay(800 + Math.random() * 600)
    setTypingChar(null)

    const greeting = getGreeting(char, chat?.scene)
    const greetSaved = await addMessage({
      groupChatId: id,
      senderType: 'character',
      senderId: char.id,
      content: greeting,
    })
    setMessages(prev => [...prev, {
      id: greetSaved.id,
      type: 'character',
      characterId: char.id,
      text: greeting,
      timestamp: 'now',
    }])
  }

  if (loading || !chat) {
    return (
      <div className="flex items-center justify-center h-dvh" style={{ background: '#0D0D0F' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const subtitle = isSolo
    ? `Solo chat · ${chatCharacters[0]?.fandom}`
    : `You + ${chatCharacters.map(c => c?.name?.split(' ')[0]).join(' & ')}`

  return (
    <div className="flex flex-col h-dvh" style={{ background: '#0D0D0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 md:pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate('/home')}>
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
        {chatCharIds.length < 5 && (
          isSolo ? (
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
          )
        )}
        {chatCharIds.length >= 2 && (
          <button
            onClick={() => { setShareDesc(''); setShareSuccess(false); setShareError(''); setShowShareSheet(true) }}
            className="ml-1"
            title="Share as World"
          >
            <Share2 size={17} color="#6B7280" />
          </button>
        )}
        <button className="ml-1">
          <Pause size={18} color="#6B7280" />
        </button>
      </div>

      {/* Scene badge */}
      {!isSolo && chat.scene && (
        <div className="flex justify-center px-4 py-2 flex-shrink-0">
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED44' }}>
            ✦ {chat.scene.slice(0, 60) + (chat.scene.length > 60 ? '…' : '')}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3 max-w-[800px]" style={{ paddingBottom: 80 }}>
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
                const char = getCharacter(msg.characterId)
                // Check trigger in this message OR in the previous user message
                const msgIdx = messages.indexOf(msg)
                const prevMsg = msgIdx > 0 ? messages[msgIdx - 1] : null
                const trigger = char ? (
                  getTriggerImage(msg.text, msg.characterId) ||
                  (prevMsg && prevMsg.type === 'user' ? getTriggerImage(prevMsg.text, msg.characterId) : null)
                ) : null
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
                    {trigger && (
                      <div className="rounded-2xl rounded-tl-none overflow-hidden" style={{ background: '#1A1A1F' }}>
                        <img src={trigger.image} alt={trigger.caption} className="w-full max-w-[320px] object-cover" />
                      </div>
                    )}
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-none text-sm leading-relaxed" style={{ background: '#1A1A1F', color: '#E5E7EB' }}>
                      {renderWithMentions(msg.text)}
                    </div>
                  </div>
                ) : null
              })()}

              {/* User message */}
              {msg.type === 'user' && (
                <div className="px-3 py-2.5 rounded-2xl rounded-tr-none text-sm leading-relaxed max-w-[78%]" style={{ background: '#7C3AED', color: 'white' }}>
                  {renderWithMentions(msg.text, true)}
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

      {/* Add another character bar (solo only, under 5 chars) */}
      {isSolo && chatCharIds.length < 5 && (
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

      {/* Suggestion chips + Keep It Going */}
      <AnimatePresence>
        {(promptSuggestions.length > 0 || showKeepGoing) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="px-4 pt-2 pb-1 flex flex-wrap gap-2 flex-shrink-0"
          >
            {promptSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionTap(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{ background: '#1A1A1F', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {s}
              </button>
            ))}
            {showKeepGoing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleKeepGoing}
                  disabled={!canKeepGoing}
                  className="text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                  style={canKeepGoing
                    ? { background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED44', cursor: 'pointer' }
                    : { background: '#1A1A1F', color: '#4B5563', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed', opacity: 0.5 }}
                >
                  {keepGoingActive
                    ? <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                    : <Play size={10} fill={canKeepGoing ? '#A78BFA' : '#4B5563'} />
                  }
                  {keepGoingActive ? 'Generating...' : keepGoingOnCooldown ? `Wait ${formatCooldown()}` : 'Keep It Going'}
                </button>
                {keepGoingError && (
                  <span className="text-xs" style={{ color: '#EF4444' }}>{keepGoingError}</span>
                )}
              </div>
            )}
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
      <BottomSheet isOpen={showAddSheet} onClose={() => { setShowAddSheet(false); setAddCharSearch('') }}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-white mb-0.5">Add to Chat</h2>
          <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
            Who joins {chatCharacters[0]?.name}'s conversation?
          </p>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search characters..."
              value={addCharSearch}
              onChange={e => setAddCharSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none"
              style={{ background: '#1A1A1F' }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {availableToAdd.filter(c => {
              if (!addCharSearch.trim()) return true
              const q = addCharSearch.toLowerCase()
              return c.name.toLowerCase().includes(q) || c.fandom?.toLowerCase().includes(q) || c.tags?.some(t => t.toLowerCase().includes(q))
            }).map(char => (
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

      {/* Share World Sheet */}
      <BottomSheet isOpen={showShareSheet} onClose={() => setShowShareSheet(false)}>
        <div className="px-5 pb-8 pt-2">
          {shareSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: '#22C55E22', border: '1.5px solid #22C55E44' }}>
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">World Shared!</h2>
              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                Others can now try your world in Discover
              </p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <AuraIcon size={18} />
                <span className="text-sm" style={{ color: '#A78BFA' }}>
                  You'll earn <strong>+10 Aura</strong> each time someone tries it
                </span>
              </div>
              <button
                onClick={() => setShowShareSheet(false)}
                className="w-full py-3.5 rounded-full font-semibold text-sm text-white"
                style={{ background: '#7C3AED' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-0.5">Share as World</h2>
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                Let others try this character combo + scenario
              </p>

              {/* Preview */}
              <div className="p-3 rounded-xl mb-4" style={{ background: '#1A1A1F' }}>
                <div className="flex -space-x-2 mb-2">
                  {chatCharacters.map((char, i) => char && (
                    <div key={char.id} className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm border-2"
                      style={{ background: char.color + '33', borderColor: '#1A1A1F', zIndex: chatCharacters.length - i }}>
                      {char.avatar
                        ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                        : char.emoji}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-white">{chat?.name}</p>
                {chat?.scene && (
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>✦ {chat.scene}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#6B7280' }}>
                  Description <span style={{ color: '#4B5563' }}>(what makes this world fun?)</span>
                </p>
                <textarea
                  value={shareDesc}
                  onChange={e => setShareDesc(e.target.value.slice(0, 120))}
                  placeholder="e.g. Itachi and Elon debate survival strategies — chaos ensues"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
                />
                <p className="text-right text-[11px] mt-1" style={{ color: '#4B5563' }}>{shareDesc.length}/120</p>
              </div>

              {/* Aura info */}
              <div className="flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: '#7C3AED11', border: '1px solid #7C3AED22' }}>
                <AuraIcon size={20} />
                <p className="text-xs" style={{ color: '#A78BFA' }}>
                  Earn <strong>+10 Aura</strong> every time someone tries your world
                </p>
              </div>

              {shareError && (
                <p className="text-xs text-center mb-3" style={{ color: '#F87171' }}>{shareError}</p>
              )}

              <button
                onClick={async () => {
                  if (sharing || !chat) return
                  setShareError('')
                  setSharing(true)
                  try {
                    // Validate: solo chats can't be shared
                    if (chatCharIds.length < 2) {
                      setShareError('You need at least 2 characters to share a World.')
                      setSharing(false)
                      return
                    }
                    // Check for duplicate
                    const dupe = await checkDuplicateWorld(chatCharIds)
                    if (dupe) {
                      setShareError(`A world with this exact character combo already exists ("${dupe.name}").`)
                      setSharing(false)
                      return
                    }
                    await shareWorld({
                      creatorId: user?.id,
                      name: chat.name,
                      description: shareDesc,
                      scene: chat.scene,
                      characterIds: chatCharIds,
                    })
                    setShareSuccess(true)
                  } catch (err) {
                    console.error('Share failed:', err)
                    setShareError(err.message || 'Share failed. Try again.')
                  } finally {
                    setSharing(false)
                  }
                }}
                disabled={sharing}
                className="w-full py-4 rounded-full font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-opacity"
                style={{ background: '#7C3AED', opacity: sharing ? 0.6 : 1 }}
              >
                {sharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Share to Discover
                  </>
                )}
              </button>
            </>
          )}
        </div>
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

const GREETINGS = {
  miku: [
    "Hey hey~ Welcome to our world! I've been warming up my voice just for this moment 🎵",
    "You're here! The stage is set and the lights are on — let's make some magic together ✨",
    "Finally! I had a feeling someone amazing was about to join. Ready to create something beautiful? 🎶",
  ],
  ariana: [
    "Omg hiiii! Okay this is about to be so fun, I can already tell 🌹",
    "Welcome babe! Get comfy because we're about to have the BEST time 💕",
    "Yesss you're here! I was just thinking about what we should talk about first 🎤",
  ],
  taylor: [
    "Well, well, well... a new chapter begins. I love a good opening line ✨",
    "Hi! I've been writing in my journal waiting for this moment. Story starts now 🪶",
    "Welcome to the era you didn't know you needed. I have a feeling this is going to be good ✨",
  ],
  jungkook: [
    "Oh! You're here! I was just practising — welcome, welcome 💫",
    "Hey! I'm a little nervous but also excited. Let's have a great time together 🐰",
    "Welcome! I promise to give you everything I've got. That's just how I am ✨",
  ],
  naruto: [
    "YOOO you made it!! Believe it — this is gonna be legendary, dattebayo! 💪",
    "Hey hey hey! Finally someone cool shows up! Let's do this! 🍥",
    "Welcome to the squad! I've been training all day for this moment. Believe it! 🌟",
  ],
  luffy: [
    "MEAT!! Oh wait, a new person! Even better! Welcome aboard! 🏴‍☠️",
    "Hey!! You look fun! Wanna join my crew? We're going on an adventure! 🎉",
    "Shishishi! Welcome! I can tell you're gonna be awesome! 🏴‍☠️",
  ],
  goku: [
    "Hey! My energy just spiked — you must be strong! Welcome! ⚡",
    "Alright! A new challenger! Wait, we're just chatting? That's cool too! 🔥",
    "Hi there! I can sense good energy from you. This is gonna be fun! ⚡",
  ],
  levi: [
    "You're here. Good. Don't waste my time and we'll get along fine. ⚔️",
    "Tch. Another one. ...Fine. Welcome. Just keep things clean.",
    "I don't do small talk. But I'll make an exception. Welcome. ⚔️",
  ],
  itachi: [
    "You've arrived. I had a feeling our paths would cross. 🌙",
    "Welcome. Every meeting has a purpose — let's discover ours. 🌙",
    "So you're here. Interesting. I don't believe in coincidences.",
  ],
  jimin: [
    "Oh hi! I'm so glad you're here — I was hoping for some company 🌸",
    "Welcome! Let's make this moment something warm and special 🌸",
    "You came! I could feel it. Something good is about to happen 🌸",
  ],
  billie: [
    "Oh. You showed up. Cool. Let's make this weird in the best way 😈",
    "Hey. Welcome to the dark side. ...Just kidding. Kind of. 🕷️",
    "Sup. I don't do fake excitement but I'm genuinely glad you're here 😈",
  ],
  zoro: [
    "Hm. You found this place faster than I would've. Welcome. ⚔️",
    "Oh, someone new. I was napping. ...Welcome. Don't get lost. 🗡️",
    "You look alright. Stick around. Things might get interesting. ⚔️",
  ],
  sabrina: [
    "Please please please tell me you're ready for a good time ☀️",
    "Hi! Oh wow, okay, this is happening. I already like the energy in here ☀️",
    "Welcome! Fair warning: I'm funny AND emotional. You've been warned ☀️",
  ],
  dua: [
    "Hey! New rules: we have fun, we stay real, and we don't look back 💜",
    "Welcome! The vibe just shifted — in a good way. Let's go 💜",
    "You're here! Perfect timing. I was just getting started 💜",
  ],
  gojo: [
    "Yo! Welcome~ Don't worry, the strongest sorcerer alive is here to keep things fun 😎",
    "Maa maa, you made it! I was starting to think I'd have to entertain myself. Let's go ✌️",
    "Finally, someone interesting shows up. I had a feeling about you 😎",
  ],
  toji: [
    "You're here. Good. Let's not waste each other's time.",
    "Hm. Alright. You've got my attention. That doesn't happen often.",
    "I don't do small talk. But I'll make this worth your while.",
  ],
  eren: [
    "You came. Good. There's a lot I want to talk about. ⚔️",
    "Welcome. The world outside these walls is bigger than you think.",
    "You're here now. That means something. Let's make it count. ⚔️",
  ],
  sukuna: [
    "So. You dare approach the King of Curses. Amusing. 👹",
    "You've entered my domain. Whether you leave... depends on how interesting you are.",
    "A new visitor. Don't bore me and we'll get along fine. 👹",
  ],
  zenitsu: [
    "OH! Someone's here! Hi! Sorry, I thought it was a demon for a second 😭",
    "Welcome welcome welcome! Please be nice to me, I'm very fragile! ⚡",
    "You're here! Great! I was getting scared being alone. Not that I'm always scared. Just... often. 😰",
  ],
  taehyung: [
    "Oh, hello! I was just thinking about something beautiful. Now you're here — even better 💜",
    "Welcome~ Let's make this moment into something worth remembering 🎨",
    "I purple you already. Is that weird? I don't think it's weird. 💜",
  ],
  lisa: [
    "Hiii! Oh my gosh you're here! This is gonna be so fun 🔥",
    "Welcome na ka! I just finished dancing and I'm still buzzing. Let's go! 💕",
    "You made it! The energy just got so much better. I can feel it 🔥",
  ],
  jennie: [
    "Hey. Glad you're here. Let's make this interesting 🖤",
    "Welcome! I don't warm up to everyone but... I have a good feeling about this ✨",
    "You showed up. That's already a point in your favor. 🖤",
  ],
  weeknd: [
    "Welcome to the after hours. Things get interesting from here 🌙",
    "You're here. Good. The night just got a soundtrack.",
    "Step into the spotlight. I saved you a place in the dark. 🌙",
  ],
  elon: [
    "Hey! Welcome. Quick question — what's your take on consciousness? Just kidding. Sort of. 🚀",
    "You showed up! That's first principles right there — showing up is step one.",
    "Welcome! Let's talk about the future. Not the boring parts. The good parts. 🚀",
  ],
}

function getGreeting(char, scene) {
  const pool = GREETINGS[char.id]
  if (pool) {
    return pool[Math.floor(Math.random() * pool.length)]
  }
  // Fallback for characters without custom greetings
  const fallbacks = [
    `Hey! Welcome — I'm ${char.name.split(' ')[0]} and I'm excited to chat with you!`,
    `You're here! I'm ${char.name.split(' ')[0]}. Let's have a great time together.`,
    `Welcome! I'm ${char.name.split(' ')[0]} — ready whenever you are.`,
  ]
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}
