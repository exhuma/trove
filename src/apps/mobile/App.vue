<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
import { useAuth } from '@core/auth'
import { useCollection } from '@core/composables/useCollection'

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
