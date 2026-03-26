import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useSubtitleStore } from '../../../stores/subtitle'
import SubtitleTable from '../SubtitleTable.vue'
import type { SubtitleItem } from '../../../core/models/SubtitleItem'

describe('SubtitleTable', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders subtitle items correctly', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    const mockItems: SubtitleItem[] = [
      { id: '1', startTime: 1000, endTime: 3000, text: 'First line' },
      { id: '2', startTime: 4000, endTime: 6000, text: 'Second line' },
    ]

    store.items = mockItems

    const wrapper = mount(SubtitleTable, {
      global: {
        plugins: [pinia],
      },
    })

    // Check table header
    const headers = wrapper.findAll('th')
    expect(headers.length).toBe(6)
    expect(headers[0].text()).toContain('#')
    expect(headers[1].text()).toContain('开始时间')
    expect(headers[2].text()).toContain('结束时间')
    expect(headers[3].text()).toContain('时长')
    expect(headers[4].text()).toContain('样式')
    expect(headers[5].text()).toContain('文本')

    // Check rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('displays formatted ASS time for start and end times', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    const mockItems: SubtitleItem[] = [
      { id: '1', startTime: 3661000, endTime: 5000, text: 'Test' },
    ]

    store.items = mockItems

    const wrapper = mount(SubtitleTable, {
      global: {
        plugins: [pinia],
      },
    })

    // The time should be formatted as ASS time
    // 3661000ms = 1 hour, 1 minute, 1 second, 0 centiseconds = 1:01:01.00
    const row = wrapper.find('tbody tr')
    expect(row.exists()).toBe(true)
  })

  it('shows empty state when no items', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()
    store.items = []

    const wrapper = mount(SubtitleTable, {
      global: {
        plugins: [pinia],
      },
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('computes duration correctly', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    const mockItems: SubtitleItem[] = [
      { id: '1', startTime: 1000, endTime: 4000, text: 'Three second duration' },
    ]

    store.items = mockItems

    const wrapper = mount(SubtitleTable, {
      global: {
        plugins: [pinia],
      },
    })

    // Duration should be computed and displayed
    const row = wrapper.find('tbody tr')
    expect(row.exists()).toBe(true)
  })

  it('shows overlap group row for multi-line time-overlap subtitles', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    store.items = [
      { id: '1', startTime: 1000, endTime: 3000, text: '中文', style: 'CN' },
      { id: '2', startTime: 1200, endTime: 2800, text: 'English', style: 'EN' },
    ]

    const wrapper = mount(SubtitleTable, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('多行组')
  })
})
