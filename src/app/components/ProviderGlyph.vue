<script setup lang="ts">
import type { Provider } from '@supabase/supabase-js'
import { providerGlyphs } from '@core/auth-providers'

// A single OAuth provider's monochrome brand mark. Renders nothing for a provider
// we don't ship a glyph for, so callers can drop it in unconditionally.
defineProps<{ provider: Provider }>()
</script>

<template>
  <svg
    v-if="providerGlyphs[provider]"
    viewBox="0 0 24 24"
    class="h-4 w-4 shrink-0"
    fill="currentColor"
    aria-hidden="true"
  >
    <path :d="providerGlyphs[provider]" />
  </svg>
</template>
