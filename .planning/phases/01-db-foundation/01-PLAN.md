---
plan: 01
phase: 1
title: Supabase Migration — Memory Tables
objective: Create world_memories and user_facts tables with schema, RLS policies, and indexes
requirements_addressed: [MSTR-01, MSTR-02, MSTR-03]
wave: 1
files_modified: [supabase/migrations/005_memory.sql, supabase/schema.sql]
autonomous: true
must_haves:
  truths:
    - "world_memories table exists with correct columns and constraints"
    - "user_facts table exists with correct columns and constraints"
    - "RLS policies restrict both tables to owner-only access"
    - "Unique constraints prevent duplicate rows on upsert"
  artifacts:
    - path: "supabase/migrations/005_memory.sql"
      provides: "Memory tables DDL, RLS, indexes"
    - path: "supabase/schema.sql"
      provides: "Updated full schema reference"
  key_links:
    - from: "world_memories"
      to: "group_chats(id)"
      via: "world_id FK with ON DELETE CASCADE"
    - from: "world_memories"
      to: "auth.users(id)"
      via: "user_id FK with ON DELETE CASCADE"
    - from: "user_facts"
      to: "auth.users(id)"
      via: "user_id FK with ON DELETE CASCADE"
---

<objective>
Create the two new memory tables in Supabase — `world_memories` and `user_facts` — with full schema, RLS policies, and performance indexes.

Purpose: This is the storage foundation for the persistent memory feature. Without these tables, no memory data can be written or read.
Output: `supabase/migrations/005_memory.sql` ready to run in Supabase SQL Editor. Updated `supabase/schema.sql` with the new tables appended.
</objective>

<context>
@.planning/REQUIREMENTS.md
@.planning/research/ARCHITECTURE.md
@supabase/schema.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create 005_memory.sql migration</name>
  <files>supabase/migrations/005_memory.sql</files>
  <action>
Create `supabase/migrations/005_memory.sql` with the following exact DDL:

**world_memories table:**
```sql
CREATE TABLE public.world_memories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id    uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary     text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, world_id)
);
```

Columns:
- `id`: uuid pk, auto-generated
- `user_id`: FK to auth.users, CASCADE delete — used for RLS
- `world_id`: FK to group_chats, CASCADE delete — the "world" is a group_chat
- `facts`: jsonb array, default empty array. Will hold max 10 fact strings.
- `summary`: text, default empty string. Max 200 chars enforced app-side.
- `updated_at`: timestamptz, default now()
- UNIQUE on (user_id, world_id) — this is the upsert target. One memory row per user per world.

**user_facts table:**
```sql
CREATE TABLE public.user_facts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

Columns:
- `id`: uuid pk, auto-generated
- `user_id`: FK to auth.users, CASCADE delete, UNIQUE — one row per user globally
- `facts`: jsonb array, default empty array. Will hold max 10 fact strings.
- `updated_at`: timestamptz, default now()

**RLS policies for world_memories:**
```sql
ALTER TABLE public.world_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own world memories"
  ON public.world_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own world memories"
  ON public.world_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own world memories"
  ON public.world_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own world memories"
  ON public.world_memories FOR DELETE
  USING (auth.uid() = user_id);
```

**RLS policies for user_facts:**
```sql
ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user facts"
  ON public.user_facts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user facts"
  ON public.user_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user facts"
  ON public.user_facts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user facts"
  ON public.user_facts FOR DELETE
  USING (auth.uid() = user_id);
```

**Indexes:**
```sql
CREATE INDEX idx_world_memories_user_world ON public.world_memories(user_id, world_id);
CREATE INDEX idx_user_facts_user ON public.user_facts(user_id);
```

The composite index on world_memories covers both the RLS check (user_id) and the lookup pattern (user_id + world_id). The user_facts index covers the RLS check and the single-row lookup.

Follow the exact style of existing migrations (001-004): plain SQL, no transaction wrapper (Supabase runs each migration in a transaction automatically).
  </action>
  <verify>
    <automated>cat supabase/migrations/005_memory.sql | head -80</automated>
  </verify>
  <done>
    - 005_memory.sql exists with both CREATE TABLE statements
    - Both tables have correct columns, types, defaults, and FK references
    - UNIQUE(user_id, world_id) on world_memories, UNIQUE(user_id) on user_facts
    - 8 RLS policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
    - 2 indexes created
  </done>
</task>

<task type="auto">
  <name>Task 2: Append memory tables to schema.sql</name>
  <files>supabase/schema.sql</files>
  <action>
Append a new section to the end of `supabase/schema.sql` following the existing style (section headers use `-- ============================================`). Add:

```sql
-- ============================================
-- MEMORY SYSTEM
-- ============================================

-- Per-world memory: one row per user per world
create table public.world_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  world_id uuid references public.group_chats(id) on delete cascade not null,
  facts jsonb not null default '[]'::jsonb,
  summary text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id, world_id)
);

create index idx_world_memories_user_world on public.world_memories(user_id, world_id);

-- Global user facts: one row per user
create table public.user_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  facts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index idx_user_facts_user on public.user_facts(user_id);

-- RLS
alter table public.world_memories enable row level security;

create policy "Users can read own world memories"
  on public.world_memories for select
  using (auth.uid() = user_id);

create policy "Users can insert own world memories"
  on public.world_memories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own world memories"
  on public.world_memories for update
  using (auth.uid() = user_id);

create policy "Users can delete own world memories"
  on public.world_memories for delete
  using (auth.uid() = user_id);

alter table public.user_facts enable row level security;

create policy "Users can read own user facts"
  on public.user_facts for select
  using (auth.uid() = user_id);

create policy "Users can insert own user facts"
  on public.user_facts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own user facts"
  on public.user_facts for update
  using (auth.uid() = user_id);

create policy "Users can delete own user facts"
  on public.user_facts for delete
  using (auth.uid() = user_id);
```

Use lowercase SQL keywords to match the existing schema.sql style (existing file uses `create table`, not `CREATE TABLE`).
  </action>
  <verify>
    <automated>grep -c "world_memories\|user_facts" supabase/schema.sql</automated>
  </verify>
  <done>
    - schema.sql contains both world_memories and user_facts table definitions
    - New section follows existing naming/style conventions
    - File serves as the canonical schema reference for the full database
  </done>
</task>

</tasks>

<verification>
- `005_memory.sql` is syntactically valid SQL (no typos in types, references, or policy names)
- Both tables reference correct parent tables: `auth.users` and `public.group_chats`
- UNIQUE constraints match the upsert patterns: `(user_id, world_id)` for world_memories, `(user_id)` for user_facts
- RLS uses `auth.uid() = user_id` consistently — no joins through other tables
</verification>

<success_criteria>
- 005_memory.sql exists and can be copy-pasted into Supabase SQL Editor without errors
- schema.sql updated with matching definitions
- Both tables have ON DELETE CASCADE on all FK references
</success_criteria>

<output>
After completion, create `.planning/phases/01-db-foundation/01-01-SUMMARY.md`
</output>
