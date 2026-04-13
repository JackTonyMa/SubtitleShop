import { useSubtitleStore } from '../stores/subtitle'
import { serializeAss } from '../plugins/parser-ass/parser'
import { serializeSrt } from '../plugins/parser-srt/parser'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function buildTimestamp(date: Date): string {
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日${pad(date.getHours())}时${pad(date.getMinutes())}分${pad(date.getSeconds())}秒`
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '')
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '_')
}

export function buildDefaultExportFilename(originalFilename: string | undefined, format: string, now = new Date()): string {
  const normalizedFormat = format === 'srt' ? 'srt' : 'ass'
  const originalBaseName = stripExtension(originalFilename?.trim() || 'subtitle')
  const safeBaseName = sanitizeFilename(originalBaseName) || 'subtitle'
  return `Edited_${buildTimestamp(now)}_${safeBaseName}.${normalizedFormat}`
}

export function useFileExport() {
  const store = useSubtitleStore()

  function exportFile(filename?: string) {
    if (!store.hasFile) {
      console.warn('No file to export')
      return
    }

    const data = store.getExportData()
    const format = data.format ?? 'ass'
    const content = format === 'srt' ? serializeSrt(data) : serializeAss(data)

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename ?? buildDefaultExportFilename(data.filename, format)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { exportFile, buildDefaultExportFilename }
}
