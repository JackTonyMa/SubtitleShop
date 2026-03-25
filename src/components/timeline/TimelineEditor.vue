<script setup lang="ts">
import { ref, computed } from 'vue'
import TimelineRuler from './TimelineRuler.vue'
import TimelineTrack from './TimelineTrack.vue'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

const props = withDefaults(defineProps<{
  duration?: number
  items?: SubtitleItem[]
}>(), {
  duration: 3600000, // 1 hour in ms
  items: () => []
})

const emit = defineEmits<{
  (e: 'seek', time: number): void
  (e: 'select', id: string, multi: boolean): void
  (e: 'update', id: string, updates: Partial<SubtitleItem>): void
}>()

// State
const zoomLevel = ref(1) // 1 = 100%, 2 = 200%, etc.
const currentTime = ref(0)
const isDraggingPlayhead = ref(false)

// Constants
const ZOOM_MIN = 0.5
const ZOOM_MAX = 5
const ZOOM_STEP = 0.5

// Computed
const zoomPercent = computed(() => `${Math.round(zoomLevel.value * 100)}%`)

// Methods
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, ZOOM_MAX)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, ZOOM_MIN)
}

function handleSeek(time: number) {
  currentTime.value = Math.max(0, Math.min(time, props.duration))
  emit('seek', currentTime.value)
}

function handleSelect(id: string, multi: boolean) {
  emit('select', id, multi)
}

function handleUpdate(id: string, updates: Partial<SubtitleItem>) {
  emit('update', id, updates)
}

// Playhead dragging
function startPlayheadDrag(event: MouseEvent) {
  isDraggingPlayhead.value = true
  updatePlayheadFromEvent(event)

  window.addEventListener('mousemove', onPlayheadDrag)
  window.addEventListener('mouseup', stopPlayheadDrag)
}

function onPlayheadDrag(event: MouseEvent) {
  if (!isDraggingPlayhead.value) return
  updatePlayheadFromEvent(event)
}

function stopPlayheadDrag() {
  isDraggingPlayhead.value = false
  window.removeEventListener('mousemove', onPlayheadDrag)
  window.removeEventListener('mouseup', stopPlayheadDrag)
}

function updatePlayheadFromEvent(event: MouseEvent) {
  const timelineEl = (event.target as HTMLElement).closest('.timeline-track-container') as HTMLElement
  if (!timelineEl) return

  const rect = timelineEl.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = x / rect.width
  const newTime = percentage * props.duration
  handleSeek(newTime)
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = Math.floor((ms % 1000) / 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="timeline-editor bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
    <!-- Header with controls -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-gray-700">时间轴</span>
        <div class="flex items-center gap-2">
          <button
            class="zoom-btn"
            @click="zoomOut"
            :disabled="zoomLevel <= ZOOM_MIN"
            title="缩小"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
            </svg>
          </button>
          <span class="text-xs text-gray-600 w-12 text-center">{{ zoomPercent }}</span>
          <button
            class="zoom-btn"
            @click="zoomIn"
            :disabled="zoomLevel >= ZOOM_MAX"
            title="放大"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="text-sm text-gray-600">
        当前时间: {{ formatTime(currentTime) }}
      </div>
    </div>

    <!-- Timeline content -->
    <div class="timeline-content relative">
      <!-- Ruler -->
      <TimelineRuler
        :duration="duration"
        :zoom="zoomLevel"
        @seek="handleSeek"
      />

      <!-- Track with playhead -->
      <div class="timeline-track-container relative h-32 bg-white">
        <!-- Grid lines -->
        <div class="absolute inset-0 pointer-events-none">
          <div
            v-for="i in Math.ceil(duration / 60000 * zoomLevel)"
            :key="i"
            class="absolute top-0 bottom-0 w-px bg-gray-100"
            :style="{ left: `${((i - 1) / (duration / 60000 * zoomLevel)) * 100}%` }"
          />
        </div>

        <!-- Subtitle blocks -->
        <TimelineTrack
          :items="items"
          :duration="duration"
          :zoom="zoomLevel"
          @select="handleSelect"
          @update="handleUpdate"
        />

        <!-- Playhead -->
        <div
          class="playhead absolute top-0 bottom-0 w-px bg-red-500 cursor-ew-resize z-20"
          :style="{ left: `${(currentTime / duration) * 100}%` }"
          @mousedown="startPlayheadDrag"
        >
          <!-- Playhead triangle -->
          <div class="absolute -top-1 -translate-x-1/2">
            <svg class="w-3 h-2 text-red-500" viewBox="0 0 12 8" fill="currentColor">
              <polygon points="6,0 12,8 0,8"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-editor {
  user-select: none;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background-color: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
}

.zoom-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.zoom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timeline-track-container {
  position: relative;
}

.playhead {
  transition: none;
}

.playhead:active {
  cursor: ew-resize;
}
</style>
</content>
