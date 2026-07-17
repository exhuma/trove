import { onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

interface Options {
  /**
   * Listen in the capture phase and swallow the keys this modal handles. A
   * modal stacked on top of another (e.g. the image lightbox over the add
   * dialog) sets this so Escape and Tab reach it first and do not also drive
   * the modal underneath.
   */
  capture?: boolean
}

/**
 * Shared dialog keyboard and focus behaviour: an Escape-to-close handler, a Tab
 * focus trap that keeps focus inside `panel`, initial focus on the first
 * focusable element, and focus restore to the opener on unmount. Extracted from
 * BaseDialog so the lightbox can reuse it without inheriting its chrome.
 */
export function useModalA11y(panel: Ref<HTMLElement | null>, onClose: () => void, options: Options = {}) {
  const capture = options.capture ?? false
  let previouslyFocused: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (capture) event.stopImmediatePropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !panel.value) return

    const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    if (capture) event.stopImmediatePropagation()

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement

    if (event.shiftKey && (active === first || !panel.value.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown, capture)
    panel.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, capture)
    // Return focus to whatever opened the dialog, so keyboard users do not get
    // dumped back at the top of the document.
    previouslyFocused?.focus()
  })
}
