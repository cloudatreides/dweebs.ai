-- Aura System Migration
-- Run this in Supabase SQL Editor

-- Add aura balance to profiles
alter table public.profiles add column if not exists aura integer not null default 0;

-- Shared Worlds table
create table if not exists public.shared_worlds (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text default '',
  scene text default '',
  character_ids text[] not null default '{}',
  try_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_worlds_creator on public.shared_worlds(creator_id);
create index if not exists idx_shared_worlds_popular on public.shared_worlds(try_count desc);

alter table public.shared_worlds enable row level security;

create policy "Anyone can view shared worlds"
  on public.shared_worlds for select using (true);

create policy "Users can create shared worlds"
  on public.shared_worlds for insert with check (auth.uid() = creator_id);

create policy "Users can update own shared worlds"
  on public.shared_worlds for update using (auth.uid() = creator_id);

create policy "Users can delete own shared worlds"
  on public.shared_worlds for delete using (auth.uid() = creator_id);

-- Aura Ledger
create table if not exists public.aura_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  reason text not null,
  world_id uuid references public.shared_worlds(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_aura_ledger_user on public.aura_ledger(user_id);

alter table public.aura_ledger enable row level security;

create policy "Users can view own aura history"
  on public.aura_ledger for select using (auth.uid() = user_id);

-- Function: award aura when someone tries a world
create or replace function public.record_world_try(world_id uuid, trying_user_id uuid)
returns void as $$
declare
  v_creator_id uuid;
  v_try_count integer;
begin
  update public.shared_worlds
  set try_count = try_count + 1
  where id = world_id
  returning creator_id, try_count into v_creator_id, v_try_count;

  if v_creator_id is not null and v_creator_id != trying_user_id then
    insert into public.aura_ledger (user_id, amount, reason, world_id)
    values (v_creator_id, 10, 'world_try', world_id);

    update public.profiles set aura = aura + 10 where id = v_creator_id;

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
