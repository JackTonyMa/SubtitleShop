import type { SubtitleFile, SubtitleFileParams } from '../../core/models/SubtitleFile'
import type { SubtitleItem } from '../../core/models/SubtitleItem'
import { AssStyle, createAssStyle, DEFAULT_STYLE } from '../../core/models/AssStyle'
import { assTimeToMs, msToAssTime } from '../../utils/time'

interface AssScriptInfo {
  [key: string]: string
}

export function parseAss(content: string): Omit<SubtitleFileParams, 'filename' | 'format'> {
  const lines = content.split(/\r?\n/)

  const scriptInfo: AssScriptInfo = {}
  const styles: AssStyle[] = []
  const items: SubtitleItem[] = []

  let section: string | null = null
  let lineIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Detect section headers
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      section = trimmed.slice(1, -1).toLowerCase()
      continue
    }

    // Parse Script Info section
    if (section === 'script info') {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim()
        const value = trimmed.slice(colonIndex + 1).trim()
        scriptInfo[key] = value
      }
      continue
    }

    // Parse V4+ Styles section
    if (section === 'v4+ styles' || section === 'v4 styles') {
      if (trimmed.startsWith('Format:')) {
        // Format line - could be used to parse non-standard formats
        continue
      }
      if (trimmed.startsWith('Style:')) {
        const style = parseStyleLine(trimmed)
        if (style) styles.push(style)
      }
      continue
    }

    // Parse Events section
    if (section === 'events') {
      if (trimmed.startsWith('Format:')) {
        // Format line - could be used to parse non-standard formats
        continue
      }
      if (trimmed.startsWith('Dialogue:')) {
        const item = parseDialogueLine(trimmed, lineIndex++)
        if (item) items.push(item)
      }
      continue
    }
  }

  return {
    items,
    styles: styles.length > 0 ? styles : [DEFAULT_STYLE],
    scriptInfo,
  }
}

function parseStyleLine(line: string): AssStyle | null {
  try {
    const styleMatch = line.match(/^Style:\s*(.+)$/)
    if (!styleMatch) return null

    const parts = styleMatch[1].split(',').map(p => p.trim())

    // Standard ASS style format has 23 fields
    // Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
    // Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
    // BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

    if (parts.length < 23) {
      // Try to parse with fewer fields
      console.warn('Style line has fewer than 23 fields:', line)
    }

    return createAssStyle({
      name: parts[0] || 'Default',
      fontName: parts[1] || DEFAULT_STYLE.fontName,
      fontSize: parseInt(parts[2]) || DEFAULT_STYLE.fontSize,
      primaryColor: parts[3] || DEFAULT_STYLE.primaryColor,
      secondaryColor: parts[4] || DEFAULT_STYLE.secondaryColor,
      outlineColor: parts[5] || DEFAULT_STYLE.outlineColor,
      backColor: parts[6] || DEFAULT_STYLE.backColor,
      bold: parseAssBoolean(parts[7]),
      italic: parseAssBoolean(parts[8]),
      underline: parseAssBoolean(parts[9]),
      strikeOut: parseAssBoolean(parts[10]),
      scaleX: parseInt(parts[11]) || DEFAULT_STYLE.scaleX,
      scaleY: parseInt(parts[12]) || DEFAULT_STYLE.scaleY,
      spacing: parseFloat(parts[13]) || DEFAULT_STYLE.spacing,
      angle: parseFloat(parts[14]) || DEFAULT_STYLE.angle,
      borderStyle: parseInt(parts[15]) || DEFAULT_STYLE.borderStyle,
      outline: parseInt(parts[16]) || DEFAULT_STYLE.outline,
      shadow: parseInt(parts[17]) || DEFAULT_STYLE.shadow,
      alignment: parseInt(parts[18]) || DEFAULT_STYLE.alignment,
      marginL: parseInt(parts[19]) || DEFAULT_STYLE.marginL,
      marginR: parseInt(parts[20]) || DEFAULT_STYLE.marginR,
      marginV: parseInt(parts[21]) || DEFAULT_STYLE.marginV,
      encoding: parseInt(parts[22]) || DEFAULT_STYLE.encoding,
    })
  } catch (e) {
    console.error('Failed to parse style line:', line, e)
    return null
  }
}

function parseAssBoolean(value: string): boolean {
  if (!value) return false
  return value === '-1' || value.toLowerCase() === 'true'
}

function parseDialogueLine(line: string, index: number): SubtitleItem | null {
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

    // Standard ASS Dialogue format has 10 fields:
    // Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    // Index mapping: 0=Layer, 1=Start, 2=End, 3=Style, 4=Name, 5=MarginL, 6=MarginR, 7=MarginV, 8=Effect, 9=Text

    if (parts.length < 10) {
      console.warn('Dialogue line has fewer than 10 fields:', line)
      return null
    }

    const startTime = assTimeToMs(parts[1])
    const endTime = assTimeToMs(parts[2])

    return {
      id: `ass-${index}-${Date.now()}`,
      startTime,
      endTime,
      text: stripAssTags(parts[9] || ''),
      style: parts[3] || 'Default',
      effect: parts[8] || undefined,
    }
  } catch (e) {
    console.error('Failed to parse dialogue line:', line, e)
    return null
  }
}

function stripAssTags(text: string): string {
  // Remove basic ASS tags like {\b1}, {\i1}, {\fs20}, etc.
  return text.replace(/\{[^}]*\}/g, '').trim()
}

export function serializeAss(file: Partial<SubtitleFile>): string {
  const lines: string[] = []

  // Script Info section
  lines.push('[Script Info]')
  lines.push(`; Script generated by SubtitleShop`)

  if (file.scriptInfo) {
    for (const [key, value] of Object.entries(file.scriptInfo)) {
      lines.push(`${key}: ${value}`)
    }
  }

  // Add required fields if not present
  if (!file.scriptInfo?.['ScriptType']) {
    lines.push('ScriptType: v4.00+')
  }
  if (!file.scriptInfo?.['Collisions']) {
    lines.push('Collisions: Normal')
  }
  if (!file.scriptInfo?.['PlayDepth']) {
    lines.push('PlayDepth: 0')
  }

  lines.push('')

  // V4+ Styles section
  lines.push('[V4+ Styles]')
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')

  const styles = file.styles || [DEFAULT_STYLE]
  for (const style of styles) {
    lines.push(serializeStyle(style))
  }

  lines.push('')

  // Events section
  lines.push('[Events]')
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')

  const items = file.items || []
  for (let i = 0; i < items.length; i++) {
    const line = serializeDialogue(items[i], i)
    if (line) lines.push(line)
  }

  return lines.join('\n')
}

function serializeStyle(style: AssStyle): string {
  const fields = [
    style.name,
    style.fontName,
    style.fontSize.toString(),
    style.primaryColor,
    style.secondaryColor,
    style.outlineColor,
    style.backColor,
    style.bold ? '-1' : '0',
    style.italic ? '-1' : '0',
    style.underline ? '-1' : '0',
    style.strikeOut ? '-1' : '0',
    style.scaleX.toString(),
    style.scaleY.toString(),
    style.spacing.toString(),
    style.angle.toString(),
    style.borderStyle.toString(),
    style.outline.toString(),
    style.shadow.toString(),
    style.alignment.toString(),
    style.marginL.toString(),
    style.marginR.toString(),
    style.marginV.toString(),
    style.encoding.toString(),
  ]
  return `Style: ${fields.join(', ')}`
}

function serializeDialogue(item: SubtitleItem, layer: number): string | null {
  if (item.startTime >= item.endTime) {
    return null
  }

  const fields = [
    layer.toString(),
    msToAssTime(item.startTime),
    msToAssTime(item.endTime),
    item.style || 'Default',
    '', // Name
    '0', // MarginL
    '0', // MarginR
    '0', // MarginV
    item.effect || '',
    item.text,
  ]
  return `Dialogue: ${fields.join(',')}`
}
