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

  it('splits bilingual ass line into two rows and extracts inline style overrides', () => {
    const store = useSubtitleStore()
    store.styles = [createAssStyle({ name: 'Default', fontName: 'Arial', fontSize: 20 })]
    store.items = [
      {
        id: '1',
        startTime: 1000,
        endTime: 2000,
        text: '中文\\NEnglish',
        style: 'Default',
        assText: '{\\fnOpen Sans\\fs18}中文{\\r}\\N{\\fnOpen Sans\\fs9\\1c&H00E6E6&}English{\\r}',
        hasInlineOverrides: true,
      },
    ]

    const changed = store.splitBilingualLines(false)

    expect(changed).toBe(1)
    expect(store.items).toHaveLength(2)
    expect(store.items[0].startTime).toBe(1000)
    expect(store.items[0].endTime).toBe(2000)
    expect(store.items[1].startTime).toBe(1000)
    expect(store.items[1].endTime).toBe(2000)
    expect(store.items.map(item => item.text)).toEqual(['English', '中文'])
    expect(store.items.every(item => item.hasInlineOverrides === false)).toBe(true)
    expect(store.styles.length).toBeGreaterThan(1)

    const engStyle = store.styles.find(style => style.name === 'ENG')
    const chsStyle = store.styles.find(style => style.name === 'CHS')
    expect(engStyle).toBeTruthy()
    expect(chsStyle).toBeTruthy()
    expect(engStyle?.fontName).toBe('Open Sans')
    expect(engStyle?.fontSize).toBe(9)
    expect(engStyle?.primaryColor).toBe('&H00E6E6&')
    expect(chsStyle?.fontSize).toBe(18)
  })

  it('reuses extracted styles across multiple split rows to avoid style explosion', () => {
    const store = useSubtitleStore()
    store.styles = [createAssStyle({ name: 'Default', fontName: 'Arial', fontSize: 20 })]
    store.items = [
      {
        id: '1',
        startTime: 1000,
        endTime: 2000,
        text: '中文1\\NEnglish1',
        style: 'Default',
        assText: '{\\fnOpen Sans\\fs18}中文1{\\r}\\N{\\fnOpen Sans\\fs9\\1c&H00E6E6&}English1{\\r}',
        hasInlineOverrides: true,
      },
      {
        id: '2',
        startTime: 2500,
        endTime: 3500,
        text: '中文2\\NEnglish2',
        style: 'Default',
        assText: '{\\fnOpen Sans\\fs18}中文2{\\r}\\N{\\fnOpen Sans\\fs9\\1c&H00E6E6&}English2{\\r}',
        hasInlineOverrides: true,
      },
    ]

    const changed = store.splitBilingualLines(false)

    expect(changed).toBe(2)
    expect(store.items).toHaveLength(4)
    const bilingualStyles = store.styles.filter(style => style.name === 'CHS' || style.name === 'ENG')
    expect(bilingualStyles).toHaveLength(2)
  })
})
