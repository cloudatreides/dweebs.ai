---
phase: 02-memory-backbone
plan: 02
subsystem: api
tags: [memory, system-prompt, claude-haiku, injection, chatApi]

# Dependency graph
requires:
  - phase: 02-memory-backbone
    provides: buildMemoryBlock function in memoryApi.js (wave 1 peer plan 02-01)
provides:
  - getCharacterResponses accepts optional worldMemory parameter
  - Memory block prepended to system prompt in primacy position (before "You are roleplaying")
  - 7800-char overflow safety — silently omits memory if system prompt too large
  - MINJ-01, MINJ-02, MINJ-03, MINJ-04 requirements satisfied
affects: [ChatView, 02-memory-backbone, 03-memory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Memory injection via optional parameter — worldMemory passed to getCharacterResponses, memory block built and prepended
    - Overflow safety pattern — build prompt with memory, check length, rebuild without if over threshold
    - Primacy position for memory — memory block appears before all character instructions

key-files:
  created: [src/lib/memoryApi.js (stub — will be overwritten by plan 02-01 merge)]
  modified: [src/lib/chatApi.js]

key-decisions:
  - "Memory block prepended BEFORE 'You are roleplaying' for primacy effect — LLMs weight earlier context more heavily"
  - "7800-char threshold (not 8000) leaves 200-char buffer below the api/chat.js server-side 8000-char limit"
  - "Silent omission on overflow — chat never fails due to memory, memory is a best-effort enhancement"
  - "memoryApi.js stub created in this plan to unblock build — peer plan 02-01 will replace with full implementation"

patterns-established:
  - "Memory injection pattern: optional param → buildMemoryBlock call → prepend to systemPrompt → overflow check → finalSystemPrompt"

requirements-completed: [MINJ-01, MINJ-02, MINJ-03, MINJ-04]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 02 Plan 02: Memory Backbone — Chat Injection Summary

**Memory block prepended to system prompt in primacy position with 7800-char overflow safety, enabling world memory + user facts injection into every chat turn**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T10:47:13Z
- **Completed:** 2026-03-24T10:52:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `getCharacterResponses` now accepts optional `worldMemory` parameter (`{ memory, userFacts }`)
- Memory block is prepended before "You are roleplaying" — primacy position ensures LLM weights it appropriately
- 7800-char overflow check silently omits memory if combined prompt exceeds threshold — chat never fails due to memory
- All other exported functions (`generateCatchUpMessages`, `generateKeepGoing`, `generateNudgeMessage`) left untouched

## Task Commits

1. **Task 1: Add memory injection to getCharacterResponses** - `be6af20` (feat)

**Plan metadata:** TBD (docs commit below)

## Files Created/Modified

- `src/lib/chatApi.js` - Modified: worldMemory param, memoryBlock build, systemPrompt prepend, overflow safety, finalSystemPrompt usage
- `src/lib/memoryApi.js` - Created: stub implementation of buildMemoryBlock (to be overwritten by peer plan 02-01)

## Decisions Made

- Memory block goes before "You are roleplaying" (primacy position) — LLMs prioritize earlier context, so placing memory first ensures characters reference it when forming responses
- 7800-char threshold chosen to leave 200-char buffer below the server-side 8000-char limit enforced in `api/chat.js`
- Silent overflow omission (not error) — memory is a best-effort enhancement; chat correctness is more important than memory presence
- Created `memoryApi.js` stub to unblock build since peer plan 02-01 had not yet created the file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created memoryApi.js stub to unblock build**
- **Found during:** Task 1 (memory injection implementation)
- **Issue:** `src/lib/memoryApi.js` does not exist (created by wave 1 peer plan 02-01 which had not yet merged). Build fails with "Module not found" when importing `buildMemoryBlock`.
- **Fix:** Created minimal stub `memoryApi.js` that exports `buildMemoryBlock` with the correct signature (`worldMemory, userFacts, maxChars = 500`) and returns a formatted memory string or empty string. The stub is functionally correct but less polished than the full implementation.
- **Files modified:** `src/lib/memoryApi.js` (created)
- **Verification:** `npm run build` passes with exit 0
- **Committed in:** `be6af20` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock build in parallel execution. Stub will be replaced by peer plan 02-01's full implementation when merged into main.

## Issues Encountered

- Parallel wave 1 execution means peer plan 02-01 (which creates `memoryApi.js`) may not have run yet. Handled via Rule 3 stub creation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getCharacterResponses` is ready to receive `worldMemory` from the caller (ChatView)
- Plan 02-03 (ChatView wiring) can now pass world memory data to `getCharacterResponses`
- When peer plan 02-01 merges, the stub `memoryApi.js` will be replaced with full implementation — no changes needed to `chatApi.js`

---
*Phase: 02-memory-backbone*
*Completed: 2026-03-24*
