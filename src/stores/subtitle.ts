import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleFile } from '../core/models/SubtitleFile'
import type { SubtitleItem } from '../core/models/SubtitleItem'
import type { AssStyle } from '../core/models/AssStyle'
import { createSubtitleItem, createDefaultStyle } from '../core/models'

export const useSubtitleStore = defineStore('subtitle', () => {
  // State
  const currentFile = ref<SubtitleFile | null>(null)
  const items = ref<SubtitleItem[]>([])
  const styles = ref<AssStyle[]>([])
  const selectedIds = ref<Set<string>>(new Set())

  // Getters
  const hasFile = computed(() => currentFile.value !== null)

  const selectedItems = computed(() => {
    return items.value.filter(item => selectedIds.value.has(item.id))
  })

  const isSelected = computed(() => {
    return (id: string) => selectedIds.value.has(id)
  })

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
    const newItem = createSubtitleItem(params)
    items.value.push(newItem)
    // Sort items by start time
    items.value.sort((a, b) => a.startTime - b.startTime)
    return newItem
  }

  function removeItem(id: string) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      selectedIds.value.delete(id)
    }
  }

  function updateItem(id: string, updates: Partial<SubtitleItem>) {
    const item = items.value.find(item => item.id === id)
    if (item) {
      Object.assign(item, updates)
    }
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
      Object.assign(style, updates)
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
    getExportData,
  }
})
