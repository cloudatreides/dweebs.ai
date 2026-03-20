-- Feedback Migration
-- Run this in Supabase SQL Editor

-- Feedback table for "Share Feedback" feature
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  -- Optional: link to a specific chat/world that prompted the feedback
  chat_id uuid references public.group_chats(id) on delete set null,
  -- Type: 'bug' | 'suggestion' | 'general'
  type text not null default 'general' check (type in ('bug', 'suggestion', 'general')),
  message text not null,
  -- User's email (in case they want a response, or for anon users)
  contact_email text,
  -- Star rating 1-5 (optional)
  rating integer check (rating >= 1 and rating <= 5),
  -- Internal use: 'new' | 'read' | 'done'
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_user on public.feedback(user_id);
create index if not exists idx_feedback_created on public.feedback(created_at desc);
create index if not exists idx_feedback_status on public.feedback(status);

-- RLS: users can insert their own feedback
alter table public.feedback enable row level security;

create policy "Users can submit feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

-- Users can view their own submissions
create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);
