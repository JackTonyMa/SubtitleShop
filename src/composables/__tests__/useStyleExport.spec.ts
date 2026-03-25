import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useStyleExport } from '../useStyleExport'
import { useSubtitleStore } from '../../stores/subtitle'

describe('useStyleExport', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('exportStyles', () => {
    it('should export styles as JSON file', () => {
      const { exportStyles } = useStyleExport()
      expect(() => exportStyles()).not.toThrow()
    })

    it('should filter styles by IDs when provided', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Default', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        { name: 'Custom', fontName: 'Verdana', fontSize: 24, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const { generateStyleTemplateData } = useStyleExport()
      const data = generateStyleTemplateData({ styleIds: ['Default'] })

      expect(data.styles).toHaveLength(1)
      expect(data.styles[0].name).toBe('Default')
    })

    it('should include metadata in export', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Default', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const { generateStyleTemplateData } = useStyleExport()
      const data = generateStyleTemplateData({
        metadata: {
          name: 'My Template',
          author: 'Test Author',
          description: 'Test Description',
        },
      })

      expect(data.name).toBe('My Template')
      expect(data.author).toBe('Test Author')
      expect(data.description).toBe('Test Description')
      expect(data.version).toBeDefined()
      expect(data.createdAt).toBeGreaterThan(0)
    })

    it('should use default metadata when not provided', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Default', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const { generateStyleTemplateData } = useStyleExport()
      const data = generateStyleTemplateData()

      expect(data.name).toBe('Style Template')
    })

    it('should warn when no styles to export', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { exportStyles } = useStyleExport()

      exportStyles()

      expect(consoleSpy).toHaveBeenCalledWith('No styles to export')
    })
  })

  describe('generateStyleTemplateData', () => {
    it('should create valid template structure', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Style1', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const { generateStyleTemplateData } = useStyleExport()
      const data = generateStyleTemplateData()

      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('styles')
      expect(data).toHaveProperty('createdAt')
      expect(Array.isArray(data.styles)).toBe(true)
    })
  })
})
