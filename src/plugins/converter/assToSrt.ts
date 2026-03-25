import type { SubtitleItem } from '../../core/models/SubtitleItem'
import { msToSrtTime } from '../../utils/time'

/**
 * Convert ASS subtitle content to SRT format
 * @param content ASS file content
 * @returns SRT formatted string
 */
export function assToSrt(content: string): string {
  const lines = content.split(/\r?\n/)
  const items: SubtitleItem[] = []

  let section: string | null = null
  let lineIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) continue

    // Detect section headers
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      section = trimmed.slice(1, -1).toLowerCase()
      continue
    }

    // Parse Events section (Dialogue lines)
    if (section === 'events' && trimmed.startsWith('Dialogue:')) {
      const item = parseAssDialogueLine(trimmed, lineIndex++)
      if (item) items.push(item)
    }
  }

  // Sort items by start time
  items.sort((a, b) => a.startTime - b.startTime)

  // Convert to SRT format
  return itemsToSrt(items)
}

/**
 * Parse an ASS Dialogue line
 */
function parseAssDialogueLine(line: string, index: number): SubtitleItem | null {
  try {
    const dialogueMatch = line.match(/^Dialogue:\s*(.+)$/)
    if (!dialogueMatch) return null

    const fullContent = dialogueMatch[1]

    // Split by comma but handle quoted fields
    const parts: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < fullContent.length; i++) {
      const char = fullContent[i]
      if (char === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
        continue
      }
      current += char
    }
    parts.push(current.trim())

    if (parts.length < 10) {
      return null
    }

    // ASS Dialogue format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const startTime = parseAssTimeToMs(parts[1])
    const endTime = parseAssTimeToMs(parts[2])

    if (isNaN(startTime) || isNaN(endTime)) {
      return null
    }

    // Remove ASS tags and replace \\N with newlines
    let text = parts[9] || ''
    text = removeAssTags(text)
    text = text.replace(/\\N/gi, '\n')
    text = text.replace(/\\n/gi, '\n')
    text = text.replace(/\\h/g, ' ') // Hard space

    return {
      id: `ass-${index}-${Date.now()}`,
      startTime,
      endTime,
      text: text.trim(),
    }
  } catch (e) {
    console.error('Failed to parse ASS dialogue line:', line, e)
    return null
  }
}

/**
 * Parse ASS time format (H:MM:SS.cc) to milliseconds
 */
function parseAssTimeToMs(time: string): number {
  const match = time.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/)
  if (!match) return NaN

  const [, hours, minutes, seconds, centiseconds] = match
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(centiseconds) * 10
  )
}

/**
 * Remove ASS tags from text
 */
function removeAssTags(text: string): string {
  // Remove {\...} tags
  return text.replace(/\{[^}]*\}/g, '').trim()
}

/**
 * Convert subtitle items to SRT format
 */
function itemsToSrt(items: SubtitleItem[]): string {
  const blocks: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.startTime >= item.endTime) {
      continue
    }

    const startTime = msToSrtTime(item.startTime)
    const endTime = msToSrtTime(item.endTime)

    const textLines = item.text.split('\n')

    const block = [
      (i + 1).toString(),
      `${startTime} --> ${endTime}`,
      ...textLines,
    ].join('\n')

    blocks.push(block)
  }

  return blocks.join('\n\n')
}
