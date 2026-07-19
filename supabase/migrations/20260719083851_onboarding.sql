-- Per-user onboarding state: whether the first-run welcome has been seen, and the
-- set of guided-tour tip keys already shown. One row per user, keyed by user_id so
-- progress follows the account across devices (never stored client-side). Mirrors
-- the initial migration's RLS style — every row is owner-scoped via auth.uid().

create table if not exists public.onboarding (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  welcome_seen boolean not null default false,
  -- Tip keys the user has already been shown; unioned as tours run, never reset.
  seen_tips    text[] not null default '{}',
  updated_at   timestamptz not null default now()
);

comment on column public.onboarding.seen_tips is
  'Stable guided-tour tip keys already shown to this user (see src/app/onboarding/tips.ts).';

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.onboarding enable row level security;

create policy "onboarding_select_own" on public.onboarding
  for select using (user_id = auth.uid());
create policy "onboarding_insert_own" on public.onboarding
  for insert with check (user_id = auth.uid());
create policy "onboarding_update_own" on public.onboarding
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
