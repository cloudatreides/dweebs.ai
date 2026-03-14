const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

/**
 * Calls Claude Haiku with a batched prompt.
 * Returns an array of { characterId, text } objects — one per responding character.
 *
 * @param {Object} opts
 * @param {Array}  opts.characters    - full character objects in this chat
 * @param {string} opts.scene         - scene description
 * @param {Array}  opts.messages      - full message history (type: user | character | system)
 * @param {string} [opts.mentionedId] - if set, only this character responds
 */
export async function getCharacterResponses({ characters, scene, messages, mentionedId }) {
  if (!API_KEY) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env.local')
  }

  // Which characters are responding this turn
  const respondingChars = mentionedId
    ? characters.filter(c => c.id === mentionedId)
    : characters

  // Character descriptions for system prompt
  const charDescriptions = characters
    .map(c => `${label(c)}: ${c.bio} Traits: ${(c.tags || []).join(', ')}.`)
    .join('\n')

  // Expected output format
  const formatExample = respondingChars
    .map(c => `${label(c)}: [response]`)
    .join('\n')

  const systemPrompt = `You are simulating a group chat between fictional characters. Respond in each character's distinct voice.

Characters in this chat:
${charDescriptions}

Scene: ${scene || 'A casual group chat.'}

Rules:
- Stay in character — match their personality, speech patterns, energy
- Keep responses SHORT (1–3 sentences) — this is a text chat, not an essay
- React to what the user AND other characters say when natural
- No asterisks, no action descriptions (*waves*), just dialogue
- Format your response EXACTLY like this with no extra text before or after:
${formatExample}`

  // Build conversation history (last 12 messages)
  const history = messages
    .slice(-12)
    .map(m => {
      if (m.type === 'user') return `You: ${m.text}`
      if (m.type === 'character') {
        const char = characters.find(c => c.id === m.characterId)
        return char ? `${char.name.split(' ')[0]}: ${m.text}` : null
      }
      return null
    })
    .filter(Boolean)
    .join('\n')

  const userContent = history
    ? `Conversation so far:\n${history}\n\nNow respond to the latest message from "You".`
    : 'Start the conversation naturally.'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const raw = data.content[0]?.text || ''

  return parseResponses(raw, respondingChars)
}

/** Parses "MIKU: blah\nARIANA: blah" into [{ characterId, text }] */
function parseResponses(raw, chars) {
  const results = []
  for (const char of chars) {
    const prefix = label(char)
    // Match "PREFIX: <text until next uppercase prefix or end>"
    const regex = new RegExp(`${prefix}:\\s*([\\s\\S]+?)(?=\\n[A-Z]+:|$)`, 'i')
    const match = raw.match(regex)
    if (match) {
      results.push({ characterId: char.id, text: match[1].trim() })
    } else if (chars.length === 1) {
      // Single character — use the whole response
      results.push({ characterId: char.id, text: raw.trim() })
    }
  }
  return results
}

/** Returns the uppercase first name used as label in the prompt */
function label(char) {
  return char.name.split(' ')[0].toUpperCase()
}
