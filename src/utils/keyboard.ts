export const KeyboardShortcuts = {
  NEW_SUBTITLE: 'Ctrl+N',
  DELETE_SUBTITLE: 'Delete',
  SELECT_ALL: 'Ctrl+A',
  ESCAPE: 'Escape',
} as const

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+')
  const key = parts.pop()?.toLowerCase()

  if (event.key.toLowerCase() !== key) return false

  const needsCtrl = parts.includes('Ctrl')
  const needsShift = parts.includes('Shift')
  const needsAlt = parts.includes('Alt')

  if (needsCtrl && !event.ctrlKey && !event.metaKey) return false
  if (needsShift && !event.shiftKey) return false
  if (needsAlt && !event.altKey) return false

  return true
}
