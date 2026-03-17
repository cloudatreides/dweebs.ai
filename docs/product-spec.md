# Dweebs.ai — Product Spec

## One-Liner
AI group chat where your favorite characters talk to each other — and you can jump in.

## What It Is
Dweebs.ai enables group conversations between multiple AI characters that talk to each other autonomously. Users observe first, participate second. Unlike Character.ai's 1:1 model, characters generate content between themselves without user input.

## Target User
Gen Z fans (19–22+): K-pop fandoms, anime/fiction fans, RPG players. 2–3 hours daily consuming fan content. Already familiar with AI chat apps but bored of 1:1 format.

## Platform
Mobile-first web app. 390px viewport (iPhone 14 base). React + Vite + Tailwind. Looks and feels like a native mobile app in the browser. No sidebar — bottom nav and input bar only.

## Visual Direction
- Dark mode
- iMessage aesthetic crossed with fandom Discord server
- Clean, large typography for thumb-scrolling
- Playful but polished (not clinical AI-tool)
- Character avatars are color-coded per speaker
- Generous whitespace between message bubbles

---

## Core Screens (Priority Order)

### 1. Group Chat (Main Experience)
Characters auto-generate messages in a natural back-and-forth. Typing indicator shows which character is "speaking" next. User can jump in at any time — typing pauses auto-generation for 4–6 seconds, then resumes. Pause/Resume button available.

- Scenario prompt pill displayed at top of chat
- "[Character name] is typing..." indicator
- Message bubbles color-coded by character
- User messages visually distinct (right-aligned, different style)

### 2. Character Discovery
Searchable library of available characters. Each card shows:
- Avatar
- Character name
- Fandom tag (e.g. "Naruto", "BTS")
- 3 personality tags
- Sample quote

### 3. Homepage / Landing
Live demo group chat auto-playing as hero section. Visitors see characters talking in real time. CTA: "Start Your Group Chat"

### 4. New Group Chat Setup
- Select 2+ characters from library
- Name the group
- Optional scenario prompt (150 chars max)
- Start chat

---

## Key Features
- Autonomous group chat engine (characters talk to each other without user prompting)
- Typing pauses auto-generation for 4–6 seconds then resumes
- Pause/Resume button
- "[Character name] is typing..." indicator
- Scenario prompt pill at top of chat
- Save/resume group chats

---

## Freemium Model
| | Free | Pro ($7.99/month) |
|---|---|---|
| Active group chats | 1 | Unlimited |
| Characters per chat | 2 | Up to 5 |
| Upgrade trigger | Tries to add 3rd character or create 2nd chat | — |

Upgrade modal appears contextually at limit.

---

## Data Model

### User
id, email, plan, stripe_customer_id

### Character
id, name, fandom_tag, avatar_url, bio, personality_tags[], speaking_style_prompt

### GroupChat
id, user_id, name, scenario_prompt, character_ids[], last_active_at

### Message
id, group_chat_id, sender_type (character | user), sender_id, content, created_at

### Subscription
id, user_id, stripe_subscription_id, plan, status

---

## Technical Architecture (Planned)
- Frontend: React + Vite + Tailwind
- Backend/DB: Supabase (V1+)
- AI: Claude API for character responses
- Auth: Skipped in PoC (hardcoded test user)
- Payments: Stripe (V1+)

### Autonomous Chat Engine (Core Technical Challenge)
Characters need to generate messages in sequence without user input. Approach:
- Server-side loop triggers next character response every 3–8 seconds (variable for realism)
- Each message includes full conversation context + character's personality prompt
- Typing indicator shown during generation delay
- User input interrupts the loop, injects user message, then resumes

---

## Competitive Landscape
| App | Model | Weakness Dweebs exploits |
|---|---|---|
| Character.ai | 1:1 chat | No group dynamics, user must drive conversation |
| Talkie | 1:1 + light roleplay | Same — no autonomous multi-character chat |
| Janitor.ai | 1:1 NSFW-heavy | Different audience, no group format |
| Group chat doesn't exist yet | — | Dweebs.ai is the first to make AI characters talk to each other autonomously |

---

## Out of Scope (V1)
- User-created characters
- Voice output
- Social sharing
- Real-time multiplayer (multiple humans in one chat)
- Native mobile apps
- Content moderation tooling
- Annual billing

---

## Success Metrics
- North Star: Messages generated per session (engagement depth)
- Activation: % of visitors who start a group chat
- Retention: D1 / D7 return rate
- Conversion: Free → Pro upgrade rate
- Target: 500 engaged users within first month of launch

---

## Open Questions / Assumptions
> Assumption: Gen Z users want to observe AI characters interact, not just talk to them 1:1

> Assumption: 2 characters is enough for a compelling free-tier experience

> Assumption: 4–6 second pause on user typing is the right balance between responsiveness and not interrupting flow

> Assumption: $7.99/month is within Gen Z willingness to pay (comparable to Character.ai Pro)

> Assumption: Fandom-tagged characters (not original IPs) avoid legal issues while driving discovery
