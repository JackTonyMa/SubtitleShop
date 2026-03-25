import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useStyleImport } from '../useStyleImport'
import { useSubtitleStore } from '../../stores/subtitle'

describe('useStyleImport', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  describe('importStylesFromContent', () => {
    it('should import styles from valid template content', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        name: 'Test Template',
        styles: [
          { name: 'NewStyle', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent(templateContent)

      expect(result.success).toBe(true)
      expect(result.importedCount).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should skip existing styles by default', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Existing', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { name: 'Existing', fontName: 'Verdana', fontSize: 24, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent(templateContent)

      expect(result.success).toBe(true)
      expect(result.importedCount).toBe(0)
      expect(result.skippedCount).toBe(1)
    })

    it('should overwrite existing styles when option is set', () => {
      const store = useSubtitleStore()
      store.styles = [
        { name: 'Existing', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
      ]

      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { name: 'Existing', fontName: 'Verdana', fontSize: 24, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent(templateContent, { overwriteExisting: true })

      expect(result.success).toBe(true)
      expect(result.importedCount).toBe(1)
      expect(result.skippedCount).toBe(0)
    })

    it('should apply prefix to imported styles', async () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { name: 'Style1', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { importStylesFromContent } = useStyleImport()
      importStylesFromContent(templateContent, { prefix: 'Imported_' })

      const store = useSubtitleStore()
      const addedStyle = store.styles.find(s => s.name === 'Imported_Style1')
      expect(addedStyle).toBeDefined()
      expect(addedStyle?.name).toBe('Imported_Style1')
    })

    it('should return error for invalid JSON', () => {
      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent('not valid json')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid JSON file format')
    })

    it('should return error for missing styles array', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        name: 'Test',
      })

      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent(templateContent)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('missing styles array'))).toBe(true)
    })

    it('should skip styles without name', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { importStylesFromContent } = useStyleImport()
      const result = importStylesFromContent(templateContent)

      expect(result.skippedCount).toBe(1)
      expect(result.errors.some(e => e.includes('without name'))).toBe(true)
    })
  })

  describe('validateStyleTemplateContent', () => {
    it('should validate correct template content', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { name: 'Style1', fontName: 'Arial', fontSize: 20, primaryColor: '&H00FFFFFF', secondaryColor: '&H000000FF', outlineColor: '&H00000000', backColor: '&H80000000', bold: false, italic: false, underline: false, strikeOut: false, scaleX: 100, scaleY: 100, spacing: 0, angle: 0, borderStyle: 1, outline: 2, shadow: 2, alignment: 2, marginL: 10, marginR: 10, marginV: 10, encoding: 1 },
        ],
        createdAt: Date.now(),
      })

      const { validateStyleTemplateContent } = useStyleImport()
      const result = validateStyleTemplateContent(templateContent)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid JSON', () => {
      const { validateStyleTemplateContent } = useStyleImport()
      const result = validateStyleTemplateContent('not valid json')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('should reject empty styles array', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [],
      })

      const { validateStyleTemplateContent } = useStyleImport()
      const result = validateStyleTemplateContent(templateContent)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('No styles found')
    })

    it('should reject styles missing required fields', () => {
      const templateContent = JSON.stringify({
        version: '1.0.0',
        styles: [
          { name: 'Style1' },
        ],
      })

      const { validateStyleTemplateContent } = useStyleImport()
      const result = validateStyleTemplateContent(templateContent)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('missing required fields')
    })
  })
})
