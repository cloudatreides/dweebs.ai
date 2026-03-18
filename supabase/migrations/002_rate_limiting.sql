-- ============================================
-- API USAGE TRACKING (for rate limiting)
-- ============================================
create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index idx_api_usage_user_time on public.api_usage(user_id, created_at desc);

alter table public.api_usage enable row level security;

-- No direct client access — only via RPC
create policy "No direct access to api_usage"
  on public.api_usage for select
  using (false);

-- ============================================
-- RATE LIMIT CHECK (atomic check + record)
-- ============================================
-- Returns true if request is allowed, false if rate limited.
-- Limits: 10/min, 100/hour, 500/day
create or replace function public.check_rate_limit(p_user_id uuid, p_endpoint text)
returns boolean as $$
declare
  v_minute_count integer;
  v_hour_count integer;
  v_day_count integer;
begin
  -- Count requests in last minute
  select count(*) into v_minute_count
  from public.api_usage
  where user_id = p_user_id
    and endpoint = p_endpoint
    and created_at > now() - interval '1 minute';

  if v_minute_count >= 10 then return false; end if;

  -- Count requests in last hour
  select count(*) into v_hour_count
  from public.api_usage
  where user_id = p_user_id
    and endpoint = p_endpoint
    and created_at > now() - interval '1 hour';

  if v_hour_count >= 100 then return false; end if;

  -- Count requests in last day
  select count(*) into v_day_count
  from public.api_usage
  where user_id = p_user_id
    and endpoint = p_endpoint
    and created_at > now() - interval '1 day';

  if v_day_count >= 500 then return false; end if;

  -- Record the request
  insert into public.api_usage (user_id, endpoint)
  values (p_user_id, p_endpoint);

  return true;
end;
$$ language plpgsql security definer;

-- ============================================
-- CLEANUP: auto-delete old api_usage rows (>2 days)
-- ============================================
-- Run this periodically via Supabase cron or pg_cron
-- select cron.schedule('cleanup-api-usage', '0 */6 * * *', $$
--   delete from public.api_usage where created_at < now() - interval '2 days';
-- $$);
