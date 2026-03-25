import { describe, it, expect } from 'vitest'
import { AssStyle, createDefaultStyle, createAssStyle } from '../AssStyle'

describe('AssStyle', () => {
  it('should create default style', () => {
    const style = createDefaultStyle()

    expect(style.name).toBe('Default')
    expect(style.fontName).toBe('Arial')
    expect(style.fontSize).toBe(20)
    expect(style.primaryColor).toBe('&H00FFFFFF')
    expect(style.alignment).toBe(2)
  })

  it('should create custom style', () => {
    const style = createAssStyle({
      name: 'Custom',
      fontName: 'Helvetica',
      fontSize: 24,
    })

    expect(style.name).toBe('Custom')
    expect(style.fontName).toBe('Helvetica')
    expect(style.fontSize).toBe(24)
  })
})
