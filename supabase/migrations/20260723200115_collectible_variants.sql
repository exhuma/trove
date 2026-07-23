-- Adds the fields the desktop management view needs: a shared identity across
-- printings of "the same card" (populated from Scryfall's oracle_id going
-- forward; null for existing rows, which the app groups by name instead) and a
-- free-text note per collectible. No backfill needed for either column.

alter table public.collectibles
  add column if not exists variant_key text,
  add column if not exists notes text;

create index if not exists collectibles_by_variant_key
  on public.collectibles (set_id, variant_key)
  where variant_key is not null;
