import { describe, it, expect } from 'vitest'
import { createSubtitleFile } from '../SubtitleFile'
import { createSubtitleItem } from '../SubtitleItem'

describe('SubtitleFile', () => {
  it('should create empty subtitle file', () => {
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
    })

    expect(file.filename).toBe('test.ass')
    expect(file.format).toBe('ass')
    expect(file.items).toEqual([])
    expect(file.styles).toEqual([])
    expect(file.createdAt).toBeDefined()
    expect(file.updatedAt).toBeDefined()
  })

  it('should create subtitle file with items', () => {
    const item = createSubtitleItem({
      startTime: 1000,
      endTime: 3000,
      text: 'Test',
    })

    const file = createSubtitleFile({
      filename: 'test.srt',
      format: 'srt',
      items: [item],
    })

    expect(file.items).toHaveLength(1)
    expect(file.items[0].text).toBe('Test')
  })
})
