import { useSubtitleStore } from '../stores/subtitle'
import { serializeAss } from '../plugins/parser-ass/parser'
import { serializeSrt } from '../plugins/parser-srt/parser'

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
    link.download = filename ?? 'ass.ass'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { exportFile }
}
