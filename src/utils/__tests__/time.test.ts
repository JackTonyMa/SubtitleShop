import { describe, it, expect } from 'vitest'
import {
  msToAssTime,
  msToSrtTime,
  assTimeToMs,
  srtTimeToMs,
  parseAssTime,
  parseSrtTime,
} from '../time'

describe('time utilities', () => {
  describe('msToAssTime', () => {
    it('converts milliseconds to ASS time format', () => {
      expect(msToAssTime(0)).toBe('0:00:00.00')
      expect(msToAssTime(1000)).toBe('0:00:01.00')
      expect(msToAssTime(5000)).toBe('0:00:05.00')
      expect(msToAssTime(60000)).toBe('0:01:00.00')
      expect(msToAssTime(61000)).toBe('0:01:01.00')
      expect(msToAssTime(3600000)).toBe('1:00:00.00')
    })

    it('handles centiseconds correctly', () => {
      expect(msToAssTime(50)).toBe('0:00:00.05')
      expect(msToAssTime(550)).toBe('0:00:00.55')
      expect(msToAssTime(1550)).toBe('0:00:01.55')
    })

    it('pads minutes and seconds with leading zeros', () => {
      expect(msToAssTime(61000)).toBe('0:01:01.00')
      expect(msToAssTime(3661000)).toBe('1:01:01.00')
    })

    it('handles hours greater than 9', () => {
      expect(msToAssTime(36000000)).toBe('10:00:00.00')
      expect(msToAssTime(36610000)).toBe('10:10:10.00')
    })
  })

  describe('msToSrtTime', () => {
    it('converts milliseconds to SRT time format', () => {
      expect(msToSrtTime(0)).toBe('00:00:00,000')
      expect(msToSrtTime(1000)).toBe('00:00:01,000')
      expect(msToSrtTime(5000)).toBe('00:00:05,000')
      expect(msToSrtTime(60000)).toBe('00:01:00,000')
      expect(msToSrtTime(61000)).toBe('00:01:01,000')
      expect(msToSrtTime(3600000)).toBe('01:00:00,000')
    })

    it('handles milliseconds correctly', () => {
      expect(msToSrtTime(5)).toBe('00:00:00,005')
      expect(msToSrtTime(50)).toBe('00:00:00,050')
      expect(msToSrtTime(550)).toBe('00:00:00,550')
      expect(msToSrtTime(1550)).toBe('00:00:01,550')
    })

    it('pads all components with leading zeros', () => {
      expect(msToSrtTime(61000)).toBe('00:01:01,000')
      expect(msToSrtTime(3661000)).toBe('01:01:01,000')
      expect(msToSrtTime(61005)).toBe('00:01:01,005')
    })
  })

  describe('assTimeToMs', () => {
    it('converts ASS time format to milliseconds', () => {
      expect(assTimeToMs('0:00:00.00')).toBe(0)
      expect(assTimeToMs('0:00:01.00')).toBe(1000)
      expect(assTimeToMs('0:01:00.00')).toBe(60000)
      expect(assTimeToMs('1:00:00.00')).toBe(3600000)
    })

    it('handles centiseconds correctly', () => {
      expect(assTimeToMs('0:00:00.05')).toBe(50)
      expect(assTimeToMs('0:00:00.55')).toBe(550)
      expect(assTimeToMs('0:00:01.55')).toBe(1550)
    })

    it('handles multi-digit hours', () => {
      expect(assTimeToMs('10:00:00.00')).toBe(36000000)
      expect(assTimeToMs('123:45:67.89')).toBe(123 * 3600000 + 45 * 60000 + 67 * 1000 + 89 * 10)
    })

    it('throws on invalid format', () => {
      expect(() => assTimeToMs('invalid')).toThrow('Invalid ASS time format: invalid')
      expect(() => assTimeToMs('0:0:0.0')).toThrow('Invalid ASS time format: 0:0:0.0')
      expect(() => assTimeToMs('0:00:00,00')).toThrow('Invalid ASS time format: 0:00:00,00')
      expect(() => assTimeToMs('abc')).toThrow('Invalid ASS time format: abc')
    })
  })

  describe('srtTimeToMs', () => {
    it('converts SRT time format to milliseconds', () => {
      expect(srtTimeToMs('00:00:00,000')).toBe(0)
      expect(srtTimeToMs('00:00:01,000')).toBe(1000)
      expect(srtTimeToMs('00:01:00,000')).toBe(60000)
      expect(srtTimeToMs('01:00:00,000')).toBe(3600000)
    })

    it('handles milliseconds correctly', () => {
      expect(srtTimeToMs('00:00:00,005')).toBe(5)
      expect(srtTimeToMs('00:00:00,050')).toBe(50)
      expect(srtTimeToMs('00:00:00,550')).toBe(550)
      expect(srtTimeToMs('00:00:01,550')).toBe(1550)
    })

    it('throws on invalid format', () => {
      expect(() => srtTimeToMs('invalid')).toThrow('Invalid SRT time format: invalid')
      expect(() => srtTimeToMs('0:00:00,000')).toThrow('Invalid SRT time format: 0:00:00,000')
      expect(() => srtTimeToMs('00:00:00.000')).toThrow('Invalid SRT time format: 00:00:00.000')
    })
  })

  describe('parseAssTime (alias)', () => {
    it('is an alias for assTimeToMs', () => {
      expect(parseAssTime).toBe(assTimeToMs)
      expect(parseAssTime('0:01:30.50')).toBe(90500)
    })
  })

  describe('parseSrtTime (alias)', () => {
    it('is an alias for srtTimeToMs', () => {
      expect(parseSrtTime).toBe(srtTimeToMs)
      expect(parseSrtTime('00:01:30,500')).toBe(90500)
    })
  })

  describe('round-trip conversion', () => {
    it('converts ASS time to ms and back', () => {
      const original = '1:23:45.67'
      const ms = assTimeToMs(original)
      const converted = msToAssTime(ms)
      expect(converted).toBe(original)
    })

    it('converts SRT time to ms and back', () => {
      const original = '01:23:45,678'
      const ms = srtTimeToMs(original)
      const converted = msToSrtTime(ms)
      expect(converted).toBe(original)
    })
  })
})
