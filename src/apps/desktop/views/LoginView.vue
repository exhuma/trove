<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@core/auth'
import TroveWordmark from '@core/components/TroveWordmark.vue'

const { signInWithPassword, signUp, signInWithMagicLink } = useAuth()
const router = useRouter()

type Mode = 'signin' | 'signup'
const mode = ref<Mode>('signin')

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')

function reset() {
  error.value = ''
  notice.value = ''
}

async function submitPassword() {
  reset()
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.'
    return
  }
  busy.value = true
  try {
    const result =
      mode.value === 'signin'
        ? await signInWithPassword(email.value.trim(), password.value)
        : await signUp(email.value.trim(), password.value)
    if (result.error) {
      error.value = result.error
      return
    }
    if (mode.value === 'signup') {
      // Depending on the project's email-confirmation setting, sign-up may or may
      // not create a session immediately; cover both.
      notice.value = 'Account created. If confirmation is required, check your email, then sign in.'
      mode.value = 'signin'
      password.value = ''
      return
    }
    void router.push('/')
  } finally {
    busy.value = false
  }
}

async function submitMagicLink() {
  reset()
  if (!email.value.trim()) {
    error.value = 'Enter your email first.'
    return
  }
  busy.value = true
  try {
    const result = await signInWithMagicLink(email.value.trim())
    if (result.error) error.value = result.error
    else notice.value = 'Check your email for a sign-in link.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center px-6">
    <div class="w-full max-w-sm">
      <h1 class="mb-1 flex justify-center">
        <TroveWordmark size="lg" />
      </h1>
      <p class="mb-8 text-center text-xs text-ink-muted">
        {{ mode === 'signin' ? 'Sign in to your collection' : 'Create your account' }}
      </p>

      <form class="flex flex-col gap-3" @submit.prevent="submitPassword">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
            @input="reset"
          />
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-ink">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
            @input="reset"
          />
        </div>

        <p v-if="error" class="text-xs text-danger">{{ error }}</p>
        <p v-if="notice" class="text-xs text-violet-bright">{{ notice }}</p>

        <button
          type="submit"
          :disabled="busy"
          class="mt-1 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50"
        >
          {{ busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
        </button>
      </form>

      <div class="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-ink-faint">
        <span class="h-px flex-1 bg-hall-line" />or<span class="h-px flex-1 bg-hall-line" />
      </div>

      <button
        type="button"
        :disabled="busy"
        class="w-full rounded-lg border border-hall-line px-4 py-2 text-sm font-medium text-ink hover:border-violet disabled:opacity-50"
        @click="submitMagicLink"
      >
        Email me a sign-in link
      </button>

      <p class="mt-6 text-center text-xs text-ink-muted">
        <template v-if="mode === 'signin'">
          No account?
          <button class="text-violet-bright hover:underline" @click="((mode = 'signup'), reset())">Create one</button>
        </template>
        <template v-else>
          Already have an account?
          <button class="text-violet-bright hover:underline" @click="((mode = 'signin'), reset())">Sign in</button>
        </template>
      </p>
    </div>
  </main>
</template>
