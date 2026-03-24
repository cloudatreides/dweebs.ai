<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dweebs.lol**

Dweebs.lol is an AI group character chat app where users build "Worlds" — group chats populated with fictional and real-world characters (K-pop idols, anime characters, custom creations). Users message the group and Claude Haiku responds as each character. The magic is the group dynamic: characters react to each other, not just the user. This milestone adds persistent memory so characters actually remember past conversations and build a model of who the user is.

**Core Value:** The group dynamic feels alive — characters with history, personality, and memory of the user make every world worth coming back to.

### Constraints

- **Stack:** React + Vite + Tailwind + Supabase + Vercel — no new infrastructure
- **AI model:** Claude Haiku only (enforced server-side in `api/chat.js`) — memory extraction uses same model
- **System prompt budget:** Current prompts already large (character personalities × N). Memory injection must stay under ~500 tokens total to avoid hitting the 8000-char system prompt limit in `api/chat.js`
- **No auth rework:** Memory is scoped to authenticated users only; no guest memory
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Frontend
- **Framework:** React 19.2.4 — component rendering, routing, context
- **Styling:** Tailwind CSS 4.2.1 — utility-first, via `@tailwindcss/vite` plugin (no separate config file; integrated directly into Vite)
- **Build Tool:** Vite 8.0.0 — dev server and production bundler
- **Routing:** react-router-dom 7.13.1 — SPA routing, protected routes
- **Animations:** Framer Motion 12.36.0 — micro-animations and transitions
- **Icons:** lucide-react 0.577.0 — icon set
- **Language:** JavaScript (JSX) — no TypeScript
## Backend / API
- **Runtime:** Node.js (Vercel serverless functions)
- **Framework:** Vercel Functions — single file at `api/chat.js`
- **Pattern:** Thin proxy — receives authenticated requests from the frontend, validates via Supabase JWT, checks rate limits via Supabase RPC, then forwards to Anthropic API
- **No separate server process** — all backend logic runs serverless on Vercel
## Database
- **Provider:** Supabase (PostgreSQL)
- **Client:** `@supabase/supabase-js` 2.99.1
- **Schema summary:**
- **RLS:** Enabled on all tables. Users can only access their own data.
- **Key RPCs:**
- **Migrations:** `supabase/migrations/` — 4 files (aura system, rate limiting, profile avatar, feedback)
- **Schema file:** `supabase/schema.sql`
## Deployment
- **Platform:** Vercel
- **Domain:** dweebs.lol
- **Routing config:** `vercel.json` — rewrites `/api/*` to serverless functions, all other routes to `/` (SPA fallback)
- **CI/CD:** Vercel automatic deploys (implied by Vercel hosting; no explicit pipeline config in repo)
- **Build output:** `dist/` directory (Vite build)
## Key Dependencies (package.json highlights)
| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | DOM rendering |
| `react-router-dom` | ^7.13.1 | Client-side routing |
| `@supabase/supabase-js` | ^2.99.1 | Supabase client (auth + database) |
| `tailwindcss` | ^4.2.1 | Utility CSS |
| `@tailwindcss/vite` | ^4.2.1 | Tailwind Vite plugin |
| `framer-motion` | ^12.36.0 | Animations |
| `lucide-react` | ^0.577.0 | Icons |
| `@vercel/analytics` | ^2.0.1 | Vercel Analytics integration |
| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.0 | Build tool + dev server |
| `@vitejs/plugin-react` | ^6.0.0 | React fast refresh for Vite |
| `eslint` | ^9.39.4 | Linting |
| `eslint-plugin-react-hooks` | ^7.0.1 | Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | Fast refresh lint rules |
## Environment Configuration
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous (public) key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key (used to verify JWTs)
- `ANTHROPIC_API_KEY` — Anthropic API key
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & Style
- **Language:** JavaScript (ES2020+) with JSX — no TypeScript
- **File extensions:** `.jsx` for React components, `.js` for utilities, data files, and config
- **Module system:** ESM (`"type": "module"` in package.json)
- **Linting:** ESLint 9 flat config (`eslint.config.js`) — `js.configs.recommended` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- **Key lint rule:** `no-unused-vars` errors on unused vars, but ignores `UPPER_SNAKE_CASE` names via `varsIgnorePattern: '^[A-Z_]'`
- **Formatting:** No Prettier config detected — formatting is not enforced by tooling
- **No TypeScript:** `@types/react` and `@types/react-dom` are devDependencies but the codebase is plain JS/JSX
## React Patterns
- `useState` for local UI state
- React Context API for shared app state (Auth, Characters, Tier)
- No external state library (no Zustand, Redux, Jotai)
- Three contexts, each in `src/context/`: `AuthContext.jsx`, `CharacterContext.jsx`, `TierContext.jsx`
- Contexts export both a Provider component and a custom hook: `useAuth()`, `useCharacters()`
- `useState`, `useEffect`, `useRef`, `useCallback` all used
- `useRef` used for both DOM refs (scroll anchors, inputs) and mutable values that should not trigger re-renders (e.g. `resolved` flag in AuthContext, `profileRef` in CharacterContext)
- `useCallback` used for context-exposed functions that would otherwise recreate on every render
## CSS/Styling Patterns
- Theme colors (brand purple `#7C3AED`, background `#0D0D0F`, etc.)
- Dynamic/conditional colors
- Pixel-precise values
## Naming Conventions
- React components: PascalCase
- Regular functions, helpers, event handlers: camelCase
- Private/internal helpers (not exported): camelCase, no prefix convention
## Code Organization Patterns
- `src/pages/` — route-level views, orchestrate state and API calls
- `src/components/` — reusable UI primitives and shared modals
- `src/layouts/` — structural wrappers (AppLayout)
- `src/context/` — global state (Auth, Characters, Tier)
- `src/lib/` — external integrations and API clients (`db.js`, `chatApi.js`, `supabase.js`)
- `src/data/` — static mock data and seed content (`mockData.js`, `mockResponses.js`, `sceneTemplates.js`)
- Colocated in the file that uses them (e.g. `parseMention`, `renderWithMentions` in `ChatView.jsx`)
- Exported from `src/lib/` if they require external API access
## Error Handling
- `console.error` for unexpected failures
- `console.warn` for recoverable/expected failures (e.g. catch-up generation, nudge)
- State variables for user-visible errors (e.g. `keepGoingError` in ChatView)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
## Frontend Architecture
### Component Hierarchy
```
```
### State Management
- `AuthContext` (`src/context/AuthContext.jsx`) — Supabase session, user object, profile row, sign-in/out methods. Handles both Google OAuth (implicit + PKCE flows) and email/password. Has a 5-second safety timeout to prevent permanent loading states.
- `CharacterContext` (`src/context/CharacterContext.jsx`) — Merges hardcoded `defaultCharacters` from `src/data/mockData.js` with `customCharacters` loaded from Supabase `custom_characters` table. Provides `allCharacters`, `getCharacter(id)`, and `saveCustomCharacter()`.
- `TierContext` (`src/context/TierContext.jsx`) — Simple boolean `isPro` flag. Currently stub (no payment integration); gates UI features.
### Routing
| Path | Component | Auth required |
|------|-----------|---------------|
| `/` | Landing | No |
| `/login` | Login | No |
| `/terms`, `/privacy` | Terms, Privacy | No |
| `/home` | Discover | Yes |
| `/my-worlds` | MyWorlds | Yes |
| `/new-chat` | NewChat | Yes |
| `/chat/:id` | ChatView | Yes |
| `/profile` | Profile | Yes |
## Backend Architecture
### API Structure
- Auth: validates `Authorization: Bearer <supabase_jwt>` against Supabase
- Rate limiting: calls Supabase RPC `check_rate_limit` (30/min, 300/hour, 600/day) — atomic via `pg_advisory_xact_lock`
- Validation: enforces system prompt ≤ 8000 chars, messages array ≤ 50 items
- Model allowlist: only `claude-haiku-4-5-20251001` is permitted regardless of what client sends
- Proxies to `https://api.anthropic.com/v1/messages` with server-side `ANTHROPIC_API_KEY`
### Business Logic Location
- `getCharacterResponses()` — main chat turn: builds system prompt with all character personalities, sends last 16 messages as history, parses `NAME: response` format + `SUGGESTIONS:` chips
- `generateCatchUpMessages()` — catch-up simulation when user returns after 2+ hours; picks 2–3 characters to chat among themselves
- `generateKeepGoing()` — "Keep It Going" feature: generates exactly 5 character-to-character messages while user spectates
- `generateNudgeMessage()` — nudge after 15 min inactivity; 1–2 characters casually notice the silence
- `generateCharacterProfile()` — AI-generates full character profile JSON from just a name input
- `fetchCharacterImage()` — fetches character avatar from Wikipedia API
### Data Access Patterns
- Reads: `.select('*').eq('col', val)` — no joins except `shared_worlds` which joins `profiles(display_name)`
- Writes: `.insert({}).select().single()` for creates, `.update({}).eq()` for updates
- Deletes: `.delete().eq()`
- Engagement tracking: `supabase.rpc('record_world_try', {...})` — DB-side atomic operation
## Data Flow
### Normal Chat Turn
### Character Discovery → World Creation
### Aura (Social/Engagement Layer)
## Key Design Decisions
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
