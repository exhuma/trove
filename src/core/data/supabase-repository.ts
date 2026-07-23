import type { Collectible, CollectibleSet } from '../types'
import { IMAGE_BUCKET, supabase } from '../supabase'
import type { CollectionRepository, NewCollectible } from './repository'

const SIGNED_URL_TTL = 60 * 60 // 1 hour; the app refetches on load, so expiry is moot.

interface CollectibleRow {
  id: string
  name: string
  image_path: string
  owned: number
  target: number
  variant_key: string | null
  notes: string | null
  created_at: string
}

interface SetRow {
  id: string
  name: string
  collectibles: CollectibleRow[]
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('You are not signed in.')
  return data.user.id
}

/** Resolves one Storage path to a signed display URL. */
async function signOne(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) throw new Error(`Could not load an image: ${error?.message ?? 'unknown error'}`)
  return data.signedUrl
}

/** Resolves many Storage paths in one round-trip, returned as a path -> URL map. */
async function signMany(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!paths.length) return map
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  if (error) throw new Error(`Could not load images: ${error.message}`)
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl)
  }
  return map
}

function toCollectible(row: CollectibleRow, url: string): Collectible {
  return {
    id: row.id,
    name: row.name,
    image: url,
    imagePath: row.image_path,
    owned: row.owned,
    target: row.target,
    variantKey: row.variant_key,
    notes: row.notes ?? '',
    addedAt: row.created_at,
  }
}

/**
 * Supabase implementation of the collection repository. RLS scopes every query to the
 * signed-in user, so no explicit `user_id` filter is needed on reads.
 */
export class SupabaseCollectionRepository implements CollectionRepository {
  async listSets(): Promise<CollectibleSet[]> {
    const { data, error } = await supabase
      .from('sets')
      .select(
        'id, name, collectibles ( id, name, image_path, owned, target, variant_key, notes, created_at )',
      )
      .order('created_at', { ascending: true })
      .order('created_at', { ascending: true, referencedTable: 'collectibles' })
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as SetRow[]
    const urls = await signMany(rows.flatMap((s) => s.collectibles.map((c) => c.image_path)))

    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      collectibles: s.collectibles.map((c) => toCollectible(c, urls.get(c.image_path) ?? '')),
    }))
  }

  async createSet(input: { name: string }): Promise<CollectibleSet> {
    const { data, error } = await supabase.from('sets').insert({ name: input.name }).select('id, name').single()
    if (error || !data) throw new Error(error?.message ?? 'Could not create the set.')
    return { id: data.id, name: data.name, collectibles: [] }
  }

  async deleteSet(id: string): Promise<void> {
    // Child collectible rows go via ON DELETE CASCADE; Storage objects are left in
    // place so an undo can restore the rows against them.
    const { error } = await supabase.from('sets').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async restoreSet(set: CollectibleSet): Promise<void> {
    const { error: setError } = await supabase.from('sets').insert({ id: set.id, name: set.name })
    if (setError) throw new Error(setError.message)
    if (!set.collectibles.length) return
    const userId = await currentUserId()
    const rows = set.collectibles.map((c) => ({
      id: c.id,
      set_id: set.id,
      user_id: userId,
      name: c.name,
      image_path: c.imagePath,
      owned: c.owned,
      target: c.target,
      variant_key: c.variantKey,
      notes: c.notes,
    }))
    const { error } = await supabase.from('collectibles').insert(rows)
    if (error) throw new Error(error.message)
  }

  async createCollectible(setId: string, input: NewCollectible): Promise<Collectible> {
    const userId = await currentUserId()
    // Owner-prefixed path — the Storage policy only lets a user touch objects under
    // their own uid folder. crypto.randomUUID keeps names unguessable and unique.
    const path = `${userId}/${crypto.randomUUID()}.webp`

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, input.blob, { contentType: 'image/webp' })
    if (uploadError) throw new Error(uploadError.message)

    const { data, error } = await supabase
      .from('collectibles')
      .insert({
        set_id: setId,
        name: input.name,
        image_path: path,
        target: input.target ?? 1,
        variant_key: input.variantKey ?? null,
      })
      .select('id, name, image_path, owned, target, variant_key, notes, created_at')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Could not save the collectible.')

    return toCollectible(data as CollectibleRow, await signOne(path))
  }

  async deleteCollectible(id: string): Promise<void> {
    const { error } = await supabase.from('collectibles').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async restoreCollectible(setId: string, collectible: Collectible): Promise<void> {
    const userId = await currentUserId()
    const { error } = await supabase.from('collectibles').insert({
      id: collectible.id,
      set_id: setId,
      user_id: userId,
      name: collectible.name,
      image_path: collectible.imagePath,
      owned: collectible.owned,
      target: collectible.target,
      variant_key: collectible.variantKey,
      notes: collectible.notes,
    })
    if (error) throw new Error(error.message)
  }

  async updateCollectible(
    id: string,
    patch: { owned?: number; target?: number; notes?: string },
  ): Promise<void> {
    const { error } = await supabase.from('collectibles').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  }
}
