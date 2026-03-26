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
    const styleSignatureToName = new Map<string, string>()
    for (const style of styles.value) {
      styleSignatureToName.set(buildStyleSignature(style), style.name)
    }

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
      const baseSignature = buildStyleSignature(baseStyle)

      const orderedSegments = [...segments].reverse()
      for (let index = 0; index < orderedSegments.length; index++) {
        const segment = orderedSegments[index]
        const overrides = extractLeadingAssStyleOverrides(segment)
        let resolvedStyleName = baseStyleName
        const plainSegmentText = stripAssTags(segment)

        if (Object.keys(overrides).length > 0) {
          const resolvedStyle = createAssStyle({
            ...baseStyle,
            ...overrides,
            name: baseStyle.name,
          })
          const signature = buildStyleSignature(resolvedStyle)

          if (signature !== baseSignature) {
            resolvedStyleName = styleSignatureToName.get(signature) || ''
            if (!resolvedStyleName) {
              const candidateBaseName = inferSplitStyleBaseName(plainSegmentText, baseStyleName, index)
              resolvedStyleName = createUniqueStyleName(candidateBaseName, existingStyleNames)
              existingStyleNames.add(resolvedStyleName)
              const extractedStyle = { ...resolvedStyle, name: resolvedStyleName }
              nextStyles.push(extractedStyle)
              styleByName.set(resolvedStyleName, extractedStyle)
              styleSignatureToName.set(signature, resolvedStyleName)
            }
          }
        }

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

function extractLeadingAssStyleOverrides(segment: string): Partial<AssStyle> {
  const block = collectLeadingOverrideContent(segment)
  if (!block) return {}

  const overrides: Partial<AssStyle> = {}

  const fontMatch = block.match(/\\fn([^\\}]+)/)
  if (fontMatch) overrides.fontName = fontMatch[1].trim()

  const sizeMatch = block.match(/\\fs(-?\d+(?:\.\d+)?)/)
  if (sizeMatch) overrides.fontSize = Number(sizeMatch[1])

  const colorMatch = block.match(/\\1c(&H[0-9A-Fa-f]+&)/)
  if (colorMatch) overrides.primaryColor = colorMatch[1].toUpperCase()

  const boldMatch = block.match(/\\b(-?1|0)/)
  if (boldMatch) overrides.bold = boldMatch[1] !== '0'

  const italicMatch = block.match(/\\i(-?1|0)/)
  if (italicMatch) overrides.italic = italicMatch[1] !== '0'

  const underlineMatch = block.match(/\\u(-?1|0)/)
  if (underlineMatch) overrides.underline = underlineMatch[1] !== '0'

  const strikeMatch = block.match(/\\s(-?1|0)/)
  if (strikeMatch) overrides.strikeOut = strikeMatch[1] !== '0'

  const borderMatch = block.match(/\\bord(-?\d+(?:\.\d+)?)/)
  if (borderMatch) overrides.outline = Number(borderMatch[1])

  const shadowMatch = block.match(/\\shad(-?\d+(?:\.\d+)?)/)
  if (shadowMatch) overrides.shadow = Number(shadowMatch[1])

  const alignMatch = block.match(/\\an([1-9])/)
  if (alignMatch) overrides.alignment = Number(alignMatch[1])

  const scaleXMatch = block.match(/\\fscx(-?\d+(?:\.\d+)?)/)
  if (scaleXMatch) overrides.scaleX = Number(scaleXMatch[1])

  const scaleYMatch = block.match(/\\fscy(-?\d+(?:\.\d+)?)/)
  if (scaleYMatch) overrides.scaleY = Number(scaleYMatch[1])

  const spacingMatch = block.match(/\\fsp(-?\d+(?:\.\d+)?)/)
  if (spacingMatch) overrides.spacing = Number(spacingMatch[1])

  const angleMatch = block.match(/\\frz?(-?\d+(?:\.\d+)?)/)
  if (angleMatch) overrides.angle = Number(angleMatch[1])

  return overrides
}

function buildStyleSignature(style: AssStyle): string {
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

function collectLeadingOverrideContent(segment: string): string {
  const text = segment.trimStart()
  let cursor = 0
  let buffer = ''

  while (text[cursor] === '{') {
    const end = text.indexOf('}', cursor + 1)
    if (end === -1) break
    const block = text.slice(cursor + 1, end)
    if (!block.startsWith('\\')) break
    buffer += block
    cursor = end + 1
  }

  return buffer
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
