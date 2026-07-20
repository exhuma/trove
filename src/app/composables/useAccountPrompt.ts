import { ref } from 'vue'

// The account dialog (linked identities, sign out) is opened from the header but
// mounted in the shell, so a module-scope singleton carries the one boolean —
// mirroring useAddSetPrompt rather than threading an emit through the header.
const open = ref(false)

export function useAccountPrompt() {
  return {
    open,
    openAccount: () => {
      open.value = true
    },
    closeAccount: () => {
      open.value = false
    },
  }
}
