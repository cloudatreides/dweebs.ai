---
plan: 02
phase: 1
title: db.js Memory Functions
objective: Add 6 memory read/write/delete functions to db.js following existing patterns
requirements_addressed: [MSTR-01, MSTR-02, MSTR-04]
wave: 1
depends_on: [01]
files_modified: [src/lib/db.js]
autonomous: true
must_haves:
  truths:
    - "getWorldMemory returns the memory row for a given user+world"
    - "upsertWorldMemory inserts or updates without creating duplicates"
    - "getUserFacts returns the single user_facts row for the current user"
    - "upsertUserFacts inserts or updates without creating duplicates"
    - "deleteMemoryEntry removes one fact from world_memories.facts by index"
    - "deleteUserFact removes one fact from user_facts.facts by index"
  artifacts:
    - path: "src/lib/db.js"
      provides: "6 new exported async functions for memory CRUD"
      exports: ["getWorldMemory", "upsertWorldMemory", "getUserFacts", "upsertUserFacts", "deleteMemoryEntry", "deleteUserFact"]
  key_links:
    - from: "src/lib/db.js"
      to: "world_memories table"
      via: "supabase.from('world_memories')"
      pattern: "supabase\\.from\\('world_memories'\\)"
    - from: "src/lib/db.js"
      to: "user_facts table"
      via: "supabase.from('user_facts')"
      pattern: "supabase\\.from\\('user_facts'\\)"
---

<objective>
Add 6 memory functions to `src/lib/db.js` — the data access layer for memory read, write, and delete operations.

Purpose: These functions are the API that ChatView, memoryApi, and Profile will call to interact with memory data. They follow the exact same pattern as every other function in db.js.
Output: 6 new named exports in `src/lib/db.js`.
</objective>

<context>
@.planning/REQUIREMENTS.md
@src/lib/db.js
@src/lib/supabase.js

<interfaces>
<!-- Existing db.js pattern — all new functions must match this exactly -->

From src/lib/db.js:
```javascript
import { supabase } from './supabase'

// Pattern: named export, async, uses supabase client directly
// Reads: .select('*').eq('col', val) → return data
// Writes: .insert({}).select().single() or .update({}).eq()
// Errors: if (error) throw error
// No try/catch wrappers — callers handle errors
```

From src/lib/supabase.js:
```javascript
// supabase client is already configured with auth — auth.uid() is available
// via RLS. Functions do NOT need to pass user_id for reads — RLS filters automatically.
// But INSERT/UPSERT must include user_id in the row data.
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 6 memory functions to db.js</name>
  <files>src/lib/db.js</files>
  <action>
Append a new section to the end of `src/lib/db.js` after the existing `addMessages` function. Add this exact code:

```javascript
// ============================================
// MEMORY
// ============================================

export async function getWorldMemory(worldId) {
  const { data, error } = await supabase
    .from('world_memories')
    .select('*')
    .eq('world_id', worldId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertWorldMemory(worldId, facts, summary) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('world_memories')
    .upsert(
      {
        user_id: user.id,
        world_id: worldId,
        facts: JSON.stringify(facts),
        summary: summary || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,world_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserFacts() {
  const { data, error } = await supabase
    .from('user_facts')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserFacts(facts) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_facts')
    .upsert(
      {
        user_id: user.id,
        facts: JSON.stringify(facts),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMemoryEntry(worldId, factIndex) {
  // Fetch current facts, remove by index, write back
  const memory = await getWorldMemory(worldId)
  if (!memory) return

  const facts = Array.isArray(memory.facts) ? [...memory.facts] : []
  if (factIndex < 0 || factIndex >= facts.length) return

  facts.splice(factIndex, 1)
  return upsertWorldMemory(worldId, facts, memory.summary)
}

export async function deleteUserFact(factIndex) {
  // Fetch current facts, remove by index, write back
  const userFacts = await getUserFacts()
  if (!userFacts) return

  const facts = Array.isArray(userFacts.facts) ? [...userFacts.facts] : []
  if (factIndex < 0 || factIndex >= facts.length) return

  facts.splice(factIndex, 1)
  return upsertUserFacts(facts)
}
```

Key implementation decisions:

1. **`getWorldMemory` uses `.maybeSingle()`** instead of `.single()` — returns `null` if no row exists rather than throwing. A world with no memory yet is a normal state, not an error.

2. **`getUserFacts` uses `.maybeSingle()`** for the same reason — no RLS `.eq('user_id', ...)` filter needed because RLS already filters to `auth.uid() = user_id`, and the UNIQUE constraint on user_id means at most one row.

3. **`upsertWorldMemory` calls `supabase.auth.getUser()`** to get the current user's ID. This is needed because upsert must include user_id in the row (it is part of the unique constraint). The `onConflict: 'user_id,world_id'` tells Supabase to update on conflict with that composite key.

4. **`facts` is passed through `JSON.stringify()`** because the Supabase JS client expects JSONB columns to receive a string or object. Passing an array directly works too, but stringify is explicit and safe.

5. **Delete functions use read-modify-write** — they fetch the current facts array, remove the entry at the given index, then write back via the existing upsert function. This avoids raw SQL and keeps all writes going through the same upsert path (MSTR-04 compliance).

6. **No `userId` parameter on read functions** — RLS handles filtering to the current user. This matches the existing db.js convention where `getChat(chatId)` does not take userId — RLS ensures you only get your own rows.
  </action>
  <verify>
    <automated>grep -c "export async function" src/lib/db.js</automated>
  </verify>
  <done>
    - db.js contains 6 new exported functions: getWorldMemory, upsertWorldMemory, getUserFacts, upsertUserFacts, deleteMemoryEntry, deleteUserFact
    - All functions follow existing db.js patterns (named export, async, supabase client, throw on error)
    - Upsert functions use onConflict to prevent duplicate rows (MSTR-04)
    - Read functions use maybeSingle() to handle missing rows gracefully
    - Delete functions use read-modify-write through the upsert path
    - Total exported functions in db.js: ~20 (14 existing + 6 new)
  </done>
</task>

</tasks>

<verification>
- All 6 functions are exported and callable
- `upsertWorldMemory` uses `onConflict: 'user_id,world_id'` — re-running with same worldId updates, does not duplicate
- `upsertUserFacts` uses `onConflict: 'user_id'` — re-running updates, does not duplicate
- `getWorldMemory` returns null (not error) for a world with no memory
- `getUserFacts` returns null (not error) for a user with no facts
- `deleteMemoryEntry` and `deleteUserFact` handle out-of-bounds index gracefully (no-op)
- `npm run build` passes with no import errors
</verification>

<success_criteria>
- 6 new functions exported from db.js
- Upsert calls do not create duplicate rows when called twice with the same key
- Read calls return null for missing data instead of throwing
- `npm run build` succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/01-db-foundation/01-02-SUMMARY.md`
</output>
