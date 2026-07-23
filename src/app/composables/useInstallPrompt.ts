import { computed, ref } from 'vue'

// Surfaces the PWA install action in-app instead of leaving it buried in the
// browser menu. A module-scope singleton (the pattern useToast/useAccountPrompt
// use): the listeners are attached once, at module load, NOT in onMounted.
// `beforeinstallprompt` fires at most once per eligible page load and can fire
// before any component mounts, so attaching it lazily would miss it. Any consumer
// (App.vue, AppHeader, AccountOverlay, LoginView) importing this module guarantees
// the handler is registered at app boot.
//
// Discovery is decoupled from that one-shot event: only Chromium fires it, so
// every other browser gets a platform-specific instruction set (`installGuide`)
// instead. `install()` is the single action every entry point calls — it fires the
// native prompt when Chromium offered one, else opens the instructions overlay.
// Awareness that install exists at all is handled once, out of band, by the
// onboarding tour (a tip anchored on the Account button), so there is no
// always-on banner and no dismissal state to remember here.

// Not in the default DOM lib — the event Chromium fires to let us defer the
// native install prompt until a user gesture.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Non-reactive side-channel for the deferred event (like useToast's `timers`
// Map): nothing renders off the event object itself, only off `canInstall`.
let deferredPrompt: BeforeInstallPromptEvent | null = null

const canInstall = ref(false)

// Whether the instructions overlay is open. Module-scope so the header/account/
// landing entry points can open it and App.vue can mount it, mirroring
// useAccountPrompt's single-boolean pattern.
const guideOpen = ref(false)

// Detection runs once at module load. `window`-guarded so a build-time import
// (or any non-browser context) can't throw.
const hasWindow = typeof window !== 'undefined'

// Already installed: running in a standalone window (Chromium/Android) or via
// the iOS-specific `navigator.standalone`.
const isStandalone =
  hasWindow &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

// The current browser/OS, only as far as it changes the manual install steps.
// Chromium can be prompted programmatically; everyone else needs instructions,
// and the instructions differ per platform.
type InstallPlatform =
  | 'ios-safari'
  | 'ios-other' // Chrome/Edge/Firefox on iOS: their own share sheet since iOS 16.4
  | 'android-firefox'
  | 'android-chromium'
  | 'desktop-firefox'
  | 'desktop-safari'
  | 'desktop-chromium'
  | 'unknown'

const platform: InstallPlatform = (() => {
  if (!hasWindow) return 'unknown'
  const ua = window.navigator.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  if (iOS) return /CriOS|EdgiOS|FxiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari'

  const firefox = /Firefox|FxiOS/.test(ua)
  const android = /Android/.test(ua)
  if (android) return firefox ? 'android-firefox' : 'android-chromium'

  if (firefox) return 'desktop-firefox'
  // Safari (desktop) sends "Safari" but not "Chrome/Chromium"; Chromium sends both.
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) return 'desktop-safari'
  return 'desktop-chromium'
})()

if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop Chromium's own mini-infobar; we drive the prompt from our button.
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    // Installed — drop the deferred event and hide the affordances immediately.
    deferredPrompt = null
    canInstall.value = false
    guideOpen.value = false
  })
}

export interface InstallGuide {
  heading: string
  steps: string[]
}

// Manual, platform-specific instructions for browsers we can't prompt. `null`
// only when there is genuinely nothing to tell the user (an unknown platform).
// Chromium keeps a guide too: it's the fallback for when `beforeinstallprompt`
// never fired (engagement heuristics, a prior install, or plain timing).
const installGuide = computed<InstallGuide | null>(() => {
  switch (platform) {
    case 'ios-safari':
      return {
        heading: 'In Safari',
        steps: ['Tap the Share button.', 'Choose “Add to Home Screen”.', 'Tap “Add” to confirm.'],
      }
    case 'ios-other':
      return {
        heading: 'On iOS',
        steps: [
          'Open the browser’s menu or Share button.',
          'Choose “Add to Home Screen”.',
          'Tap “Add” to confirm.',
        ],
      }
    case 'android-firefox':
      return {
        heading: 'In Firefox',
        steps: ['Open the ⋮ menu.', 'Tap “Install” (or “Add to Home screen”).', 'Confirm to add Trove.'],
      }
    case 'android-chromium':
      return {
        heading: 'In your browser',
        steps: ['Open the ⋮ menu.', 'Tap “Install app” (or “Add to Home screen”).', 'Confirm to add Trove.'],
      }
    case 'desktop-safari':
      return {
        heading: 'In Safari',
        steps: ['Open the Share menu.', 'Choose “Add to Dock”.', 'Confirm to add Trove.'],
      }
    case 'desktop-chromium':
      return {
        heading: 'In your browser',
        steps: [
          'Click the install icon at the right of the address bar,',
          'or open the ⋮ menu and choose “Install Trove”.',
        ],
      }
    case 'desktop-firefox':
      return {
        heading: 'Firefox on desktop',
        steps: [
          'Firefox on desktop can’t install web apps directly.',
          'Open Trove in Chrome or Edge to install it, or add a bookmark for quick access.',
        ],
      }
    default:
      return null
  }
})

// Chromium has deferred a native prompt we can fire from a user gesture.
const nativePromptAvailable = computed(() => canInstall.value)

// Whether to surface any install affordance at all: not already installed, and
// there is either a native prompt or a manual guide to show.
const installOffered = computed(
  () => !isStandalone && (nativePromptAvailable.value || installGuide.value !== null),
)

// MUST be called from a user gesture (click). `prompt()` can only be consumed
// once, so we null the event and flip the flag regardless of the choice.
async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return
  const event = deferredPrompt
  deferredPrompt = null
  canInstall.value = false
  await event.prompt()
  await event.userChoice
}

function openGuide(): void {
  guideOpen.value = true
}

function closeGuide(): void {
  guideOpen.value = false
}

// The single entry-point action: fire the real prompt when Chromium offered one,
// otherwise fall back to the instructions overlay.
async function install(): Promise<void> {
  if (nativePromptAvailable.value) return promptInstall()
  openGuide()
}

export function useInstallPrompt() {
  return {
    installOffered,
    nativePromptAvailable,
    installGuide,
    guideOpen,
    install,
    openGuide,
    closeGuide,
  }
}
