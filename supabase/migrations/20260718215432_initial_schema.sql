-- Baseline migration: the tables, indexes, RLS policies, and Storage bucket the
-- app needs. This reproduces the schema that was originally applied by hand via
-- the (now removed) schema.sql + policies.sql scripts, so it is what the existing
-- live project already contains — mark it applied there with
-- `supabase migration repair --status applied 20260718215432` rather than
-- re-running it (see supabase/README.md).
--
-- Portable: the only Supabase-specific references are auth.users / auth.uid(), so
-- the data model could migrate to vanilla Postgres by swapping those out.

create extension if not exists pgcrypto; -- provides gen_random_uuid()

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  -- Owner-only today; 'public' is reserved so sharing can be added later without a
  -- schema rewrite (see the commented policy variant below).
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

create table if not exists public.collectibles (
  id         uuid primary key default gen_random_uuid(),
  set_id     uuid not null references public.sets (id) on delete cascade,
  -- Denormalized owner, so RLS on this table is a simple user_id = auth.uid() check
  -- without a join back to sets.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  image_path text not null,
  owned      integer not null default 0 check (owned >= 0),
  target     integer not null default 1 check (target >= 1),
  created_at timestamptz not null default now()
);

create index if not exists collectibles_by_set on public.collectibles (set_id);
create index if not exists sets_by_user on public.sets (user_id);

comment on column public.collectibles.image_path is
  'Storage object key in the private collectible-images bucket (e.g. <uid>/<uuid>.webp).';

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The whole basis of multi-user separation. Enforced at the database so app code
-- can never accidentally leak across users.
alter table public.sets enable row level security;
alter table public.collectibles enable row level security;

-- ── sets ─────────────────────────────────────────────────────────────────────
create policy "sets_select_own" on public.sets
  for select using (user_id = auth.uid());
create policy "sets_insert_own" on public.sets
  for insert with check (user_id = auth.uid());
create policy "sets_update_own" on public.sets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sets_delete_own" on public.sets
  for delete using (user_id = auth.uid());

-- To make some sets publicly viewable later, replace sets_select_own with:
--   for select using (user_id = auth.uid() or visibility = 'public');
-- (and add an equivalent visibility check for collectibles).

-- ── collectibles ─────────────────────────────────────────────────────────────
create policy "collectibles_select_own" on public.collectibles
  for select using (user_id = auth.uid());
create policy "collectibles_insert_own" on public.collectibles
  for insert with check (user_id = auth.uid());
create policy "collectibles_update_own" on public.collectibles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "collectibles_delete_own" on public.collectibles
  for delete using (user_id = auth.uid());

-- ── Storage: private thumbnail bucket ────────────────────────────────────────
-- Objects are keyed <uid>/<uuid>.webp; a user may only touch objects under their own
-- uid folder. The bucket is private, so images are served via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('collectible-images', 'collectible-images', false)
on conflict (id) do nothing;

create policy "collectible_images_select_own" on storage.objects
  for select using (
    bucket_id = 'collectible-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "collectible_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'collectible-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "collectible_images_update_own" on storage.objects
  for update using (
    bucket_id = 'collectible-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "collectible_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'collectible-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
