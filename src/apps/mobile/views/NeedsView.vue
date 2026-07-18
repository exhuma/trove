<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import TroveWordmark from '@core/components/TroveWordmark.vue'
import { useCollection } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAuth } from '@core/auth'
import NavSwitcher from '../components/NavSwitcher.vue'
import NeedRow from '../components/NeedRow.vue'
import type { NeedRow as Row } from '@core/composables/useNeeds'

const { sets, loading, error, ready, setOwnedCount } = useCollection()
const { needGroups, needTotals, needingCount, grouped, sort, captureNeeds } = useNeeds()
const { push } = useToast()
const { signOut } = useAuth()

// Two triggers, both needed: mount covers arriving from the collection with data
// already loaded, and the ready watch covers a hard refresh straight onto /needs,
// where sets is still empty at mount and a capture then would find nothing.
onMounted(captureNeeds)
watch(ready, (isReady) => {
  if (isReady) captureNeeds()
})

const zoom = ref<{ src: string; alt: string } | null>(null)

function onSetOwned(row: Row, count: number) {
  const result = setOwnedCount(row.setId, row.id, count)
  if (!result.ok) push(result.message, { tone: 'error' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-hall-line bg-hall/90 px-4 py-3 backdrop-blur-md"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
    >
      <h1>
        <TroveWordmark size="sm" />
      </h1>

      <span class="min-w-0 flex-1 truncate text-center font-display text-lg tracking-wide text-ink">
        Needs
      </span>

      <button class="shrink-0 text-sm text-ink-muted" @click="signOut">Sign out</button>
    </header>

    <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-4 py-2 text-center text-xs text-danger">
      {{ error }}
    </div>

    <NavSwitcher :needing="needingCount" />

    <main class="flex-1 px-4 py-4">
      <div v-if="loading && !sets.length" class="py-16 text-center text-sm text-ink-muted">Loading…</div>

      <p v-else-if="!sets.length" class="py-16 text-center text-sm text-ink-faint">
        No sets yet. Add some collectibles and anything you're short of turns up here.
      </p>

      <p v-else-if="!needGroups.length" class="py-16 text-center text-sm text-ink-faint">
        Nothing needed — every collectible is at its wanted count.
      </p>

      <template v-else>
        <!-- Four taps' worth of state, so the controls sit inline rather than
             behind a sheet; a sheet earns its round-trip only for real input. -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <div class="flex flex-1 gap-1 rounded-xl border border-hall-line bg-hall-raised p-1" role="group" aria-label="Grouping">
            <button
              class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium"
              :class="grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted'"
              :aria-pressed="grouped"
              @click="grouped = true"
            >
              By set
            </button>
            <button
              class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium"
              :class="!grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted'"
              :aria-pressed="!grouped"
              @click="grouped = false"
            >
              All
            </button>
          </div>

          <div class="flex flex-1 gap-1 rounded-xl border border-hall-line bg-hall-raised p-1" role="group" aria-label="Sort">
            <button
              class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium"
              :class="sort === 'name' ? 'bg-hall-panel text-ink' : 'text-ink-muted'"
              :aria-pressed="sort === 'name'"
              @click="sort = 'name'"
            >
              A–Z
            </button>
            <button
              class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium"
              :class="sort === 'needed' ? 'bg-hall-panel text-ink' : 'text-ink-muted'"
              :aria-pressed="sort === 'needed'"
              @click="sort = 'needed'"
            >
              Most needed
            </button>
          </div>
        </div>

        <!-- Rows stay put once completed, so the list never shifts mid-tap. This
             is how you clear them out when you're done. -->
        <button
          v-if="needTotals.shown > needTotals.items"
          class="mb-3 min-h-11 w-full rounded-xl border border-hall-line px-3 text-sm text-ink-muted"
          @click="captureNeeds"
        >
          Clear completed
        </button>

        <div class="flex flex-col gap-5">
          <section v-for="group in needGroups" :key="group.setId">
            <h2 v-if="grouped" class="mb-2 flex items-baseline gap-2 px-1">
              <span class="truncate font-display text-lg tracking-wide text-ink">{{ group.setName }}</span>
              <span class="shrink-0 text-xs tabular-nums text-ink-muted">{{ group.outstanding }} outstanding</span>
            </h2>

            <ul class="flex flex-col gap-2">
              <li v-for="row in group.rows" :key="row.id">
                <NeedRow
                  :row="row"
                  :show-set="!grouped"
                  @set-owned="(count) => onSetOwned(row, count)"
                  @zoom="zoom = { src: row.image, alt: row.name }"
                />
              </li>
            </ul>
          </section>
        </div>
      </template>
    </main>

    <div v-if="zoom" class="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-6" @click="zoom = null">
      <img :src="zoom.src" :alt="zoom.alt" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
    </div>
  </div>
</template>
