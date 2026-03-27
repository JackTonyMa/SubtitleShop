<script setup lang="ts">
export interface TrackSummary {
  track: number
  itemCount: number
  dominantStyle: string
  languageLabel: '中文' | '英文' | '中性'
  languageConfidence: number
}

const props = defineProps<{
  tracks: TrackSummary[]
  hiddenTrackCount: number
  selectedTrack: number | null
  trackStyleBindings: Record<number, string>
  styleNames: string[]
  presetOptions: Array<{ id: string; name: string }>
  hideLowShareTracks: boolean
}>()

const emit = defineEmits<{
  (e: 'select', track: number): void
  (e: 'updateBinding', track: number, value: string): void
  (e: 'updateHideLowShareTracks', value: boolean): void
}>()

function handleBindingChange(track: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('updateBinding', track, value)
}

function getBindingValue(track: TrackSummary): string {
  return props.trackStyleBindings[track.track] || track.dominantStyle
}

function getSelectValue(track: TrackSummary): string {
  const binding = getBindingValue(track)
  if (props.styleNames.includes(binding)) return `style:${binding}`
  return ''
}
</script>

<template>
  <div class="track-panel">
    <div class="panel-header">
      <span class="panel-title">轨道</span>
      <div class="panel-header-meta">
        <span class="panel-count">{{ tracks.length }}</span>
        <span v-if="hiddenTrackCount > 0" class="panel-hidden-note">已隐藏 {{ hiddenTrackCount }} 条</span>
      </div>
    </div>
    <label class="panel-toggle">
      <input
        type="checkbox"
        :checked="hideLowShareTracks"
        @change="emit('updateHideLowShareTracks', ($event.target as HTMLInputElement).checked)"
      />
      <span>仅显示占比 ≥ 10% 的轨道</span>
    </label>

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
        <div class="track-language">
          <span
            class="track-lang-badge"
            :class="{
              'lang-zh': track.languageLabel === '中文',
              'lang-en': track.languageLabel === '英文',
              'lang-neutral': track.languageLabel === '中性',
            }"
          >
            {{ track.languageLabel }}<template v-if="track.languageConfidence > 0"> {{ track.languageConfidence }}%</template>
          </span>
        </div>
        <div class="track-controls" @click.stop>
          <span class="track-control-label">样式</span>
          <select
            class="track-select"
            :value="getSelectValue(track)"
            @change="handleBindingChange(track.track, $event)"
          >
            <option
              v-if="!styleNames.includes(getBindingValue(track))"
              value=""
              disabled
            >
              {{ getBindingValue(track) }}
            </option>
            <optgroup label="内置样式">
              <option
                v-for="styleName in styleNames"
                :key="`style-${styleName}`"
                :value="`style:${styleName}`"
              >
                {{ styleName }}
              </option>
            </optgroup>
            <optgroup label="预设样式">
              <option
                v-for="preset in presetOptions"
                :key="`preset-${preset.id}`"
                :value="`preset:${preset.id}`"
              >
                {{ preset.name }}
              </option>
            </optgroup>
          </select>
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

.panel-header-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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

.panel-hidden-note {
  font-size: 0.68rem;
  color: #9a3412;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
}

.panel-empty {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.panel-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #4b5563;
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
  align-items: center;
  gap: 0.35rem;
}

.track-language {
  display: flex;
}

.track-lang-badge {
  font-size: 0.7rem;
  line-height: 1;
  border-radius: 999px;
  padding: 0.2rem 0.45rem;
  font-weight: 600;
}

.lang-zh {
  background: #dbeafe;
  color: #1d4ed8;
}

.lang-en {
  background: #dcfce7;
  color: #166534;
}

.lang-neutral {
  background: #f3f4f6;
  color: #4b5563;
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

.track-control-label {
  font-size: 0.72rem;
  color: #6b7280;
  white-space: nowrap;
}
</style>
