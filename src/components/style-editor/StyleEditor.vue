<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import { createAssStyle } from '../../core/models/AssStyle'
import type { AssStyle } from '../../core/models/AssStyle'
import { createStyleFromPreset } from '../preset-styles'
import { detectBilingualStyleRoles, type BilingualRole } from '../../utils/bilingualDetection'
import type { SubtitleItem } from '../../core/models/SubtitleItem'
import StyleList from './StyleList.vue'
import StyleForm from './StyleForm.vue'
import StylePreview from './StylePreview.vue'
import TrackPanel from './TrackPanel.vue'

const store = useSubtitleStore()

const selectedStyleName = ref<string | null>(null)
const editingStyle = ref<AssStyle | null>(null)
const manualRoleOverrides = ref<Record<string, BilingualRole | 'auto'>>({})
const selectedTrack = ref<number | null>(null)
const trackStyleBindings = ref<Record<number, string>>({})

// Watch for store styles changes
const projectStyles = computed(() => store.styles)
const playResX = computed(() => {
  const value = Number(store.currentFile?.scriptInfo?.PlayResX)
  return Number.isFinite(value) && value > 0 ? value : 1920
})
const playResY = computed(() => {
  const value = Number(store.currentFile?.scriptInfo?.PlayResY)
  return Number.isFinite(value) && value > 0 ? value : 1080
})
const autoStyleRoles = computed(() => detectBilingualStyleRoles(store.items, store.styles))
const resolvedStyleRoles = computed(() => {
  const resolved: Record<string, ReturnType<typeof detectBilingualStyleRoles>[string]> = {}
  for (const style of store.styles) {
    const auto = autoStyleRoles.value[style.name] ?? { role: 'neutral' as BilingualRole, confidence: 0, reason: '无可用信息' }
    const manual = manualRoleOverrides.value[style.name]
    if (manual && manual !== 'auto') {
      resolved[style.name] = {
        role: manual,
        confidence: 1,
        reason: '手动标记',
      }
    } else {
      resolved[style.name] = auto
    }
  }
  return resolved
})

const itemTrackMap = computed(() => {
  const map = new Map<string, number>()
  const styleOrder = new Map<string, number>()
  let nextTrack = 1

  for (const item of store.items) {
    const styleName = item.style || 'Default'
    if (!styleOrder.has(styleName)) {
      styleOrder.set(styleName, nextTrack++)
    }
    map.set(item.id, styleOrder.get(styleName)!)
  }

  return map
})

const trackSummaries = computed(() => {
  const byTrack = new Map<number, SubtitleItem[]>()
  for (const item of store.items) {
    const track = itemTrackMap.value.get(item.id)
    if (!track) continue
    if (!byTrack.has(track)) byTrack.set(track, [])
    byTrack.get(track)!.push(item)
  }

  const tracks = Array.from(byTrack.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([track, items]) => {
      const dominantStyle = items[0]?.style || store.styles[0]?.name || 'Default'
      return {
        track,
        itemCount: items.length,
        dominantStyle,
      }
    })

  return tracks
})

// Keep local editing state synced with store styles (including reload after structure fix).
watch(projectStyles, (styles) => {
  if (styles.length === 0) {
    selectedStyleName.value = null
    editingStyle.value = null
    return
  }

  const currentName = selectedStyleName.value
  const matched = currentName
    ? styles.find(style => style.name === currentName)
    : null

  if (matched) {
    editingStyle.value = { ...matched }
    return
  }

  selectedStyleName.value = styles[0].name
  editingStyle.value = { ...styles[0] }
}, { immediate: true })

watch(trackSummaries, (tracks) => {
  if (tracks.length > 0 && !selectedTrack.value) {
    selectedTrack.value = tracks[0].track
  }
  for (const track of tracks) {
    if (!trackStyleBindings.value[track.track]) {
      trackStyleBindings.value[track.track] = track.dominantStyle
    }
  }
}, { immediate: true })

// Update editing style when selection changes
watch(selectedStyleName, (name) => {
  if (name) {
    const style = store.styles.find(s => s.name === name)
    if (style) {
      editingStyle.value = { ...style }
    }
  }
})

function handleSelect(styleName: string) {
  selectedStyleName.value = styleName
}

function handleNew() {
  // Find a unique name
  let index = 1
  let name = 'New Style'
  while (store.styles.some(s => s.name === name)) {
    name = `New Style ${index}`
    index++
  }

  const newStyle = createAssStyle({ name })
  store.addStyle(newStyle)
  selectedStyleName.value = name
  editingStyle.value = { ...newStyle }
}

function handleCopy(styleName: string) {
  const style = store.styles.find(s => s.name === styleName)
  if (!style) return

  // Find a unique name
  let index = 1
  let name = `${style.name} Copy`
  while (store.styles.some(s => s.name === name)) {
    name = `${style.name} Copy ${index}`
    index++
  }

  const copiedStyle = createAssStyle({
    ...style,
    name,
  })
  store.addStyle(copiedStyle)
  selectedStyleName.value = name
  editingStyle.value = { ...copiedStyle }
}

function handleDelete(styleName: string) {
  store.removeStyle(styleName)
  if (selectedStyleName.value === styleName) {
    selectedStyleName.value = store.styles[0]?.name || null
    editingStyle.value = store.styles[0] ? { ...store.styles[0] } : null
  }
}

function handleApplyPreset(presetId: string) {
  const presetStyle = createStyleFromPreset(presetId)
  if (!presetStyle) return

  // Find a unique name
  let index = 1
  let name = presetStyle.name
  while (store.styles.some(s => s.name === name)) {
    name = `${presetStyle.name} ${index}`
    index++
  }

  const newStyle = createAssStyle({
    ...presetStyle,
    name,
  })
  store.addStyle(newStyle)
  selectedStyleName.value = name
  editingStyle.value = { ...newStyle }
}

function handleStyleUpdate(updatedStyle: AssStyle) {
  const previousName = selectedStyleName.value
  editingStyle.value = updatedStyle
  if (!previousName) return

  store.updateStyle(previousName, updatedStyle)

  if (updatedStyle.name !== previousName) {
    if (manualRoleOverrides.value[previousName]) {
      manualRoleOverrides.value[updatedStyle.name] = manualRoleOverrides.value[previousName]
      delete manualRoleOverrides.value[previousName]
    }
    selectedStyleName.value = updatedStyle.name
  }
}

function handleRoleChange(styleName: string, role: BilingualRole | 'auto') {
  manualRoleOverrides.value[styleName] = role
}

function handleTrackSelect(track: number) {
  selectedTrack.value = track
}

function handleTrackBindingUpdate(track: number, styleName: string) {
  trackStyleBindings.value[track] = styleName
}

function handleApplyTrackStyle(track: number) {
  const targetStyle = trackStyleBindings.value[track]
  if (!targetStyle) return
  store.items
    .filter(item => itemTrackMap.value.get(item.id) === track)
    .forEach(item => {
      store.updateItem(item.id, { style: targetStyle })
    })
}
</script>

<template>
  <div class="style-editor">
    <div class="editor-header">
      <h2 class="editor-title">样式编辑器</h2>
      <span class="editor-subtitle">{{ projectStyles.length }} 个样式</span>
    </div>

    <div class="editor-body">
      <!-- Left: Tracks -->
      <div class="editor-sidebar tracks-sidebar">
        <TrackPanel
          :tracks="trackSummaries"
          :selected-track="selectedTrack"
          :track-style-bindings="trackStyleBindings"
          :style-names="projectStyles.map(style => style.name)"
          @select="handleTrackSelect"
          @update-binding="handleTrackBindingUpdate"
          @apply-track="handleApplyTrackStyle"
        />
      </div>

      <!-- Middle: Style Library -->
      <div class="editor-sidebar styles-sidebar">
        <StyleList
          :styles="projectStyles"
          :selected-style-name="selectedStyleName"
          :style-roles="resolvedStyleRoles"
          :manual-role-overrides="manualRoleOverrides"
          @select="handleSelect"
          @new="handleNew"
          @copy="handleCopy"
          @delete="handleDelete"
          @apply-preset="handleApplyPreset"
          @role-change="handleRoleChange"
        />
      </div>

      <!-- Right: Form + Preview -->
      <div class="editor-content">
        <template v-if="editingStyle">
          <div class="content-split">
            <div class="form-section">
              <h3 class="section-title">样式设置</h3>
              <StyleForm
                :model-value="editingStyle"
                :play-res-x="playResX"
                :play-res-y="playResY"
                @update:model-value="handleStyleUpdate"
              />
            </div>
            <div class="preview-section">
              <h3 class="section-title">实时预览</h3>
              <StylePreview
                :style="editingStyle"
                :play-res-x="playResX"
                :play-res-y="playResY"
                preview-text="字幕预览文本\nSubtitle Preview"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <div class="empty-state">
            <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
            </svg>
            <p class="empty-text">暂无样式</p>
            <p class="empty-hint">点击左侧"新建"按钮创建样式</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.editor-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.editor-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: auto;
}

.editor-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.tracks-sidebar {
  width: 220px;
}

.styles-sidebar {
  width: 280px;
}

.editor-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

.content-split {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) minmax(360px, 440px);
  gap: 2rem;
  min-width: 940px;
  max-width: 1240px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.75rem;
  color: #9ca3af;
}

.empty-text {
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
}

.empty-hint {
  font-size: 0.875rem;
  color: #9ca3af;
}

@media (max-width: 1600px) {
  .editor-body {
    overflow-x: auto;
  }

  .content-split {
    grid-template-columns: 1fr;
    min-width: 0;
    max-width: none;
  }

  .preview-section {
    max-width: 520px;
  }
}

@media (max-width: 1200px) {
  .editor-body {
    flex-direction: column;
  }

  .editor-sidebar,
  .tracks-sidebar,
  .styles-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: 260px;
  }
}

@media (max-width: 900px) {
  .content-split {
    grid-template-columns: 1fr;
  }
}
</style>
