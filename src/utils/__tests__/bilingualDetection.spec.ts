import { describe, it, expect } from 'vitest'
import { detectBilingualStyleRoles } from '../bilingualDetection'
import { createAssStyle } from '../../core/models/AssStyle'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

describe('detectBilingualStyleRoles', () => {
  it('detects likely primary and secondary styles from overlapping bilingual lines', () => {
    const styles = [
      createAssStyle({ name: 'CN', fontSize: 32 }),
      createAssStyle({ name: 'EN', fontSize: 22 }),
    ]

    const items: SubtitleItem[] = [
      { id: '1', startTime: 1000, endTime: 3000, text: '现在开始', style: 'CN' },
      { id: '2', startTime: 1000, endTime: 3000, text: 'Start now', style: 'EN' },
      { id: '3', startTime: 4000, endTime: 6000, text: '你准备好了吗', style: 'CN' },
      { id: '4', startTime: 4000, endTime: 6000, text: 'Are you ready?', style: 'EN' },
    ]

    const roles = detectBilingualStyleRoles(items, styles)

    expect(roles.CN.role).toBe('primary')
    expect(roles.EN.role).toBe('secondary')
    expect(roles.CN.confidence).toBeGreaterThan(0.6)
    expect(roles.EN.confidence).toBeGreaterThan(0.6)
  })
})
