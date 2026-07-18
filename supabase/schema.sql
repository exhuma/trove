-- Trove schema — plain PostgreSQL + Supabase auth. Portable: the only
-- Supabase-specific references are auth.users / auth.uid(), so the data model could
-- migrate to vanilla Postgres by swapping those out.
--
-- Run this once in the Supabase SQL editor (or `supabase db` CLI), then policies.sql.

create extension if not exists pgcrypto; -- provides gen_random_uuid()

create table if not exists public.sets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  -- Owner-only today; 'public' is reserved so sharing can be added later without a
  -- schema rewrite (see the commented policy variant in policies.sql).
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
