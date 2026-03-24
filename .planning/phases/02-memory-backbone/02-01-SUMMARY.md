---
phase: 02-memory-backbone
plan: "01"
subsystem: memory
tags: [memory, extraction, injection, ai, supabase]
dependency_graph:
  requires: [src/lib/db.js, src/lib/supabase.js, /api/chat]
  provides: [src/lib/memoryApi.js]
  affects: [src/lib/chatApi.js, src/pages/ChatView.jsx]
tech_stack:
  added: []
  patterns: [fire-and-forget async, defensive JSONB parsing, progressive JSON parsing fallback, silent error degradation]
key_files:
  created: [src/lib/memoryApi.js]
  modified: []
decisions:
  - "Transcript uses first word of character name uppercased (e.g. ITACHI:) for readability in extraction prompt — matches research spec"
  - "parseExtractionJSON tries three strategies: direct parse, markdown-fence strip then parse, regex extract {…} then parse — handles Haiku non-determinism"
  - "buildMemoryBlock drops ABOUT THE USER section first under budget pressure, then hard-truncates world facts — preserves world context over user context"
metrics:
  duration_seconds: 66
  completed_date: "2026-03-24"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 02 Plan 01: memoryApi.js — Memory Extraction and Injection Builder Summary

**One-liner:** New `src/lib/memoryApi.js` module wires Haiku-based fact extraction from 30-message transcripts and builds 500-char-capped memory blocks for system prompt injection.

## What Was Built

`src/lib/memoryApi.js` — a standalone library module (peer of `chatApi.js`) with two exported functions and one internal helper:

- `extractAndSaveMemory({ chatId, messages, characters, scene })` — fires at session end. Builds a transcript from the last 30 messages, prepends existing facts for contradiction resolution, calls `/api/chat` with a structured extraction prompt, parses the JSON response with a 3-strategy fallback parser, and writes world facts + user facts to Supabase. Never throws — all errors are `console.warn` and silent return.

- `buildMemoryBlock(worldMemory, userFacts, maxChars = 500)` — formats stored world memory and user facts into an injection string for the system prompt. Enforces the 500-char hard cap by dropping the ABOUT THE USER section first, then hard-truncating remaining world facts with `...`.

- `parseExtractionJSON(raw)` (internal) — 3-strategy JSON parser: (1) direct `JSON.parse`, (2) strip markdown code fences then parse, (3) regex-extract `{...}` then parse. Returns null if all fail.

## Requirements Satisfied

| Req | Description | How Satisfied |
|-----|-------------|---------------|
| MEXT-01 | Extract after 5+ messages | Guard at top of `extractAndSaveMemory`: `if (!messages || messages.length < 5) return` |
| MEXT-02 | Structured JSON with fact/source/category | `EXTRACTION_SYSTEM_PROMPT` instructs Haiku to return `{"worldFacts": [{fact, source, category}], ...}` |
| MEXT-03 | Contradictions resolved | Existing facts passed as numbered lists in user content under `EXISTING WORLD FACTS:` / `EXISTING USER FACTS:` headers |
| MEXT-05 | Last-30-message window | `messages.slice(-30)` in transcript builder |

## Commits

| Hash | Description |
|------|-------------|
| 9df4103 | feat(02-01): create memoryApi.js with extractAndSaveMemory and buildMemoryBlock |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this module is fully wired. It imports real db.js functions and calls the real `/api/chat` endpoint. It will produce real results when called from ChatView (Plan 03) with real messages.

## Self-Check: PASSED
