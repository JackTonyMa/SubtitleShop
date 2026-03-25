<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

const props = defineProps<{
  item: SubtitleItem
  duration: number
  zoom: number
}>()

const emit = defineEmits<{
  (e: 'select', multi: boolean): void
  (e: 'update', updates: Partial<SubtitleItem>): void
}>()

const store = useSubtitleStore()

// State
const isResizing = ref(false)
const resizeEdge = ref<'start' | 'end' | null>(null)
const initialX = ref(0)
const initialTime = ref(0)

const isSelected = computed(() => store.isSelected(props.item.id))

// Position calculations
const left = computed(() => {
  const percentage = (props.item.startTime / props.duration) * 100
  return `${percentage}%`
})

const width = computed(() => {
  const duration = props.item.endTime - props.item.startTime
  const percentage = (duration / props.duration) * 100
  return `${percentage}%`
})

const truncatedText = computed(() => {
  const maxLength = 30
  if (props.item.text.length <= maxLength) return props.item.text
  return props.item.text.slice(0, maxLength) + '...'
})

// Event handlers
function handleClick(event: MouseEvent) {
  if (isResizing.value) return
  const multi = event.ctrlKey || event.metaKey
  emit('select', multi)
}

function startResize(edge: 'start' | 'end', event: MouseEvent) {
  event.stopPropagation()
  isResizing.value = true
  resizeEdge.value = edge
  initialX.value = event.clientX
  initialTime.value = edge === 'start' ? props.item.startTime : props.item.endTime

  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

function onResize(event: MouseEvent) {
  if (!isResizing.value || !resizeEdge.value) return

  const trackEl = document.querySelector('.timeline-track-container') as HTMLElement
  if (!trackEl) return

  const rect = trackEl.getBoundingClientRect()
  const deltaX = event.clientX - initialX.value
  const deltaPercentage = deltaX / rect.width
  const deltaTime = deltaPercentage * props.duration

  let newTime = initialTime.value + deltaTime
  newTime = Math.max(0, Math.min(newTime, props.duration))

  if (resizeEdge.value === 'start') {
    // Ensure start time doesn't exceed end time
    newTime = Math.min(newTime, props.item.endTime - 100) // Minimum 100ms
    emit('update', { startTime: newTime })
  } else {
    // Ensure end time doesn't precede start time
    newTime = Math.max(newTime, props.item.startTime + 100) // Minimum 100ms
    emit('update', { endTime: newTime })
  }
}

function stopResize() {
  isResizing.value = false
  resizeEdge.value = null
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <div
    class="timeline-subtitle-block absolute h-8 rounded cursor-pointer transition-colors"
    :class="[
      isSelected ? 'bg-blue-600' : 'bg-blue-400',
      isResizing ? 'cursor-ew-resize' : 'cursor-pointer'
    ]"
    :style="{ left, width }"
    @click="handleClick"
  >
    <!-- Left resize handle -->
    <div
      class="resize-handle resize-handle-left absolute left-0 top-0 bottom-0 w-2 cursor-w-resize"
      :class="isSelected ? 'hover:bg-blue-400/50' : 'hover:bg-blue-300/50'"
      @mousedown="(e) => startResize('start', e)"
    />

    <!-- Text content -->
    <div class="px-3 py-1 text-white text-xs truncate select-none">
      {{ truncatedText }}
    </div>

    <!-- Right resize handle -->
    <div
      class="resize-handle resize-handle-right absolute right-0 top-0 bottom-0 w-2 cursor-e-resize"
      :class="isSelected ? 'hover:bg-blue-400/50' : 'hover:bg-blue-300/50'"
      @mousedown="(e) => startResize('end', e)"
    />
  </div>
</template>

<style scoped>
.timeline-subtitle-block {
  top: 50%;
  transform: translateY(-50%);
}

.resize-handle {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.timeline-subtitle-block:hover .resize-handle,
.timeline-subtitle-block.bg-blue-600 .resize-handle {
  opacity: 1;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 12px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 1px;
}
</style>
