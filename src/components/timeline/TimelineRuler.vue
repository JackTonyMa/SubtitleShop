<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  duration: number
  zoom: number
}>()

const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

// Generate tick marks
const ticks = computed(() => {
  const tickInterval = getTickInterval()
  const tickCount = Math.ceil(props.duration / tickInterval)
  const result = []

  for (let i = 0; i <= tickCount; i++) {
    const time = i * tickInterval
    if (time > props.duration) break

    result.push({
      time,
      position: (time / props.duration) * 100,
      isMajor: i % getMajorTickInterval() === 0,
      label: formatTime(time)
    })
  }

  return result
})

function getTickInterval(): number {
  // Adjust interval based on zoom level
  const baseInterval = 10000 // 10 seconds
  return baseInterval / props.zoom
}

function getMajorTickInterval(): number {
  // Every 6th tick is major (1 minute at base zoom)
  return Math.max(1, Math.floor(60000 / getTickInterval()))
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function handleClick(event: MouseEvent) {
  const rulerEl = event.currentTarget as HTMLElement
  const rect = rulerEl.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = x / rect.width
  const time = percentage * props.duration
  emit('seek', time)
}
</script>

<template>
  <div class="timeline-ruler h-8 bg-gray-100 border-b border-gray-200 relative cursor-pointer" @click="handleClick">
    <!-- Tick marks -->
    <div
      v-for="tick in ticks"
      :key="tick.time"
      class="absolute bottom-0"
      :style="{ left: `${tick.position}%` }"
    >
      <!-- Tick line -->
      <div
        class="w-px bg-gray-400"
        :class="tick.isMajor ? 'h-3' : 'h-1.5'"
      />
      <!-- Label for major ticks -->
      <span
        v-if="tick.isMajor"
        class="absolute top-1 left-0 -translate-x-1/2 text-xs text-gray-500 font-medium"
      >
        {{ tick.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.timeline-ruler {
  overflow: hidden;
}
</style>
