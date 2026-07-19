<script setup lang="ts">
// A deliberately tiny build-identity line: the CalVer version, plus a channel
// chip only when this isn't a clean production release. Kept unobtrusive so it
// costs no real estate on mobile. Reused in the footer and on the login screen.
import { build, isPrerelease } from '@core/version'
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-[10px] tracking-wide text-ink-faint" :title="build.commit ? `commit ${build.commit}` : undefined">
    <span>v{{ build.version }}</span>
    <span
      v-if="isPrerelease"
      class="rounded-full border border-amber-muted px-1.5 py-px font-medium uppercase tracking-wider text-amber-bright"
    >
      {{ build.channel }}
    </span>
  </span>
</template>
