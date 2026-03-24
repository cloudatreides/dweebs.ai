# Requirements: Dweebs.lol — Persistent Memory Milestone

**Defined:** 2026-03-24
**Core Value:** Characters that feel alive — memory makes every world worth coming back to.

## v1 Requirements

### Memory Extraction

- [ ] **MEXT-01**: System extracts key facts from conversation after every 5+ user messages
- [ ] **MEXT-02**: Extraction produces structured JSON with `fact`, `source` (verbatim quote), and `category` fields
- [ ] **MEXT-03**: Extraction resolves contradictions — new facts replace contradicted existing facts rather than appending alongside them
- [ ] **MEXT-04**: Extraction triggers on chat session end (tab close / navigation away), not on every turn
- [ ] **MEXT-05**: Extraction uses a windowed last-30-messages slice, not full unbounded history

### Memory Storage

- [ ] **MSTR-01**: `world_memories` table stores per-world facts (capped at 10) and a short world summary (max 200 chars)
- [ ] **MSTR-02**: `user_facts` table stores global user profile facts (capped at 10)
- [ ] **MSTR-03**: Both tables have RLS policies — users can only read and write their own memory rows
- [ ] **MSTR-04**: Memory writes use upsert pattern (not append-only) to prevent unbounded row growth

### Memory Injection

- [ ] **MINJ-01**: World memory (facts + summary) is injected into the system prompt for every chat turn in that world
- [ ] **MINJ-02**: Global user facts are injected into every world's system prompt
- [ ] **MINJ-03**: Memory block is hard-capped at 400 tokens — silently omitted if limit would be exceeded rather than failing the chat
- [ ] **MINJ-04**: Memory block is injected at the top of the system prompt (primacy effect)

### Memory UI

- [ ] **MUI-01**: Profile page shows all per-world memories grouped by world name
- [ ] **MUI-02**: Profile page shows a global user facts section separate from world memories
- [ ] **MUI-03**: User can delete individual facts (both world facts and user facts)
- [ ] **MUI-04**: User can clear all memories for a specific world
- [ ] **MUI-05**: Memory sections show an empty state ("No memories yet") for worlds with no extracted facts

## v2 Requirements

### Memory Controls

- **MCTL-01**: User can manually pin a fact ("always remember this") without waiting for extraction
- **MCTL-02**: User can edit the text of an individual fact inline
- **MCTL-03**: User can export all memories as JSON

### Memory Intelligence

- **MINT-01**: Extraction quality improves via user feedback (thumbs up/down on referenced memories)
- **MINT-02**: Characters explicitly reference a memory when using it ("I remember you mentioned...")

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-character memory across worlds | Higher storage/retrieval cost with unclear UX benefit; world-level covers the use case |
| Rolling transcript compression | Grows unbounded; structured fact extraction produces better, cheaper results |
| Real-time memory updates mid-conversation | Adds per-turn API cost; session-end extraction is sufficient |
| pgvector / semantic search | Overkill at this scale — 10 facts per world means no retrieval problem to solve |
| Memory for unauthenticated users | No identity to attach memory to |
| Mobile-first memory UI | Desktop-first per project build philosophy |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEXT-01 | Phase 2 | Pending |
| MEXT-02 | Phase 2 | Pending |
| MEXT-03 | Phase 2 | Pending |
| MEXT-04 | Phase 2 | Pending |
| MEXT-05 | Phase 2 | Pending |
| MSTR-01 | Phase 1 | Pending |
| MSTR-02 | Phase 1 | Pending |
| MSTR-03 | Phase 1 | Pending |
| MSTR-04 | Phase 1 | Pending |
| MINJ-01 | Phase 2 | Pending |
| MINJ-02 | Phase 2 | Pending |
| MINJ-03 | Phase 2 | Pending |
| MINJ-04 | Phase 2 | Pending |
| MUI-01 | Phase 3 | Pending |
| MUI-02 | Phase 3 | Pending |
| MUI-03 | Phase 3 | Pending |
| MUI-04 | Phase 3 | Pending |
| MUI-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18/18
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — traceability mapped after roadmap creation*
