import { describe, it, expect } from 'vitest'
import { buildSideBySideDiff } from '../diff'

describe('buildSideBySideDiff', () => {
  it('aligns add/remove/change rows with LCS', () => {
    const original = ['A', 'B', 'C', 'D'].join('\n')
    const current = ['A', 'BX', 'C', 'E'].join('\n')

    const rows = buildSideBySideDiff(original, current)
    const types = rows.map(r => r.type)

    expect(types).toEqual(['equal', 'change', 'equal', 'change'])
    expect(rows[1].originalText).toBe('B')
    expect(rows[1].currentText).toBe('BX')
    expect(rows[3].originalText).toBe('D')
    expect(rows[3].currentText).toBe('E')
  })
})
