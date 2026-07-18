<script setup lang="ts">
// The Trove mark: a treasure chest, its clasp cut as a gem.
//
// Two-tone by design, matching the app's split of duties — the chest is drawn in
// `currentColor` so it takes on whatever ink the surrounding text uses, while the
// gem is fixed amber, the palette's reserved "this is the good stuff" accent.
//
// Sized by the parent via h-*/w-* utilities. Geometry is kept to a handful of
// heavy strokes so it stays legible down to a 16px favicon.
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <!-- Lid: a domed hood. Without the band below it this silhouette reads as a
         handbag, so the two are drawn as one unit and neither is optional. -->
    <path
      d="M3 11.4V9.6C3 5.9 6.6 3.6 12 3.6s9 2.3 9 6v1.8"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
    />
    <!-- Body -->
    <path
      d="M3 11.4h18V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6.6Z"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
    <!-- The strap band across the seam — the detail that makes it a chest. -->
    <path d="M3 13.6h18" stroke="currentColor" stroke-width="1.6" />
    <!-- Clasp gem, sized to straddle the band and stay visible at 16px. -->
    <path d="M12 9.3l2.3 2.9-2.3 2.9-2.3-2.9L12 9.3Z" class="fill-amber" />
    <!-- Top facet, a shade brighter, to give the gem a light source. -->
    <path d="M12 9.3l2.3 2.9H9.7L12 9.3Z" class="fill-amber-bright" />
  </svg>
</template>
