# Roadmap: Dweebs.lol — Persistent Memory Milestone

**Milestone:** Persistent Memory v1
**Goal:** Characters remember past conversations and build a model of who the user is.
**Created:** 2026-03-24

---

## Phases

- [x] **Phase 0: KIG Bug Fix** - Resolve the Keep It Going 401 error blocking production before memory ships
- [x] **Phase 1: DB Foundation** - Stand up the two new memory tables with RLS and read/write functions in db.js (completed 2026-03-24)
- [x] **Phase 2: Memory Backbone** - Wire extraction and injection end-to-end so characters reference memories in chat (completed 2026-03-24)
- [ ] **Phase 3: Memory UI** - Surface stored memories on the Profile page with view and delete controls

---

## Phase Details

### Phase 0: KIG Bug Fix
**Goal**: Production is unblocked — Keep It Going works and api/chat.js validates env vars on startup
**Depends on**: Nothing
**Requirements**: None (prerequisite fix)
**Success Criteria** (what must be TRUE):
  1. Keep It Going generates character messages without a 401 error in production
  2. api/chat.js logs a clear startup message confirming SUPABASE_ANON_KEY is present and well-formed
  3. No embedded newline or whitespace in the Vercel env var causes auth failures
**Plans**: TBD

---

### Phase 1: DB Foundation
**Goal**: The two new memory tables exist in Supabase with correct schema, RLS policies, and all six db.js read/write functions are wired and tested
**Depends on**: Phase 0
**Requirements**: MSTR-01, MSTR-02, MSTR-03, MSTR-04
**Success Criteria** (what must be TRUE):
  1. `world_memories` and `user_facts` tables exist in Supabase with the correct columns and constraints
  2. RLS policies allow a user to read and write only their own rows in both tables
  3. `getWorldMemory`, `upsertWorldMemory`, `getUserFacts`, `upsertUserFacts`, `deleteMemoryEntry`, and `deleteUserFact` are callable from the browser without errors
  4. Upsert calls do not create duplicate rows — re-running the same write updates the existing record
**Plans**: TBD

---

### Phase 2: Memory Backbone
**Goal**: Characters reference past conversation facts in their responses — extraction fires at session end, injection prepends memory to the system prompt on every chat turn
**Depends on**: Phase 1
**Requirements**: MEXT-01, MEXT-02, MEXT-03, MEXT-04, MEXT-05, MINJ-01, MINJ-02, MINJ-03, MINJ-04
**Success Criteria** (what must be TRUE):
  1. After 5+ user messages in a world and navigating away, world_memories and user_facts rows are created or updated in Supabase
  2. Returning to the same world in a new session, characters organically reference a fact from the previous session without the user prompting them
  3. Extraction never blocks navigation — the chat page closes immediately and extraction runs in the background
  4. A world with a system prompt near the 8000-char limit still loads and chats successfully — memory is silently omitted rather than breaking the request
  5. Extracted facts include a source field (verbatim quote) and are capped at 5 world facts + 3 user facts per extraction run
**Plans:** 3/3 plans complete

Plans:
- [x] 02-01-PLAN.md — Create memoryApi.js with extraction engine and memory block builder
- [x] 02-02-PLAN.md — Add memory injection to chatApi.js system prompt
- [x] 02-03-PLAN.md — Wire ChatView.jsx with memory loading, passing, and extraction triggers

**UI hint**: no

---

### Phase 3: Memory UI
**Goal**: Users can see exactly what characters know about them and delete any fact they disagree with
**Depends on**: Phase 2
**Requirements**: MUI-01, MUI-02, MUI-03, MUI-04, MUI-05
**Success Criteria** (what must be TRUE):
  1. The Profile page shows a memory section listing all per-world facts grouped under each world name
  2. The Profile page shows a separate global user facts section distinct from world memories
  3. User can delete an individual world fact or user fact and it disappears immediately from the UI and from Supabase
  4. User can clear all memories for a specific world with a single action
  5. Worlds that have never had a memory extraction show an empty state ("No memories yet") rather than a blank section
**Plans:** 2 plans

Plans:
- [ ] 03-01-PLAN.md — Add db.js functions and build Memory section in Profile.jsx
- [ ] 03-02-PLAN.md — Visual verification checkpoint

**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. KIG Bug Fix | 0/1 | Not started | - |
| 1. DB Foundation | 2/2 | Complete   | 2026-03-24 |
| 2. Memory Backbone | 3/3 | Complete   | 2026-03-24 |
| 3. Memory UI | 0/2 | Not started | - |

---

## Milestone Success Criteria

- [ ] Characters in an active world reference a fact from a previous session without being prompted
- [ ] A user can open their Profile page and see all facts characters know about them, grouped by world
- [ ] A user can delete any individual fact and confirm it is gone from the Profile page and no longer referenced in chat
- [ ] Keep It Going works in production without a 401 error
- [ ] Memory extraction never causes a chat request to fail — token overflow degrades gracefully to no injection
