-- Dweebs.ai Database Schema
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
