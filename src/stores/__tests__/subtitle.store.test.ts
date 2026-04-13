import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubtitleStore } from '../subtitle'
import { createAssStyle } from '../../core/models/AssStyle'
import { createSubtitleFile } from '../../core/models/SubtitleFile'

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

  it('splits bilingual ass line by line break and assigns CHS/ENG style names', () => {
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
    expect(engStyle?.fontName).toBe('Arial')
    expect(engStyle?.fontSize).toBe(20)
    expect(chsStyle?.fontSize).toBe(20)
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

  it('estimates and applies resolution resample impact', () => {
    const store = useSubtitleStore()
    const baseStyle = createAssStyle({
      name: 'Default',
      fontSize: 30,
      spacing: 2,
      outline: 3,
      shadow: 2,
      marginL: 60,
      marginR: 60,
      marginV: 40,
    })
    const file = createSubtitleFile({
      filename: 'a.ass',
      format: 'ass',
      styles: [baseStyle],
      items: [
        {
          id: 'line-1',
          startTime: 0,
          endTime: 1000,
          text: 'Test',
          style: 'Default',
          assText: '{\\pos(300,150)\\fs30}Test',
          hasInlineOverrides: true,
        },
      ],
      scriptInfo: {
        PlayResX: '1920',
        PlayResY: '1080',
      },
    })
    store.loadFile(file)

    const estimate = store.estimateResolutionImpact({
      playResX: 1280,
      playResY: 720,
      resample: true,
    })

    expect(estimate.ok).toBe(true)
    expect(estimate.styleChanged).toBe(1)
    expect(estimate.itemChanged).toBe(1)

    const result = store.updateScriptResolution({
      playResX: 1280,
      playResY: 720,
      scaledBorderAndShadow: true,
      resample: true,
    })

    expect(result.ok).toBe(true)
    expect(result.styleChanged).toBe(1)
    expect(result.itemChanged).toBe(1)
    expect(store.currentFile?.scriptInfo?.PlayResX).toBe('1280')
    expect(store.currentFile?.scriptInfo?.PlayResY).toBe('720')
    expect(store.currentFile?.scriptInfo?.ScaledBorderAndShadow).toBe('yes')
    expect(store.styles[0].fontSize).toBe(20)
    expect(store.styles[0].marginL).toBe(40)
    expect(store.items[0].assText).toContain('\\pos(200,100)')
    expect(store.items[0].assText).toContain('\\fs20')
  })

  it('updates PlayRes without resampling when requested', () => {
    const store = useSubtitleStore()
    const baseStyle = createAssStyle({ name: 'Default', fontSize: 24 })
    const file = createSubtitleFile({
      filename: 'b.ass',
      format: 'ass',
      styles: [baseStyle],
      items: [
        {
          id: 'line-2',
          startTime: 0,
          endTime: 1000,
          text: 'No Resample',
          style: 'Default',
          assText: '{\\pos(400,300)}No Resample',
          hasInlineOverrides: true,
        },
      ],
      scriptInfo: {
        PlayResX: '1920',
        PlayResY: '1080',
      },
    })
    store.loadFile(file)

    const beforeStyle = { ...store.styles[0] }
    const beforeAssText = store.items[0].assText

    const estimate = store.estimateResolutionImpact({
      playResX: 1280,
      playResY: 720,
      resample: false,
    })
    expect(estimate.ok).toBe(true)
    expect(estimate.styleChanged).toBe(0)
    expect(estimate.itemChanged).toBe(0)

    const result = store.updateScriptResolution({
      playResX: 1280,
      playResY: 720,
      scaledBorderAndShadow: false,
      resample: false,
    })

    expect(result.ok).toBe(true)
    expect(result.styleChanged).toBe(0)
    expect(result.itemChanged).toBe(0)
    expect(store.currentFile?.scriptInfo?.PlayResX).toBe('1280')
    expect(store.currentFile?.scriptInfo?.PlayResY).toBe('720')
    expect(store.currentFile?.scriptInfo?.ScaledBorderAndShadow).toBe('no')
    expect(store.styles[0]).toEqual(beforeStyle)
    expect(store.items[0].assText).toBe(beforeAssText)
  })
})
