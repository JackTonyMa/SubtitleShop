import type { AssStyle } from '../core/models/AssStyle'
import type { SubtitleItem } from '../core/models/SubtitleItem'

export type BilingualRole = 'primary' | 'secondary' | 'neutral'

export interface StyleRoleInfo {
  role: BilingualRole
  confidence: number
  reason: string
}

interface StyleStats {
  name: string
  total: number
  cjkCount: number
  latinCount: number
  mixedCount: number
  pairedCount: number
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text)
}

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text)
}

function getLanguageType(text: string): 'cjk' | 'latin' | 'mixed' | 'unknown' {
  const cjk = hasCjk(text)
  const latin = hasLatin(text)
  if (cjk && !latin) return 'cjk'
  if (!cjk && latin) return 'latin'
  if (cjk && latin) return 'mixed'
  return 'unknown'
}

function overlapRatio(a: SubtitleItem, b: SubtitleItem): number {
  const overlap = Math.max(0, Math.min(a.endTime, b.endTime) - Math.max(a.startTime, b.startTime))
  if (overlap <= 0) return 0
  const base = Math.min(a.endTime - a.startTime, b.endTime - b.startTime)
  return base <= 0 ? 0 : overlap / base
}

export function detectBilingualStyleRoles(
  items: SubtitleItem[],
  styles: AssStyle[]
): Record<string, StyleRoleInfo> {
  const statsMap = new Map<string, StyleStats>()
  const styleMap = new Map(styles.map(style => [style.name, style]))

  for (const style of styles) {
    statsMap.set(style.name, {
      name: style.name,
      total: 0,
      cjkCount: 0,
      latinCount: 0,
      mixedCount: 0,
      pairedCount: 0,
    })
  }

  const validItems = items
    .filter(item => item.style && statsMap.has(item.style))
    .sort((a, b) => a.startTime - b.startTime)

  for (const item of validItems) {
    const styleName = item.style as string
    const stats = statsMap.get(styleName)!
    stats.total++
    const lang = getLanguageType(item.text)
    if (lang === 'cjk') stats.cjkCount++
    if (lang === 'latin') stats.latinCount++
    if (lang === 'mixed') stats.mixedCount++
  }

  // Pair detection by overlap and language contrast.
  for (let i = 0; i < validItems.length; i++) {
    const a = validItems[i]
    const aStyle = a.style as string
    const aLang = getLanguageType(a.text)
    if (aLang === 'unknown') continue

    for (let j = i + 1; j < validItems.length; j++) {
      const b = validItems[j]
      const bStyle = b.style as string
      if (aStyle === bStyle) continue
      if (b.startTime - a.endTime > 500) break

      const ratio = overlapRatio(a, b)
      if (ratio < 0.7) continue

      const bLang = getLanguageType(b.text)
      const contrasted =
        (aLang === 'cjk' && bLang === 'latin') ||
        (aLang === 'latin' && bLang === 'cjk')

      if (contrasted) {
        statsMap.get(aStyle)!.pairedCount++
        statsMap.get(bStyle)!.pairedCount++
      }
    }
  }

  const statsList = Array.from(statsMap.values()).filter(s => s.total > 0)
  const result: Record<string, StyleRoleInfo> = {}

  if (statsList.length === 0) {
    for (const style of styles) {
      result[style.name] = { role: 'neutral', confidence: 0, reason: '无字幕引用此样式' }
    }
    return result
  }

  const primaryCandidate = [...statsList]
    .sort((a, b) => (b.cjkCount + b.pairedCount) - (a.cjkCount + a.pairedCount))[0]
  const secondaryCandidate = [...statsList]
    .sort((a, b) => (b.latinCount + b.pairedCount) - (a.latinCount + a.pairedCount))[0]

  for (const style of styles) {
    const stats = statsMap.get(style.name)!
    const infoStyle = styleMap.get(style.name)!
    if (stats.total === 0) {
      result[style.name] = { role: 'neutral', confidence: 0, reason: '无字幕引用此样式' }
      continue
    }

    const cjkRatio = stats.cjkCount / stats.total
    const latinRatio = stats.latinCount / stats.total
    const pairedBonus = Math.min(0.3, stats.pairedCount / Math.max(1, stats.total))

    if (style.name === primaryCandidate?.name && cjkRatio >= latinRatio) {
      result[style.name] = {
        role: 'primary',
        confidence: Number(Math.min(0.98, 0.55 + cjkRatio * 0.35 + pairedBonus).toFixed(2)),
        reason: `中文占比高(${Math.round(cjkRatio * 100)}%)，且存在时间重叠双语对`,
      }
      continue
    }

    if (style.name === secondaryCandidate?.name && latinRatio >= cjkRatio) {
      const fontHint = infoStyle.fontSize <= (primaryCandidate ? (styleMap.get(primaryCandidate.name)?.fontSize ?? infoStyle.fontSize) : infoStyle.fontSize)
      result[style.name] = {
        role: 'secondary',
        confidence: Number(Math.min(0.98, 0.5 + latinRatio * 0.35 + pairedBonus + (fontHint ? 0.05 : 0)).toFixed(2)),
        reason: `英文占比高(${Math.round(latinRatio * 100)}%)，且存在时间重叠双语对`,
      }
      continue
    }

    result[style.name] = {
      role: 'neutral',
      confidence: Number(Math.max(cjkRatio, latinRatio).toFixed(2)),
      reason: '语言特征不明显或用于通用文本',
    }
  }

  return result
}
