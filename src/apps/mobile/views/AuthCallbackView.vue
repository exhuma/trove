<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authReady, useAuth } from '@core/auth'

const { session } = useAuth()
const router = useRouter()
const failed = ref(false)

onMounted(async () => {
  await authReady
  if (session.value) {
    void router.replace('/')
    return
  }
  const stop = watch(session, (s) => {
    if (s) {
      stop()
      void router.replace('/')
    }
  })
  setTimeout(() => {
    if (!session.value) {
      stop()
      failed.value = true
    }
  }, 4000)
})
</script>

<template>
  <main class="grid min-h-screen place-items-center px-6 text-center">
    <div v-if="!failed" class="flex items-center gap-2 text-sm text-ink-muted">
      <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="8" r="6" class="opacity-25" />
        <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
      </svg>
      Signing you in…
    </div>
    <div v-else class="max-w-sm">
      <p class="text-sm text-ink">That sign-in link didn’t work — it may have expired.</p>
      <button
        class="mt-4 rounded-xl bg-violet px-4 py-3 text-base font-medium text-ink hover:bg-violet-bright"
        @click="router.replace('/login')"
      >
        Back to sign in
      </button>
    </div>
  </main>
</template>
