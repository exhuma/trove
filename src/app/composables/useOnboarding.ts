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

/** Await a persistence write and adopt its result; never throws (state stays local). */
async function persist(write: Promise<OnboardingState>): Promise<void> {
  try {
    state.value = await write
  } catch (e) {
    console.error('[onboarding] persist failed', e)
  }
}

/**
 * Mark the welcome intro seen. **Optimistic**: the local flag flips synchronously so
 * the UI reacts (and the dialog closes) immediately, even if the server write is
 * slow or fails; the write is fired in the background and can only correct the local
 * state, never block it. This is what keeps the welcome buttons responsive.
 */
function markWelcomeSeen(): void {
  state.value = { welcomeSeen: true, seenTips: state.value?.seenTips ?? [] }
  void persist(onboardingRepo.markWelcomeSeen())
}

/**
 * Run a view's tour. A normal run waits behind the welcome gate and shows only
 * unseen tips; a `replay` (the "Take a tour" button) bypasses the gate and re-shows
 * every tip for the view, so the tour is always reachable — never a dead end.
 */
async function runTourFor(view: ViewKey, replay: boolean): Promise<void> {
  if (!replay && (!loaded.value || !welcomeSeen.value)) return
  const seen = replay ? [] : (state.value?.seenTips ?? [])
  const tips = selectTips(view, seen)
  if (!tips.length) return
  const shownKeys = await runTour(tips)
  if (!shownKeys.length) return
  // Optimistically union locally so a seen tip never repeats this session even if the
  // persist below fails; then write through in the background.
  state.value = {
    welcomeSeen: welcomeSeen.value,
    seenTips: [...new Set([...(state.value?.seenTips ?? []), ...shownKeys])],
  }
  void persist(onboardingRepo.markTipsSeen(shownKeys))
}

/** Run a view's tour if the welcome gate has passed (called from views on mount). */
function startTour(view: ViewKey): void {
  void runTourFor(view, false)
}

/** Re-run a view's full tour on demand (the persistent "Take a tour" control). */
function replayTour(view: ViewKey): void {
  void runTourFor(view, true)
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
    replayTour,
    reset,
  }
}
