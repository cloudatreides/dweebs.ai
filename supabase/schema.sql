-- dweebs.lol Database Schema
-- Run this in Supabase SQL Editor after creating the project

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- GROUP CHATS
-- ============================================
create table public.group_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  scene text default '',
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_group_chats_user on public.group_chats(user_id);

-- ============================================
-- MESSAGES
-- ============================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_chat_id uuid references public.group_chats(id) on delete cascade not null,
  sender_type text not null check (sender_type in ('user', 'character', 'system')),
  sender_id text, -- character id for character messages, null for user/system
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_messages_chat on public.messages(group_chat_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles: users can read/update their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Group chats: users can CRUD their own chats
alter table public.group_chats enable row level security;

create policy "Users can view own chats"
  on public.group_chats for select
  using (auth.uid() = user_id);

create policy "Users can create chats"
  on public.group_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.group_chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.group_chats for delete
  using (auth.uid() = user_id);

-- ============================================
-- CUSTOM CHARACTERS
-- ============================================
create table public.custom_characters (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  fandom text default 'Custom',
  category text default 'Custom',
  color text default '#A78BFA',
  emoji text default '🎤',
  avatar_url text,
  tags text[] not null default '{}',
  quote text default '',
  bio text default '',
  personality text default '',
  is_public boolean default true,
  created_at timestamptz not null default now()
);

create index idx_custom_characters_user on public.custom_characters(user_id);

alter table public.custom_characters enable row level security;

create policy "Users can view own custom characters"
  on public.custom_characters for select
  using (auth.uid() = user_id);

create policy "Users can create custom characters"
  on public.custom_characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own custom characters"
  on public.custom_characters for update
  using (auth.uid() = user_id);

create policy "Users can delete own custom characters"
  on public.custom_characters for delete
  using (auth.uid() = user_id);

-- Messages: users can CRUD messages in their own chats
alter table public.messages enable row level security;

create policy "Users can view messages in own chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.group_chats
      where group_chats.id = messages.group_chat_id
      and group_chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own chats"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.group_chats
      where group_chats.id = messages.group_chat_id
      and group_chats.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in own chats"
  on public.messages for delete
  using (
    exists (
      select 1 from public.group_chats
      where group_chats.id = messages.group_chat_id
      and group_chats.user_id = auth.uid()
    )
  );

-- ============================================
-- AURA SYSTEM
-- ============================================

-- Add aura balance to profiles
alter table public.profiles add column if not exists aura integer not null default 0;

-- ============================================
-- SHARED WORLDS
-- ============================================
create table public.shared_worlds (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text default '',
  scene text default '',
  character_ids text[] not null default '{}',
  try_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_shared_worlds_creator on public.shared_worlds(creator_id);
create index idx_shared_worlds_popular on public.shared_worlds(try_count desc);

alter table public.shared_worlds enable row level security;

-- Anyone can view shared worlds
create policy "Anyone can view shared worlds"
  on public.shared_worlds for select
  using (true);

-- Users can create shared worlds
create policy "Users can create shared worlds"
  on public.shared_worlds for insert
  with check (auth.uid() = creator_id);

-- Users can update own shared worlds
create policy "Users can update own shared worlds"
  on public.shared_worlds for update
  using (auth.uid() = creator_id);

-- Users can delete own shared worlds
create policy "Users can delete own shared worlds"
  on public.shared_worlds for delete
  using (auth.uid() = creator_id);

-- ============================================
-- AURA LEDGER (tracks all aura transactions)
-- ============================================
create table public.aura_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  reason text not null,
  world_id uuid references public.shared_worlds(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_aura_ledger_user on public.aura_ledger(user_id);

alter table public.aura_ledger enable row level security;

create policy "Users can view own aura history"
  on public.aura_ledger for select
  using (auth.uid() = user_id);

-- Function: award aura when someone tries a world
create or replace function public.record_world_try(world_id uuid, trying_user_id uuid)
returns void as $$
declare
  v_creator_id uuid;
  v_try_count integer;
begin
  -- Get creator and increment try count
  update public.shared_worlds
  set try_count = try_count + 1
  where id = world_id
  returning creator_id, try_count into v_creator_id, v_try_count;

  -- Don't award aura if user is trying their own world
  if v_creator_id is not null and v_creator_id != trying_user_id then
    -- Award 10 aura per try
    insert into public.aura_ledger (user_id, amount, reason, world_id)
    values (v_creator_id, 10, 'world_try', world_id);

    update public.profiles set aura = aura + 10 where id = v_creator_id;

    -- Milestone bonuses
    if v_try_count = 50 then
      insert into public.aura_ledger (user_id, amount, reason, world_id)
      values (v_creator_id, 200, 'milestone_50', world_id);
      update public.profiles set aura = aura + 200 where id = v_creator_id;
    elsif v_try_count = 200 then
      insert into public.aura_ledger (user_id, amount, reason, world_id)
      values (v_creator_id, 500, 'milestone_200', world_id);
      update public.profiles set aura = aura + 500 where id = v_creator_id;
    end if;
  end if;
end;
$$ language plpgsql security definer;

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
