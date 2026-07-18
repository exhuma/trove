<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
import { useAuth } from '@core/auth'
import { useCollection } from '@core/composables/useCollection'

// The shell owns the session→data lifecycle: load the collection when a user signs
// in (or changes), clear it and return to /login when they sign out. Token refreshes
// keep the same user id, so they don't trigger a reload.
const { session } = useAuth()
const { loadForUser, reset } = useCollection()
const router = useRouter()

watch(
  session,
  (next, prev) => {
    if (next && next.user.id !== prev?.user?.id) void loadForUser()
    else if (!next && prev) {
      reset()
      void router.push('/login')
    }
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
