# Research Summary: Dweebs.lol Persistent Memory

*Synthesized: 2026-03-24*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*

---

## Executive Summary

Adding persistent memory to Dweebs.lol is a well-bounded engineering task with no new infrastructure required. The entire feature — schema, extraction, injection, and UI — is buildable on top of existing Supabase, Vercel, and Anthropic Haiku primitives already in the app. The recommended approach is two new Supabase tables (world-scoped JSONB facts + global user fact rows), a custom extraction prompt fired fire-and-forget at session end, and a 500-character memory block prepended to the system prompt on every chat turn.

The key architectural insight is that the `api/chat.js` serverless function is already a generic Anthropic proxy — it requires zero changes. All memory logic lives in the browser layer: `chatApi.js` handles injection, a new `memoryApi.js` handles extraction, and `db.js` gets 6 new functions for reads/writes. The only new files are `memoryApi.js` and `supabase/migrations/005_memory.sql`. Profile.jsx gets a memory management UI section.

The highest risks are hallucinated extraction facts (Haiku inventing facts not in the transcript), token budget overflow causing chat breaks, and memory that feels surveillance-like rather than warm. All three are preventable with prompt discipline and a hard 500-char cap enforced in `chatApi.js`. The feature should be invisible to users during chat (no notifications, organic in-character references) and fully transparent on the profile page (all stored facts visible and deletable).

---

## Stack Decisions

**Use. No new npm packages, no new infrastructure.**

| Layer | Decision | Rationale |
|-------|----------|-----------|
| Schema | Two tables: `world_memories` (JSONB facts array) + `user_facts` (individual rows) | World facts are always read together — single row SELECT by chat_id is faster than a join. User facts need independent deletion across worlds — individual rows are correct. |
| Semantic retrieval | None. Structured facts only. | 5-fact cap per world means zero retrieval problem — inject everything every time. pgvector adds embedding cost + complexity for zero benefit at this scale. |
| Extraction mechanism | Custom prompt via existing `POST /api/chat` | No library (LangChain, mem0, MemGPT) is justified. Custom prompt is the production norm. Anthropic's Memory Tool (`memory_20250818`) is for agentic turn-by-turn use, not batch session extraction. |
| Memory reads | Browser → Supabase direct (`@supabase/supabase-js`) | Consistent with every other data operation in `db.js`. No reason to route through serverless. |
| Injection | String prepend in `chatApi.js` before `callClaude()` | `chatApi.js` is the single source of truth for system prompt assembly. 500-char hard cap enforced here. |
| Migration | `supabase/migrations/005_memory.sql` | New tables only. No changes to existing tables. No new Supabase extensions. |

**Avoid:** pgvector, LangChain memory modules, mem0, MemGPT, Anthropic Memory Tool, any new serverless function for extraction.

**Cost impact:** ~$0.004–0.005 per session total (injection + extraction). At 1,000 sessions/day, ~$4–5/day — negligible until meaningful scale.

---

## Table Stakes Features

Features users expect. Missing any makes memory feel broken.

| Feature | Priority | Notes |
|---------|----------|-------|
| Characters reference past facts organically, in their own voice | Critical | This is the entire user-facing payoff. Without injection working, storage is invisible and useless. |
| View stored memories on profile page | Must-have | Universal pattern: Replika "Facts about me", Character.ai memory section, ChatGPT Settings > Manage Memory. |
| Delete individual memory entries | Must-have | Trash icon + confirm dialog. Users correct extraction errors this way. Every comparable app has it. |
| Clear all memories per world | Must-have | Power user escape hatch. Prevents dirty data accumulation. |
| Global user facts apply across all worlds | Must-have | Name, preferences, recurring topics — users expect these to transfer. Two-tier system: global + per-world. |
| Async extraction — never blocks chat | Must-have | Extraction must be fire-and-forget. Any added latency to chat turns will be blamed on memory. |
| Memory scoped to world | Must-have | Already decided in PROJECT.md. World A facts must not bleed into World B. |
| Auth gate — no memory for guests | Must-have | Memory without auth is incoherent. Clear messaging if unauthenticated user hits memory features. |

**Defer to V2:**
- In-chat memory drawer (view memories without leaving chat)
- Memory extraction confidence scoring
- Manual memory pinning (Character.ai-style pinned memories)
- Memory toggle-off / disable feature
- Memory categories or tags UI
- Inline memory text editing (trust paradox: users should delete + re-converse, not manually author facts)

---

## Architecture Approach

**Three integration points. No changes to `api/chat.js`.**

### New Files
- `src/lib/memoryApi.js` — extraction prompt construction, `POST /api/chat` call, Supabase write
- `supabase/migrations/005_memory.sql` — `world_memories` + `user_facts` tables + RLS policies + indexes

### Files Modified
- `src/lib/chatApi.js` — `getCharacterResponses()` accepts optional `worldMemory` param; memory block assembled and prepended before `callClaude()` with 500-char hard cap
- `src/lib/db.js` — add `getWorldMemory`, `upsertWorldMemory`, `getUserFacts`, `upsertUserFacts`, `deleteMemoryEntry`, `deleteUserFact`
- `src/pages/ChatView.jsx` — load memory in initial `Promise.all` alongside chat + messages; pass `worldMemory` to `getCharacterResponses`; trigger `extractAndSaveMemory` on unmount/visibilitychange
- `src/pages/Profile.jsx` — add memory UI section with per-world fact lists + global user facts, delete controls

### Data Flow (Injection — every turn)
```
ChatView mounts
  → Promise.all([getChat, getChatMessages, getWorldMemory, getUserFacts])
  → worldMemory stored in local state

User sends message
  → getCharacterResponses({ ..., worldMemory })
  → chatApi.js prepends 500-char memory block to system prompt
  → POST /api/chat (unchanged)
```

### Data Flow (Extraction — session end)
```
ChatView unmounts OR visibilitychange → hidden
  → guard: messagesThisSession >= 5
  → extractAndSaveMemory() fire-and-forget
  → POST /api/chat with extraction system prompt + last 30 messages
  → parse JSON → { worldFacts, worldSummary, userFacts }
  → upsert world_memories + user_facts in Supabase
```

### Memory Block Format (injected after SCENE:, before RULES:)
```
MEMORY OF THIS WORLD:
[1-2 sentence world summary]
Key facts: [fact 1]. [fact 2]. [fact 3]. (max 5)

ABOUT THE USER:
[user fact 1]. [user fact 2]. (max 3)
```

### Key Constraints
- `api/chat.js` hard rejects system prompts > 8,000 chars. Use 7,800-char safety threshold in `chatApi.js`.
- Current typical prompt (3-character world): ~2,300–2,700 chars. Memory block adds ~280 chars typical, 500 chars max. Comfortable headroom.
- Memory injection instruction must tell characters to use facts organically, never to announce them: "Use this knowledge to inform how you speak to the user — do not state these facts directly or announce that you remember them."

---

## Top Pitfalls to Avoid

### 1. Extraction Hallucination (Critical)
Haiku invents plausible facts not present in the transcript. Small models are documented to hallucinate extraction under loose prompts.

**Prevention:** Require a `source` field in extraction output — model must quote the exact user message that grounds each fact. Anything without a verbatim source is discarded. Phrase the prompt as: "List only facts explicitly stated by the user. Do not infer. Do not speculate." Cap at 5 facts per session.

### 2. Token Budget Overflow Breaking Chat (Critical)
Memory injection that pushes the system prompt past 8,000 chars causes `api/chat.js` to hard-reject the request. Chat breaks.

**Prevention:** Hard cap memory block at 500 chars in `chatApi.js`. If combined prompt exceeds 7,800 chars after adding memory, omit memory block entirely and log a warning. Chat must never fail due to memory. Never throw — silently degrade.

### 3. Stale Contradicting Facts (Moderate)
User changes opinion between sessions. Old and new facts conflict. Characters pick one arbitrarily and seem confused or unreliable.

**Prevention:** At extraction time, pass existing facts alongside new session transcript and instruct: "If a new fact contradicts an existing fact, replace the old one." Sort injected facts by `updated_at` descending — recent wins. Show `updated_at` in memory UI.

### 4. Surveillance-Feeling Memory (Critical for trust/retention)
Characters surface sensitive personal disclosures (relationship problems, health info, real-world identity) unexpectedly. Users feel watched, not understood.

**Prevention:** Extraction prompt must explicitly exclude: health/medical, relationship conflicts, financial situations, real names (unless formally introduced), emotional distress signals. Scope extraction to: preferences, interests, recurring topics, stated opinions about characters and worlds. Make the memory UI prominent — users who can see and delete feel in control.

### 5. Noise Extraction from Short Sessions (Moderate)
1–4 message sessions produce trivial or invented facts. Keep It Going output (character-to-character banter) gets incorrectly extracted as user signal.

**Prevention:** Minimum threshold before extraction fires: 5 user messages in the session (not total messages — character messages inflate count). Extraction prompt must explicitly scope to "messages from the user," not all messages in the transcript. Return empty facts list on insufficient data rather than forcing output.

---

## Implications for Roadmap

The research supports a clean two-phase build:

**Phase 1 — Memory backbone (invisible to users)**
Wire extraction + injection before building any UI. Characters will start referencing memory in conversation immediately, giving the feature a testable signal before profile page work begins.
- `supabase/migrations/005_memory.sql` — new tables + RLS
- `src/lib/memoryApi.js` — extraction logic
- `src/lib/db.js` extensions — memory read/write functions
- `src/lib/chatApi.js` — injection into `getCharacterResponses()`
- `src/pages/ChatView.jsx` — load memory on mount, trigger extraction on exit

**Phase 2 — Memory UI (surfaces the feature)**
Profile page memory section. Users can see and manage what characters know.
- `src/pages/Profile.jsx` — per-world memory list + global user facts + delete controls
- One-time onboarding tooltip after first extraction runs

**No Phase 3 items** for this milestone. All V2 features (in-chat drawer, pinning, confidence scoring, toggle-off) are cleanly deferrable.

**Phase 1 can be verified** before Phase 2: send 10+ messages in a world, navigate away, return to a new session, confirm characters reference a past fact without any profile UI existing.

---

## Open Questions

1. **Contradiction resolution in Haiku:** The recommended approach (pass existing facts + new session to the extraction prompt, instruct to replace contradictions) is theoretically sound but untested with Haiku specifically. A short prompt test before Phase 1 build would validate this works reliably at Haiku's capability level.

2. **`visibilitychange` reliability on mobile browsers:** `visibilitychange` is the recommended primary extraction trigger, but mobile browser behavior varies (iOS Safari is documented to behave differently on backgrounding). If Dweebs sees meaningful mobile traffic, test this trigger on iOS Safari specifically.

3. **Character label collision interaction with extraction:** CONCERNS.md documents a bug where two characters sharing a first name cause response mis-attribution. If this bug is unresolved when memory ships, extraction quality will be degraded for worlds with duplicate first names. Recommend resolving before or alongside Phase 1.

4. **Extraction trigger threshold tuning:** The research recommends 5 user messages as the minimum threshold. This is a reasoned estimate, not empirically validated. Monitor extraction runs vs. session lengths in the first 2 weeks post-ship and adjust if noise is high.

5. **Optimistic locking for concurrent sessions:** The research flags a race condition for users with two tabs open. The simplest mitigation (debounce + DB-side cooldown) is acceptable for V1, but the right solution (PostgreSQL row-level lock on merge) should be implemented before memory reaches any meaningful scale.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack decisions | HIGH | Verified against actual codebase source files (`api/chat.js`, `chatApi.js`, `db.js`). No assumptions. |
| Feature scope | HIGH | Table stakes derived from Character.ai, ChatGPT, Replika, Gemini — universal patterns across all major apps reviewed. |
| Architecture | HIGH | All integration points derived from reading actual source files, not training data. Component boundaries are exact. |
| Pitfalls | HIGH | Hallucination risk: validated by HaluMem arXiv paper. Token overflow: verified against `api/chat.js` source. Privacy risk: documented by Palo Alto Unit42 and Meta AI reporting. Race condition: verified against Supabase concurrent write behavior. |
| Extraction quality (Haiku-specific) | MEDIUM | General hallucination suppression techniques are well-documented. Haiku-specific extraction quality at 5-fact structured tasks is inferred from capability docs, not benchmarked for this exact use case. |

**Overall: HIGH confidence.** All major decisions are grounded in actual codebase state or authoritative external sources. The one medium-confidence area (Haiku extraction quality) is mitigated by the `source`-field grounding technique and a defensively parsed fire-and-forget extraction path.

---

## Sources (Aggregated)

- Anthropic Memory Tool docs (platform.claude.ai) — HIGH
- Anthropic context engineering guide (anthropic.com/engineering) — HIGH
- Actual codebase source files: `api/chat.js`, `src/lib/chatApi.js`, `src/lib/db.js`, `src/pages/ChatView.jsx` — HIGH
- Character.ai memory feature docs and community updates (April 2025) — HIGH
- OpenAI ChatGPT memory announcement and controls — HIGH
- mem0.ai memory architecture best practices — HIGH
- HaluMem: Evaluating Hallucinations in Memory Systems of Agents (arXiv) — HIGH
- Palo Alto Unit42: Indirect prompt injection via memory poisoning — HIGH
- Memory-Driven Role-Playing evaluation (arXiv) — HIGH
- MLOps Community: prompt bloat and LLM output quality degradation — HIGH
- Replika AI 2025 overview (eesel.ai) — MEDIUM
- Tribe AI: context-aware memory systems 2025 — HIGH
- Simon Willison commentary on ChatGPT memory dossier — MEDIUM
- Meta AI privacy concerns (Washington Post) — HIGH
