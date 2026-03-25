import { describe, it, expect } from 'vitest'
import { createSubtitleItem } from '../SubtitleItem'

describe('SubtitleItem', () => {
  it('should create a subtitle item with default values', () => {
    const item = createSubtitleItem({
      startTime: 1000,
      endTime: 3000,
      text: 'Hello',
    })

    expect(item.startTime).toBe(1000)
    expect(item.endTime).toBe(3000)
    expect(item.text).toBe('Hello')
    expect(item.id).toBeDefined()
    expect(item.style).toBeUndefined()
    expect(item.effect).toBeUndefined()
  })

  it('should validate time range', () => {
    expect(() =>
      createSubtitleItem({
        startTime: 5000,
        endTime: 3000,
        text: 'Invalid',
      })
    ).toThrow('Start time must be less than end time')
  })
})
