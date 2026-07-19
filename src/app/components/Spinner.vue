<script setup lang="ts">
// The app's one spinner. Inherits size and colour from the parent via
// `currentColor` and an `h-*/w-*` class, so a button, banner or full-page
// loader all use the same mark.
</script>

<template>
  <svg
    class="motion-safe:animate-spin"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    role="img"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6" class="opacity-25" />
    <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
  </svg>
</template>
