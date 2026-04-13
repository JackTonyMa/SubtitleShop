import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleFile } from '../core/models/SubtitleFile'
import type { SubtitleItem } from '../core/models/SubtitleItem'
import type { AssStyle } from '../core/models/AssStyle'
import { createSubtitleItem, createDefaultStyle, createAssStyle } from '../core/models'
import { HistoryManager } from '../core/history/HistoryManager'
import { AddSubtitleCommand, DeleteSubtitleCommand, UpdateSubtitleCommand } from '../core/history/commands'

export const useSubtitleStore = defineStore('subtitle', () => {
  // State
  const currentFile = ref<SubtitleFile | null>(null)
  const items = ref<SubtitleItem[]>([])
  const styles = ref<AssStyle[]>([])
  const selectedIds = ref<Set<string>>(new Set())
  const history = new HistoryManager()

  // Getters
  const hasFile = computed(() => currentFile.value !== null)

  const selectedItems = computed(() => {
    return items.value.filter(item => selectedIds.value.has(item.id))
  })

  const isSelected = computed(() => {
    return (id: string) => selectedIds.value.has(id)
  })

  const canUndo = computed(() => history.canUndo())
  const canRedo = computed(() => history.canRedo())

  // Actions
  function loadFile(file: SubtitleFile) {
    currentFile.value = file
    items.value = [...file.items]
    styles.value = file.styles.length > 0 ? [...file.styles] : [createDefaultStyle()]
    selectedIds.value.clear()
  }

  function unloadFile() {
    currentFile.value = null
    items.value = []
    styles.value = []
    selectedIds.value.clear()
  }

  function addItem(params: Omit<SubtitleItem, 'id'>) {
    const command = new AddSubtitleCommand({
      item: params,
      addFn: (item) => {
        const newItem = createSubtitleItem(item)
        items.value.push(newItem)
        items.value.sort((a, b) => a.startTime - b.startTime)
        return newItem
      },
      removeFn: (id: string) => {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
          items.value.splice(index, 1)
          selectedIds.value.delete(id)
        }
      }
    })
    return history.execute(command)
  }

  function removeItem(id: string) {
    const item = items.value.find(item => item.id === id)
    if (!item) return false

    const command = new DeleteSubtitleCommand({
      item,
      removeFn: (id: string) => {
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
          items.value.splice(index, 1)
          selectedIds.value.delete(id)
        }
      },
      addFn: (item) => {
        const newItem = createSubtitleItem(item)
        items.value.push(newItem)
        items.value.sort((a, b) => a.startTime - b.startTime)
        return newItem
      }
    })
    return history.execute(command)
  }

  function updateItem(id: string, updates: Partial<SubtitleItem>) {
    const item = items.value.find(item => item.id === id)
    if (!item) return false

    const normalizedUpdates: Partial<SubtitleItem> = { ...updates }
    if (
      'text' in normalizedUpdates &&
      !('assText' in normalizedUpdates) &&
      !('hasInlineOverrides' in normalizedUpdates)
    ) {
      normalizedUpdates.assText = undefined
      normalizedUpdates.hasInlineOverrides = false
    }

    const oldValues: Partial<SubtitleItem> = {}
    for (const key in normalizedUpdates) {
      if (key in item) {
        (oldValues as Record<string, unknown>)[key] = (item as Record<string, unknown>)[key]
      }
    }

    const command = new UpdateSubtitleCommand({
      id,
      oldValues,
      newValues: normalizedUpdates,
      updateFn: (id: string, updates: Partial<SubtitleItem>) => {
        const item = items.value.find(item => item.id === id)
        if (item) {
          Object.assign(item, updates)
        }
      },
      getItemFn: (id: string) => items.value.find(item => item.id === id)
    })
    return history.execute(command)
  }

  function selectItem(id: string, multi = false) {
    if (!multi) {
      selectedIds.value.clear()
    }
    selectedIds.value.add(id)
  }

  function deselectItem(id: string) {
    selectedIds.value.delete(id)
  }

  function clearSelection() {
    selectedIds.value.clear()
  }

  function undo() {
    return history.undo()
  }

  function redo() {
    return history.redo()
  }

  function deleteSelected() {
    const ids = Array.from(selectedIds.value)
    ids.forEach(id => removeItem(id))
    clearSelection()
  }

  function shiftTime(offset: number) {
    const ids = Array.from(selectedIds.value)
    ids.forEach(id => {
      const item = items.value.find(item => item.id === id)
      if (item) {
        updateItem(id, {
          startTime: Math.max(0, item.startTime + offset),
          endTime: Math.max(0, item.endTime + offset)
        })
      }
    })
  }

  function mergeSelected() {
    const selected = selectedItems.value
    if (selected.length < 2) return

    // Sort by start time
    selected.sort((a, b) => a.startTime - b.startTime)

    const first = selected[0]
    const last = selected[selected.length - 1]
    const mergedText = selected.map(s => s.text).join(' ')

    // Create merged item
    addItem({
      startTime: first.startTime,
      endTime: last.endTime,
      text: mergedText,
      style: first.style
    })

    // Delete original items
    selected.forEach(item => removeItem(item.id))
    clearSelection()
  }

  function duplicateSelected() {
    const selected = selectedItems.value
    clearSelection()

    const newIds: string[] = []

    selected.forEach(item => {
      // Create new item params
      const params = {
        startTime: item.startTime + 100,
        endTime: item.endTime + 100,
        text: item.text,
        style: item.style
      }

      const command = new AddSubtitleCommand({
        item: params,
        addFn: (item) => {
          const newItem = createSubtitleItem(item)
          items.value.push(newItem)
          items.value.sort((a, b) => a.startTime - b.startTime)
          newIds.push(newItem.id)
          return newItem
        },
        removeFn: (id: string) => {
          const index = items.value.findIndex(item => item.id === id)
          if (index !== -1) {
            items.value.splice(index, 1)
            selectedIds.value.delete(id)
          }
        }
      })
      history.execute(command)
    })

    // Select the newly created items
    newIds.forEach(id => selectItem(id, true))
  }

  function addStyle(style: AssStyle) {
    // Check for duplicate style names
    const existingIndex = styles.value.findIndex(s => s.name === style.name)
    if (existingIndex !== -1) {
      // Update existing style
      styles.value[existingIndex] = { ...style }
    } else {
      styles.value.push({ ...style })
    }
  }

  function removeStyle(name: string) {
    const index = styles.value.findIndex(style => style.name === name)
    if (index !== -1 && styles.value.length > 1) {
      // Don't remove the last style
      styles.value.splice(index, 1)
      // Update items that use this style to use the default style
      const defaultStyleName = styles.value[0].name
      items.value.forEach(item => {
        if (item.style === name) {
          item.style = defaultStyleName
        }
      })
    }
  }

  function updateStyle(name: string, updates: Partial<AssStyle>) {
    const style = styles.value.find(s => s.name === name)
    if (style) {
      const oldName = style.name
      Object.assign(style, updates)

      // Keep subtitle items linked when a style is renamed.
      if (updates.name && updates.name !== oldName) {
        items.value.forEach(item => {
          if (item.style === oldName) {
            item.style = updates.name
          }
        })
      }
    }
  }

  function renameStyle(oldName: string, nextNameRaw: string) {
    const nextName = nextNameRaw.trim()
    if (!nextName) {
      return { ok: false as const, reason: '样式名称不能为空' }
    }

    if (oldName === nextName) {
      return { ok: true as const, appliedName: nextName }
    }

    const exists = styles.value.some(style => style.name === nextName && style.name !== oldName)
    if (exists) {
      return { ok: false as const, reason: `样式名“${nextName}”已存在` }
    }

    const style = styles.value.find(s => s.name === oldName)
    if (!style) {
      return { ok: false as const, reason: '未找到要重命名的样式' }
    }

    style.name = nextName
    items.value.forEach(item => {
      if (item.style === oldName) {
        item.style = nextName
      }
    })

    return { ok: true as const, appliedName: nextName }
  }

  function applyStyleToAll(styleName: string) {
    const exists = styles.value.some(style => style.name === styleName)
    if (!exists) return 0

    let changedCount = 0
    items.value.forEach(item => {
      if (item.style !== styleName) {
        item.style = styleName
        changedCount++
      }
    })

    return changedCount
  }

  function batchReplaceText(findText: string, replaceText: string, onlySelected = false) {
    if (!findText) return 0

    const targets = onlySelected ? selectedItems.value : items.value
    let changedCount = 0

    for (const item of targets) {
      if (item.hasInlineOverrides && item.assText) {
        if (!item.assText.includes(findText)) continue
        const nextAssText = item.assText.split(findText).join(replaceText)
        if (nextAssText === item.assText) continue

        updateItem(item.id, {
          text: stripAssTags(nextAssText),
          assText: nextAssText,
          hasInlineOverrides: /{\\[^}]+}/.test(nextAssText),
        })
        changedCount++
        continue
      }

      if (!item.text.includes(findText)) continue
      const nextText = item.text.split(findText).join(replaceText)
      if (nextText === item.text) continue
      updateItem(item.id, { text: nextText })
      changedCount++
    }

    return changedCount
  }

  function splitBilingualLines(onlySelected = true) {
    const targetIdSet = new Set(
      (onlySelected ? selectedItems.value : items.value)
        .filter(item => hasAssLineBreak(item.assText || item.text))
        .map(item => item.id)
    )
    if (targetIdSet.size === 0) return 0

    const styleByName = new Map(styles.value.map(style => [style.name, style]))
    const existingStyleNames = new Set(styles.value.map(style => style.name))
    const nextStyles = [...styles.value]
    const nextItems: SubtitleItem[] = []
    let changedCount = 0

    for (const item of items.value) {
      if (!targetIdSet.has(item.id)) {
        nextItems.push(item)
        continue
      }

      const raw = item.assText || item.text
      const segments = splitAssByLineBreak(raw)
        .map(segment => segment.trim())
        .filter(Boolean)

      if (segments.length < 2) {
        nextItems.push(item)
        continue
      }

      const baseStyleName = (item.style && styleByName.has(item.style))
        ? item.style
        : (styles.value[0]?.name || 'Default')
      const baseStyle = styleByName.get(baseStyleName) || createDefaultStyle()

      const orderedSegments = [...segments].reverse()
      for (let index = 0; index < orderedSegments.length; index++) {
        const segment = orderedSegments[index]
        const plainSegmentText = stripAssTags(segment)
        const preferredBaseName = inferSplitStyleBaseName(plainSegmentText, baseStyleName, index)
        const resolvedStyleName = resolveOrCreateSplitStyleName(
          preferredBaseName,
          baseStyle,
          styleByName,
          existingStyleNames,
          nextStyles
        )

        nextItems.push(createSubtitleItem({
          layer: item.layer,
          startTime: item.startTime,
          endTime: item.endTime,
          text: plainSegmentText,
          style: resolvedStyleName,
          effect: item.effect,
          assText: undefined,
          hasInlineOverrides: false,
        }))
      }

      changedCount++
    }

    if (changedCount === 0) return 0

    items.value = nextItems.sort((a, b) => a.startTime - b.startTime)
    styles.value = nextStyles
    if (onlySelected) selectedIds.value.clear()
    return changedCount
  }

  function cleanChinesePunctuation(replacement: string, onlySelected = false) {
    const targets = onlySelected ? selectedItems.value : items.value
    let changedCount = 0

    for (const item of targets) {
      if (item.hasInlineOverrides && item.assText) {
        const nextAssText = replaceChinesePunctuationOutsideAssTags(item.assText, replacement)
        if (nextAssText === item.assText) continue
        updateItem(item.id, {
          text: stripAssTags(nextAssText),
          assText: nextAssText,
          hasInlineOverrides: /{\\[^}]+}/.test(nextAssText),
        })
        changedCount++
        continue
      }

      const nextText = replaceChinesePunctuation(item.text, replacement)
      if (nextText === item.text) continue
      updateItem(item.id, { text: nextText })
      changedCount++
    }

    return changedCount
  }

  function updateScriptResolution(params: {
    playResX: number
    playResY: number
    scaledBorderAndShadow: boolean
    resample: boolean
  }) {
    if (!currentFile.value) {
      return { ok: false as const, reason: '当前没有已加载文件', styleChanged: 0, itemChanged: 0 }
    }

    const nextX = Math.max(1, Math.round(params.playResX))
    const nextY = Math.max(1, Math.round(params.playResY))
    const scriptInfo = { ...(currentFile.value.scriptInfo || {}) }
    const prevX = parsePositiveInt(scriptInfo.PlayResX, 1920)
    const prevY = parsePositiveInt(scriptInfo.PlayResY, 1080)

    scriptInfo.PlayResX = String(nextX)
    scriptInfo.PlayResY = String(nextY)
    scriptInfo.ScaledBorderAndShadow = params.scaledBorderAndShadow ? 'yes' : 'no'

    let styleChanged = 0
    let itemChanged = 0
    const needResample = params.resample && (nextX !== prevX || nextY !== prevY)
    if (needResample) {
      const sx = nextX / prevX
      const sy = nextY / prevY
      const impact = estimateResolutionImpactWithScale(styles.value, items.value, sx, sy)
      styleChanged = impact.styleChanged
      itemChanged = impact.itemChanged
      styles.value = impact.nextStyles
      items.value = impact.nextItems
    }

    currentFile.value.scriptInfo = scriptInfo

    return {
      ok: true as const,
      styleChanged,
      itemChanged,
    }
  }

  function estimateResolutionImpact(params: {
    playResX: number
    playResY: number
    resample: boolean
  }) {
    if (!currentFile.value) {
      return { ok: false as const, reason: '当前没有已加载文件', styleChanged: 0, itemChanged: 0 }
    }
    const nextX = Math.max(1, Math.round(params.playResX))
    const nextY = Math.max(1, Math.round(params.playResY))
    const scriptInfo = currentFile.value.scriptInfo || {}
    const prevX = parsePositiveInt(scriptInfo.PlayResX, 1920)
    const prevY = parsePositiveInt(scriptInfo.PlayResY, 1080)

    if (!params.resample || (nextX === prevX && nextY === prevY)) {
      return { ok: true as const, styleChanged: 0, itemChanged: 0 }
    }

    const sx = nextX / prevX
    const sy = nextY / prevY
    const impact = estimateResolutionImpactWithScale(styles.value, items.value, sx, sy)
    return {
      ok: true as const,
      styleChanged: impact.styleChanged,
      itemChanged: impact.itemChanged,
    }
  }

  function getExportData(): Partial<SubtitleFile> {
    if (!currentFile.value) {
      return {}
    }

    return {
      id: currentFile.value.id,
      filename: currentFile.value.filename,
      format: currentFile.value.format,
      items: [...items.value],
      styles: [...styles.value],
      scriptInfo: currentFile.value.scriptInfo,
      updatedAt: Date.now(),
    }
  }

  return {
    // State
    currentFile,
    items,
    styles,
    selectedIds,
    // Getters
    hasFile,
    selectedItems,
    isSelected,
    canUndo,
    canRedo,
    // Actions
    loadFile,
    unloadFile,
    addItem,
    removeItem,
    updateItem,
    selectItem,
    deselectItem,
    clearSelection,
    addStyle,
    removeStyle,
    updateStyle,
    renameStyle,
    applyStyleToAll,
    batchReplaceText,
    splitBilingualLines,
    cleanChinesePunctuation,
    updateScriptResolution,
    estimateResolutionImpact,
    getExportData,
    undo,
    redo,
    deleteSelected,
    shiftTime,
    mergeSelected,
    duplicateSelected,
  }
})

function stripAssTags(text: string): string {
  return text.replace(/\{[^}]*\}/g, '').trim()
}

function hasAssLineBreak(text: string): boolean {
  return /\\N|\\n|\n/.test(text)
}

function splitAssByLineBreak(text: string): string[] {
  return text.split(/\\N|\\n|\n/g)
}

function createUniqueStyleName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) return baseName
  let index = 2
  let candidate = `${baseName}_${index}`
  while (existingNames.has(candidate)) {
    index++
    candidate = `${baseName}_${index}`
  }
  return candidate
}

function replaceChinesePunctuation(text: string, replacement: string): string {
  return text.replace(CHINESE_PUNCTUATION_REGEX, replacement)
}

function replaceChinesePunctuationOutsideAssTags(text: string, replacement: string): string {
  let inTag = false
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      inTag = true
      result += ch
      continue
    }
    if (ch === '}') {
      inTag = false
      result += ch
      continue
    }
    if (inTag) {
      result += ch
      continue
    }
    result += ch.replace(CHINESE_PUNCTUATION_REGEX, replacement)
  }

  return result
}

const CHINESE_PUNCTUATION_REGEX = /[，。！？；：、“”‘’（）【】《》〈〉「」『』〔〕…—～·]/g

function inferSplitStyleBaseName(text: string, fallbackBaseName: string, segmentIndex: number): string {
  const cjkCount = (text.match(/[\u3400-\u9fff]/g) || []).length
  const latinCount = (text.match(/[A-Za-z]/g) || []).length

  if (cjkCount > latinCount) return 'CHS'
  if (latinCount > cjkCount) return 'ENG'
  if (latinCount > 0) return 'ENG'
  if (cjkCount > 0) return 'CHS'
  return `${fallbackBaseName}_split_${segmentIndex + 1}`
}

function findStyleNameCaseInsensitive(styleByName: Map<string, AssStyle>, name: string): string | null {
  if (styleByName.has(name)) return name
  const lower = name.toLowerCase()
  for (const styleName of styleByName.keys()) {
    if (styleName.toLowerCase() === lower) return styleName
  }
  return null
}

function resolveOrCreateSplitStyleName(
  preferredBaseName: string,
  baseStyle: AssStyle,
  styleByName: Map<string, AssStyle>,
  existingStyleNames: Set<string>,
  nextStyles: AssStyle[]
): string {
  const existingName = findStyleNameCaseInsensitive(styleByName, preferredBaseName)
  if (existingName) return existingName

  const nextName = createUniqueStyleName(preferredBaseName, existingStyleNames)
  existingStyleNames.add(nextName)
  const nextStyle = createAssStyle({
    ...baseStyle,
    name: nextName,
  })
  nextStyles.push(nextStyle)
  styleByName.set(nextName, nextStyle)
  return nextName
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw || '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function roundInt(value: number): number {
  return Math.max(0, Math.round(value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function formatScaledNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  const asText = String(rounded)
  return asText.includes('.') ? asText.replace(/\.?0+$/, '') : asText
}

function scaleAssNumber(raw: string, scale: number): string {
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return raw
  return formatScaledNumber(parsed * scale)
}

function scaleStyleForResolution(style: AssStyle, sx: number, sy: number): AssStyle {
  return {
    ...style,
    fontSize: round2(style.fontSize * sy),
    spacing: round2(style.spacing * sx),
    outline: round2(style.outline * sy),
    shadow: round2(style.shadow * sy),
    marginL: roundInt(style.marginL * sx),
    marginR: roundInt(style.marginR * sx),
    marginV: roundInt(style.marginV * sy),
  }
}

function isSameStyle(a: AssStyle, b: AssStyle): boolean {
  return [
    a.name === b.name,
    a.fontName === b.fontName,
    a.fontSize === b.fontSize,
    a.primaryColor === b.primaryColor,
    a.secondaryColor === b.secondaryColor,
    a.outlineColor === b.outlineColor,
    a.backColor === b.backColor,
    a.bold === b.bold,
    a.italic === b.italic,
    a.underline === b.underline,
    a.strikeOut === b.strikeOut,
    a.scaleX === b.scaleX,
    a.scaleY === b.scaleY,
    a.spacing === b.spacing,
    a.angle === b.angle,
    a.borderStyle === b.borderStyle,
    a.outline === b.outline,
    a.shadow === b.shadow,
    a.alignment === b.alignment,
    a.marginL === b.marginL,
    a.marginR === b.marginR,
    a.marginV === b.marginV,
    a.encoding === b.encoding,
  ].every(Boolean)
}

function scaleItemForResolution(item: SubtitleItem, sx: number, sy: number): SubtitleItem {
  if (!item.assText || !item.hasInlineOverrides) return item
  const nextAssText = scaleAssOverrideCoordinates(item.assText, sx, sy)
  if (nextAssText === item.assText) return item
  return {
    ...item,
    assText: nextAssText,
    text: stripAssTags(nextAssText),
    hasInlineOverrides: /{\\[^}]+}/.test(nextAssText),
  }
}

function estimateResolutionImpactWithScale(styles: AssStyle[], items: SubtitleItem[], sx: number, sy: number) {
  let styleChanged = 0
  let itemChanged = 0

  const nextStyles = styles.map((style) => {
    const nextStyle = scaleStyleForResolution(style, sx, sy)
    if (isSameStyle(style, nextStyle)) return style
    styleChanged += 1
    return nextStyle
  })

  const nextItems = items.map((item) => {
    const nextItem = scaleItemForResolution(item, sx, sy)
    if (nextItem === item) return item
    itemChanged += 1
    return nextItem
  })

  return {
    nextStyles,
    nextItems,
    styleChanged,
    itemChanged,
  }
}

function scaleAssOverrideCoordinates(text: string, sx: number, sy: number): string {
  let next = text

  next = next.replace(
    /\\pos\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)/gi,
    (_m, x, y) => `\\pos(${scaleAssNumber(x, sx)},${scaleAssNumber(y, sy)})`
  )
  next = next.replace(
    /\\org\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)/gi,
    (_m, x, y) => `\\org(${scaleAssNumber(x, sx)},${scaleAssNumber(y, sy)})`
  )
  next = next.replace(
    /\\move\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*\)/gi,
    (_m, x1, y1, x2, y2, t1, t2) =>
      `\\move(${scaleAssNumber(x1, sx)},${scaleAssNumber(y1, sy)},${scaleAssNumber(x2, sx)},${scaleAssNumber(y2, sy)},${t1},${t2})`
  )
  next = next.replace(
    /\\move\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)/gi,
    (_m, x1, y1, x2, y2) =>
      `\\move(${scaleAssNumber(x1, sx)},${scaleAssNumber(y1, sy)},${scaleAssNumber(x2, sx)},${scaleAssNumber(y2, sy)})`
  )

  next = next.replace(
    /\\(i?clip)\(\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\s*\)/gi,
    (_m, tag, x1, y1, x2, y2) =>
      `\\${tag}(${scaleAssNumber(x1, sx)},${scaleAssNumber(y1, sy)},${scaleAssNumber(x2, sx)},${scaleAssNumber(y2, sy)})`
  )

  next = next.replace(/\\(i?clip)\(([^)]*)\)/gi, (all, tag, args) => {
    if (/^\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*$/.test(args)) {
      return all
    }
    const trimmed = String(args).trim()
    const comma = trimmed.indexOf(',')
    if (comma > 0 && /^\d+$/.test(trimmed.slice(0, comma).trim())) {
      const scalePrefix = trimmed.slice(0, comma).trim()
      const drawing = trimmed.slice(comma + 1).trim()
      return `\\${tag}(${scalePrefix},${scaleAssDrawingPath(drawing, sx, sy)})`
    }
    return `\\${tag}(${scaleAssDrawingPath(trimmed, sx, sy)})`
  })

  next = next.replace(/\\fs\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\fs${scaleAssNumber(n, sy)}`)
  next = next.replace(/\\fsp\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\fsp${scaleAssNumber(n, sx)}`)
  next = next.replace(/\\bord\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\bord${scaleAssNumber(n, sy)}`)
  next = next.replace(/\\xbord\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\xbord${scaleAssNumber(n, sx)}`)
  next = next.replace(/\\ybord\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\ybord${scaleAssNumber(n, sy)}`)
  next = next.replace(/\\shad\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\shad${scaleAssNumber(n, sy)}`)
  next = next.replace(/\\xshad\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\xshad${scaleAssNumber(n, sx)}`)
  next = next.replace(/\\yshad\s*([-+]?\d*\.?\d+)/gi, (_m, n) => `\\yshad${scaleAssNumber(n, sy)}`)

  return next
}

function scaleAssDrawingPath(path: string, sx: number, sy: number): string {
  if (!path.trim()) return path
  const commandToken = /^[mnlbspc]$/i
  const numberToken = /^[-+]?\d*\.?\d+$/
  const tokens = path.trim().split(/\s+/)
  const out: string[] = []
  let pairIndex = 0

  for (const token of tokens) {
    if (commandToken.test(token)) {
      out.push(token)
      pairIndex = 0
      continue
    }
    if (!numberToken.test(token)) {
      out.push(token)
      continue
    }

    const scale = pairIndex % 2 === 0 ? sx : sy
    out.push(scaleAssNumber(token, scale))
    pairIndex += 1
  }

  return out.join(' ')
}
