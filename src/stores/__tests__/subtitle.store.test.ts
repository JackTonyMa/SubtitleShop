import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubtitleStore } from '../subtitle'
import { createAssStyle } from '../../core/models/AssStyle'

describe('subtitle store style updates', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates item style references when style is renamed', () => {
    const store = useSubtitleStore()
    store.styles = [createAssStyle({ name: 'Default' })]
    store.items = [
      { id: '1', startTime: 0, endTime: 1000, text: 'A', style: 'Default' },
      { id: '2', startTime: 1500, endTime: 2500, text: 'B', style: 'Other' },
    ]

    store.updateStyle('Default', { name: 'Main' })

    expect(store.styles[0].name).toBe('Main')
    expect(store.items[0].style).toBe('Main')
    expect(store.items[1].style).toBe('Other')
  })

  it('applies one style to all subtitle items', () => {
    const store = useSubtitleStore()
    store.styles = [createAssStyle({ name: 'Default' }), createAssStyle({ name: '白-黑' })]
    store.items = [
      { id: '1', startTime: 0, endTime: 1000, text: 'A', style: 'Default' },
      { id: '2', startTime: 1500, endTime: 2500, text: 'B', style: 'Eng' },
      { id: '3', startTime: 3000, endTime: 3500, text: 'C' },
    ]

    const changed = store.applyStyleToAll('白-黑')

    expect(changed).toBe(3)
    expect(store.items.every(item => item.style === '白-黑')).toBe(true)
  })
})
