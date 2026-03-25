import { describe, it, expect } from 'vitest'
import {
  PRESET_STYLES,
  getPresetStyleById,
  createStyleFromPreset,
  getPresetStyles,
  getPresetStyleNames,
} from '../index'

describe('preset-styles', () => {
  describe('PRESET_STYLES', () => {
    it('should contain preset styles', () => {
      expect(PRESET_STYLES.length).toBeGreaterThan(0)
      expect(PRESET_STYLES.map(s => s.id)).toContain('anime')
      expect(PRESET_STYLES.map(s => s.id)).toContain('movie')
    })

    it('should have required fields', () => {
      PRESET_STYLES.forEach(style => {
        expect(style.id).toBeDefined()
        expect(style.name).toBeDefined()
        expect(style.description).toBeDefined()
        expect(style.style).toBeDefined()
      })
    })

    it('should have valid style properties', () => {
      PRESET_STYLES.forEach(preset => {
        expect(preset.style.fontName).toBeDefined()
        expect(preset.style.fontSize).toBeGreaterThan(0)
        expect(preset.style.primaryColor).toMatch(/^&H[0-9A-F]{8}$/i)
      })
    })
  })

  describe('getPresetStyleById', () => {
    it('should find preset by id', () => {
      const anime = getPresetStyleById('anime')
      expect(anime).toBeDefined()
      expect(anime?.name).toBe('动漫风格')
      expect(anime?.id).toBe('anime')
    })

    it('should return undefined for unknown id', () => {
      const result = getPresetStyleById('unknown')
      expect(result).toBeUndefined()
    })

    it('should find all preset styles', () => {
      const ids = ['anime', 'movie', 'documentary', 'karaoke', 'minimal']
      ids.forEach(id => {
        expect(getPresetStyleById(id)).toBeDefined()
      })
    })
  })

  describe('createStyleFromPreset', () => {
    it('should create style from preset', () => {
      const style = createStyleFromPreset('anime')
      expect(style).not.toBeNull()
      expect(style?.name).toBe('动漫风格')
      expect(style?.fontName).toBe('Arial Unicode MS')
    })

    it('should use custom name when provided', () => {
      const style = createStyleFromPreset('anime', 'MyCustomName')
      expect(style?.name).toBe('MyCustomName')
    })

    it('should return null for unknown preset', () => {
      const style = createStyleFromPreset('unknown')
      expect(style).toBeNull()
    })

    it('should include all style properties', () => {
      const style = createStyleFromPreset('movie')
      expect(style).toHaveProperty('name')
      expect(style).toHaveProperty('fontName')
      expect(style).toHaveProperty('fontSize')
      expect(style).toHaveProperty('primaryColor')
      expect(style).toHaveProperty('outline')
      expect(style).toHaveProperty('alignment')
    })
  })

  describe('getPresetStyles', () => {
    it('should return all preset styles', () => {
      const styles = getPresetStyles()
      expect(styles.length).toBe(PRESET_STYLES.length)
    })

    it('should return a copy', () => {
      const styles = getPresetStyles()
      styles.pop()
      expect(PRESET_STYLES.length).toBeGreaterThan(styles.length)
    })
  })

  describe('getPresetStyleNames', () => {
    it('should return id, name, and description', () => {
      const names = getPresetStyleNames()
      names.forEach(item => {
        expect(item.id).toBeDefined()
        expect(item.name).toBeDefined()
        expect(item.description).toBeDefined()
      })
    })

    it('should not include style details', () => {
      const names = getPresetStyleNames()
      names.forEach(item => {
        expect(item).not.toHaveProperty('style')
      })
    })
  })
})
