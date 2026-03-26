import type { SubtitleFile, SubtitleFileParams } from '../../core/models/SubtitleFile'
import type { SubtitleItem } from '../../core/models/SubtitleItem'
import { AssStyle, createAssStyle, DEFAULT_STYLE } from '../../core/models/AssStyle'
import { assTimeToMs, msToAssTime } from '../../utils/time'

interface AssScriptInfo {
  [key: string]: string
}

const DEFAULT_STYLE_FORMAT = 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding'
const DEFAULT_EVENTS_FORMAT = 'Format: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text'

export interface AssStyleCandidate {
  id: string
  name: string
  line: string
  sectionOccurrence: number
  lineNumber: number
}

export interface AssStructureAnalysis {
  duplicateStyleSections: number
  duplicateEventSections: number
  extraStyleFormatLines: number
  extraEventFormatLines: number
  hasIssues: boolean
}

export function collectAssStyleCandidates(content: string): AssStyleCandidate[] {
  const lines = content.split(/\r?\n/)
  const candidates: AssStyleCandidate[] = []
  let index = 0
  let section: string | null = null
  let styleSectionOccurrence = 0

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      section = trimmed.slice(1, -1).toLowerCase()
      if (section === 'v4+ styles' || section === 'v4 styles') {
        styleSectionOccurrence += 1
      }
      continue
    }

    if (!trimmed.startsWith('Style:')) continue
    const body = trimmed.slice('Style:'.length).trim()
    const name = body.split(',')[0]?.trim() || `Style${index + 1}`
    candidates.push({
      id: `style-${index++}`,
      name,
      line: trimmed,
      sectionOccurrence:
        section === 'v4+ styles' || section === 'v4 styles'
          ? Math.max(styleSectionOccurrence, 1)
          : 0,
      lineNumber: i + 1,
    })
  }

  return candidates
}

export function hasScatteredStyleCandidates(candidates: AssStyleCandidate[]): boolean {
  if (candidates.length <= 1) return false
  const inSection = candidates.filter(item => item.sectionOccurrence > 0)
  const uniqueSectionCount = new Set(inSection.map(item => item.sectionOccurrence)).size
  const hasOutsideStyleSection = candidates.some(item => item.sectionOccurrence === 0)
  return uniqueSectionCount > 1 || hasOutsideStyleSection
}

export function normalizeAssStructureWithSelectedStyles(
  content: string,
  selectedStyleIds?: string[]
): string {
  const lines = content.split(/\r?\n/)
  const selectedSet = selectedStyleIds ? new Set(selectedStyleIds) : null
  const styleCandidates = collectAssStyleCandidates(content)
  const selectedIdSet = new Set(selectedStyleIds || styleCandidates.map(candidate => candidate.id))
  let styleCandidateCursor = 0

  interface StyleSectionData {
    format: string
    styleLines: string[]
  }
  interface EventSectionData {
    format: string
    eventLines: string[]
  }

  const styleSections: StyleSectionData[] = []
  const eventSections: EventSectionData[] = []
  let section: string | null = null
  const preserved: string[] = []

  for (const raw of lines) {
    const trimmed = raw.trim()

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const sec = trimmed.slice(1, -1).toLowerCase()
      section = sec

      // Drop duplicated styles/events sections in final normalized output.
      if (sec === 'v4+ styles' || sec === 'v4 styles') {
        styleSections.push({
          format: '',
          styleLines: [],
        })
        continue
      }
      if (sec === 'events') {
        eventSections.push({
          format: '',
          eventLines: [],
        })
        continue
      }

      preserved.push(raw)
      continue
    }

    if (trimmed.startsWith('Format:')) {
      if ((section === 'v4+ styles' || section === 'v4 styles') && styleSections.length > 0) {
        if (!styleSections[styleSections.length - 1].format) {
          styleSections[styleSections.length - 1].format = trimmed
        }
        continue
      }
      if (section === 'events' && eventSections.length > 0) {
        if (!eventSections[eventSections.length - 1].format) {
          eventSections[eventSections.length - 1].format = trimmed
        }
        continue
      }
      preserved.push(raw)
      continue
    }

    if ((section === 'v4+ styles' || section === 'v4 styles') && trimmed.startsWith('Style:')) {
      const current = styleSections[styleSections.length - 1]
      if (current) current.styleLines.push(trimmed)
      continue
    }

    if (section === 'events' && trimmed) {
      const current = eventSections[eventSections.length - 1]
      if (current) current.eventLines.push(trimmed)
      continue
    }

    preserved.push(raw)
  }

  const canonicalStyleFormat =
    styleSections.find(item => item.format)?.format || DEFAULT_STYLE_FORMAT
  const canonicalEventsFormat =
    eventSections.find(item => item.format)?.format || DEFAULT_EVENTS_FORMAT

  const usedStyleNames = new Set<string>()
  const mergedStyleLines: string[] = []
  const styleRenameMapsBySection: Array<Map<string, string>> = []

  for (const styleSection of styleSections) {
    const renameMap = new Map<string, string>()
    for (const line of styleSection.styleLines) {
      const candidate = styleCandidates[styleCandidateCursor++]
      if (selectedSet && candidate && !selectedIdSet.has(candidate.id)) continue

      const oldName = extractStyleName(line)
      if (!oldName) continue

      const targetName = makeUniqueStyleName(oldName, usedStyleNames)
      renameMap.set(oldName, targetName)
      mergedStyleLines.push(oldName === targetName ? line : renameStyleLineName(line, targetName))
    }
    styleRenameMapsBySection.push(renameMap)
  }

  const mergedEventLines: string[] = []
  const fallbackMap = styleRenameMapsBySection[styleRenameMapsBySection.length - 1] || new Map<string, string>()
  for (let i = 0; i < eventSections.length; i++) {
    const eventSection = eventSections[i]
    const renameMap = styleRenameMapsBySection[i] || fallbackMap
    const styleFieldIndex = getStyleFieldIndex(eventSection.format || canonicalEventsFormat)
    for (const line of eventSection.eventLines) {
      mergedEventLines.push(remapEventStyle(line, styleFieldIndex, renameMap))
    }
  }

  const output: string[] = []
  const cleanPreserved = preserved
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (cleanPreserved) {
    output.push(cleanPreserved)
    output.push('')
  }

  output.push('[V4+ Styles]')
  output.push(canonicalStyleFormat)
  for (const line of mergedStyleLines) {
    output.push(line)
  }
  output.push('')

  output.push('[Events]')
  output.push(canonicalEventsFormat)
  for (const line of mergedEventLines) {
    output.push(line)
  }

  if (selectedSet && selectedSet.size === 0) {
    return output.join('\n')
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

function extractStyleName(styleLine: string): string {
  const body = styleLine.slice('Style:'.length).trim()
  return body.split(',')[0]?.trim() || ''
}

function makeUniqueStyleName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName)
    return baseName
  }

  let index = 2
  let candidate = `${baseName}${index}`
  while (usedNames.has(candidate)) {
    index += 1
    candidate = `${baseName}${index}`
  }
  usedNames.add(candidate)
  return candidate
}

function renameStyleLineName(styleLine: string, newName: string): string {
  const body = styleLine.slice('Style:'.length).trim()
  const parts = body.split(',')
  if (parts.length === 0) return styleLine
  parts[0] = newName
  return `Style: ${parts.join(',')}`
}

function getStyleFieldIndex(formatLine: string): number {
  const body = formatLine.replace(/^Format:\s*/i, '')
  const fields = body.split(',').map(item => item.trim().toLowerCase())
  const styleIndex = fields.findIndex(item => item === 'style')
  return styleIndex >= 0 ? styleIndex : 3
}

function splitAssWithLimit(input: string, expectedFields: number): string[] {
  if (expectedFields <= 1) return [input]

  const fields: string[] = []
  let cursor = 0
  for (let i = 0; i < expectedFields - 1; i++) {
    const commaIndex = input.indexOf(',', cursor)
    if (commaIndex === -1) {
      fields.push(input.slice(cursor))
      cursor = input.length
      break
    }
    fields.push(input.slice(cursor, commaIndex))
    cursor = commaIndex + 1
  }
  fields.push(input.slice(cursor))
  return fields
}

function remapEventStyle(line: string, styleFieldIndex: number, renameMap: Map<string, string>): string {
  const match = line.match(/^(\w+):\s*(.*)$/)
  if (!match) return line

  const prefix = match[1]
  const payload = match[2]
  const fields = splitAssWithLimit(payload, Math.max(styleFieldIndex + 1, 10))
  if (fields.length <= styleFieldIndex) return line

  const originalStyle = fields[styleFieldIndex].trim()
  const mapped = renameMap.get(originalStyle)
  if (!mapped || mapped === originalStyle) return line

  fields[styleFieldIndex] = mapped
  return `${prefix}: ${fields.join(',')}`
}

export function normalizeAssStructureText(content: string): string {
  return normalizeAssStructureWithSelectedStyles(content)
}

export function analyzeAssStructure(content: string): AssStructureAnalysis {
  const lines = content.split(/\r?\n/)
  let section: string | null = null
  let styleSections = 0
  let eventSections = 0
  let styleFormatLines = 0
  let eventFormatLines = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase()
      if (section === 'v4+ styles' || section === 'v4 styles') styleSections++
      if (section === 'events') eventSections++
      continue
    }

    if (line.startsWith('Format:')) {
      if (section === 'v4+ styles' || section === 'v4 styles') styleFormatLines++
      if (section === 'events') eventFormatLines++
    }
  }

  const duplicateStyleSections = Math.max(0, styleSections - 1)
  const duplicateEventSections = Math.max(0, eventSections - 1)
  const extraStyleFormatLines = Math.max(0, styleFormatLines - 1)
  const extraEventFormatLines = Math.max(0, eventFormatLines - 1)

  return {
    duplicateStyleSections,
    duplicateEventSections,
    extraStyleFormatLines,
    extraEventFormatLines,
    hasIssues:
      duplicateStyleSections > 0 ||
      duplicateEventSections > 0 ||
      extraStyleFormatLines > 0 ||
      extraEventFormatLines > 0,
  }
}

export function parseAss(content: string): Omit<SubtitleFileParams, 'filename' | 'format'> {
  const lines = content.split(/\r?\n/)

  const scriptInfo: AssScriptInfo = {}
  const styleMap = new Map<string, AssStyle>()
  const styleOrder: string[] = []
  const items: SubtitleItem[] = []

  let section: string | null = null
  let lineIndex = 0
  let eventFormatFields: string[] = []

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
        if (style) {
          if (!styleMap.has(style.name)) {
            styleOrder.push(style.name)
          }
          styleMap.set(style.name, style)
        }
      }
      continue
    }

    // Parse Events section
    if (section === 'events') {
      if (trimmed.startsWith('Format:')) {
        eventFormatFields = parseFormatFields(trimmed)
        continue
      }
      if (trimmed.startsWith('Dialogue:')) {
        const item = parseDialogueLine(trimmed, lineIndex++, eventFormatFields)
        if (item) items.push(item)
      }
      continue
    }
  }

  const styles = styleOrder.map(name => styleMap.get(name)!).filter(Boolean)

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
      fontSize: parseIntWithFallback(parts[2], DEFAULT_STYLE.fontSize),
      primaryColor: parts[3] || DEFAULT_STYLE.primaryColor,
      secondaryColor: parts[4] || DEFAULT_STYLE.secondaryColor,
      outlineColor: parts[5] || DEFAULT_STYLE.outlineColor,
      backColor: parts[6] || DEFAULT_STYLE.backColor,
      bold: parseAssBoolean(parts[7]),
      italic: parseAssBoolean(parts[8]),
      underline: parseAssBoolean(parts[9]),
      strikeOut: parseAssBoolean(parts[10]),
      scaleX: parseIntWithFallback(parts[11], DEFAULT_STYLE.scaleX),
      scaleY: parseIntWithFallback(parts[12], DEFAULT_STYLE.scaleY),
      spacing: parseFloatWithFallback(parts[13], DEFAULT_STYLE.spacing),
      angle: parseFloatWithFallback(parts[14], DEFAULT_STYLE.angle),
      borderStyle: parseIntWithFallback(parts[15], DEFAULT_STYLE.borderStyle),
      outline: parseFloatWithFallback(parts[16], DEFAULT_STYLE.outline),
      shadow: parseFloatWithFallback(parts[17], DEFAULT_STYLE.shadow),
      alignment: parseIntWithFallback(parts[18], DEFAULT_STYLE.alignment),
      marginL: parseIntWithFallback(parts[19], DEFAULT_STYLE.marginL),
      marginR: parseIntWithFallback(parts[20], DEFAULT_STYLE.marginR),
      marginV: parseIntWithFallback(parts[21], DEFAULT_STYLE.marginV),
      encoding: parseIntWithFallback(parts[22], DEFAULT_STYLE.encoding),
    })
  } catch (e) {
    console.error('Failed to parse style line:', line, e)
    return null
  }
}

function parseIntWithFallback(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function parseFloatWithFallback(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

function parseAssBoolean(value: string): boolean {
  if (!value) return false
  return value === '-1' || value.toLowerCase() === 'true'
}

function parseDialogueLine(line: string, index: number, formatFields: string[]): SubtitleItem | null {
  try {
    const dialogueMatch = line.match(/^Dialogue:\s*(.+)$/)
    if (!dialogueMatch) return null

    const fullContent = dialogueMatch[1]
    const fields = formatFields.length > 0
      ? formatFields
      : ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text']
    const expectedFieldCount = Math.max(fields.length, 10)
    const textIndex = fields.indexOf('text')
    const parsed = splitAssWithLimit(fullContent, expectedFieldCount)
    const parts = parsed.map((part, fieldIndex) => (
      textIndex >= 0 && fieldIndex === textIndex && textIndex === expectedFieldCount - 1
        ? part
        : part.trim()
    ))

    if (parts.length < expectedFieldCount) {
      console.warn('Dialogue line has fewer fields than format:', line)
      return null
    }

    const layerIndex = getFormatFieldIndex(fields, ['layer'], 0)
    const startIndex = getFormatFieldIndex(fields, ['start'], 1)
    const endIndex = getFormatFieldIndex(fields, ['end'], 2)
    const styleIndex = getFormatFieldIndex(fields, ['style'], 3)
    const effectIndex = getFormatFieldIndex(fields, ['effect'], 8)
    const resolvedTextIndex = textIndex >= 0 ? textIndex : expectedFieldCount - 1

    const startTime = assTimeToMs(parts[startIndex] || '0:00:00.00')
    const endTime = assTimeToMs(parts[endIndex] || '0:00:00.00')

    const rawText = parts[resolvedTextIndex] || ''
    return {
      id: `ass-${index}-${Date.now()}`,
      layer: parseIntWithFallback(parts[layerIndex], 0),
      startTime,
      endTime,
      text: stripAssTags(rawText),
      style: parts[styleIndex] || 'Default',
      effect: parts[effectIndex] || undefined,
      assText: rawText,
      hasInlineOverrides: /\{\\[^}]+\}/.test(rawText),
    }
  } catch (e) {
    console.error('Failed to parse dialogue line:', line, e)
    return null
  }
}

function parseFormatFields(formatLine: string): string[] {
  const body = formatLine.replace(/^Format:\s*/i, '')
  return body.split(',').map(item => item.trim().toLowerCase())
}

function getFormatFieldIndex(fields: string[], aliases: string[], fallback: number): number {
  for (const alias of aliases) {
    const idx = fields.indexOf(alias)
    if (idx >= 0) return idx
  }
  return fallback
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
  const styleNameSet = new Set(styles.map(style => style.name))
  const fallbackStyleName = styleNameSet.has('Default')
    ? 'Default'
    : (styles[0]?.name || 'Default')
  for (const style of styles) {
    lines.push(serializeStyle(style))
  }

  lines.push('')

  // Events section
  lines.push('[Events]')
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')

  const items = file.items || []
  for (let i = 0; i < items.length; i++) {
    const line = serializeDialogue(items[i], styleNameSet, fallbackStyleName)
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
  return `Style: ${fields.join(',')}`
}

function serializeDialogue(
  item: SubtitleItem,
  styleNameSet: Set<string>,
  fallbackStyleName: string
): string | null {
  if (item.startTime >= item.endTime) {
    return null
  }

  const resolvedLayer = typeof item.layer === 'number' && Number.isFinite(item.layer)
    ? Math.trunc(item.layer)
    : 0
  const resolvedStyleName = item.style && styleNameSet.has(item.style)
    ? item.style
    : fallbackStyleName
  const textContent = item.hasInlineOverrides && item.assText && stripAssTags(item.assText) === item.text
    ? item.assText
    : item.text

  const fields = [
    resolvedLayer.toString(),
    msToAssTime(item.startTime),
    msToAssTime(item.endTime),
    resolvedStyleName,
    '', // Name
    '0', // MarginL
    '0', // MarginR
    '0', // MarginV
    item.effect || '',
    textContent,
  ]
  return `Dialogue: ${fields.join(',')}`
}
