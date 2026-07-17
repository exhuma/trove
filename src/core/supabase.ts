import { createClient } from '@supabase/supabase-js'
import { config } from './config'

/**
 * The single Supabase client for the app. `persistSession` keeps the auth token in
 * localStorage (token storage only — app data lives in Postgres, never localStorage),
 * and `detectSessionInUrl` completes the magic-link redirect on the callback route.
 */
export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Storage bucket for collectible thumbnails. Private — access is via signed URLs. */
export const IMAGE_BUCKET = 'collectible-images'
