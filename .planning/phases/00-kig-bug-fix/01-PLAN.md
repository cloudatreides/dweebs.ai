---
plan: 01
phase: 0
title: Fix KIG 401 + Add Env Validation
objective: Unblock Keep It Going in production by fixing the SUPABASE_ANON_KEY env var and adding startup validation to api/chat.js
requirements_addressed: None — prerequisite fix
wave: 1
---

# Plan 01: Fix KIG 401 + Add Env Validation

## Objective

Make Keep It Going work in production. The root cause is a malformed `SUPABASE_ANON_KEY` env var in Vercel (embedded newline). This plan adds defensive env var validation to `api/chat.js` so the issue is immediately diagnosable if it recurs, removes a debug console.log from ChatView, and documents the manual Vercel dashboard fix.

## Context

- `api/chat.js` creates a Supabase client with `process.env.SUPABASE_ANON_KEY` on every request (line 28-30). If the key has trailing whitespace or a newline, Supabase JWT validation fails with 401.
- `generateKeepGoing` in `src/lib/chatApi.js` catches the error and returns `[]` silently — users see nothing.
- The debug `console.log` at `ChatView.jsx:444` leaks internal state to the browser console.

## Tasks

### Task 1: Add env var validation to api/chat.js

Add a validation block at the top of `api/chat.js` (after the imports, before the handler function) that trims whitespace from env vars and logs a startup confirmation.

**File:** `api/chat.js`

**Change:** Add env var sanitization and validation between line 3 (after `ALLOWED_MODELS`) and line 5 (before `export default`). The key insight: Vercel serverless functions run the module-level code once per cold start, so module-level validation runs at startup.

Add this block after line 3:

```javascript
// --- Env var validation (runs once per cold start) ---
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim()
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim()

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ANTHROPIC_API_KEY) {
  console.error('[api/chat] FATAL: Missing required env vars:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
    ANTHROPIC_API_KEY: !!ANTHROPIC_API_KEY,
  })
} else {
  console.log('[api/chat] Env vars OK — SUPABASE_ANON_KEY length:', SUPABASE_ANON_KEY.length, '| no newlines:', !SUPABASE_ANON_KEY.includes('\n'))
}
// --- End env var validation ---
```

Then update the handler to use the trimmed constants instead of reading `process.env` directly:

- Line 27-30: Change `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)` to `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
- Line 74: Change `'x-api-key': process.env.ANTHROPIC_API_KEY` to `'x-api-key': ANTHROPIC_API_KEY`

This ensures that even if the Vercel env var has trailing whitespace/newlines, the trimmed version is used at runtime.

### Task 2: Remove debug console.log from ChatView.jsx

**File:** `src/pages/ChatView.jsx`

**Change:** Delete line 444:

```javascript
// DELETE THIS LINE:
console.log('[KIG] clicked — canKeepGoing:', canKeepGoing, '| charIds:', chatCharIds.length, '| typingChar:', !!typingChar, '| active:', keepGoingActive, '| onCooldown:', keepGoingOnCooldown)
```

The `handleKeepGoing` function should start directly with `if (!canKeepGoing) return` after the function declaration.

## Manual Steps

These steps must be done by the developer in the Vercel dashboard. Claude cannot do this.

### Step 1: Re-paste SUPABASE_ANON_KEY in Vercel

1. Go to [Vercel Dashboard](https://vercel.com) -> dweebs.ai project -> Settings -> Environment Variables
2. Find `SUPABASE_ANON_KEY`
3. Click Edit
4. Select all the current value and delete it
5. Paste the key fresh from Supabase Dashboard (Project Settings -> API -> `anon` `public` key)
6. **Before saving:** visually confirm the pasted value has no line break or trailing whitespace. The value should be a single line, ~200 characters, ending with a normal character (not a space or newline).
7. Save
8. Redeploy the project (Settings -> Deployments -> redeploy latest, or push a commit)

### Step 2: Verify in Vercel function logs

1. After redeployment, open Vercel Dashboard -> dweebs.ai -> Logs (Runtime Logs)
2. Trigger a Keep It Going action on dweebs.lol (open any world with 2+ characters, send a message, click the fast-forward/Keep It Going button)
3. In the logs, confirm you see: `[api/chat] Env vars OK — SUPABASE_ANON_KEY length: <number> | no newlines: true`
4. Confirm the request returns 200, not 401

## Verification

- [ ] `api/chat.js` has env var validation block at module level that trims and logs key presence/length
- [ ] `api/chat.js` uses trimmed constants (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`) instead of raw `process.env` references inside the handler
- [ ] `ChatView.jsx` no longer has the `console.log('[KIG] clicked...')` line
- [ ] After Vercel env var re-paste + redeploy: Keep It Going generates 5 character messages without a 401 error
- [ ] Vercel runtime logs show the `[api/chat] Env vars OK` startup confirmation
