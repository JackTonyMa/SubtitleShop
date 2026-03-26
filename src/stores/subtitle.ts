import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleFile } from '../core/models/SubtitleFile'
import type { SubtitleItem } from '../core/models/SubtitleItem'
import type { AssStyle } from '../core/models/AssStyle'
import { createSubtitleItem, createDefaultStyle } from '../core/models'
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
    if ('text' in normalizedUpdates) {
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
    applyStyleToAll,
    getExportData,
    undo,
    redo,
    deleteSelected,
    shiftTime,
    mergeSelected,
    duplicateSelected,
  }
})
