import { computed, ref } from 'vue'
import { onboardingRepo, type OnboardingState } from '@core/data'
import { selectTips, type ViewKey } from '../onboarding/tips'
import { runTour } from '../onboarding/runTour'

// Module-scope singleton (the pattern useToast / useAddSetPrompt already use): one
// onboarding state shared by the shell and every view. The shell loads it on
// sign-in; views ask to run their tour on mount.
const state = ref<OnboardingState | null>(null)
const loaded = ref(false)
let loadInFlight: Promise<void> | null = null

const welcomeSeen = computed(() => state.value?.welcomeSeen ?? false)

/**
 * Load the user's onboarding state once per session, lazily and de-duped. The load
 * is non-throwing: a failure logs and leaves `loaded` false, so the welcome gate
 * simply never fires rather than looping or stranding the user.
 */
async function ensureLoaded(): Promise<void> {
  if (loaded.value) return
  if (loadInFlight) return loadInFlight
  loadInFlight = (async () => {
    try {
      state.value = await onboardingRepo.get()
      loaded.value = true
    } catch (e) {
      console.error('[onboarding] load failed', e)
    } finally {
      loadInFlight = null
    }
  })()
  return loadInFlight
}

async function markWelcomeSeen(): Promise<void> {
  try {
    state.value = await onboardingRepo.markWelcomeSeen()
  } catch (e) {
    console.error('[onboarding] markWelcomeSeen failed', e)
  }
}

/**
 * Run the tour for a view, gated behind the welcome intro. Selects unseen tips,
 * shows them through the runner, and persists only the keys actually displayed so
 * they never repeat. No-op until the state is loaded and the welcome is seen.
 */
async function startTour(view: ViewKey): Promise<void> {
  if (!loaded.value || !welcomeSeen.value || !state.value) return
  const tips = selectTips(view, state.value.seenTips)
  if (!tips.length) return
  const shownKeys = await runTour(tips)
  if (!shownKeys.length) return
  try {
    state.value = await onboardingRepo.markTipsSeen(shownKeys)
  } catch (e) {
    console.error('[onboarding] markTipsSeen failed', e)
  }
}

/** Clear state on sign-out so the next user loads their own progress afresh. */
function reset(): void {
  state.value = null
  loaded.value = false
}

export function useOnboarding() {
  return {
    loaded,
    welcomeSeen,
    // True once state is loaded and the first-run welcome hasn't been seen.
    showWelcome: computed(() => loaded.value && !welcomeSeen.value),
    ensureLoaded,
    markWelcomeSeen,
    startTour,
    reset,
  }
}
