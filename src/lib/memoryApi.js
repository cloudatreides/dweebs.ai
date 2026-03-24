import { supabase } from './supabase'
import { getWorldMemory, upsertWorldMemory, getUserFacts, upsertUserFacts } from './db'

const EXTRACTION_SYSTEM_PROMPT = `You extract structured memory from group chat transcripts between a user and AI characters.

Given a conversation transcript, extract:
1. worldFacts: up to 5 key facts about what happened in this world (events, topics discussed, running jokes, character dynamics). Each fact has:
   - "fact": 1 sentence describing the fact
   - "source": verbatim quote from the transcript that supports this fact (max 50 chars)
   - "category": one of "event", "preference", "relationship", "topic", "joke"
2. worldSummary: 1-2 sentences describing the overall vibe/history of this world (max 200 chars).
3. userFacts: up to 3 persistent facts about the user that would be relevant in ANY world (name, preferences, interests). Each has:
   - "fact": 1 sentence
   - "source": verbatim quote (max 50 chars)
   - "category": one of "identity", "preference", "interest"

If there are existing facts provided, check for contradictions. If a new fact contradicts an existing one, include ONLY the new fact (it supersedes the old one).

Respond with ONLY valid JSON, no markdown code fences:
{"worldFacts": [...], "worldSummary": "...", "userFacts": [...]}`

export async function extractAndSaveMemory({ chatId, messages, characters, scene }) {
  try {
    // Guard: need at least 5 messages to extract from (safety net — caller enforces session count)
    if (!messages || messages.length < 5) return

    // Fetch existing facts for contradiction resolution (MEXT-03)
    const [existingMemory, existingUserFacts] = await Promise.all([
      getWorldMemory(chatId),
      getUserFacts(),
    ])

    // Build transcript from last 30 messages (MEXT-05)
    const transcript = messages
      .slice(-30)
      .map(m => {
        if (m.type === 'user') return 'You: ' + m.text
        if (m.type === 'character') {
          const char = characters.find(c => c.id === m.characterId)
          return char ? char.name.split(' ')[0].toUpperCase() + ': ' + m.text : null
        }
        return null
      })
      .filter(Boolean)
      .join('\n')

    // Parse existing facts defensively (handle both string and object — JSONB may return either)
    const existingWorldFactsList = existingMemory?.facts
      ? (typeof existingMemory.facts === 'string' ? JSON.parse(existingMemory.facts) : existingMemory.facts)
      : []
    const existingUserFactsList = existingUserFacts?.facts
      ? (typeof existingUserFacts.facts === 'string' ? JSON.parse(existingUserFacts.facts) : existingUserFacts.facts)
      : []

    // Build user content with existing facts for MEXT-03 contradiction context
    const existingWorldFactsText = existingWorldFactsList.length > 0
      ? existingWorldFactsList.map((f, i) => `${i + 1}. ${f.fact}`).join('\n')
      : 'None'
    const existingUserFactsText = existingUserFactsList.length > 0
      ? existingUserFactsList.map((f, i) => `${i + 1}. ${f.fact}`).join('\n')
      : 'None'

    const userContent =
      'EXISTING WORLD FACTS:\n' + existingWorldFactsText +
      '\n\nEXISTING USER FACTS:\n' + existingUserFactsText +
      '\n\nCONVERSATION TRANSCRIPT:\n' + transcript

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return // silently fail if not authenticated

    // Call /api/chat proxy with extraction prompt
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      console.warn('Memory extraction API failed:', response.status)
      return
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || ''

    // Parse JSON — handles raw JSON, markdown-fenced JSON, and embedded JSON objects
    const parsed = parseExtractionJSON(rawText)
    if (!parsed) {
      console.warn('Memory extraction JSON parse failed:', rawText.slice(0, 200))
      return
    }

    const { worldFacts, worldSummary, userFacts } = parsed

    // Write world memory to Supabase
    if (worldFacts?.length > 0 || worldSummary) {
      await upsertWorldMemory(chatId, (worldFacts || []).slice(0, 10), worldSummary || '')
    }

    // Write user facts to Supabase
    if (userFacts?.length > 0) {
      await upsertUserFacts((userFacts || []).slice(0, 10))
    }
  } catch (err) {
    console.warn('Memory extraction failed (non-blocking):', err.message)
  }
}

function parseExtractionJSON(raw) {
  // Try direct parse first
  try { return JSON.parse(raw) } catch (_) {}
  // Strip markdown code fences
  const stripped = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(stripped) } catch (_) {}
  // Try to extract embedded JSON object
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch (_) {}
  }
  return null
}

export function buildMemoryBlock(worldMemory, userFacts, maxChars = 500) {
  if (!worldMemory && !userFacts) return ''

  let block = ''

  if (worldMemory) {
    const facts = typeof worldMemory.facts === 'string'
      ? JSON.parse(worldMemory.facts)
      : (worldMemory.facts || [])
    const summary = worldMemory.summary || ''

    if (summary || facts.length > 0) {
      block += 'MEMORY OF THIS WORLD:\n'
      if (summary) block += summary + '\n'
      if (facts.length > 0) {
        block += 'Key facts: ' + facts.map(f => f.fact).join('. ') + '.\n'
      }
    }
  }

  if (userFacts) {
    const facts = typeof userFacts.facts === 'string'
      ? JSON.parse(userFacts.facts)
      : (userFacts.facts || [])
    if (facts.length > 0) {
      block += '\nABOUT THE USER:\n'
      block += facts.map(f => f.fact).join('. ') + '.\n'
    }
  }

  // Truncation: if over budget, drop user facts first, then hard truncate (MINJ-03 / 500-char cap)
  if (block.length > maxChars) {
    block = block.replace(/\nABOUT THE USER:\n[\s\S]*$/, '')
    if (block.length > maxChars) {
      block = block.slice(0, maxChars - 3) + '...'
    }
  }

  return block
}
