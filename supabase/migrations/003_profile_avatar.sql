-- Add avatar_url to profiles table
alter table public.profiles add column if not exists avatar_url text;

-- ============================================
-- STORAGE: profile-avatars bucket
-- ============================================

-- Create the bucket (run this in Supabase dashboard > Storage if SQL fails)
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

-- Anyone can view profile avatars (public bucket)
create policy "Anyone can view profile avatars"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

-- Users can upload to their own folder
create policy "Users can upload own profile avatar"
  on storage.objects for insert
  with check (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update/replace their own avatar
create policy "Users can update own profile avatar"
  on storage.objects for update
  using (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
create policy "Users can delete own profile avatar"
  on storage.objects for delete
  using (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
