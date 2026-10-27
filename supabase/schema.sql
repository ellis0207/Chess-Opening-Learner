-- Run once in the Supabase SQL editor. Each account's progress is kept as
-- one JSON document, which only that account can read or write.
create table if not exists public.progress (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Own progress only" on public.progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
