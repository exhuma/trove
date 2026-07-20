<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Provider } from '@supabase/supabase-js'
import { useAuth } from '@core/auth'
import { enabledOAuthProviders, loadOAuthProviders } from '@core/auth-providers'
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

const { signInWithPassword, signUp, signInWithMagicLink, signInWithOAuth } = useAuth()
const router = useRouter()

// Which social providers to show is discovered live from Supabase on mount, so a
// provider toggled in the dashboard appears/disappears without an app rebuild.
onMounted(() => {
  void loadOAuthProviders()
})

// Monochrome (currentColor) brand glyphs — the multicolour marks would need hex
// literals, which the repo forbids. viewBox is 0 0 24 24 for each.
const providerGlyphs: Partial<Record<Provider, string>> = {
  google:
    'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  discord:
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z',
}

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

async function submitOAuth(provider: Provider) {
  reset()
  busy.value = true
  try {
    // On success Supabase redirects the whole page; router.push only matters in
    // the memory backend, where sign-in completes in place.
    const result = await signInWithOAuth(provider)
    if (result.error) {
      error.value = result.error
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
  <main class="grid min-h-screen place-items-center px-6 py-8 sm:py-10">
    <div
      class="grid w-full max-w-4xl items-center gap-6 sm:grid-cols-2 sm:gap-16"
    >
      <!-- Marketing hero: the pitch a signed-out visitor lands on. Stacked above
           the sign-in card on phones, beside it from sm: up. -->
      <section class="flex flex-col gap-4 text-center sm:gap-6 sm:text-left">
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
        <ul class="mx-auto hidden max-w-md flex-col gap-3 text-left sm:mx-0 sm:flex">
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

      <div class="flex flex-col gap-2">
        <!-- Social providers, discovered live from Supabase — only the enabled
             ones render. -->
        <button
          v-for="provider in enabledOAuthProviders"
          :key="provider.id"
          type="button"
          :disabled="busy"
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-hall-line px-4 py-3 text-base font-medium text-ink hover:border-violet disabled:opacity-50 sm:rounded-lg sm:py-2 sm:text-sm"
          @click="submitOAuth(provider.id)"
        >
          <svg
            v-if="providerGlyphs[provider.id]"
            viewBox="0 0 24 24"
            class="h-4 w-4 shrink-0"
            fill="currentColor"
            aria-hidden="true"
          >
            <path :d="providerGlyphs[provider.id]" />
          </svg>
          Continue with {{ provider.label }}
        </button>

        <button
          type="button"
          :disabled="busy"
          class="w-full rounded-xl border border-hall-line px-4 py-3 text-base font-medium text-ink hover:border-violet disabled:opacity-50 sm:rounded-lg sm:py-2 sm:text-sm"
          @click="submitMagicLink"
        >
          Email me a sign-in link
        </button>
      </div>

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
