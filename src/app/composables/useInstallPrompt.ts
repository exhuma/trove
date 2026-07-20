import { computed, ref } from 'vue'

// Surfaces the PWA install action in-app instead of leaving it buried in the
// browser menu. A module-scope singleton (the pattern useToast/useOnboarding
// use): the listeners are attached once, at module load, NOT in onMounted.
// `beforeinstallprompt` fires at most once per eligible page load and can fire
// before any component mounts, so attaching it lazily would miss it. Importing
// this module from App.vue guarantees the handler is registered at app boot.

// Not in the default DOM lib — the event Chromium fires to let us defer the
// native install prompt until a user gesture.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'trove:install-dismissed'

// Non-reactive side-channel for the deferred event (like useToast's `timers`
// Map): nothing renders off the event object itself, only off `canInstall`.
let deferredPrompt: BeforeInstallPromptEvent | null = null

const canInstall = ref(false)
const dismissed = ref(loadDismissed())

function loadDismissed(): boolean {
  // Best-effort: storage can be unavailable (private mode, disabled cookies),
  // and a dismissal flag is never worth an exception.
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Detection runs once at module load. `window`-guarded so a build-time import
// (or any non-browser context) can't throw.
const hasWindow = typeof window !== 'undefined'

// Already installed: running in a standalone window (Chromium/Android) or via
// the iOS-specific `navigator.standalone`.
const isStandalone =
  hasWindow &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

// iOS never fires `beforeinstallprompt`, so the only affordance is an
// instructional hint — and "Add to Home Screen" exists only in Safari, so
// Chrome/Edge/Firefox on iOS (CriOS/EdgiOS/FxiOS/OPiOS) are excluded: they
// can't install at all and the hint would be wrong for them.
const isIOSSafari = (() => {
  if (!hasWindow) return false
  const ua = window.navigator.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  const otherIOSBrowser = /CriOS|EdgiOS|FxiOS|OPiOS/.test(ua)
  return iOS && !otherIOSBrowser
})()

if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop Chromium's own mini-infobar; we drive the prompt from our button.
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    // Installed — drop the deferred event and hide the button immediately.
    deferredPrompt = null
    canInstall.value = false
  })
}

// The button shows only when Chromium has offered an install and the user
// hasn't already installed or dismissed. The iOS hint is the fallback path.
const showInstallButton = computed(
  () => canInstall.value && !isStandalone && !dismissed.value,
)
const showIOSHint = computed(() => isIOSSafari && !isStandalone && !dismissed.value)

// MUST be called from a user gesture (click). `prompt()` can only be consumed
// once, so we null the event and hide the button regardless of the choice.
async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return
  const event = deferredPrompt
  deferredPrompt = null
  canInstall.value = false
  await event.prompt()
  await event.userChoice
}

function dismiss(): void {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Dismissal just won't persist past this session.
  }
}

export function useInstallPrompt() {
  return { canInstall, showInstallButton, showIOSHint, promptInstall, dismiss }
}
