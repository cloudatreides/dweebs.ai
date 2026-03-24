---
phase: 2
slug: memory-backbone
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (via `npm run test`) |
| **Config file** | vite.config.js or vitest.config.js |
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
| 02-01-01 | 01 | 1 | MEXT-01, MEXT-02 | build | `npm run build` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | MINJ-01, MINJ-02 | build | `npm run build` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | MEXT-03, MEXT-04, MEXT-05 | build | `npm run build` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 2 | MINJ-03, MINJ-04 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no new test infra needed. Build validation via `npm run build` is sufficient for this backend-only phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extraction fires on tab close/navigation without blocking UI | MEXT-03 | Requires browser interaction | Navigate away from a world with 5+ messages; check Supabase for updated world_memories row |
| Characters reference memory in responses | MINJ-01 | Requires live AI response | Return to a world in a new session; send a message; verify character references a prior fact |
| Memory silently omitted near 8000-char limit | MINJ-03 | Requires Supabase row with known large prompt | Manually set a very long system prompt; verify chat works without error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
