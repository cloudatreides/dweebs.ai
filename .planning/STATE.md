---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 02
stopped_at: "Completed 02-03-PLAN.md (2026-03-24T10:55:08Z)"
last_updated: "2026-03-24T10:56:12.177Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
---

# Project State: Dweebs.lol

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-24)

**Core value:** Characters that feel alive — memory makes every world worth coming back to.
**Current focus:** Phase 02 — memory-backbone

## Milestone

**Persistent Memory v1**
Goal: Characters remember past conversations and build a model of who the user is.

## Phase Progress

| Phase | Status |
|-------|--------|
| 0. KIG Bug Fix | Not started |
| 1. DB Foundation | In progress (plan 2/3 complete) |
| 2. Memory Backbone | Not started |
| 3. Memory UI | Not started |

## Decisions

- **01-02:** `maybeSingle()` on reads returns null for missing rows instead of throwing — avoids false errors when no memory row yet exists
- **01-02:** `upsert onConflict` composite key prevents duplicate world_memories and user_facts rows on repeated calls
- [Phase 01-db-foundation]: world_memories references group_chats(id) — world IS a group_chat, CASCADE delete cleans memory on world deletion
- [Phase 01-db-foundation]: user_facts UNIQUE on user_id column enforces one row per user globally; upsert via ON CONFLICT (user_id) DO UPDATE
- [Phase 02-01]: parseExtractionJSON uses 3-strategy fallback: direct parse, fence-strip parse, regex-extract parse — handles Haiku non-determinism without throwing
- [Phase 02-01]: buildMemoryBlock drops ABOUT THE USER section first under 500-char budget pressure, preserving world context priority
- [Phase 02-memory-backbone]: Memory block prepended BEFORE 'You are roleplaying' for primacy effect in chat system prompt
- [Phase 02-memory-backbone]: 7800-char threshold for memory overflow safety leaves 200-char buffer below server-side 8000-char limit
- [Phase 02-memory-backbone]: Silent memory omission on overflow — chat never fails, memory is best-effort enhancement
- [Phase 02-memory-backbone]: userMessageCountRef >= 5 guard satisfies MEXT-01 — extraction only fires after meaningful session
- [Phase 02-memory-backbone]: chatCharactersRef synced on every render (not in useEffect) since chatCharacters is a derived value

## Performance Metrics

| Phase | Plan | Duration (s) | Tasks | Files |
|-------|------|-------------|-------|-------|
| 01 | 02 | 44 | 1 | 1 |
| Phase 01-db-foundation P01 | 2 | 2 tasks | 2 files |
| Phase 02-memory-backbone P01 | 66 | 1 tasks | 1 files |
| Phase 02-memory-backbone P02 | 156 | 1 tasks | 2 files |
| Phase 02-memory-backbone P03 | 300 | 1 tasks | 1 files |

## Last Session

Stopped at: Completed 02-03-PLAN.md (2026-03-24T10:55:08Z)

## Next Action

Execute plan 03 of phase 01-db-foundation.

---
*State initialized: 2026-03-24*
*Last updated: 2026-03-24T10:11:28Z*
