import { onMounted, onUnmounted } from 'vue'
import { useSubtitleStore } from '../stores/subtitle'
import { KeyboardShortcuts, matchesShortcut } from '../utils/keyboard'

export function useKeyboardShortcuts() {
  const store = useSubtitleStore()

  function handleKeydown(event: KeyboardEvent) {
    // Skip if typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (matchesShortcut(event, KeyboardShortcuts.ESCAPE)) {
        (event.target as HTMLElement).blur()
        event.preventDefault()
      }
      return
    }

    // Ctrl+Z - Undo
    if (matchesShortcut(event, KeyboardShortcuts.UNDO)) {
      event.preventDefault()
      store.undo()
      return
    }

    // Ctrl+Y - Redo
    if (matchesShortcut(event, KeyboardShortcuts.REDO)) {
      event.preventDefault()
      store.redo()
      return
    }

    // Ctrl+N - New subtitle
    if (matchesShortcut(event, KeyboardShortcuts.NEW_SUBTITLE)) {
      event.preventDefault()
      const lastItem = store.items[store.items.length - 1]
      const startTime = lastItem ? lastItem.endTime + 500 : 0
      store.addItem({
        startTime,
        endTime: startTime + 2000,
        text: 'New subtitle',
      })
      return
    }

    // Ctrl+D - Duplicate selected
    if (matchesShortcut(event, KeyboardShortcuts.DUPLICATE)) {
      event.preventDefault()
      store.duplicateSelected()
      return
    }

    // Delete - Delete selected
    if (matchesShortcut(event, KeyboardShortcuts.DELETE_SUBTITLE)) {
      event.preventDefault()
      store.deleteSelected()
      return
    }

    // Ctrl+A - Select all
    if (matchesShortcut(event, KeyboardShortcuts.SELECT_ALL)) {
      event.preventDefault()
      store.items.forEach(item => store.selectItem(item.id, true))
      return
    }

    // Escape - Clear selection
    if (matchesShortcut(event, KeyboardShortcuts.ESCAPE)) {
      event.preventDefault()
      store.clearSelection()
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {}
}
