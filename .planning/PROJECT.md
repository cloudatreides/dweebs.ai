# Dweebs.lol

## What This Is

Dweebs.lol is an AI group character chat app where users build "Worlds" — group chats populated with fictional and real-world characters (K-pop idols, anime characters, custom creations). Users message the group and Claude Haiku responds as each character. The magic is the group dynamic: characters react to each other, not just the user. This milestone adds persistent memory so characters actually remember past conversations and build a model of who the user is.

## Core Value

The group dynamic feels alive — characters with history, personality, and memory of the user make every world worth coming back to.

## Requirements

### Validated

- ✓ Group AI character chat — multiple characters respond per turn in `NAME: response` format — existing
- ✓ World creation — user selects characters, creates a named group chat — existing
- ✓ Character discovery — browse default + custom characters on Discover page — existing
- ✓ Custom character creation — AI-generates full personality profile from a name — existing
- ✓ World sharing + Aura rewards — share worlds publicly, earn Aura on tries — existing
- ✓ Keep It Going — user spectates while characters chat among themselves — existing
- ✓ Catch-up messages — characters simulate activity while user was away — existing
- ✓ User authentication — Google OAuth + email/password via Supabase — existing
- ✓ Rate limiting — 30/min, 300/hr, 600/day per user via DB-level advisory lock — existing
- ✓ Pro tier UI stubs — UpgradeModal and TierContext exist but no payment integration — existing

### Active

- [ ] Per-world memory extraction — after each session, Claude extracts key facts and events into a structured memory store per world
- [ ] World memory summary — maintain a short (1–2 sentence) rolling summary of what has happened in each world
- [ ] Global user profile facts — a small set of persistent facts about the user (name, preferences, recurring topics) stored globally and injected into every world's system prompt
- [ ] Memory injection into system prompt — world memory + user facts prepended to system prompt on each chat turn
- [ ] Memory UI on profile page — users can view their per-world memories and global user facts
- [ ] Memory editing — users can edit or delete individual memory entries and user facts

### Out of Scope

- Per-character memory across worlds — higher storage/retrieval cost with unclear UX benefit; world-level memory covers the use case
- Rolling transcript compression — grows unbounded, harder to control quality vs. structured fact extraction
- Payment integration / real Pro tier — separate future milestone; TierContext stub remains
- Mobile-first polish — desktop-first per project build philosophy
- Real-time memory updates mid-conversation — memory extracted at session end, not turn-by-turn

## Context

**Existing codebase:** React 19 + Vite + Tailwind deployed on Vercel. Single serverless function (`api/chat.js`) proxies to Anthropic Haiku. All other data ops go browser → Supabase directly via JS client.

**System prompt architecture:** All character personalities are encoded as plain text blocks in `src/lib/chatApi.js`. Memory will be injected as an additional section in the existing system prompt — no structural change to the prompt format needed.

**Supabase schema:** `profiles` table already has a `plan` column. New tables needed: `world_memories` (per-world extracted facts + summary) and `user_facts` (global user profile facts). Migrations will extend the existing schema.

**Known production issue:** Keep It Going 401 error — `SUPABASE_ANON_KEY` in Vercel has an embedded newline. Fix is an env var re-paste, no code change. Should be resolved before memory feature ships.

**API cost consideration:** Memory extraction runs as a background call after the session ends (or after N messages), not on every chat turn. Injection adds ~200–400 tokens to the system prompt per turn — acceptable given Haiku's pricing.

## Constraints

- **Stack:** React + Vite + Tailwind + Supabase + Vercel — no new infrastructure
- **AI model:** Claude Haiku only (enforced server-side in `api/chat.js`) — memory extraction uses same model
- **System prompt budget:** Current prompts already large (character personalities × N). Memory injection must stay under ~500 tokens total to avoid hitting the 8000-char system prompt limit in `api/chat.js`
- **No auth rework:** Memory is scoped to authenticated users only; no guest memory

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-world memory (not per-character) | 1 DB lookup vs N lookups per turn; matches user mental model (they think in worlds, not characters); world-level shared context captures group dynamics | — Pending |
| AI-extracted facts over rolling transcript | Structured, queryable, injection-size controlled; extraction is periodic not per-turn; quality improves with prompt tuning | — Pending |
| Light world summary alongside facts | 1–2 sentences of narrative context complements structured facts without bloating the prompt | — Pending |
| Memory editable on profile page | Users feel in control; surfaces profile page as a destination; corrects AI extraction errors | — Pending |
| Haiku for memory extraction | Consistent with existing model; extraction is a simple classification/summarization task; keeps cost low | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state (users, feedback, metrics)

---
*Last updated: 2026-03-24 — Phase 1 complete (DB Foundation: world_memories + user_facts tables, RLS policies, and 6 db.js memory CRUD functions shipped)*
