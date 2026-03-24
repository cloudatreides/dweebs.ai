---
phase: 1
plan: 2
title: db.js Memory Functions
subsystem: data-access
tags: [memory, supabase, db, crud]
dependency_graph:
  requires: [01-01]
  provides: [getWorldMemory, upsertWorldMemory, getUserFacts, upsertUserFacts, deleteMemoryEntry, deleteUserFact]
  affects: [src/lib/db.js]
tech_stack:
  added: []
  patterns: [supabase-upsert-on-conflict, read-modify-write, maybeSingle-null-safe]
key_files:
  created: []
  modified: [src/lib/db.js]
decisions:
  - maybeSingle() used on read functions so missing rows return null not an error
  - onConflict composite key prevents duplicate rows on repeated upsert calls
  - delete functions use read-modify-write through existing upsert path (no raw SQL)
  - No userId param on read functions — RLS handles filtering automatically
metrics:
  duration_seconds: 44
  completed_date: "2026-03-24"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
requirements_addressed: [MSTR-01, MSTR-02, MSTR-04]
---

# Phase 1 Plan 2: db.js Memory Functions Summary

**One-liner:** 6 memory CRUD functions added to db.js using supabase upsert-on-conflict and read-modify-write patterns for world and user fact storage.

## What Was Built

Added a new MEMORY section to `src/lib/db.js` with 6 exported async functions that form the data access layer for the persistent memory feature. All functions follow the existing db.js conventions: named exports, async, supabase client calls, `if (error) throw error`, no try/catch wrappers.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add 6 memory functions to db.js | 5405583 | src/lib/db.js |

## Functions Added

| Function | Table | Pattern |
|----------|-------|---------|
| `getWorldMemory(worldId)` | world_memories | `.select().eq().maybeSingle()` |
| `upsertWorldMemory(worldId, facts, summary)` | world_memories | `.upsert({ onConflict: 'user_id,world_id' })` |
| `getUserFacts()` | user_facts | `.select().maybeSingle()` (RLS filters to current user) |
| `upsertUserFacts(facts)` | user_facts | `.upsert({ onConflict: 'user_id' })` |
| `deleteMemoryEntry(worldId, factIndex)` | world_memories | read-modify-write via upsertWorldMemory |
| `deleteUserFact(factIndex)` | user_facts | read-modify-write via upsertUserFacts |

## Key Decisions

1. **`maybeSingle()` on reads** — A world with no memory yet or a user with no facts yet is a normal state, not an error. `.maybeSingle()` returns `null` rather than throwing, which callers can handle gracefully.

2. **`onConflict` composite key on upserts** — `upsertWorldMemory` uses `onConflict: 'user_id,world_id'` and `upsertUserFacts` uses `onConflict: 'user_id'`. Re-running with the same key updates rather than duplicating.

3. **Read-modify-write for deletes** — Delete functions fetch the current facts array, splice the index, and write back through the upsert path. This avoids raw SQL array operations and keeps all writes through the same validated code path.

4. **No `userId` on read functions** — RLS on both tables filters to `auth.uid() = user_id`. This matches the existing db.js convention (e.g., `getChat(chatId)` takes no userId).

5. **`JSON.stringify(facts)` on writes** — Explicit stringify for JSONB columns. Safe even if the Supabase client accepts arrays directly.

## Verification

- `npm run build` passed (2201 modules, built in 1.12s)
- 25 total exported async functions in db.js (19 existing + 6 new)
- All 6 functions present: `getWorldMemory`, `upsertWorldMemory`, `getUserFacts`, `upsertUserFacts`, `deleteMemoryEntry`, `deleteUserFact`

## Deviations from Plan

None — plan executed exactly as written. The code block in the plan was appended verbatim.

## Known Stubs

None — these are pure data access functions with no UI or placeholder values.

## Self-Check: PASSED

- [x] `src/lib/db.js` exists and contains 6 new memory functions
- [x] Commit `5405583` exists
- [x] `npm run build` succeeded
