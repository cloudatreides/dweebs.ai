const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const PRIMARY_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Build a rich character description for the system prompt.
 * Uses the new `personality` field if available, otherwise falls back to bio + tags.
 */
function describeCharacter(c) {
  if (c.personality) {
    return `[${c.name}]\n${c.personality}`
  }
  return `[${c.name}]: ${c.bio || ''} Traits: ${(c.tags || []).join(', ')}.`
}

/**
 * Calls Claude with a batched prompt. Tries Sonnet first, falls back to Haiku.
 * Returns an array of { characterId, text } objects — one per responding character.
 */
export async function getCharacterResponses({ characters, scene, messages, mentionedId }) {
  if (!API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  }

  const respondingChars = mentionedId
    ? characters.filter(c => c.id === mentionedId)
    : characters

  const charDescriptions = characters.map(describeCharacter).join('\n\n')

  const respondingNames = respondingChars.map(c => label(c)).join(', ')

  const systemPrompt = `You are roleplaying multiple characters in a group text chat. The user ("You") is a friend hanging out in the chat. Characters talk to the user AND to each other naturally.

CHARACTERS IN THIS CHAT:
${charDescriptions}

SCENE: ${scene || 'A casual group chat — just vibing.'}

RULES:
1. Stay in character at all times. Match each character's speech style, vocabulary, energy level, and emoji habits exactly as described above.
2. This is a TEXT CHAT — keep every response to 1-3 short sentences max. No monologues.
3. Characters should react to each other, not just the user. Banter, tease, agree, disagree — make it feel like a real group chat.
4. No narration, no action text (no *waves*, no *laughs*), no quotation marks around responses. Just raw dialogue.
5. Don't be sycophantic. Characters can disagree with the user or each other. Not every message needs to be supportive.
6. Only these characters respond this turn: ${respondingNames}

FORMAT — respond with EXACTLY this format, one line per character, no extra text:
${respondingChars.map(c => `${label(c)}: [their response]`).join('\n')}`

  const history = messages
    .slice(-16)
    .map(m => {
      if (m.type === 'user') return `You: ${m.text}`
      if (m.type === 'character') {
        const char = characters.find(c => c.id === m.characterId)
        return char ? `${label(char)}: ${m.text}` : null
      }
      return null
    })
    .filter(Boolean)
    .join('\n')

  const userContent = history
    ? `Chat so far:\n${history}\n\nRespond to the latest message from "You". Stay in character.`
    : 'The chat just started. Each character should say something natural to kick things off.'

  const raw = await callWithFallback(systemPrompt, userContent)
  return parseResponses(raw, respondingChars)
}

/**
 * Generate "catch-up" messages — characters chatting with each other while the user was away.
 * Called when user opens a chat after 2+ hours of inactivity.
 */
export async function generateCatchUpMessages({ characters, scene, recentMessages, hoursAway }) {
  if (!API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  }

  if (characters.length < 2) return []

  const charDescriptions = characters.map(describeCharacter).join('\n\n')

  // Pick 2-3 characters to chat (not all — feels more natural)
  const numTalkers = Math.min(characters.length, Math.random() < 0.5 ? 2 : 3)
  const shuffled = [...characters].sort(() => Math.random() - 0.5)
  const talkers = shuffled.slice(0, numTalkers)

  const timePeriod = hoursAway >= 24
    ? `${Math.floor(hoursAway / 24)} day(s)`
    : `${Math.round(hoursAway)} hours`

  const systemPrompt = `You are simulating a group chat where characters talk to EACH OTHER while the user is away. The user has been gone for about ${timePeriod}.

CHARACTERS:
${charDescriptions}

SCENE: ${scene || 'A casual group chat.'}

RULES:
1. Generate a short, natural conversation between the characters listed below — 2-4 messages total.
2. They are talking to EACH OTHER, not to the user. The user is not here.
3. Stay perfectly in character — match speech style, emoji habits, vocabulary.
4. The conversation should feel organic: maybe they're reacting to the scene, joking around, debating something, or just vibing.
5. The LAST message should acknowledge the user's absence in a natural way — like "where'd they go?" or "they've been quiet" — but keep it casual, not dramatic.
6. No narration, no action text, no quotation marks. Just dialogue.
7. Keep each message to 1-2 sentences.

CHARACTERS TALKING THIS ROUND: ${talkers.map(c => c.name).join(', ')}

FORMAT — one message per line:
${talkers[0] ? `${label(talkers[0])}: [message]` : ''}
${talkers[1] ? `${label(talkers[1])}: [message]` : ''}
[continue alternating naturally, 2-4 messages total]`

  const history = recentMessages
    .slice(-6)
    .map(m => {
      if (m.type === 'user') return `You: ${m.text}`
      if (m.type === 'character') {
        const char = characters.find(c => c.id === m.characterId)
        return char ? `${label(char)}: ${m.text}` : null
      }
      return null
    })
    .filter(Boolean)
    .join('\n')

  const userContent = history
    ? `Recent chat before the user left:\n${history}\n\nNow generate the characters chatting with each other while the user was gone.`
    : 'The chat has been quiet. Generate a natural conversation between the characters.'

  try {
    const raw = await callWithFallback(systemPrompt, userContent)
    return parseCatchUpResponses(raw, characters)
  } catch (err) {
    console.warn('Catch-up generation failed:', err.message)
    return []
  }
}

async function callWithFallback(systemPrompt, userContent) {
  return await callClaude(PRIMARY_MODEL, systemPrompt, userContent)
}

async function callClaude(model, systemPrompt, userContent) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`${model} error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

/** Parses "NAME: blah\nNAME2: blah" into [{ characterId, text }] for regular responses */
function parseResponses(raw, chars) {
  const results = []
  for (const char of chars) {
    const prefix = label(char)
    const regex = new RegExp(`${escapeRegex(prefix)}:\\s*([\\s\\S]+?)(?=\\n[A-Z][A-Z\\s]*:|$)`, 'i')
    const match = raw.match(regex)
    if (match) {
      results.push({ characterId: char.id, text: cleanResponse(match[1]) })
    } else if (chars.length === 1) {
      results.push({ characterId: char.id, text: cleanResponse(raw) })
    }
  }
  return results
}

/** Parses catch-up responses where any character in the chat might speak */
function parseCatchUpResponses(raw, allChars) {
  const results = []
  const lines = raw.split('\n').filter(l => l.trim())

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const namePrefix = line.slice(0, colonIdx).trim().toUpperCase()
    const text = line.slice(colonIdx + 1).trim()
    if (!text) continue

    const char = allChars.find(c => label(c) === namePrefix)
    if (char) {
      results.push({ characterId: char.id, text: cleanResponse(text) })
    }
  }
  return results
}

/** Clean up common LLM artifacts from responses */
function cleanResponse(text) {
  let cleaned = text.trim()
  // Remove wrapping quotation marks
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1)
  }
  // Remove leading character label if duplicated
  cleaned = cleaned.replace(/^[A-Z]+:\s*/, '')
  return cleaned.trim()
}

/** Escape special regex characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Returns the uppercase first name used as label in the prompt */
function label(char) {
  return char.name.split(' ')[0].toUpperCase()
}

/**
 * Generate a nudge message — characters notice the user went quiet.
 * Called after ~15 min of inactivity while chat tab is visible.
 * Returns [{ characterId, text }] — 1-2 messages max.
 */
export async function generateNudgeMessage({ characters, scene, recentMessages }) {
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  if (characters.length === 0) return []

  // Pick 1-2 characters to nudge
  const numTalkers = Math.min(characters.length, Math.random() < 0.6 ? 1 : 2)
  const shuffled = [...characters].sort(() => Math.random() - 0.5)
  const talkers = shuffled.slice(0, numTalkers)

  const charDescriptions = characters.map(describeCharacter).join('\n\n')

  const systemPrompt = `You are simulating a group chat. The user has gone quiet for about 15 minutes. One or two characters should casually acknowledge the silence and try to re-engage the user.

CHARACTERS:
${charDescriptions}

SCENE: ${scene || 'A casual group chat.'}

RULES:
1. Keep it VERY casual and brief — 1 short sentence each.
2. Stay in character — match speech style, emoji habits, tone.
3. Don't be dramatic or clingy. Just naturally notice the quiet. Examples of good tones: "you still there? 👀", "helloooo", "did you fall asleep on us", "yo where'd you go"
4. If 2 characters respond, they should riff off each other, not both address the user independently.
5. No narration, no action text, no quotation marks.

CHARACTERS RESPONDING: ${talkers.map(c => c.name).join(', ')}

FORMAT — one line per character:
${talkers.map(c => `${label(c)}: [message]`).join('\n')}`

  const history = recentMessages
    .slice(-6)
    .map(m => {
      if (m.type === 'user') return `You: ${m.text}`
      if (m.type === 'character') {
        const char = characters.find(c => c.id === m.characterId)
        return char ? `${label(char)}: ${m.text}` : null
      }
      return null
    })
    .filter(Boolean)
    .join('\n')

  const userContent = history
    ? `Recent chat:\n${history}\n\nThe user has been quiet for ~15 minutes. Nudge them back naturally.`
    : 'The chat has been quiet for a while. Say something to get things going.'

  try {
    const raw = await callWithFallback(systemPrompt, userContent)
    return parseCatchUpResponses(raw, characters)
  } catch (err) {
    console.warn('Nudge generation failed:', err.message)
    return []
  }
}

/**
 * Fetch a character image from Wikipedia.
 * Returns a URL string or null if not found.
 */
export async function fetchCharacterImage(name) {
  try {
    // Search Wikipedia for the character
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    const title = searchData?.query?.search?.[0]?.title
    if (!title) return null

    // Get the page image
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*&pithumbsize=300`
    const imgRes = await fetch(imgUrl)
    const imgData = await imgRes.json()
    const pages = imgData?.query?.pages
    if (!pages) return null

    const page = Object.values(pages)[0]
    return page?.thumbnail?.source || null
  } catch (err) {
    console.warn('Wikipedia image fetch failed:', err.message)
    return null
  }
}

/**
 * AI-generate a full character profile from just a name.
 * Returns { name, fandom, bio, personality, tags, quote, emoji, color }.
 */
export async function generateCharacterProfile(name) {
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

  const systemPrompt = `You generate character profiles for a group chat app where users roleplay with fictional and real-world characters.

Given a character name, return a JSON object with these fields:
- name: full character name (cleaned up if needed)
- fandom: their universe/franchise (e.g. "Anime · Naruto", "Music · Pop", "K-pop · BTS", "Games · Sonic")
- category: one of "Anime", "K-pop", "Music", or "Custom"
- bio: 1-2 sentence description of who they are (not their personality — their identity/role)
- personality: a rich roleplay guide (4-6 lines) covering: speech style, energy level, emoji habits, quirks, catchphrases. This is used as the system prompt when they chat.
- tags: array of exactly 2-3 personality trait words (e.g. ["Fierce", "Loyal", "Chaotic"])
- quote: a short signature quote they'd actually say (no quotation marks)
- emoji: a single emoji that represents them
- color: a hex color that fits their vibe (choose from: #00E5FF, #FF69B4, #FF8C00, #FFD700, #A78BFA, #FF4444, #22C55E, #F59E0B, #EC4899, #06B6D4, #8B5CF6, #EF4444)

Respond with ONLY the JSON object, no markdown, no explanation.`

  const raw = await callWithFallback(systemPrompt, `Generate a character profile for: ${name}`)

  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response')
  }
}
