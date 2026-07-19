<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@core/auth'
import TroveWordmark from '@core/components/TroveWordmark.vue'
import TroveMark from '@core/components/TroveMark.vue'
import AppVersion from '../components/AppVersion.vue'

// Shown signed-out alongside the sign-in card to pitch the tool at a first-time
// visitor. Kept as data so the markup stays a simple list.
const highlights = [
  {
    title: 'Owned vs. target',
    body: 'Track how many copies you hold against a goal — a Magic playset is 4, and Trove keeps the count.',
  },
  {
    title: 'A Needs view',
    body: 'See exactly what each set is still short, so you know what to chase before the next order.',
  },
  {
    title: 'Cards and sealed product',
    body: 'Add cards straight from Scryfall, or boosters and sealed product from the built-in catalogue.',
  },
]

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
  <main class="grid min-h-screen place-items-center px-6 py-10">
    <div
      class="grid w-full max-w-4xl items-center gap-10 sm:grid-cols-2 sm:gap-16"
    >
      <!-- Marketing hero: the pitch a signed-out visitor lands on. Stacked above
           the sign-in card on phones, beside it from sm: up. -->
      <section class="flex flex-col gap-6 text-center sm:text-left">
        <h1 class="flex justify-center sm:justify-start">
          <TroveWordmark size="lg" />
        </h1>
        <div class="space-y-3">
          <p class="font-display text-3xl leading-tight tracking-wide text-ink sm:text-4xl">
            Every card accounted for.
          </p>
          <p class="mx-auto max-w-md text-sm leading-relaxed text-ink-muted sm:mx-0">
            Trove is a personal collection tracker for Magic: The Gathering. Build sets, track the
            copies you own against a target, and see what you still need at a glance.
          </p>
        </div>
        <ul class="mx-auto flex max-w-md flex-col gap-3 text-left sm:mx-0">
          <li v-for="h in highlights" :key="h.title" class="flex gap-3">
            <TroveMark class="mt-0.5 h-5 w-5 shrink-0 text-violet-bright" />
            <span class="text-sm leading-snug text-ink-muted">
              <span class="font-medium text-ink">{{ h.title }}</span> — {{ h.body }}
            </span>
          </li>
        </ul>
      </section>

      <!-- Sign-in / sign-up card. -->
      <div class="mx-auto w-full max-w-sm">
      <p class="mb-8 text-center text-sm text-ink-muted sm:text-xs">
        {{ mode === 'signin' ? 'Sign in to your collection' : 'Create your account' }}
      </p>

      <form class="flex flex-col gap-3" @submit.prevent="submitPassword">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            class="w-full rounded-xl border border-hall-line bg-hall px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
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
            class="w-full rounded-xl border border-hall-line bg-hall px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            @input="reset"
          />
        </div>

        <p v-if="error" class="text-sm text-danger sm:text-xs">{{ error }}</p>
        <p v-if="notice" class="text-sm text-violet-bright sm:text-xs">{{ notice }}</p>

        <button
          type="submit"
          :disabled="busy"
          class="mt-1 rounded-xl bg-violet px-4 py-3 text-base font-medium text-ink hover:bg-violet-bright disabled:opacity-50 sm:rounded-lg sm:py-2 sm:text-sm"
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
        class="w-full rounded-xl border border-hall-line px-4 py-3 text-base font-medium text-ink hover:border-violet disabled:opacity-50 sm:rounded-lg sm:py-2 sm:text-sm"
        @click="submitMagicLink"
      >
        Email me a sign-in link
      </button>

      <p class="mt-6 text-center text-sm text-ink-muted sm:text-xs">
        <template v-if="mode === 'signin'">
          No account?
          <button class="text-violet-bright hover:underline" @click="((mode = 'signup'), reset())">Create one</button>
        </template>
        <template v-else>
          Already have an account?
          <button class="text-violet-bright hover:underline" @click="((mode = 'signin'), reset())">Sign in</button>
        </template>
      </p>

      <p class="mt-8 flex justify-center">
        <AppVersion />
      </p>
      </div>
    </div>
  </main>
</template>
