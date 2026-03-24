# Phase 3: Memory UI - Research

**Researched:** 2026-03-24
**Domain:** React UI for memory management (read, display, delete) on Supabase JSONB data
**Confidence:** HIGH

## Summary

This phase adds a Memory section to the existing Profile page (`src/pages/Profile.jsx`). The data layer is fully built: `world_memories` and `user_facts` tables exist with RLS, and `db.js` already exports `getWorldMemory`, `getUserFacts`, `deleteMemoryEntry`, and `deleteUserFact`. The main work is (1) a new query to fetch ALL world memories for the current user (not just one world), (2) joining with `group_chats` to get world names for display, and (3) building the grouped list UI with delete actions.

The facts column is JSONB and Supabase returns it as a parsed JavaScript array (not a string), but the codebase defensively handles both cases (see `memoryApi.js` lines 48-53). Each fact object has `{ fact, source, category }`. The existing `deleteMemoryEntry` and `deleteUserFact` functions use a read-modify-write pattern (fetch, splice, upsert back) which is correct for removing individual items from a JSONB array. "Clear all memories for a world" should delete the entire `world_memories` row, not just empty the array -- this is cleaner and matches the CASCADE pattern already established.

**Primary recommendation:** Add a `getAllUserWorldMemories(userId)` function to `db.js` that queries all `world_memories` rows for the user, then separately load the corresponding `group_chats` rows to get world names. Build the Memory section as a new component below the existing Save button in Profile.jsx. Use optimistic UI updates (remove from state immediately, then fire the Supabase call) for delete actions.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MUI-01 | Profile page shows all per-world memories grouped by world name | New `getAllUserWorldMemories` query + join with `group_chats` for names; grouped rendering in Profile.jsx |
| MUI-02 | Profile page shows a global user facts section separate from world memories | Existing `getUserFacts()` from db.js returns the single user_facts row; render as separate section |
| MUI-03 | User can delete individual facts (both world facts and user facts) | Existing `deleteMemoryEntry(worldId, factIndex)` and `deleteUserFact(factIndex)` in db.js handle this |
| MUI-04 | User can clear all memories for a specific world | New `clearWorldMemory(worldId)` function: delete the entire world_memories row via `.delete().eq()` |
| MUI-05 | Memory sections show empty state for worlds with no extracted facts | Conditional render: if a world's facts array is empty, show "No memories yet" text |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack:** React + Vite + Tailwind + Supabase -- no new infrastructure
- **Language:** JavaScript (JSX) -- no TypeScript
- **Styling:** Dark mode, Tailwind utility classes, theme colors (#7C3AED brand purple, #0D0D0F background, #1A1A1F card background)
- **State management:** useState + useEffect, React Context via useAuth() -- no external state library
- **Error handling:** console.error for unexpected, state variables for user-visible errors
- **Code organization:** pages in src/pages/, utilities in src/lib/, components in src/components/
- **Framer Motion:** Available (v12.36.0) for AnimatePresence exit animations on deleted items
- **GSD workflow:** Do not make direct repo edits outside GSD workflow

## Standard Stack

No new libraries needed. Everything required is already installed.

### Core (already in project)
| Library | Version | Purpose | Already Used |
|---------|---------|---------|--------------|
| react | 19.2.4 | Component rendering | Yes |
| @supabase/supabase-js | 2.99.1 | Database queries (world_memories, user_facts, group_chats) | Yes |
| framer-motion | 12.36.0 | AnimatePresence for delete animations | Yes in ChatView, Landing |
| lucide-react | 0.577.0 | Icons (Trash2, Brain, X, ChevronDown) | Yes |

### No New Dependencies
This phase uses only existing project dependencies. No `npm install` needed.

## Architecture Patterns

### Profile.jsx Structure (Current)
```
Profile page (max-w-xl mx-auto)
  |- Header (back button + title)
  |- Avatar section
  |- Aura stat (conditional)
  |- Username input
  |- Email (read-only)
  |- Error display
  |- Save button
  |- Feedback button
  |- BottomNav
  |- FeedbackModal
```

### Profile.jsx Structure (After Phase 3)
```
Profile page (max-w-xl mx-auto)
  |- Header / Avatar / Aura / Username / Email / Save / Feedback  (unchanged)
  |- DIVIDER
  |- Memory Section (new)
  |    |- Section header: "Your Memories" with Brain icon
  |    |- Loading state (spinner)
  |    |- Global User Facts card
  |    |    |- Each fact with delete (X) button
  |    |    |- Empty state if no facts
  |    |- Per-World Memory cards (grouped)
  |    |    |- World name header + "Clear all" button
  |    |    |- Each fact with delete (X) button
  |    |    |- Empty state per world if facts=[]
  |    |- Global empty state if no memories at all
  |- BottomNav / FeedbackModal (unchanged)
```

### Pattern 1: Data Loading for Memory Section
**What:** Load all world memories + world names + user facts in parallel on mount
**When to use:** When Profile.jsx mounts and user is authenticated

```javascript
// New function in db.js
export async function getAllUserWorldMemories(userId) {
  const { data, error } = await supabase
    .from('world_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

// In Profile.jsx useEffect:
const [memories, userFacts, chats] = await Promise.all([
  getAllUserWorldMemories(user.id),
  getUserFacts(),
  getUserChats(user.id),  // already exists in db.js -- reuse for world names
])
// Build a name lookup: { [chatId]: chatName }
const worldNames = Object.fromEntries(chats.map(c => [c.id, c.name]))
```

### Pattern 2: JSONB Facts Parsing (Defensive)
**What:** Facts column is JSONB but the codebase always handles both string and array
**When to use:** Every time you read facts from a world_memories or user_facts row

```javascript
// Standard pattern used throughout the codebase (memoryApi.js, db.js)
const facts = row?.facts
  ? (typeof row.facts === 'string' ? JSON.parse(row.facts) : row.facts)
  : []
```

### Pattern 3: Optimistic Delete with State Update
**What:** Remove item from local state immediately, then fire async delete
**When to use:** All delete actions (individual fact, clear all world)

```javascript
async function handleDeleteWorldFact(worldId, factIndex) {
  // Optimistic: update local state immediately
  setWorldMemories(prev => prev.map(m =>
    m.world_id === worldId
      ? { ...m, facts: parseFacts(m.facts).filter((_, i) => i !== factIndex) }
      : m
  ))
  // Fire async delete (read-modify-write in db.js)
  try {
    await deleteMemoryEntry(worldId, factIndex)
  } catch (err) {
    console.error('Failed to delete memory:', err)
    // Could reload on error, but not critical for PoC
  }
}
```

### Pattern 4: Clear All World Memories
**What:** Delete the entire world_memories row (not just empty the array)
**When to use:** MUI-04 -- "Clear all" button per world

```javascript
// New function in db.js
export async function clearWorldMemory(worldId) {
  const { error } = await supabase
    .from('world_memories')
    .delete()
    .eq('world_id', worldId)

  if (error) throw error
}
```

### Anti-Patterns to Avoid
- **Supabase join for world names:** Don't use `.select('*, group_chats(name)')` on world_memories -- the FK references group_chats(id) via `world_id` but Supabase PostgREST naming may not auto-resolve this cleanly. Safer to load `getUserChats` separately and build a lookup map. The chats query already exists and returns all user chats.
- **Inline Supabase calls in Profile.jsx:** Keep DB calls in `db.js` per project convention. Profile.jsx should only call db.js functions.
- **N+1 queries:** Don't fetch world names one-by-one per memory row. Load all chats once, build lookup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Delete animations | Manual CSS transitions | Framer Motion `AnimatePresence` + `motion.div` with `exit` prop | Already in project, handles unmount animations properly |
| Confirmation dialogs | Custom modal for every delete | Inline confirm state (show "Are you sure?" replacing the delete button) | Lighter weight for PoC, matches the fast/minimal build philosophy |
| JSONB array manipulation | Direct Supabase RPC or raw SQL | Existing `deleteMemoryEntry` / `deleteUserFact` (read-modify-write) | Already built, tested in Phase 1 |

## Common Pitfalls

### Pitfall 1: Facts as String vs Array
**What goes wrong:** Rendering `facts.map(...)` throws because facts is a JSON string, not an array
**Why it happens:** `upsertWorldMemory` calls `JSON.stringify(facts)` before writing. Supabase JSONB column *should* return parsed objects, but the codebase hedges against string returns.
**How to avoid:** Always parse defensively: `typeof facts === 'string' ? JSON.parse(facts) : (facts || [])`
**Warning signs:** `TypeError: facts.map is not a function`

### Pitfall 2: World Name Resolution for Deleted Worlds
**What goes wrong:** A world_memories row exists but the corresponding group_chat was deleted (CASCADE only deletes world_memories when group_chats row is deleted, but if there's a timing issue or the chat name can't be found)
**Why it happens:** Race condition or stale data
**How to avoid:** Default world name to "Unknown World" if lookup fails. The CASCADE delete on group_chats(id) should clean up world_memories rows, but defensive coding is warranted.
**Warning signs:** Blank or undefined world name headers

### Pitfall 3: Empty Facts Array vs No Row
**What goes wrong:** MUI-05 requires "No memories yet" for worlds with no extracted facts, but there are two cases: (a) world_memories row exists with `facts: []`, and (b) no world_memories row exists at all
**Why it happens:** The query only returns rows that exist -- worlds with no memory extraction yet won't appear at all
**How to avoid:** The Memory section should only show worlds that HAVE a world_memories row. If a world has never been chatted in enough to trigger extraction, it simply doesn't appear. MUI-05's "No memories yet" applies to worlds where extraction ran but produced empty results (facts=[]).
**Warning signs:** Showing every world the user has, including ones never chatted in

### Pitfall 4: Stale Index After Delete
**What goes wrong:** Deleting fact at index 2 from a 5-item array, then immediately deleting what was index 3 (now shifted to index 2) -- sends wrong index to `deleteMemoryEntry`
**Why it happens:** Optimistic UI updates local state immediately, but if two rapid deletes overlap, the second delete uses the original index
**How to avoid:** Update local state first (optimistic), and the `deleteMemoryEntry` function re-fetches from Supabase before splicing, so it operates on current server state. The optimistic local state handles what the user sees; the server-side read-modify-write handles correctness. Potential issue: if local and server states diverge. For PoC, this is acceptable -- user can refresh.

### Pitfall 5: RLS on world_memories Queries
**What goes wrong:** Query returns empty results even when rows exist
**Why it happens:** RLS policy on world_memories requires `auth.uid() = user_id`. The Supabase client must have an active session.
**How to avoid:** Use the supabase client from `src/lib/supabase.js` which automatically includes the auth session. The `user` object from `useAuth()` being present confirms session is active.

## Code Examples

### Fact Item Component Pattern
```javascript
// Matches project's dark theme card style (from MyWorlds.jsx, Profile.jsx)
function FactItem({ fact, onDelete }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl group"
      style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{fact.fact}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#4B5563' }}>
          {fact.category}
          {fact.source ? ` -- "${fact.source}"` : ''}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: '#6B7280' }}
        title="Delete this memory"
      >
        <X size={14} />
      </button>
    </div>
  )
}
```

### Section Header Pattern
```javascript
// Consistent with Profile.jsx label styling
<label
  className="text-xs font-semibold tracking-widest uppercase block mb-2"
  style={{ color: '#4B5563' }}
>
  Your Memories
</label>
```

### World Group Header with Clear All
```javascript
<div className="flex items-center justify-between mb-2">
  <h3 className="text-sm font-semibold text-white">{worldName}</h3>
  <button
    onClick={() => handleClearWorld(worldId)}
    className="text-[11px] px-2 py-1 rounded-lg transition-colors"
    style={{ color: '#EF4444', background: 'transparent' }}
  >
    Clear all
  </button>
</div>
```

### AnimatePresence for Smooth Deletes
```javascript
import { AnimatePresence, motion } from 'framer-motion'

<AnimatePresence>
  {facts.map((fact, index) => (
    <motion.div
      key={`${worldId}-${index}-${fact.fact}`}
      initial={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      <FactItem fact={fact} onDelete={() => handleDelete(worldId, index)} />
    </motion.div>
  ))}
</AnimatePresence>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom confirm modals for destructive actions | Inline confirm or immediate action with undo | Industry trend 2024+ | Faster UX, less modal fatigue |
| Full page reload after data mutation | Optimistic UI with local state update | Standard React pattern | Instant feedback, better perceived performance |

## Open Questions

1. **Should "Clear all" have a confirmation step?**
   - What we know: Clearing all memories for a world is destructive and not easily undoable (extraction only happens on next chat session)
   - What's unclear: How much friction is acceptable for a PoC
   - Recommendation: Use inline confirmation -- replace "Clear all" with "Are you sure? [Yes] [No]" for 3 seconds, then revert. No modal needed.

2. **Should we show worlds with empty facts arrays?**
   - What we know: MUI-05 says show "No memories yet" rather than blank. But extraction producing zero facts is unusual -- it usually produces something.
   - What's unclear: Whether this ever actually happens in practice
   - Recommendation: Show the world card with "No memories yet" if the row exists but facts is empty. Don't show worlds that have no world_memories row at all.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- no test runner configured |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MUI-01 | World memories grouped by name | manual-only | Visual verification in browser | N/A |
| MUI-02 | User facts separate section | manual-only | Visual verification in browser | N/A |
| MUI-03 | Delete individual fact | manual-only | Click delete, verify removal from UI and Supabase | N/A |
| MUI-04 | Clear all world memories | manual-only | Click clear all, verify row deleted from Supabase | N/A |
| MUI-05 | Empty state display | manual-only | Check world with no facts shows "No memories yet" | N/A |

### Wave 0 Gaps
No test framework exists in this project. All validation is manual browser testing. This is consistent with the PoC build philosophy. No Wave 0 test infrastructure needed.

## Sources

### Primary (HIGH confidence)
- `supabase/schema.sql` -- world_memories and user_facts table definitions, RLS policies, JSONB column types
- `src/lib/db.js` -- existing memory CRUD functions (getWorldMemory, getUserFacts, deleteMemoryEntry, deleteUserFact, upsertWorldMemory, upsertUserFacts)
- `src/lib/memoryApi.js` -- extraction logic, buildMemoryBlock showing facts shape `{ fact, source, category }`
- `src/pages/Profile.jsx` -- current page structure, styling patterns, auth context usage
- `src/pages/MyWorlds.jsx` -- list rendering patterns, card styling, action buttons, Supabase data loading
- `src/context/AuthContext.jsx` -- user object shape, profile loading, useAuth() hook

### Secondary (MEDIUM confidence)
- Supabase JSONB handling: Based on codebase evidence that both string and parsed array returns are handled defensively across multiple files

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing project libraries
- Architecture: HIGH - Profile.jsx structure fully read, db.js functions verified, data shapes confirmed from schema + memoryApi.js
- Pitfalls: HIGH - derived from actual codebase patterns and Supabase JSONB behavior observed in existing code

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- no external dependencies changing)
