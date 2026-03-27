<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import { createAssStyle } from '../../core/models/AssStyle'
import type { AssStyle } from '../../core/models/AssStyle'
import { createStyleFromPreset, PRESET_STYLES } from '../preset-styles'
import { detectBilingualStyleRoles } from '../../utils/bilingualDetection'
import type { SubtitleItem } from '../../core/models/SubtitleItem'
import StyleList from './StyleList.vue'
import StyleForm from './StyleForm.vue'
import StylePreview from './StylePreview.vue'
import TrackPanel from './TrackPanel.vue'

const store = useSubtitleStore()
const UNIFIED_STYLE_PLACEHOLDER = '无统一样式'

const selectedStyleName = ref<string | null>(null)
const pinnedStyleName = ref<string | null>(null)
const editingStyle = ref<AssStyle | null>(null)
const previewPresetStyle = ref<AssStyle | null>(null)
const previewPresetName = ref('')
const editorContentRef = ref<HTMLElement | null>(null)
const selectedTrack = ref<number | null>(null)
const trackStyleBindings = ref<Record<number, string>>({})
const hideLowShareTracks = ref(true)
const renameDialogVisible = ref(false)
const renameSourceName = ref('')
const renameDraft = ref('')
const renameError = ref('')
const trackChangeConfirmVisible = ref(false)
const pendingTrackChange = ref<{ track: number; nextStyle: string } | null>(null)

// Watch for store styles changes
const projectStyles = computed(() => {
  const list = [...store.styles]
  const pinned = pinnedStyleName.value
  if (!pinned) return list

  const index = list.findIndex(style => style.name === pinned)
  if (index <= 0) return list
  const [hit] = list.splice(index, 1)
  return [hit, ...list]
})
const playResX = computed(() => {
  const value = Number(store.currentFile?.scriptInfo?.PlayResX)
  return Number.isFinite(value) && value > 0 ? value : 1920
})
const playResY = computed(() => {
  const value = Number(store.currentFile?.scriptInfo?.PlayResY)
  return Number.isFinite(value) && value > 0 ? value : 1080
})
const presetOptions = computed(() => PRESET_STYLES.map(preset => ({
  id: preset.id,
  name: preset.name,
})))
const resolvedStyleRoles = computed(() => detectBilingualStyleRoles(store.items, store.styles))
const validStyleNameSet = computed(() => new Set(store.styles.map(style => style.name)))

const itemTrackMap = computed(() => {
  const map = new Map<string, number>()
  const styleOrder = new Map<string, number>()
  let nextTrack = 1

  for (const item of store.items) {
    const styleName = item.style?.trim() && validStyleNameSet.value.has(item.style)
      ? item.style
      : UNIFIED_STYLE_PLACEHOLDER
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
    .map(([track, items]) => {
      const firstStyle = items[0]?.style?.trim() || ''
      const dominantStyle = firstStyle && validStyleNameSet.value.has(firstStyle)
        ? firstStyle
        : UNIFIED_STYLE_PLACEHOLDER
      const languageMeta = inferTrackLanguageMeta(items, dominantStyle)
      return {
        track,
        itemCount: items.length,
        dominantStyle,
        languageLabel: languageMeta.label,
        languageConfidence: languageMeta.confidence,
      }
    })
    .sort((a, b) => {
      if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount
      return a.track - b.track
    })

  return tracks
})

const visibleTrackSummaries = computed(() => {
  if (!hideLowShareTracks.value) return trackSummaries.value
  const total = Math.max(store.items.length, 1)
  return trackSummaries.value.filter(track => (track.itemCount / total) >= 0.1)
})

const hiddenTrackCount = computed(() => {
  const hidden = trackSummaries.value.length - visibleTrackSummaries.value.length
  return hidden > 0 ? hidden : 0
})

function inferTrackLanguageMeta(
  items: SubtitleItem[],
  dominantStyle: string
): { label: '中文' | '英文' | '中性'; confidence: number } {
  if (dominantStyle !== UNIFIED_STYLE_PLACEHOLDER) {
    const roleInfo = resolvedStyleRoles.value[dominantStyle]
    if (roleInfo?.role === 'primary') {
      return { label: '中文', confidence: Math.round(roleInfo.confidence * 100) }
    }
    if (roleInfo?.role === 'secondary') {
      return { label: '英文', confidence: Math.round(roleInfo.confidence * 100) }
    }
  }

  let cjkCount = 0
  let latinCount = 0
  for (const item of items) {
    const text = item.text || ''
    const hasCjk = /[\u3400-\u9fff]/.test(text)
    const hasLatin = /[A-Za-z]/.test(text)
    if (hasCjk) cjkCount++
    if (hasLatin) latinCount++
  }

  const total = cjkCount + latinCount
  if (total === 0) return { label: '中性', confidence: 0 }
  if (cjkCount >= latinCount) {
    return { label: '中文', confidence: Math.round((cjkCount / total) * 100) }
  }
  return { label: '英文', confidence: Math.round((latinCount / total) * 100) }
}

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
  if (tracks.length === 0) {
    selectedTrack.value = null
    trackStyleBindings.value = {}
    return
  }

  const nextBindings: Record<number, string> = {}
  for (const track of tracks) {
    const current = trackStyleBindings.value[track.track]
    nextBindings[track.track] = current && store.styles.some(style => style.name === current)
      ? current
      : track.dominantStyle
  }
  trackStyleBindings.value = nextBindings

  const hasSelectedTrack = selectedTrack.value !== null
    && visibleTrackSummaries.value.some(track => track.track === selectedTrack.value)
  if (!hasSelectedTrack) {
    selectedTrack.value = visibleTrackSummaries.value[0]?.track ?? null
  }
}, { immediate: true })

watch(visibleTrackSummaries, (tracks) => {
  if (tracks.length === 0) {
    selectedTrack.value = null
    return
  }
  const exists = selectedTrack.value !== null && tracks.some(track => track.track === selectedTrack.value)
  if (!exists) {
    selectedTrack.value = tracks[0].track
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

watch(
  () => [selectedStyleName.value, previewPresetName.value],
  async () => {
    await nextTick()
    if (editorContentRef.value) {
      editorContentRef.value.scrollTop = 0
    }
  }
)

function handleSelect(styleName: string) {
  previewPresetStyle.value = null
  previewPresetName.value = ''
  selectedStyleName.value = styleName
}

function handleNew() {
  previewPresetStyle.value = null
  previewPresetName.value = ''
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
  previewPresetStyle.value = null
  previewPresetName.value = ''
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
  previewPresetStyle.value = null
  previewPresetName.value = ''
  store.removeStyle(styleName)
  if (selectedStyleName.value === styleName) {
    selectedStyleName.value = store.styles[0]?.name || null
    editingStyle.value = store.styles[0] ? { ...store.styles[0] } : null
  }
}

function handleRename(styleName: string) {
  previewPresetStyle.value = null
  previewPresetName.value = ''
  renameSourceName.value = styleName
  renameDraft.value = styleName
  renameError.value = ''
  renameDialogVisible.value = true
}

function closeRenameDialog() {
  renameDialogVisible.value = false
  renameSourceName.value = ''
  renameDraft.value = ''
  renameError.value = ''
}

function submitRenameDialog() {
  const result = store.renameStyle(renameSourceName.value, renameDraft.value)
  if (!result.ok) {
    renameError.value = result.reason
    return
  }

  if (result.appliedName) {
    selectedStyleName.value = result.appliedName
    const updated = store.styles.find(style => style.name === result.appliedName)
    if (updated) {
      editingStyle.value = { ...updated }
    }
  }
  closeRenameDialog()
}

function handleStyleUpdate(updatedStyle: AssStyle) {
  previewPresetStyle.value = null
  previewPresetName.value = ''
  const previousName = selectedStyleName.value
  editingStyle.value = updatedStyle
  if (!previousName) return

  store.updateStyle(previousName, updatedStyle)

  if (updatedStyle.name !== previousName) {
    selectedStyleName.value = updatedStyle.name
  }
}

function handleTrackSelect(track: number) {
  selectedTrack.value = track
  syncSelectedStyleByTrack(track)
}

function handleToggleHideLowShareTracks(value: boolean) {
  hideLowShareTracks.value = value
}

function handleTrackBindingUpdate(track: number, value: string) {
  const currentStyle = getCurrentTrackAppliedStyle(track)
  let nextStyleName = ''

  if (value.startsWith('style:')) {
    nextStyleName = value.slice('style:'.length)
  }
  if (!nextStyleName && value.startsWith('preset:')) {
    const presetId = value.slice('preset:'.length)
    const importedStyleName = ensurePresetStyle(presetId)
    if (importedStyleName) {
      nextStyleName = importedStyleName
    }
  }
  if (!nextStyleName) return
  if (currentStyle === nextStyleName) return

  pendingTrackChange.value = { track, nextStyle: nextStyleName }
  trackChangeConfirmVisible.value = true
}

function handleApplyTrackStyle(track: number) {
  const targetStyle = trackStyleBindings.value[track]
  if (!targetStyle) return
  if (!store.styles.some(style => style.name === targetStyle)) return
  store.items
    .filter(item => itemTrackMap.value.get(item.id) === track)
    .forEach(item => {
      store.updateItem(item.id, { style: targetStyle })
    })
}

function getCurrentTrackAppliedStyle(track: number): string {
  const bound = trackStyleBindings.value[track]
  if (bound && store.styles.some(style => style.name === bound)) {
    return bound
  }
  const summary = trackSummaries.value.find(item => item.track === track)
  if (!summary) return ''
  return store.styles.some(style => style.name === summary.dominantStyle)
    ? summary.dominantStyle
    : ''
}

function closeTrackChangeConfirm() {
  trackChangeConfirmVisible.value = false
  pendingTrackChange.value = null
}

function submitTrackChangeConfirm() {
  const payload = pendingTrackChange.value
  if (!payload) return
  trackStyleBindings.value[payload.track] = payload.nextStyle
  pinnedStyleName.value = payload.nextStyle
  previewPresetStyle.value = null
  previewPresetName.value = ''
  selectedStyleName.value = payload.nextStyle
  handleApplyTrackStyle(payload.track)
  closeTrackChangeConfirm()
}

function syncSelectedStyleByTrack(track: number) {
  const summary = trackSummaries.value.find(item => item.track === track)
  if (!summary) return

  const boundStyle = trackStyleBindings.value[track]
  const candidate = (boundStyle && store.styles.some(style => style.name === boundStyle))
    ? boundStyle
    : summary.dominantStyle

  if (!candidate || !store.styles.some(style => style.name === candidate)) return
  pinnedStyleName.value = candidate
  previewPresetStyle.value = null
  previewPresetName.value = ''
  selectedStyleName.value = candidate
}

function handlePreviewPreset(presetId: string) {
  const style = createStyleFromPreset(presetId)
  if (!style) return
  previewPresetStyle.value = style
  previewPresetName.value = style.name
}

function ensurePresetStyle(presetId: string): string | null {
  const presetStyle = createStyleFromPreset(presetId)
  if (!presetStyle) return null

  const signature = buildStyleSignatureWithoutName(presetStyle)
  const existingBySignature = store.styles.find(style => buildStyleSignatureWithoutName(style) === signature)
  if (existingBySignature) return existingBySignature.name

  let nextName = presetStyle.name
  let index = 2
  while (store.styles.some(style => style.name === nextName)) {
    nextName = `${presetStyle.name}_${index}`
    index++
  }

  const newStyle = createAssStyle({
    ...presetStyle,
    name: nextName,
  })
  store.addStyle(newStyle)
  return nextName
}

function buildStyleSignatureWithoutName(style: Omit<AssStyle, 'name'> | AssStyle): string {
  return [
    style.fontName,
    style.fontSize,
    style.primaryColor,
    style.secondaryColor,
    style.outlineColor,
    style.backColor,
    style.bold ? 1 : 0,
    style.italic ? 1 : 0,
    style.underline ? 1 : 0,
    style.strikeOut ? 1 : 0,
    style.scaleX,
    style.scaleY,
    style.spacing,
    style.angle,
    style.borderStyle,
    style.outline,
    style.shadow,
    style.alignment,
    style.marginL,
    style.marginR,
    style.marginV,
    style.encoding,
  ].join('|')
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
          :tracks="visibleTrackSummaries"
          :hidden-track-count="hiddenTrackCount"
          :selected-track="selectedTrack"
          :track-style-bindings="trackStyleBindings"
          :style-names="projectStyles.map(style => style.name)"
          :preset-options="presetOptions"
          :hide-low-share-tracks="hideLowShareTracks"
          @select="handleTrackSelect"
          @update-binding="handleTrackBindingUpdate"
          @update-hide-low-share-tracks="handleToggleHideLowShareTracks"
        />
      </div>

      <!-- Middle: Style Library -->
      <div class="editor-sidebar styles-sidebar">
        <StyleList
          :styles="projectStyles"
          :selected-style-name="selectedStyleName"
          :style-roles="resolvedStyleRoles"
          @select="handleSelect"
          @new="handleNew"
          @copy="handleCopy"
          @rename="handleRename"
          @delete="handleDelete"
          @preview-preset="handlePreviewPreset"
        />
      </div>

      <!-- Right: Form + Preview -->
      <div ref="editorContentRef" class="editor-content">
        <template v-if="previewPresetStyle">
          <div class="content-split">
            <div class="form-section">
              <h3 class="section-title">预设预览（只读）</h3>
              <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {{ previewPresetName }}
              </div>
              <StyleForm
                :model-value="previewPresetStyle"
                :play-res-x="playResX"
                :play-res-y="playResY"
                :readonly="true"
              />
            </div>
            <div class="preview-section">
              <h3 class="section-title">实时预览</h3>
              <StylePreview
                :style="previewPresetStyle"
                :play-res-x="playResX"
                :play-res-y="playResY"
                preview-text="字幕预览文本\nSubtitle Preview"
              />
            </div>
          </div>
        </template>
        <template v-else-if="editingStyle">
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
  <div v-if="renameDialogVisible" class="rename-overlay" @click.self="closeRenameDialog">
    <div class="rename-modal">
      <h4 class="rename-title">重命名样式</h4>
      <p class="rename-desc">当前：{{ renameSourceName }}</p>
      <input
        v-model="renameDraft"
        class="rename-input"
        type="text"
        placeholder="输入新的样式名称"
        @keydown.enter.prevent="submitRenameDialog"
      />
      <p v-if="renameError" class="rename-error">{{ renameError }}</p>
      <div class="rename-actions">
        <button class="rename-btn ghost" @click="closeRenameDialog">取消</button>
        <button class="rename-btn primary" @click="submitRenameDialog">确认重命名</button>
      </div>
    </div>
  </div>
  <div v-if="trackChangeConfirmVisible" class="rename-overlay" @click.self="closeTrackChangeConfirm">
    <div class="rename-modal">
      <h4 class="rename-title">确认变更轨道样式</h4>
      <p class="rename-desc">
        是否将轨道 {{ pendingTrackChange?.track }} 的字幕样式变更为
        {{ pendingTrackChange?.nextStyle }}？
      </p>
      <div class="rename-actions">
        <button class="rename-btn ghost" @click="closeTrackChangeConfirm">取消</button>
        <button class="rename-btn primary" @click="submitTrackChangeConfirm">确认变更</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-editor {
  display: flex;
  flex-direction: column;
  height: min(78vh, 900px);
  min-height: 560px;
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
  overflow: hidden;
  min-height: 0;
}

.editor-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  min-height: 0;
}

.tracks-sidebar {
  width: 220px;
  overflow-y: auto;
}

.styles-sidebar {
  width: 280px;
  display: flex;
  overflow: hidden;
  min-height: 0;
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

.rename-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.rename-modal {
  width: min(420px, 94vw);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.rename-title {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.rename-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
}

.rename-input {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.875rem;
  color: #111827;
}

.rename-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.8rem;
}

.rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.rename-btn {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8125rem;
}

.rename-btn.ghost {
  border-color: #d1d5db;
  background: #fff;
  color: #374151;
}

.rename-btn.primary {
  background: #2563eb;
  color: #fff;
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
