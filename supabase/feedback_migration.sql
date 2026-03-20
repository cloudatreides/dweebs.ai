-- Run this in Supabase SQL Editor

create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  type text not null check (type in ('bug', 'idea', 'love')),
  message text not null,
  created_at timestamptz default now()
);

-- Anyone authenticated can insert their own feedback
alter table feedback enable row level security;

create policy "Users can submit feedback"
  on feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
