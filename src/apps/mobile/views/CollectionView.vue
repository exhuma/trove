<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCollection, progressOf } from '@core/composables/useCollection'
import { useToast } from '@core/composables/useToast'
import { useAuth } from '@core/auth'

// The mobile "pocket" build is read-and-adjust only: browse your sets and bump owned
// counts on the go. Creating/deleting sets and collectibles lives in the desktop app.
const { sets, loading, error, setOwnedCount } = useCollection()
const { push } = useToast()
const { signOut } = useAuth()

const openSetId = ref<string | null>(null)
const openSet = computed(() => sets.value.find((s) => s.id === openSetId.value) ?? null)

const zoom = ref<{ src: string; alt: string } | null>(null)

function bump(collectibleId: string, delta: number, current: number) {
  if (!openSetId.value) return
  const result = setOwnedCount(openSetId.value, collectibleId, current + delta)
  if (!result.ok) push(result.message, { tone: 'error' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-hall-line bg-hall/90 px-4 py-3 backdrop-blur-md"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
    >
      <button
        v-if="openSet"
        class="-ml-1 flex items-center gap-1 text-sm text-ink-muted"
        @click="openSetId = null"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 5l-5 5 5 5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Sets
      </button>
      <h1 v-else class="font-display text-2xl leading-none tracking-[0.15em] text-ink">
        COLLECT<span class="text-violet-bright">ibles</span>
      </h1>

      <span class="min-w-0 flex-1 truncate text-center font-display text-lg tracking-wide text-ink">
        {{ openSet?.name ?? '' }}
      </span>

      <button class="shrink-0 text-sm text-ink-muted" @click="signOut">Sign out</button>
    </header>

    <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-4 py-2 text-center text-xs text-danger">
      {{ error }}
    </div>

    <main class="flex-1 px-4 py-4">
      <div v-if="loading && !sets.length" class="py-16 text-center text-sm text-ink-muted">Loading…</div>

      <!-- Set detail: adjust owned counts -->
      <ul v-else-if="openSet" class="flex flex-col gap-2">
        <li v-if="!openSet.collectibles.length" class="py-16 text-center text-sm text-ink-faint">
          Nothing in this set yet.
        </li>
        <li
          v-for="c in openSet.collectibles"
          :key="c.id"
          class="flex items-center gap-3 rounded-xl border border-hall-line bg-hall-raised p-2"
        >
          <button
            class="aspect-card w-12 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel"
            @click="zoom = { src: c.image, alt: c.name }"
          >
            <img :src="c.image" alt="" class="h-full w-full object-contain" />
          </button>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ink">{{ c.name }}</p>
            <p class="text-xs" :class="c.owned >= c.target ? 'text-amber-bright' : 'text-ink-muted'">
              {{ c.owned }} of {{ c.target }} owned
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button
              class="grid h-9 w-9 place-items-center rounded-lg border border-hall-line text-ink disabled:opacity-30"
              :disabled="c.owned <= 0"
              aria-label="Decrease owned"
              @click="bump(c.id, -1, c.owned)"
            >
              −
            </button>
            <span class="w-5 text-center text-base tabular-nums text-ink">{{ c.owned }}</span>
            <button
              class="grid h-9 w-9 place-items-center rounded-lg border border-hall-line text-ink"
              aria-label="Increase owned"
              @click="bump(c.id, 1, c.owned)"
            >
              +
            </button>
          </div>
        </li>
      </ul>

      <!-- Set list -->
      <template v-else>
        <p v-if="!sets.length" class="py-16 text-center text-sm text-ink-faint">
          No sets yet. Add some from the desktop app.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="set in sets" :key="set.id">
            <button
              class="flex w-full items-center gap-3 rounded-xl border border-hall-line bg-hall-raised p-3 text-left"
              @click="openSetId = set.id"
            >
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-muted">
                <span class="font-display text-sm text-ink">{{ set.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-display text-lg leading-tight tracking-wide text-ink">{{ set.name }}</p>
                <p class="text-xs text-ink-muted">
                  {{ progressOf(set).owned }} of {{ progressOf(set).total }} owned
                </p>
              </div>
              <svg class="h-5 w-5 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M8 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </li>
        </ul>
      </template>
    </main>

    <!-- Simple full-screen image view -->
    <div
      v-if="zoom"
      class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
      @click="zoom = null"
    >
      <img :src="zoom.src" :alt="zoom.alt" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
    </div>
  </div>
</template>
