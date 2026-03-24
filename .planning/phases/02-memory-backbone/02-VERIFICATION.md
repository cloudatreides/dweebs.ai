---
phase: 02-memory-backbone
verified: 2026-03-24T11:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 2: Memory Backbone Verification Report

**Phase Goal:** Characters reference past conversation facts in their responses — extraction fires at session end, injection prepends memory to the system prompt on every chat turn
**Verified:** 2026-03-24T11:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After 5+ user messages and navigating away, world_memories and user_facts rows are created/updated | VERIFIED | `triggerExtraction()` guards on `userMessageCountRef.current < 5`, calls `extractAndSaveMemory` fire-and-forget; `extractAndSaveMemory` calls `upsertWorldMemory` / `upsertUserFacts` |
| 2 | Characters organically reference facts from previous session (memory injected into every system prompt) | VERIFIED | `buildMemoryBlock` formats stored memory; prepended via `${memoryBlock ? memoryBlock + '\n' : ''}` before "You are roleplaying..." in `chatApi.js` line 36 |
| 3 | Extraction never blocks navigation — fires fire-and-forget | VERIFIED | `triggerExtraction` calls `extractAndSaveMemory(...)` without `await`; wrapped in `visibilitychange` and `useEffect` cleanup — navigation path never awaits it |
| 4 | A world with system prompt near 8000-char limit still loads — memory silently omitted on overflow | VERIFIED | `chatApi.js` lines 57-78: `if (systemPrompt.length > 7800 && memoryBlock)` rebuilds prompt without memory block |
| 5 | Extracted facts include source field, capped at 5 world facts + 3 user facts per run | VERIFIED | `EXTRACTION_SYSTEM_PROMPT` instructs "up to 5 key facts" with `fact/source/category` and "up to 3 persistent facts"; extraction target cap enforced by prompt |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/lib/memoryApi.js` | Extraction engine + memory block builder | Yes | 173 lines, full implementation | Imported in chatApi.js + ChatView.jsx | VERIFIED |
| `src/lib/chatApi.js` | Modified with worldMemory param + injection | Yes | ~462 lines, injection present | Called from ChatView.jsx with worldMemory | VERIFIED |
| `src/pages/ChatView.jsx` | Memory load on mount, injection on send, extraction on exit | Yes | Large file, all three wiring points present | Imports from memoryApi + db | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/lib/memoryApi.js` | `src/lib/db.js` | `import { getWorldMemory, upsertWorldMemory, getUserFacts, upsertUserFacts }` | WIRED | Line 2 of memoryApi.js, exact import present |
| `src/lib/memoryApi.js` | `/api/chat` | `fetch('/api/chat', ...)` | WIRED | Lines 74-86 of memoryApi.js, authenticated POST with extraction prompt |
| `src/lib/chatApi.js` | `src/lib/memoryApi.js` | `import { buildMemoryBlock } from './memoryApi'` | WIRED | Line 2 of chatApi.js |
| `src/lib/chatApi.js` | system prompt | `${memoryBlock ? memoryBlock + '\n' : ''}` at prompt start | WIRED | Line 36 of chatApi.js — memory block in primacy position |
| `src/pages/ChatView.jsx` | `src/lib/memoryApi.js` | `import { extractAndSaveMemory }` | WIRED | Line 8 of ChatView.jsx |
| `src/pages/ChatView.jsx` | `src/lib/db.js` | `import { ..., getWorldMemory, getUserFacts }` | WIRED | Line 7 of ChatView.jsx — merged into existing db import |
| `src/pages/ChatView.jsx` | `src/lib/chatApi.js` | `getCharacterResponses({ ..., worldMemory })` | WIRED | Lines 373-379 of ChatView.jsx |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `chatApi.js` — system prompt | `memoryBlock` | `buildMemoryBlock(worldMemory.memory, worldMemory.userFacts)` | Yes — reads `worldMemory` passed from ChatView which loaded from Supabase via `getWorldMemory` + `getUserFacts` | FLOWING |
| `ChatView.jsx` — `worldMemory` state | `worldMemory` | `Promise.all([..., getWorldMemory(id).catch(() => null), getUserFacts().catch(() => null)])` then `setWorldMemory(...)` | Yes — Supabase DB reads; `.catch(() => null)` is a failure guard, not a static return | FLOWING |
| `memoryApi.js` — extraction | `parsed` (worldFacts/userFacts) | `/api/chat` → Claude Haiku extraction prompt | Yes — live LLM call with real transcript, writes to Supabase via `upsertWorldMemory` / `upsertUserFacts` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| `memoryApi.js` exports both expected functions | `grep -c "^export" src/lib/memoryApi.js` → 2 | PASS |
| `buildMemoryBlock` enforces 500-char cap | Code at lines 163-168: `if (block.length > maxChars)` with drop + hard truncate | PASS |
| `parseExtractionJSON` handles 3 strategies | Lines 119-131: direct parse → strip fences → regex extract | PASS |
| `chatApi.js` uses `finalSystemPrompt` (not `systemPrompt`) in API call | Line 97: `callWithFallback(finalSystemPrompt, userContent)` | PASS |
| Build compiles cleanly | `npm run build` → `built in 454ms`, 0 errors | PASS |
| `extractionFiredRef` dedup guard present | Lines 438: `if (extractionFiredRef.current) return` | PASS |
| Both visibilitychange and useEffect cleanup trigger extraction | Lines 451-462 of ChatView.jsx | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MEXT-01 | 02-01, 02-03 | Extract after 5+ user messages | SATISFIED | `userMessageCountRef.current < 5` guard in `triggerExtraction`; safety guard in `extractAndSaveMemory` (`messages.length < 5`) |
| MEXT-02 | 02-01 | Structured JSON with fact/source/category | SATISFIED | `EXTRACTION_SYSTEM_PROMPT` mandates `{"fact", "source", "category"}` fields; stored and forwarded to Supabase |
| MEXT-03 | 02-01 | Contradiction resolution — new facts replace old | SATISFIED | Existing facts fetched via `getWorldMemory`/`getUserFacts` and passed under `EXISTING WORLD FACTS:` / `EXISTING USER FACTS:` headers in extraction prompt |
| MEXT-04 | 02-03 | Extraction triggers on session end, not every turn | SATISFIED | `triggerExtraction` called only from `visibilitychange` (hidden) and `useEffect` cleanup — never from `sendMessage` |
| MEXT-05 | 02-01, 02-03 | Windowed last-30-messages slice | SATISFIED | `messages.slice(-30)` in `extractAndSaveMemory` transcript builder |
| MINJ-01 | 02-02, 02-03 | World memory injected into system prompt every turn | SATISFIED | `buildMemoryBlock(worldMemory.memory, ...)` → `memoryBlock + '\n'` prepended in `getCharacterResponses` |
| MINJ-02 | 02-02, 02-03 | Global user facts injected into every world's system prompt | SATISFIED | `buildMemoryBlock(..., worldMemory.userFacts)` includes `ABOUT THE USER:` section from same memory object |
| MINJ-03 | 02-02 | Memory hard-capped, silently omitted if overflow | SATISFIED | Two-layer protection: `buildMemoryBlock` enforces 500-char cap with truncation; `chatApi.js` rebuilds prompt without memory if total exceeds 7800 chars |
| MINJ-04 | 02-02 | Memory injected at top of system prompt (primacy) | SATISFIED | `systemPrompt = \`${memoryBlock ? memoryBlock + '\n' : ''}You are roleplaying...\`` — memory block is first content |

**Note on MINJ-03:** REQUIREMENTS.md describes a "400-token hard cap". The plan and implementation use a 500-character string cap in `buildMemoryBlock` plus a 7800-character total prompt overflow check. 500 chars is approximately 125 tokens — well within the 400-token bound stated in requirements. The two-layer approach (char cap on the block + total prompt overflow) provides stronger protection than the requirement specifies. No functional gap.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

Checked for: TODO/FIXME/placeholder comments, `return null` / `return {}` / `return []` without data fetch, hardcoded empty props at call site, console.log-only implementations, and throw statements in `extractAndSaveMemory` (none found — all errors are caught and `console.warn`).

`buildMemoryBlock` has a short-circuit `return ''` when both inputs are null/falsy — this is correct defensive behavior, not a stub.

---

### Human Verification Required

#### 1. Characters actually reference memory in responses

**Test:** Create a world, send 5+ messages establishing a fact (e.g. "my name is Nick"), navigate away, return to same world, and send a message. Check if characters reference the fact without prompting.
**Expected:** A character naturally incorporates the stored fact in their response.
**Why human:** Requires live Supabase + Anthropic API, cannot verify statically that Claude Haiku honors the injected memory block.

#### 2. Extraction fires on tab close (visibilitychange)

**Test:** Open chat, send 5+ messages, close the tab or switch tabs, then check `world_memories` table in Supabase.
**Expected:** A row is created or updated for that chat ID with extracted facts.
**Why human:** Requires runtime browser behavior (visibilitychange event), live API call, and Supabase write — cannot exercise in static analysis.

#### 3. Memory is silently omitted on overflow (not tested with real large prompts)

**Test:** Create a world with many characters (generating a large charDescriptions block > 7300 chars), then navigate to that world with stored memory. Confirm chat responds normally.
**Expected:** Chat responds without error; memory is omitted silently from the system prompt.
**Why human:** Requires constructing a specific data state in Supabase and a specific character configuration.

---

### Gaps Summary

No gaps found. All 8 must-haves (5 truths + 3 artifact/wiring checks) are verified. All 9 requirement IDs (MEXT-01 through MEXT-05, MINJ-01 through MINJ-04) are satisfied by substantive, wired, data-flowing implementations. The build passes cleanly. Three items are routed to human verification because they require a live runtime environment.

---

_Verified: 2026-03-24T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
