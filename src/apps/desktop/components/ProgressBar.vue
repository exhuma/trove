<script setup lang="ts">
const props = defineProps<{
  owned: number
  total: number
  complete: boolean
}>()

const percent = () => (props.total ? (props.owned / props.total) * 100 : 0)
</script>

<template>
  <div
    class="h-1 w-full overflow-hidden rounded-full bg-hall-line"
    role="progressbar"
    :aria-valuenow="owned"
    :aria-valuemin="0"
    :aria-valuemax="total"
    :aria-label="`${owned} of ${total} owned`"
  >
    <div
      class="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
      :class="complete ? 'bg-amber' : 'bg-violet'"
      :style="{ width: `${percent()}%` }"
    />
  </div>
</template>
