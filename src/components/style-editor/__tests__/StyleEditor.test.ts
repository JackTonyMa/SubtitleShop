import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StyleEditor from '../StyleEditor.vue'
import { useSubtitleStore } from '../../../stores/subtitle'
import { createAssStyle } from '../../../core/models/AssStyle'

describe('StyleEditor', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('keeps updating style after renaming it', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSubtitleStore()

    store.styles = [createAssStyle({ name: 'Default', fontName: 'Arial' })]

    const wrapper = mount(StyleEditor, {
      global: {
        plugins: [pinia],
      },
    })

    const styleNameInput = wrapper.find('input[placeholder="输入样式名称"]')
    const fontNameInput = wrapper.find('input[placeholder="输入或选择字体名称"]')
    expect(styleNameInput.exists()).toBe(true)
    expect(fontNameInput.exists()).toBe(true)

    await styleNameInput.setValue('Renamed')
    await fontNameInput.setValue('Verdana')
    await fontNameInput.trigger('blur')  // commit font display draft to store
    await wrapper.find('button.save-btn').trigger('click')

    expect(store.styles[0].name).toBe('Renamed')
    expect(store.styles[0].fontName).toBe('Verdana')
  })
})
