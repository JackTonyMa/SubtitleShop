import { useSubtitleStore } from '../stores/subtitle'
import { createAssStyle, type AssStyle } from '../core/models/AssStyle'
import type { StyleTemplateFile } from './useStyleExport'

export interface ImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errors: string[]
}

export interface ImportOptions {
  overwriteExisting?: boolean
  prefix?: string
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function useStyleImport() {
  const store = useSubtitleStore()

  async function importStyles(file: File, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
    }

    try {
      const content = await readFileContent(file)
      return importStylesFromContent(content, options)
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  function importStylesFromContent(content: string, options: ImportOptions = {}): ImportResult {
    const { overwriteExisting = false, prefix } = options
    const result: ImportResult = {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
    }

    let template: StyleTemplateFile

    try {
      template = JSON.parse(content) as StyleTemplateFile
    } catch {
      result.errors.push('Invalid JSON file format')
      return result
    }

    // Validate template structure
    if (!template.styles || !Array.isArray(template.styles)) {
      result.errors.push('Invalid template file: missing styles array')
      return result
    }

    // Validate version (but allow import from older versions)
    if (!template.version) {
      console.warn('Template file has no version specified')
    }

    const existingStyleNames = new Set(store.styles.map(s => s.name))

    for (const style of template.styles) {
      if (!style.name) {
        result.errors.push(`Skipped style without name`)
        result.skippedCount++
        continue
      }

      let styleName = style.name

      // Apply prefix if provided
      if (prefix) {
        styleName = `${prefix}${styleName}`
      }

      // Check for existing style
      if (existingStyleNames.has(styleName)) {
        if (overwriteExisting) {
          store.updateStyle(styleName, { ...style, name: styleName })
          result.importedCount++
        } else {
          result.skippedCount++
        }
        continue
      }

      // Create new style
      const newStyle = createAssStyle({
        ...style,
        name: styleName,
      })
      store.addStyle(newStyle)
      result.importedCount++
      existingStyleNames.add(styleName)
    }

    result.success = result.importedCount > 0 || result.skippedCount > 0
    return result
  }

  async function validateStyleTemplate(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
      const content = await readFileContent(file)
      return validateStyleTemplateContent(content)
    } catch (error) {
      return { valid: false, error: 'Failed to read file' }
    }
  }

  function validateStyleTemplateContent(content: string): { valid: boolean; error?: string } {
    let template: StyleTemplateFile

    try {
      template = JSON.parse(content) as StyleTemplateFile
    } catch {
      return { valid: false, error: 'Invalid JSON file format' }
    }

    if (!template.styles || !Array.isArray(template.styles)) {
      return { valid: false, error: 'Missing styles array' }
    }

    if (template.styles.length === 0) {
      return { valid: false, error: 'No styles found in template' }
    }

    // Validate each style has required fields
    const requiredFields: (keyof AssStyle)[] = ['name', 'fontName', 'fontSize']
    const invalidStyles = template.styles.filter(style =>
      requiredFields.some(field => !(field in style))
    )

    if (invalidStyles.length > 0) {
      return { valid: false, error: `${invalidStyles.length} styles are missing required fields` }
    }

    return { valid: true }
  }

  return {
    importStyles,
    importStylesFromContent,
    validateStyleTemplate,
    validateStyleTemplateContent,
  }
}
