<script setup lang="ts">
export interface TrackSummary {
  track: number
  itemCount: number
  dominantStyle: string
}

const props = defineProps<{
  tracks: TrackSummary[]
  selectedTrack: number | null
  trackStyleBindings: Record<number, string>
  styleNames: string[]
}>()

const emit = defineEmits<{
  (e: 'select', track: number): void
  (e: 'updateBinding', track: number, styleName: string): void
  (e: 'applyTrack', track: number): void
}>()

function handleBindingChange(track: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('updateBinding', track, value)
}

function getBindingValue(track: TrackSummary): string {
  return props.trackStyleBindings[track.track] || track.dominantStyle
}
</script>

<template>
  <div class="track-panel">
    <div class="panel-header">
      <span class="panel-title">轨道</span>
      <span class="panel-count">{{ tracks.length }}</span>
    </div>

    <div v-if="tracks.length === 0" class="panel-empty">
      当前文件暂无可识别轨道
    </div>

    <div v-else class="track-list">
      <button
        v-for="track in tracks"
        :key="track.track"
        class="track-item"
        :class="{ active: selectedTrack === track.track }"
        @click="$emit('select', track.track)"
      >
        <div class="track-main">
          <span class="track-name">轨道 {{ track.track }}</span>
          <span class="track-meta">{{ track.itemCount }} 条</span>
        </div>
        <div class="track-controls" @click.stop>
          <select
            class="track-select"
            :value="getBindingValue(track)"
            @change="handleBindingChange(track.track, $event)"
          >
            <option
              v-if="!styleNames.includes(getBindingValue(track))"
              :value="getBindingValue(track)"
              disabled
            >
              {{ getBindingValue(track) }}
            </option>
            <option
              v-for="styleName in styleNames"
              :key="styleName"
              :value="styleName"
            >
              {{ styleName }}
            </option>
          </select>
          <button
            class="track-apply"
            @click="$emit('applyTrack', track.track)"
          >
            应用
          </button>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.track-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.panel-count {
  font-size: 0.75rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.panel-empty {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.track-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: white;
  padding: 0.625rem;
  text-align: left;
}

.track-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.track-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1f2937;
}

.track-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.track-controls {
  display: flex;
  gap: 0.375rem;
}

.track-select {
  flex: 1;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.3rem;
  background: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.375rem;
}

.track-apply {
  border: 1px solid #2563eb;
  color: white;
  background: #2563eb;
  border-radius: 0.3rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  white-space: nowrap;
}
</style>
