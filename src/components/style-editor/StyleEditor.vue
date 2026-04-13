<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import { createAssStyle } from '../../core/models/AssStyle'
import type { AssStyle } from '../../core/models/AssStyle'
import { createStyleFromPreset, PRESET_STYLES } from '../preset-styles'
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
const activePresetId = ref<string | null>(null)
const editorContentRef = ref<HTMLElement | null>(null)
const selectedTrack = ref<number | null>(null)
const trackStyleBindings = ref<Record<number, string>>({})
const hideLowShareTracks = ref(true)
const hideUnusedStyles = ref(true)
const renameDialogVisible = ref(false)
const renameSourceName = ref('')
const renameDraft = ref('')
const renameError = ref('')
const trackChangeConfirmVisible = ref(false)
const pendingTrackChange = ref<{ track: number; nextStyle: string } | null>(null)
const unsavedDialogVisible = ref(false)
let pendingAfterUnsavedDecision: (() => void) | null = null
let bypassUnsavedGuard = false
const PREVIEW_TEXT = '字幕预览文本\nSubtitle Preview'
const resolutionX = ref('1920')
const resolutionY = ref('1080')
const scaledBorderAndShadow = ref(true)
const resolutionMessage = ref('')
const resolutionConfirmVisible = ref(false)
const pendingResolutionAction = ref<{
  playResX: number
  playResY: number
  scaledBorderAndShadow: boolean
  resample: boolean
  styleChanged: number
  itemChanged: number
} | null>(null)

// Watch for store styles changes
const projectStyles = computed(() => {
  const list = [...store.styles]
  list.sort((a, b) => {
    const diff = (styleReferenceCounts.value[b.name] || 0) - (styleReferenceCounts.value[a.name] || 0)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name, 'zh-CN')
  })

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
      const languageMeta = inferTrackLanguageMeta(items)
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
const styleReferenceCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const style of store.styles) {
    counts[style.name] = 0
  }
  for (const item of store.items) {
    const name = item.style?.trim()
    if (!name) continue
    if (name in counts) {
      counts[name] += 1
    }
  }
  return counts
})
const hiddenUnusedStyleCount = computed(() => {
  if (!hideUnusedStyles.value) return 0
  let hidden = 0
  for (const style of store.styles) {
    if ((styleReferenceCounts.value[style.name] || 0) <= 0) hidden++
  }
  return hidden
})
const currentPreviewStyle = computed(() => previewPresetStyle.value ?? editingStyle.value)
const currentFormTitle = computed(() => (previewPresetStyle.value ? '预设预览（只读）' : '样式设置'))
const hasUnsavedChanges = computed(() => {
  if (previewPresetStyle.value) return false
  if (!selectedStyleName.value || !editingStyle.value) return false
  const current = store.styles.find(style => style.name === selectedStyleName.value)
  if (!current) return false
  return buildStyleSignature(current) !== buildStyleSignature(editingStyle.value)
})

function inferTrackLanguageMeta(
  items: SubtitleItem[]
): { label: '中文' | '英文' | '中性'; confidence: number } {
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

watch(
  () => store.currentFile?.scriptInfo,
  (scriptInfo) => {
    const playResX = Number.parseInt(scriptInfo?.PlayResX || '', 10)
    const playResY = Number.parseInt(scriptInfo?.PlayResY || '', 10)
    resolutionX.value = Number.isFinite(playResX) && playResX > 0 ? String(playResX) : '1920'
    resolutionY.value = Number.isFinite(playResY) && playResY > 0 ? String(playResY) : '1080'
    const scaled = (scriptInfo?.ScaledBorderAndShadow || '').toLowerCase()
    scaledBorderAndShadow.value = scaled ? scaled !== 'no' : true
  },
  { immediate: true }
)

function handleSelect(styleName: string) {
  if (styleName === selectedStyleName.value && !previewPresetStyle.value) return
  runWithUnsavedGuard(() => {
    previewPresetStyle.value = null
    previewPresetName.value = ''
    activePresetId.value = null
    selectedStyleName.value = styleName
  })
}

function handleNew() {
  runWithUnsavedGuard(() => {
    previewPresetStyle.value = null
    previewPresetName.value = ''
    activePresetId.value = null
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
  })
}

function handleCopy(styleName: string) {
  runWithUnsavedGuard(() => {
    previewPresetStyle.value = null
    previewPresetName.value = ''
    activePresetId.value = null
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
  })
}

function handleDelete(styleName: string) {
  runWithUnsavedGuard(() => {
    previewPresetStyle.value = null
    previewPresetName.value = ''
    activePresetId.value = null
    store.removeStyle(styleName)
    if (selectedStyleName.value === styleName) {
      selectedStyleName.value = store.styles[0]?.name || null
      editingStyle.value = store.styles[0] ? { ...store.styles[0] } : null
    }
  })
}

function handleRename(styleName: string) {
  previewPresetStyle.value = null
  previewPresetName.value = ''
  activePresetId.value = null
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
  activePresetId.value = null
  editingStyle.value = updatedStyle
}

function handleTrackSelect(track: number) {
  selectedTrack.value = track
  syncSelectedStyleByTrack(track)
}

function handleToggleHideLowShareTracks(value: boolean) {
  hideLowShareTracks.value = value
}

function handleToggleHideUnusedStyles(value: boolean) {
  hideUnusedStyles.value = value
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
  activePresetId.value = null
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
  if (selectedStyleName.value === candidate && !previewPresetStyle.value) return
  runWithUnsavedGuard(() => {
    previewPresetStyle.value = null
    previewPresetName.value = ''
    activePresetId.value = null
    selectedStyleName.value = candidate
  })
}

function handlePreviewPreset(presetId: string) {
  runWithUnsavedGuard(() => {
    const style = createStyleFromPreset(presetId)
    if (!style) return
    previewPresetStyle.value = style
    previewPresetName.value = style.name
    activePresetId.value = presetId
  })
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

function buildStyleSignature(style: AssStyle): string {
  return [
    style.name,
    buildStyleSignatureWithoutName(style),
  ].join('|')
}

function runWithUnsavedGuard(action: () => void) {
  if (bypassUnsavedGuard || !hasUnsavedChanges.value || previewPresetStyle.value) {
    action()
    return
  }
  pendingAfterUnsavedDecision = action
  unsavedDialogVisible.value = true
}

function closeUnsavedDialog() {
  unsavedDialogVisible.value = false
  pendingAfterUnsavedDecision = null
}

function executePendingAction() {
  const next = pendingAfterUnsavedDecision
  pendingAfterUnsavedDecision = null
  unsavedDialogVisible.value = false
  if (!next) return
  bypassUnsavedGuard = true
  try {
    next()
  } finally {
    bypassUnsavedGuard = false
  }
}

function saveCurrentStyle() {
  if (previewPresetStyle.value) return
  if (!selectedStyleName.value || !editingStyle.value) return
  const previousName = selectedStyleName.value
  store.updateStyle(previousName, editingStyle.value)
  if (editingStyle.value.name !== previousName) {
    selectedStyleName.value = editingStyle.value.name
  }
}

function handleSaveAndContinue() {
  saveCurrentStyle()
  executePendingAction()
}

function handleDiscardAndContinue() {
  if (selectedStyleName.value) {
    const source = store.styles.find(style => style.name === selectedStyleName.value)
    if (source) {
      editingStyle.value = { ...source }
    }
  }
  executePendingAction()
}

function applyResolution(resample: boolean) {
  runWithUnsavedGuard(() => {
    const nextX = Number.parseInt(resolutionX.value, 10)
    const nextY = Number.parseInt(resolutionY.value, 10)
    if (!Number.isFinite(nextX) || nextX <= 0 || !Number.isFinite(nextY) || nextY <= 0) {
      resolutionMessage.value = '分辨率需为正整数'
      return
    }

    const estimate = store.estimateResolutionImpact({
      playResX: nextX,
      playResY: nextY,
      resample,
    })
    if (!estimate.ok) {
      resolutionMessage.value = estimate.reason
      return
    }

    pendingResolutionAction.value = {
      playResX: nextX,
      playResY: nextY,
      scaledBorderAndShadow: scaledBorderAndShadow.value,
      resample,
      styleChanged: estimate.styleChanged,
      itemChanged: estimate.itemChanged,
    }
    resolutionConfirmVisible.value = true
  })
}

function closeResolutionConfirm() {
  resolutionConfirmVisible.value = false
  pendingResolutionAction.value = null
}

function submitResolutionConfirm() {
  const payload = pendingResolutionAction.value
  if (!payload) return

  const result = store.updateScriptResolution({
    playResX: payload.playResX,
    playResY: payload.playResY,
    scaledBorderAndShadow: payload.scaledBorderAndShadow,
    resample: payload.resample,
  })
  if (!result.ok) {
    resolutionMessage.value = result.reason
    closeResolutionConfirm()
    return
  }

    if (selectedStyleName.value) {
      const selected = store.styles.find(style => style.name === selectedStyleName.value)
      if (selected) editingStyle.value = { ...selected }
    }
    resolutionMessage.value = payload.resample
      ? `已重采样：样式 ${result.styleChanged} 条，字幕 ${result.itemChanged} 条`
      : '已更新脚本分辨率'
  closeResolutionConfirm()
}
</script>

<template>
  <div class="style-editor">
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
          :active-preset-id="activePresetId"
          :hide-unused-styles="hideUnusedStyles"
          :hidden-unused-style-count="hiddenUnusedStyleCount"
          :style-reference-counts="styleReferenceCounts"
          @select="handleSelect"
          @new="handleNew"
          @copy="handleCopy"
          @rename="handleRename"
          @delete="handleDelete"
          @preview-preset="handlePreviewPreset"
          @update-hide-unused-styles="handleToggleHideUnusedStyles"
        />
      </div>

      <!-- Right: Form -->
      <div ref="editorContentRef" class="editor-content">
        <template v-if="currentPreviewStyle">
          <div class="form-section">
            <div class="section-head">
              <h3 class="section-title">{{ currentFormTitle }}</h3>
              <button
                v-if="!previewPresetStyle && hasUnsavedChanges"
                class="save-btn"
                @click="saveCurrentStyle"
              >
                保存
              </button>
            </div>
            <div class="resolution-panel">
              <div class="resolution-row">
                <label class="resolution-field">
                  <span>PlayResX</span>
                  <input v-model="resolutionX" class="resolution-input" type="number" min="1" />
                </label>
                <label class="resolution-field">
                  <span>PlayResY</span>
                  <input v-model="resolutionY" class="resolution-input" type="number" min="1" />
                </label>
                <label class="resolution-toggle">
                  <input v-model="scaledBorderAndShadow" type="checkbox" />
                  <span>ScaledBorderAndShadow</span>
                </label>
              </div>
              <div class="resolution-actions">
                <button class="resolution-btn ghost" @click="applyResolution(false)">仅修改分辨率</button>
                <button class="resolution-btn primary" @click="applyResolution(true)">重采样到此分辨率</button>
              </div>
              <p v-if="resolutionMessage" class="resolution-message">{{ resolutionMessage }}</p>
            </div>
            <StyleForm
              :model-value="currentPreviewStyle"
              :play-res-x="playResX"
              :play-res-y="playResY"
              :readonly="!!previewPresetStyle"
              @update:model-value="handleStyleUpdate"
            />
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

      <!-- Far Right: Preview -->
      <div class="preview-sidebar">
        <template v-if="currentPreviewStyle">
          <div class="preview-pane">
            <div class="section-head">
              <h3 class="section-title">实时预览</h3>
            </div>
            <StylePreview
              :style="currentPreviewStyle"
              :play-res-x="playResX"
              :play-res-y="playResY"
              :preview-text="PREVIEW_TEXT"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
  <div v-if="unsavedDialogVisible" class="rename-overlay" @click.self="closeUnsavedDialog">
    <div class="rename-modal">
      <h4 class="rename-title">有未保存的样式修改</h4>
      <p class="rename-desc">切换前是否先保存当前样式？</p>
      <div class="rename-actions">
        <button class="rename-btn ghost" @click="closeUnsavedDialog">取消</button>
        <button class="rename-btn ghost" @click="handleDiscardAndContinue">不保存</button>
        <button class="rename-btn primary" @click="handleSaveAndContinue">保存并继续</button>
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
  <div v-if="resolutionConfirmVisible" class="rename-overlay" @click.self="closeResolutionConfirm">
    <div class="rename-modal">
      <h4 class="rename-title">{{ pendingResolutionAction?.resample ? '确认重采样分辨率' : '确认修改脚本分辨率' }}</h4>
      <p class="rename-desc">
        目标分辨率：{{ pendingResolutionAction?.playResX }} × {{ pendingResolutionAction?.playResY }}，
        ScaledBorderAndShadow: {{ pendingResolutionAction?.scaledBorderAndShadow ? 'yes' : 'no' }}
      </p>
      <p v-if="pendingResolutionAction?.resample" class="resolution-confirm-note">
        预计影响：样式 {{ pendingResolutionAction?.styleChanged }} 条，字幕 {{ pendingResolutionAction?.itemChanged }} 条
      </p>
      <p v-else class="resolution-confirm-note">
        仅更新脚本分辨率字段，不改写样式与字幕坐标。
      </p>
      <div class="rename-actions">
        <button class="rename-btn ghost" @click="closeResolutionConfirm">取消</button>
        <button class="rename-btn primary" @click="submitResolutionConfirm">确认应用</button>
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
  border-radius: 0.65rem;
  overflow: hidden;
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
  width: 190px;
  overflow-y: auto;
}

.styles-sidebar {
  width: 230px;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  padding: 1rem 0.75rem 0.85rem;
  border-right: 1px solid #e5e7eb;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-height: 2rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.save-btn {
  border: 1px solid #2563eb;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.62rem;
}

.resolution-panel {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 0.5rem;
  padding: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.resolution-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.resolution-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: #4b5563;
}

.resolution-input {
  width: 92px;
  border: 1px solid #d1d5db;
  border-radius: 0.35rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.75rem;
  color: #111827;
  background: #fff;
}

.resolution-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: #4b5563;
}

.resolution-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.resolution-btn {
  border: 1px solid #d1d5db;
  border-radius: 0.45rem;
  padding: 0.26rem 0.55rem;
  font-size: 0.72rem;
  color: #374151;
  background: #fff;
}

.resolution-btn.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.resolution-message {
  margin: 0;
  font-size: 0.72rem;
  color: #0369a1;
}

.resolution-confirm-note {
  margin: 0;
  font-size: 0.78rem;
  color: #374151;
}

.preview-sidebar {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  min-height: 0;
  padding: 1rem 0.75rem 0.85rem;
}

.preview-pane {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
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
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
}

.empty-hint {
  font-size: 0.8rem;
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

@media (max-width: 1200px) {
  .editor-body {
    flex-direction: column;
  }

  .editor-sidebar,
  .tracks-sidebar,
  .styles-sidebar,
  .preview-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: 260px;
  }

  .editor-content {
    border-right: none;
  }
}

@media (max-width: 900px) {
  .editor-content {
    padding: 0.85rem;
  }
}
</style>
