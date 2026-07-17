import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'error'
  /** Present only on reversible actions; wired to the toast's Undo button. */
  undo?: () => void
}

const DURATION_MS = 6000

// Module-scope state: one queue shared by every caller (no store library).
const toasts = ref<Toast[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function dismiss(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function push(message: string, options: { tone?: Toast['tone']; undo?: () => void } = {}) {
  const id = crypto.randomUUID()
  toasts.value = [...toasts.value, { id, message, tone: options.tone ?? 'info', undo: options.undo }]
  timers.set(
    id,
    setTimeout(() => dismiss(id), DURATION_MS),
  )
  return id
}

export function useToast() {
  return {
    toasts,
    push,
    dismiss,
    /** Runs the undo callback and clears the toast that offered it. */
    runUndo(toast: Toast) {
      toast.undo?.()
      dismiss(toast.id)
    },
  }
}
