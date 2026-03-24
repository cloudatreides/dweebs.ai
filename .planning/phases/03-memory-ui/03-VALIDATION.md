---
phase: 3
slug: memory-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (via `npm run build`) |
| **Config file** | vite.config.js |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MUI-01, MUI-02 | build | `npm run build` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | MUI-03, MUI-04 | build | `npm run build` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 2 | MUI-05 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Two new db.js functions needed before other plans can build:
- `getAllUserWorldMemories(userId)` — query all world_memories rows for the user
- `clearWorldMemory(worldId)` — delete the entire world_memories row for a world

These are data prerequisites for Plan 02 (delete/clear actions). Plan 01 can load data without them via existing `getWorldMemory` calls, but the clean pattern uses the new batch query.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Memory section renders with real extracted data | MUI-01, MUI-02 | Requires live Supabase data from prior extraction | Run extraction in a world, open Profile page |
| Delete fact disappears from UI and Supabase | MUI-03 | Requires browser interaction + DB verification | Delete a fact, confirm UI updates and Supabase row is modified |
| Clear world memories removes entire section | MUI-04 | Requires browser interaction | Clear a world, confirm empty state appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
