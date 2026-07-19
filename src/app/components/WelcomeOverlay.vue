<script setup lang="ts">
// First-run welcome: the gate that precedes any guided tour. Shown once, when
// onboarding state is loaded and the welcome hasn't been seen. Either choice marks
// the welcome seen (so it never reappears); "Take the tour" then kicks off the
// collection tour. Built on the shared overlay shell like every other modal.
import BaseOverlay from './BaseOverlay.vue'
import TroveMark from '@core/components/TroveMark.vue'
import { useOnboarding } from '../composables/useOnboarding'

const { markWelcomeSeen, startTour } = useOnboarding()

async function takeTour() {
  await markWelcomeSeen()
  await startTour('collection')
}

async function skip() {
  await markWelcomeSeen()
}
</script>

<template>
  <BaseOverlay title="Welcome to Trove" @close="skip">
    <div class="flex flex-col items-center gap-5 text-center">
      <TroveMark class="h-14 w-14 text-violet-bright" />
      <div class="space-y-2">
        <p class="text-base text-ink">Track every collectible — owned versus target — across your sets.</p>
        <p class="text-sm text-ink-muted">
          Want a 30-second look around? We'll point out the essentials. You can skip and explore on your own.
        </p>
      </div>
      <div class="mt-1 flex w-full flex-col gap-2 sm:flex-row-reverse">
        <button
          class="flex-1 rounded-xl bg-violet px-4 py-3 text-base font-medium text-ink hover:bg-violet-bright sm:rounded-lg sm:py-2 sm:text-sm"
          @click="takeTour"
        >
          Take the tour
        </button>
        <button
          class="flex-1 rounded-xl border border-hall-line px-4 py-3 text-base font-medium text-ink-muted hover:border-violet hover:text-ink sm:rounded-lg sm:py-2 sm:text-sm"
          @click="skip"
        >
          Skip for now
        </button>
      </div>
    </div>
  </BaseOverlay>
</template>
