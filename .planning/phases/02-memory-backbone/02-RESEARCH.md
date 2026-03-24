# Phase 2: Memory Backbone - Research

**Researched:** 2026-03-24
**Domain:** AI memory extraction/injection in a React + Vercel + Supabase + Anthropic Haiku app
**Confidence:** HIGH — all findings derived from actual source code reading and prior architecture research

## Summary

Phase 2 implements the core memory loop: extraction fires at session end (navigation away or tab close), producing structured facts that get saved to Supabase; injection prepends those facts to the system prompt on every chat turn. The entire loop touches four files: a new `src/lib/memoryApi.js` for extraction logic, modifications to `src/lib/chatApi.js` for injection, modifications to `src/pages/ChatView.jsx` for session lifecycle triggers, and the existing `src/lib/db.js` functions (already created in Phase 1).

The critical technical challenges are: (1) firing extraction without blocking React Router navigation, (2) fitting memory into the 8000-char system prompt budget, and (3) getting Haiku to return parseable JSON for extracted facts. All three have clear solutions documented below with exact code insertion points.

**Primary recommendation:** Build extraction as a fire-and-forget call from `visibilitychange` + `useEffect` cleanup, routed through the existing `/api/chat` proxy with a structured extraction prompt. Inject memory as a prepended block in `chatApi.js` with a 500-char hard cap and silent degradation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEXT-01 | Extract key facts after every 5+ user messages | Session message counter in ChatView + extraction trigger logic (see Extraction Trigger section) |
| MEXT-02 | Structured JSON with fact, source, category | Extraction prompt design with explicit JSON schema (see Extraction Prompt section) |
| MEXT-03 | Resolve contradictions — new facts replace old | Merge logic in memoryApi.js comparing new facts against existing (see Contradiction Resolution section) |
| MEXT-04 | Trigger on session end, not every turn | visibilitychange + useEffect cleanup, fire-and-forget (see Extraction Trigger section) |
| MEXT-05 | Windowed last-30-messages slice | Messages array sliced to last 30 before building extraction transcript |
| MINJ-01 | World memory injected into system prompt every turn | Memory block prepended in chatApi.js getCharacterResponses() (see Injection section) |
| MINJ-02 | Global user facts injected into every world | User facts included in same memory block (see Memory Block Format) |
| MINJ-03 | Hard-capped at 400 tokens, silently omitted if exceeded | 500-char hard cap (conservative ~125 tokens) with overflow-to-omit fallback (see Budget Math) |
| MINJ-04 | Memory block at top of system prompt (primacy) | Prepended before CHARACTERS block (see Injection Point) |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase uses only what already exists in the project.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | Memory reads/writes (already in db.js) | Already the app's data layer |
| Anthropic API (via api/chat.js proxy) | claude-haiku-4-5-20251001 | Memory extraction LLM call | Already the app's only AI path |
| React (useState, useEffect, useRef) | ^19.2.4 | Session lifecycle, state management | Already the app's framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing /api/chat for extraction | New /api/extract-memory.js endpoint | Adds infra, duplicates auth/rate-limit. Not worth it — /api/chat is a generic proxy. |
| visibilitychange trigger | beforeunload event | beforeunload is unreliable for async work and triggers download warnings in some browsers. visibilitychange is the modern standard. |
| navigator.sendBeacon for extraction | Regular fetch (fire-and-forget) | sendBeacon has a 64KB payload limit and only supports POST with no custom headers (no auth). Use regular fetch — React Router in-app navigation gives enough time. |

## Architecture Patterns

### New File: `src/lib/memoryApi.js`

This is the only new file. Peer of `chatApi.js`. Contains:
- `extractAndSaveMemory()` — builds extraction prompt, calls `/api/chat`, parses JSON, writes to Supabase
- `buildMemoryBlock()` — formats world memory + user facts into the injection string

### Modified Files

| File | What Changes |
|------|-------------|
| `src/lib/chatApi.js` | `getCharacterResponses()` accepts optional `worldMemory` param. Memory block prepended to system prompt. 500-char cap enforced. |
| `src/pages/ChatView.jsx` | Load memory on mount via Promise.all. Pass to getCharacterResponses. Add extraction trigger on unmount/visibility. Track message count. |
| `src/lib/db.js` | No changes — 6 memory functions already exist from Phase 1. |
| `api/chat.js` | No changes — already a generic proxy. |

### Injection Point in chatApi.js (Exact Location)

In `getCharacterResponses()` (line 20-71 of chatApi.js), the system prompt is a template literal starting at line 30. The memory block must be prepended BEFORE the `CHARACTERS IN THIS CHAT:` section.

Current structure:
```
You are roleplaying multiple characters...
CHARACTERS IN THIS CHAT:
{charDescriptions}
SCENE: ...
RULES: ...
FORMAT: ...
```

After injection:
```
MEMORY OF THIS WORLD:
{worldSummary}
Key facts: {fact1}. {fact2}. ...

ABOUT THE USER:
{userFact1}. {userFact2}. ...

You are roleplaying multiple characters...
CHARACTERS IN THIS CHAT:
...
```

The memory block goes BEFORE the main prompt body, giving it primacy position (MINJ-04).

### Extraction Trigger Logic (Exact Mechanism)

**Problem:** `useEffect` cleanup functions cannot be async. React does not await them. `beforeunload` cannot reliably fire async requests. `navigator.sendBeacon` cannot carry Authorization headers.

**Solution:** Two-trigger approach:

1. **`visibilitychange` to `hidden`** (primary) — fires when user switches tabs, closes tab, or navigates to a different origin. This gives the browser a moment to fire the fetch before teardown. Use a regular `fetch()` call — no await needed, fire-and-forget.

2. **`useEffect` cleanup** (secondary) — fires on in-app React Router navigation. Since the app is an SPA, navigation between `/chat/:id` and `/home` or `/my-worlds` is client-side — the page stays alive, so a fire-and-forget `fetch()` will complete.

**Guard:** Only fire if `userMessageCountRef.current >= 5` (tracks messages sent by the user in this session, not total messages). Use a ref to avoid stale closure issues.

**Dedup:** Use a `extractionFiredRef` boolean ref. Set to `true` on first trigger. Both `visibilitychange` and cleanup check this ref — extraction fires at most once per session.

```javascript
// In ChatView.jsx
const userMessageCountRef = useRef(0)
const extractionFiredRef = useRef(false)

const triggerExtraction = () => {
  if (extractionFiredRef.current) return
  if (userMessageCountRef.current < 5) return
  extractionFiredRef.current = true
  // Fire-and-forget — no await
  extractAndSaveMemory({
    chatId: id,
    messages: messagesRef.current, // ref to avoid stale closure
    characters: chatCharactersRef.current,
    scene: chatRef.current?.scene,
  })
}

// visibilitychange listener
useEffect(() => {
  const handler = () => {
    if (document.visibilityState === 'hidden') triggerExtraction()
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}, [])

// useEffect cleanup for SPA navigation
useEffect(() => {
  return () => triggerExtraction()
}, [])
```

**Important:** The `messages` state must be accessible via a ref (`messagesRef`) inside the cleanup/visibility handler to avoid capturing a stale empty array from the initial render.

### Extraction Prompt Design

The extraction call goes through the same `callClaude()` path in `chatApi.js` (via the existing `/api/chat` proxy). The system prompt instructs Haiku to return structured JSON.

```
You extract structured memory from group chat transcripts between a user and AI characters.

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
{"worldFacts": [...], "worldSummary": "...", "userFacts": [...]}
```

The user content is the last 30 messages formatted as a transcript, plus any existing facts for contradiction checking:

```
EXISTING WORLD FACTS:
{existingFacts as numbered list, or "None"}

EXISTING USER FACTS:
{existingUserFacts as numbered list, or "None"}

CONVERSATION TRANSCRIPT:
You: hello everyone
ITACHI: hey what's up
GOJO: yo welcome back
...
```

### Contradiction Resolution (MEXT-03)

The extraction prompt explicitly instructs Haiku to check new facts against existing ones and supersede contradictions. After receiving the response:

1. Parse the JSON response
2. For `worldFacts`: replace the entire facts array in `world_memories` — the extraction prompt already filtered contradictions
3. For `userFacts`: merge new facts with existing ones. If a new fact has the same `category` as an existing fact and they conflict, keep the new one. Simple approach: pass existing facts to the extraction prompt and let Haiku handle dedup.
4. Cap `worldFacts` at 10 total (5 existing max + 5 new max, but Haiku is instructed to return at most 5 that represent the best current state)
5. Cap `userFacts` at 10 total

### System Prompt Budget Math

Measured from `chatApi.js` source:

| Section | Chars |
|---------|-------|
| Static preamble ("You are roleplaying...") | ~120 |
| CHARACTERS block (per character, typical) | 300-600 |
| 3-character world (typical) | 1200-2000 |
| 5-character world (max common) | 2000-3500 |
| SCENE line | 50-150 |
| RULES block (7 rules + format) | ~600 |
| FORMAT lines | ~150 |
| **Typical total (3 chars)** | **~2500** |
| **Heavy total (5 chars, long personalities)** | **~4500** |

Hard limit: 8000 chars (api/chat.js line 69).

**Memory budget: 500 chars hard cap.** This is ~125 tokens. With 5 world facts at ~60 chars each (300) + summary at ~100 chars + 3 user facts at ~30 chars each (90) + labels (~60) = ~550 chars before truncation. The 500-char cap means some facts may get trimmed in a full extraction — this is acceptable. The cap ensures even a 5-character world with long personalities (4500 chars) + memory (500 chars) = 5000 chars, well under 8000.

**Overflow strategy in chatApi.js:**
1. Build memory block string
2. If > 500 chars, truncate: drop user facts first, then drop world facts from the end
3. Build full system prompt with memory prepended
4. If full prompt > 7800 chars (200-char safety margin), omit memory entirely
5. Never throw — chat must always work

### JSON Schema for Extracted Facts

```json
{
  "worldFacts": [
    {
      "fact": "The group discussed K-pop comeback schedules",
      "source": "You: when is blackpink coming back",
      "category": "topic"
    }
  ],
  "worldSummary": "A lively chat about K-pop with friendly banter between characters.",
  "userFacts": [
    {
      "fact": "The user's name is Nick",
      "source": "You: im nick btw",
      "category": "identity"
    }
  ]
}
```

This schema satisfies MEXT-02 (fact + source + category).

### Memory Block Format for Injection

```
MEMORY OF THIS WORLD:
[worldSummary]
Key facts: [fact1]. [fact2]. [fact3].

ABOUT THE USER:
[userFact1]. [userFact2].
```

Only the `fact` text is injected — `source` and `category` are stored but not included in the system prompt (they are metadata for the Memory UI in Phase 3 and for contradiction resolution).

### Anti-Patterns to Avoid

- **Blocking navigation on extraction:** useEffect cleanup is sync. Do NOT await the extraction call. Fire-and-forget only.
- **Using navigator.sendBeacon:** Cannot carry Authorization headers. The `/api/chat` endpoint requires `Bearer <token>`.
- **Extracting on every turn:** Multiplies API costs. Session-end only.
- **Routing memory reads through api/chat.js:** Adds serverless latency. Use browser-to-Supabase direct (consistent with all other reads in the app).
- **Letting memory overflow break the chat:** Always enforce the 500-char cap and 7800-char total limit. Silent degradation, never errors.
- **Stale closures in extraction trigger:** The visibilitychange handler and useEffect cleanup capture state at registration time. Use refs for `messages`, `chat`, and `characters` to avoid extracting stale/empty data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing from LLM output | Custom regex parser | `JSON.parse()` with try/catch + retry prompt | Haiku returns valid JSON >95% of the time. Simple parse with fallback is sufficient. |
| Auth token management | Manual token extraction | `supabase.auth.getSession()` (already in callClaude) | Token refresh, expiry all handled by Supabase client |
| Rate limiting for extraction | Custom throttle | Existing `check_rate_limit` RPC in api/chat.js | Already enforced server-side |

## Common Pitfalls

### Pitfall 1: Stale Closure in Extraction Trigger
**What goes wrong:** The visibilitychange handler captures `messages` state from initial render (empty array). Extraction fires with no messages.
**Why it happens:** JavaScript closures in useEffect capture the value at registration time, not current state.
**How to avoid:** Use a `useRef` that mirrors the messages state. Update the ref in a separate useEffect whenever messages change. Read from the ref in the handler.
**Warning signs:** Extraction calls succeed but produce empty or nonsensical facts.

### Pitfall 2: Double Extraction
**What goes wrong:** Both visibilitychange AND useEffect cleanup fire, causing two extraction API calls.
**Why it happens:** Closing a tab triggers visibilitychange first, then React unmount.
**How to avoid:** Use a `extractionFiredRef` boolean. Set to true on first trigger. Both handlers check it.
**Warning signs:** Duplicate world_memories upserts (not harmful due to upsert, but wasteful API calls).

### Pitfall 3: JSON Parse Failure from Haiku
**What goes wrong:** Haiku occasionally wraps JSON in markdown code fences (```json ... ```) or adds text before/after.
**Why it happens:** LLM output is non-deterministic. Even with "respond with ONLY JSON" instructions, it sometimes adds framing.
**How to avoid:** Strip markdown code fences before parsing. Try `JSON.parse()` first, then regex extract `{...}` and retry. If both fail, log warning and return without writing.
**Warning signs:** console.error messages about JSON parse failures.

### Pitfall 4: Memory Block Exceeds System Prompt Limit
**What goes wrong:** A world with 5 characters with long personalities + full memory block exceeds 8000 chars. api/chat.js returns 400.
**Why it happens:** No budget enforcement before sending.
**How to avoid:** 500-char hard cap on memory block. 7800-char total limit check. Silent omission.
**Warning signs:** Chat API returns 400 errors intermittently.

### Pitfall 5: Extraction Fires on World with < 5 Messages
**What goes wrong:** User opens a world, sends 2 messages, navigates away. Extraction fires with insufficient context, producing low-quality or empty facts.
**Why it happens:** Guard condition uses total messages instead of user messages this session.
**How to avoid:** Track `userMessageCountRef` (incremented only on user sends in this session). Guard: `>= 5`.
**Warning signs:** World memories with vague or useless facts from short sessions.

## Code Examples

### extractAndSaveMemory() in memoryApi.js
```javascript
// src/lib/memoryApi.js
import { supabase } from './supabase'
import { getWorldMemory, upsertWorldMemory, getUserFacts, upsertUserFacts } from './db'

const EXTRACTION_SYSTEM_PROMPT = `You extract structured memory from group chat transcripts...`
// (full prompt as designed in Extraction Prompt section above)

export async function extractAndSaveMemory({ chatId, messages, characters, scene }) {
  try {
    // Guard: need messages to extract from
    if (!messages || messages.length < 5) return

    // Get existing facts for contradiction resolution
    const [existingMemory, existingUserFacts] = await Promise.all([
      getWorldMemory(chatId),
      getUserFacts(),
    ])

    // Build transcript from last 30 messages
    const transcript = messages
      .slice(-30)
      .map(m => {
        if (m.type === 'user') return `You: ${m.text}`
        if (m.type === 'character') {
          const char = characters.find(c => c.id === m.characterId)
          return char ? `${char.name}: ${m.text}` : null
        }
        return null
      })
      .filter(Boolean)
      .join('\n')

    // Build user content with existing facts context
    const existingWorldFactsList = existingMemory?.facts
      ? JSON.parse(typeof existingMemory.facts === 'string' ? existingMemory.facts : JSON.stringify(existingMemory.facts))
      : []
    const existingUserFactsList = existingUserFacts?.facts
      ? JSON.parse(typeof existingUserFacts.facts === 'string' ? existingUserFacts.facts : JSON.stringify(existingUserFacts.facts))
      : []

    const userContent = `EXISTING WORLD FACTS:\n${existingWorldFactsList.length > 0 ? existingWorldFactsList.map((f, i) => `${i+1}. ${f.fact}`).join('\n') : 'None'}\n\nEXISTING USER FACTS:\n${existingUserFactsList.length > 0 ? existingUserFactsList.map((f, i) => `${i+1}. ${f.fact}`).join('\n') : 'None'}\n\nCONVERSATION TRANSCRIPT:\n${transcript}`

    // Call via /api/chat (reuse existing proxy)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return // silently fail if not authenticated

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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

    // Parse JSON — handle markdown code fences
    const parsed = parseExtractionJSON(rawText)
    if (!parsed) {
      console.warn('Memory extraction JSON parse failed:', rawText.slice(0, 200))
      return
    }

    // Write to Supabase
    const { worldFacts, worldSummary, userFacts } = parsed

    if (worldFacts?.length > 0 || worldSummary) {
      await upsertWorldMemory(chatId, (worldFacts || []).slice(0, 10), worldSummary || '')
    }

    if (userFacts?.length > 0) {
      // Merge with existing user facts (deduplicated by extraction prompt)
      await upsertUserFacts((userFacts || []).slice(0, 10))
    }
  } catch (err) {
    console.warn('Memory extraction failed (non-blocking):', err.message)
  }
}

function parseExtractionJSON(raw) {
  // Try direct parse first
  try { return JSON.parse(raw) } catch {}
  // Strip markdown code fences
  const stripped = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(stripped) } catch {}
  // Try to extract JSON object
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}
```

### buildMemoryBlock() for injection
```javascript
// In memoryApi.js or chatApi.js
export function buildMemoryBlock(worldMemory, userFacts, maxChars = 500) {
  if (!worldMemory && !userFacts) return ''

  let block = ''

  if (worldMemory) {
    const facts = typeof worldMemory.facts === 'string'
      ? JSON.parse(worldMemory.facts) : (worldMemory.facts || [])
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
      ? JSON.parse(userFacts.facts) : (userFacts.facts || [])
    if (facts.length > 0) {
      block += '\nABOUT THE USER:\n'
      block += facts.map(f => f.fact).join('. ') + '.\n'
    }
  }

  // Truncation: if over budget, trim user facts first, then world facts
  if (block.length > maxChars) {
    // Rebuild without user facts
    block = block.replace(/\nABOUT THE USER:\n[\s\S]*$/, '')
    if (block.length > maxChars) {
      block = block.slice(0, maxChars - 3) + '...'
    }
  }

  return block
}
```

### getCharacterResponses() modification
```javascript
// In chatApi.js — modified signature
export async function getCharacterResponses({ characters, scene, messages, mentionedId, worldMemory }) {
  // ... existing char description logic ...

  // Build memory block
  const memoryBlock = worldMemory ? buildMemoryBlock(worldMemory.memory, worldMemory.userFacts) : ''

  const systemPrompt = `${memoryBlock ? memoryBlock + '\n' : ''}You are roleplaying multiple characters in a group text chat...`
  // ... rest unchanged ...

  // Safety check: if total prompt exceeds 7800, omit memory
  if (systemPrompt.length > 7800 && memoryBlock) {
    const systemPromptNoMemory = `You are roleplaying multiple characters...` // rebuild without memory
    // use systemPromptNoMemory instead
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| document.beforeunload for cleanup | document.visibilitychange | ~2020+ (Page Lifecycle API) | visibilitychange fires reliably on tab close, mobile app switch, navigation. beforeunload is deprecated for async work. |
| navigator.sendBeacon for fire-and-forget | Regular fetch (fire-and-forget) | Ongoing | sendBeacon cannot carry custom headers (Authorization). For authenticated APIs, regular fetch is the only option. |

## Open Questions

1. **Extraction cost per session**
   - What we know: Haiku pricing is cheap (~$0.25/M input, $1.25/M output). Extraction is ~1000 tokens input + ~200 output = ~$0.0005/extraction.
   - What's unclear: At scale (1000+ daily sessions), is the 5-message guard sufficient to prevent excessive extraction calls?
   - Recommendation: Start with 5-message guard. Monitor extraction rate in Vercel logs. Can increase to 8-10 if costs spike.

2. **facts column JSONB parsing**
   - What we know: `upsertWorldMemory` in db.js calls `JSON.stringify(facts)` before writing. `getWorldMemory` returns the raw row.
   - What's unclear: Whether Supabase returns JSONB as a parsed object or as a string depends on the client version and column type.
   - Recommendation: Always handle both cases — `typeof facts === 'string' ? JSON.parse(facts) : facts`. This is defensive and costs nothing.

3. **Rate limiting on extraction calls**
   - What we know: Extraction goes through `/api/chat`, which enforces 30/min, 300/hour, 600/day limits.
   - What's unclear: Could extraction calls eat into the user's chat rate limit budget?
   - Recommendation: Acceptable for V1 — extraction fires at most once per session end. If this becomes an issue, the extraction call could be excluded from rate limiting in a future iteration.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework configured in the project |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEXT-01 | Extraction fires after 5+ user messages | manual | Open world, send 5 messages, navigate away, check Supabase | N/A |
| MEXT-02 | Extracted facts have fact/source/category | manual | Check world_memories.facts JSONB after extraction | N/A |
| MEXT-03 | Contradictions resolved | manual | Extract once, chat contradicting info, extract again, verify old fact replaced | N/A |
| MEXT-04 | Extraction on session end only | manual | Monitor network tab — no extraction calls during chat, one on navigate away | N/A |
| MEXT-05 | Last-30-messages window | manual | Chat 40+ messages, extract, verify transcript in network tab uses last 30 | N/A |
| MINJ-01 | World memory in system prompt | manual | Check system prompt in network tab on chat turn | N/A |
| MINJ-02 | User facts in system prompt | manual | Extract user facts in one world, open different world, check system prompt | N/A |
| MINJ-03 | 400-token cap, silent omission | manual | Populate long facts, verify system prompt stays under limit | N/A |
| MINJ-04 | Memory at top of system prompt | manual | Check system prompt in network tab — memory block before CHARACTERS | N/A |

### Sampling Rate
- **Per task commit:** Manual smoke test — send 5+ messages, navigate away, return, verify character references memory
- **Per wave merge:** Full walkthrough of all 9 requirements above
- **Phase gate:** All 5 success criteria from phase description verified manually

### Wave 0 Gaps
No test framework exists in the project. All validation is manual for this phase. This is acceptable given:
- The project is a PoC with no existing tests
- All requirements are observable via browser DevTools (network tab for system prompts, Supabase dashboard for stored facts)
- Adding a test framework is out of scope for this milestone

## Sources

### Primary (HIGH confidence)
- Direct source reading: `api/chat.js` (112 lines), `src/lib/chatApi.js` (~260 lines), `src/lib/db.js` (381 lines), `src/pages/ChatView.jsx` (~500 lines)
- Prior architecture research: `.planning/research/ARCHITECTURE.md` (370 lines — same milestone, verified decisions)
- Migration schema: `supabase/migrations/005_memory.sql` (71 lines — tables already created)

### Secondary (MEDIUM confidence)
- visibilitychange API behavior — well-documented MDN standard, widely used pattern for session-end triggers
- Haiku JSON output reliability — based on practical experience, not formal testing. The JSON parse fallback handles edge cases.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, everything already in the project
- Architecture: HIGH — all decisions derived from reading actual source code and prior architecture research
- Pitfalls: HIGH — all pitfalls are well-known React patterns (stale closures, double-firing effects)
- Extraction prompt: MEDIUM — Haiku's JSON reliability is good but not guaranteed; the fallback parser mitigates this

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — no moving parts)
