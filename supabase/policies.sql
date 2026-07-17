-- Row Level Security — the whole basis of multi-user separation. Enforced at the
-- database so app code can never accidentally leak across users. Run after schema.sql.

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
