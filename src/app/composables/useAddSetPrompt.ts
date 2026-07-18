import { ref } from 'vue'

// "New set" is header chrome, so the dialog it opens lives in the shell — but the
// collection's empty state (and the needs list's) opens the same dialog from deep
// inside a route component. A module-scope singleton (the pattern useToast already
// uses) beats threading an emit up through RouterView for one boolean.
const open = ref(false)

export function useAddSetPrompt() {
  return {
    open,
    openAddSet: () => {
      open.value = true
    },
    closeAddSet: () => {
      open.value = false
    },
  }
}
