-- Migration 005: Memory System
-- Creates world_memories and user_facts tables with RLS policies and indexes.
-- Run in Supabase SQL Editor.

-- ============================================
-- WORLD MEMORIES
-- One row per user per world (group_chat).
-- ============================================

CREATE TABLE public.world_memories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id    uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary     text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, world_id)
);

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

CREATE INDEX idx_world_memories_user_world ON public.world_memories(user_id, world_id);

-- ============================================
-- USER FACTS
-- One row per user globally.
-- ============================================

CREATE TABLE public.user_facts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX idx_user_facts_user ON public.user_facts(user_id);
