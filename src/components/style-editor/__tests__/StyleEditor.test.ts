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

    const textInputs = wrapper.findAll('input[type="text"]')
    expect(textInputs.length).toBeGreaterThanOrEqual(2)

    await textInputs[0].setValue('Renamed')
    await textInputs[1].setValue('Verdana')

    expect(store.styles[0].name).toBe('Renamed')
    expect(store.styles[0].fontName).toBe('Verdana')
  })
})
