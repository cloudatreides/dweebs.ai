---
phase: 01-db-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, rls, jsonb, migrations]

# Dependency graph
requires: []
provides:
  - world_memories table (uuid pk, user_id FK, world_id FK, facts jsonb, summary text, updated_at)
  - user_facts table (uuid pk, user_id FK unique, facts jsonb, updated_at)
  - RLS policies: owner-only SELECT/INSERT/UPDATE/DELETE on both tables
  - Performance indexes: idx_world_memories_user_world, idx_user_facts_user
  - Upsert target: UNIQUE(user_id, world_id) on world_memories
affects:
  - 02-memory-backbone
  - 03-memory-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UNIQUE(user_id, world_id) constraint enables INSERT ... ON CONFLICT upsert pattern"
    - "auth.uid() = user_id in all RLS policies — no joins through other tables"
    - "jsonb array default '[]' for fact lists — app-side enforcement of 10-item max"

key-files:
  created:
    - supabase/migrations/005_memory.sql
  modified:
    - supabase/schema.sql

key-decisions:
  - "world_memories references group_chats(id) not profiles(id) — world IS a group_chat, CASCADE delete cleans up memory when world is deleted"
  - "user_facts uses UNIQUE on user_id column (not separate UNIQUE constraint) — enforces exactly one row per user globally"
  - "No trigger for updated_at — app layer handles setting updated_at on upsert to keep migration simple"

patterns-established:
  - "Migration style: uppercase SQL keywords, no transaction wrapper (Supabase handles it), section comments"
  - "Schema.sql style: lowercase keywords matching existing file convention"

requirements-completed: [MSTR-01, MSTR-02, MSTR-03]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 1 Plan 01: Supabase Migration — Memory Tables Summary

**Two Supabase tables (world_memories, user_facts) with jsonb fact arrays, owner-only RLS, and composite indexes — the storage foundation for persistent character memory**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-24T10:11:27Z
- **Completed:** 2026-03-24T10:12:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `world_memories` table created: per-user per-world facts (jsonb array) + rolling summary text, with UNIQUE(user_id, world_id) enabling upsert without conflicts
- `user_facts` table created: global per-user fact store with UNIQUE(user_id) enforcing single row per user
- 8 RLS policies across both tables restricting all operations to row owner (`auth.uid() = user_id`)
- 2 indexes covering both the RLS check path and the expected lookup pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 005_memory.sql migration** - `1b18204` (feat)
2. **Task 2: Append memory tables to schema.sql** - `1ece663` (feat)

## Files Created/Modified

- `supabase/migrations/005_memory.sql` - Full DDL for world_memories + user_facts, RLS policies, indexes — ready to paste into Supabase SQL Editor
- `supabase/schema.sql` - Appended MEMORY SYSTEM section with matching lowercase-style definitions as canonical reference

## Decisions Made

- Used uppercase SQL in the migration file to follow the style of existing migrations (001–004 all use uppercase). Used lowercase in schema.sql to match that file's existing convention.
- `world_memories.world_id` references `public.group_chats(id)` (not `auth.users` directly) — the "world" in this app IS a group_chat row.
- Both FK references include `ON DELETE CASCADE` — deleting a user or world automatically removes their memory rows, no orphans.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**External service configuration required.** To activate the memory tables, paste `supabase/migrations/005_memory.sql` into the Supabase SQL Editor for the dweebs.lol project and run it. This is a one-time manual step — there is no Supabase CLI migration runner configured for this project.

## Next Phase Readiness

- DB layer ready for Phase 02 (Memory Backbone): both tables exist with correct schema and RLS
- Upsert pattern available via `ON CONFLICT (user_id, world_id) DO UPDATE` for world_memories
- `user_facts` single-row upsert via `ON CONFLICT (user_id) DO UPDATE`
- No blockers

---
*Phase: 01-db-foundation*
*Completed: 2026-03-24*

## Self-Check: PASSED

- FOUND: supabase/migrations/005_memory.sql
- FOUND: supabase/schema.sql
- FOUND: .planning/phases/01-db-foundation/01-01-SUMMARY.md
- FOUND commit: 1b18204 (Task 1)
- FOUND commit: 1ece663 (Task 2)
