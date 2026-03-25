import { describe, it, expect } from 'vitest'
import {
  assColorToCss,
  cssToAssColor,
  parseAssColor,
  formatAssColor,
  AssColorComponents,
} from '../assColor'

describe('assColor', () => {
  describe('assColorToCss', () => {
    it('should convert ASS color to CSS color', () => {
      expect(assColorToCss('&H00FFFFFF')).toBe('#ffffff')
      expect(assColorToCss('&H000000FF')).toBe('#ff0000')
      expect(assColorToCss('&H0000FF00')).toBe('#00ff00')
      expect(assColorToCss('&H00FF0000')).toBe('#0000ff')
      expect(assColorToCss('&H00000000')).toBe('#000000')
    })

    it('should handle lowercase input', () => {
      // &h00ffffff in BBGGRR format = alpha=00, blue=ff, green=ff, red=ff
      // Result should be #ffffff (white)
      expect(assColorToCss('&h00ffffff')).toBe('#ffffff')
    })

    it('should handle short hex values', () => {
      expect(assColorToCss('&HFFFFFF')).toBe('#ffffff')
    })
  })

  describe('cssToAssColor', () => {
    it('should convert CSS color to ASS color', () => {
      expect(cssToAssColor('#ffffff')).toBe('&H00FFFFFF')
      expect(cssToAssColor('#ff0000')).toBe('&H000000FF')
      expect(cssToAssColor('#00ff00')).toBe('&H0000FF00')
      expect(cssToAssColor('#0000ff')).toBe('&H00FF0000')
      expect(cssToAssColor('#000000')).toBe('&H00000000')
    })

    it('should handle short hex values', () => {
      // #fff -> expands to ff, ff, ff -> blue=FF, green=FF, red=FF -> &H00FFFFFF
      expect(cssToAssColor('#fff')).toBe('&H00FFFFFF')
    })
  })

  describe('parseAssColor', () => {
    it('should parse ASS color into components', () => {
      const result = parseAssColor('&H00FFFFFF')
      expect(result).toEqual({
        alpha: 0,
        red: 255,
        green: 255,
        blue: 255,
      })
    })

    it('should parse ASS color with alpha', () => {
      const result = parseAssColor('&HFF0000FF')
      expect(result).toEqual({
        alpha: 255,
        red: 255,
        green: 0,
        blue: 0,
      })
    })

    it('should handle partial hex values', () => {
      const result = parseAssColor('&HFF')
      // Padded to 000000FF = alpha=00, blue=00, green=00, red=FF
      expect(result).toEqual({
        alpha: 0,
        red: 255,
        green: 0,
        blue: 0,
      })
    })
  })

  describe('formatAssColor', () => {
    it('should format color components to ASS color', () => {
      const components: AssColorComponents = {
        alpha: 0,
        red: 255,
        green: 255,
        blue: 255,
      }
      expect(formatAssColor(components)).toBe('&H00FFFFFF')
    })

    it('should format color components with alpha', () => {
      const components: AssColorComponents = {
        alpha: 255,
        red: 0,
        green: 0,
        blue: 255,
      }
      expect(formatAssColor(components)).toBe('&HFFFF0000')
    })

    it('should pad single digit hex values', () => {
      // Components: alpha=1 (01), blue=4 (04), green=3 (03), red=2 (02)
      // Result: &H01040302
      const components: AssColorComponents = {
        alpha: 1,
        red: 2,
        green: 3,
        blue: 4,
      }
      expect(formatAssColor(components)).toBe('&H01040302')
    })
  })

  describe('round-trip conversion', () => {
    it('should preserve color through conversion', () => {
      // &H00AABBCC in BBGGRR format: alpha=00, blue=AA, green=BB, red=CC
      // To CSS: #CCBBAA (red, green, blue)
      // Back to ASS: &H00AABBCC (blue=AA, green=BB, red=CC)
      const original = '&H00AABBCC'
      const css = assColorToCss(original)
      const backToAss = cssToAssColor(css)
      expect(backToAss).toBe(original)
    })

    it('should preserve components through format/parse', () => {
      const original: AssColorComponents = {
        alpha: 128,
        red: 64,
        green: 192,
        blue: 255,
      }
      const formatted = formatAssColor(original)
      const parsed = parseAssColor(formatted)
      expect(parsed).toEqual(original)
    })
  })
})
