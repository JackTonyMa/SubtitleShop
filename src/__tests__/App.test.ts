import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'
import { useSubtitleStore } from '../stores/subtitle'
import { createSubtitleFile } from '../core/models/SubtitleFile'

function createMockSubtitleFile(filename = 'demo.ass') {
  return createSubtitleFile({
    filename,
    format: 'ass',
    items: [
      {
        id: '1',
        startTime: 0,
        endTime: 1000,
        text: 'hello',
        style: 'Default',
      },
    ],
    styles: [],
    scriptInfo: {},
  })
}

describe('App', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('returns to the styles home after closing and reopening a file', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    store.loadFile(createMockSubtitleFile())

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
      },
    })

    const buttons = () => wrapper.findAll('button')
    const findButtonByText = (label: string) => buttons().find(button => button.text().trim() === label)

    const tableViewButton = findButtonByText('表格视图')
    expect(tableViewButton).toBeDefined()
    await tableViewButton!.trigger('click')
    expect(wrapper.text()).toContain('表格视图')

    const closeButton = findButtonByText('关闭')
    expect(closeButton).toBeDefined()
    await closeButton!.trigger('click')
    expect(store.hasFile).toBe(false)
    expect(wrapper.text()).toContain('导入字幕文件')

    store.loadFile(createMockSubtitleFile('reopened.ass'))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('reopened.ass')
    expect(wrapper.text()).toContain('样式设置')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
