import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFileExport, buildDefaultExportFilename } from '../useFileExport'
import { useSubtitleStore } from '../../stores/subtitle'
import { createSubtitleFile } from '../../core/models/SubtitleFile'

describe('useFileExport', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.useRealTimers()
  })

  it('builds the default export filename from timestamp and original filename', () => {
    const filename = buildDefaultExportFilename('episode01.ass', 'ass', new Date('2026-04-13T11:56:07'))
    expect(filename).toBe('Edited_2026年04月13日11时56分07秒_episode01.ass')
  })

  it('exports with the generated default filename', () => {
    const store = useSubtitleStore()
    store.loadFile(createSubtitleFile({
      filename: 'episode01.ass',
      format: 'ass',
      items: [
        {
          id: '1',
          startTime: 0,
          endTime: 1000,
          text: 'Hello',
        },
      ],
      styles: [],
      scriptInfo: {},
    }))

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn(() => {})
    const clickSpy = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        const anchor = document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
        anchor.click = clickSpy
        return anchor
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    }) as typeof document.createElement)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T11:56:07'))

    const { exportFile } = useFileExport()
    exportFile()

    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement
    expect(anchor.download).toBe('Edited_2026年04月13日11时56分07秒_episode01.ass')
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith(anchor)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    vi.useRealTimers()
    createElementSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })
})
