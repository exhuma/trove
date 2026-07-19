<script setup lang="ts">
// The phone-only section switcher. On `sm` up the same links live inline in the
// header (AppHeader); here they get a full-width segmented strip with thumb-sized
// targets. Rendered by the views (not the shell) so the collection can hide it
// inside a set, where the detail deserves the full screen.
defineProps<{ needing: number }>()
</script>

<template>
  <nav aria-label="Sections" class="border-b border-hall-line px-4 pb-3 pt-1 sm:hidden">
    <!-- exact-active-class, not active-class: "/" prefixes every route and would
         otherwise keep Collection lit on /needs. Exact matching also puts
         aria-current="page" on the right link. -->
    <div class="flex gap-1 rounded-xl border border-hall-line bg-hall-raised p-1">
      <RouterLink
        to="/"
        exact-active-class="bg-violet text-ink"
        class="grid min-h-11 flex-1 place-items-center rounded-lg text-sm font-medium text-ink-muted motion-safe:transition"
      >
        Collection
      </RouterLink>
      <RouterLink
        to="/needs"
        data-tour="needs-nav"
        exact-active-class="bg-violet text-ink"
        class="grid min-h-11 flex-1 place-items-center rounded-lg text-sm font-medium text-ink-muted motion-safe:transition"
      >
        <span>
          Needs<span v-if="needing" class="ml-1 tabular-nums">({{ needing }})</span>
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
