import { useSubtitleStore } from '../stores/subtitle'
import type { AssStyle } from '../core/models/AssStyle'

export interface StyleTemplateFile {
  version: string
  name: string
  author?: string
  description?: string
  styles: AssStyle[]
  createdAt: number
}

export interface ExportOptions {
  filename?: string
  styleIds?: string[] // Style names to export (if empty, export all)
  metadata?: {
    name?: string
    author?: string
    description?: string
  }
}

const TEMPLATE_VERSION = '1.0.0'

export function useStyleExport() {
  const store = useSubtitleStore()

  function exportStyles(options: ExportOptions = {}): void {
    const { filename, styleIds, metadata } = options

    // Filter styles if specific IDs provided
    let stylesToExport: AssStyle[] = store.styles
    if (styleIds && styleIds.length > 0) {
      stylesToExport = store.styles.filter(style => styleIds.includes(style.name))
    }

    if (stylesToExport.length === 0) {
      console.warn('No styles to export')
      return
    }

    const templateFile: StyleTemplateFile = {
      version: TEMPLATE_VERSION,
      name: metadata?.name ?? 'Style Template',
      author: metadata?.author,
      description: metadata?.description,
      styles: [...stylesToExport],
      createdAt: Date.now(),
    }

    const content = JSON.stringify(templateFile, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename ?? 'styles-template.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function generateStyleTemplateData(options: Omit<ExportOptions, 'filename'> = {}): StyleTemplateFile {
    const { styleIds, metadata } = options

    let stylesToExport: AssStyle[] = store.styles
    if (styleIds && styleIds.length > 0) {
      stylesToExport = store.styles.filter(style => styleIds.includes(style.name))
    }

    return {
      version: TEMPLATE_VERSION,
      name: metadata?.name ?? 'Style Template',
      author: metadata?.author,
      description: metadata?.description,
      styles: [...stylesToExport],
      createdAt: Date.now(),
    }
  }

  return {
    exportStyles,
    generateStyleTemplateData,
    templateVersion: TEMPLATE_VERSION,
  }
}
