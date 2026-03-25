import type { SubtitleFile, SubtitleFileParams } from '../../core/models/SubtitleFile'
import type { SubtitleItem } from '../../core/models/SubtitleItem'
import { srtTimeToMs, msToSrtTime } from '../../utils/time'

export function parseSrt(content: string): Omit<SubtitleFileParams, 'filename' | 'format'> {
  const items: SubtitleItem[] = []

  // Split content into blocks (separated by blank lines)
  const blocks = content.split(/\r?\n\s*\r?\n/)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const item = parseSrtBlock(trimmed)
    if (item) {
      items.push(item)
    }
  }

  return {
    items,
    styles: [], // SRT doesn't support styles
    scriptInfo: {}, // SRT doesn't have script info
  }
}

function parseSrtBlock(block: string): SubtitleItem | null {
  const lines = block.split(/\r?\n/)

  // First line should be the subtitle number (can be ignored)
  // Second line should be the time line
  // Remaining lines are the text

  if (lines.length < 2) {
    return null
  }

  // Find the time line (contains -->)
  let timeLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('-->')) {
      timeLineIndex = i
      break
    }
  }

  if (timeLineIndex === -1) {
    return null
  }

  const timeLine = lines[timeLineIndex]
  const textLines = lines.slice(timeLineIndex + 1)

  // Parse time line: "00:00:01,000 --> 00:00:04,000"
  const timeMatch = timeLine.match(
    /^\s*(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
  )

  if (!timeMatch) {
    return null
  }

  const startTimeStr = timeMatch[1]
  const endTimeStr = timeMatch[2]

  try {
    const startTime = srtTimeToMs(startTimeStr)
    const endTime = srtTimeToMs(endTimeStr)

    // Join text lines and clean up
    const text = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '') // Remove HTML-like tags
      .trim()

    if (!text) {
      return null
    }

    return {
      id: `srt-${startTime}-${Date.now()}`,
      startTime,
      endTime,
      text,
    }
  } catch (e) {
    console.error('Failed to parse SRT time:', timeLine, e)
    return null
  }
}

export function serializeSrt(file: Partial<SubtitleFile>): string {
  const items = file.items || []

  // Sort items by start time
  const sortedItems = [...items].sort((a, b) => a.startTime - b.startTime)

  const blocks: string[] = []

  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i]

    if (item.startTime >= item.endTime) {
      continue
    }

    const block = serializeSrtBlock(item, i + 1)
    if (block) {
      blocks.push(block)
    }
  }

  return blocks.join('\n\n')
}

function serializeSrtBlock(item: SubtitleItem, index: number): string | null {
  const startTime = msToSrtTime(item.startTime)
  const endTime = msToSrtTime(item.endTime)

  // Split text by newlines for SRT format
  const textLines = item.text.split('\n')

  const lines: string[] = [
    index.toString(),
    `${startTime} --> ${endTime}`,
    ...textLines,
  ]

  return lines.join('\n')
}
