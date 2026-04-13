import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StyleForm from '../StyleForm.vue'
import { createAssStyle } from '../../../core/models/AssStyle'

describe('StyleForm', () => {
  it('commits numeric inputs on blur without mangling multi-digit values', async () => {
    const wrapper = mount(StyleForm, {
      props: {
        modelValue: createAssStyle({ name: 'Default', fontSize: 20, outline: 2, shadow: 2 }),
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    })

    const numberInputs = wrapper.findAll('input.form-number-input')
    expect(numberInputs).toHaveLength(3)

    await numberInputs[0].setValue('10')
    expect((numberInputs[0].element as HTMLInputElement).value).toBe('10')
    await numberInputs[0].trigger('blur')

    const updates = wrapper.emitted('update:modelValue') || []
    expect(updates.at(-1)?.[0].fontSize).toBe(10)
  })

  it('filters illegal numeric characters but does not force-rewrite valid drafts', async () => {
    const wrapper = mount(StyleForm, {
      props: {
        modelValue: createAssStyle({ name: 'Default', fontSize: 20, outline: 2, shadow: 2 }),
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    })

    const numberInputs = wrapper.findAll('input.form-number-input')
    const fontSizeInput = numberInputs[0]
    const outlineInput = numberInputs[1]
    const shadowInput = numberInputs[2]

    ;(fontSizeInput.element as HTMLInputElement).value = '-12a'
    await fontSizeInput.trigger('input')
    expect((fontSizeInput.element as HTMLInputElement).value).toBe('12')
    await fontSizeInput.trigger('blur')

    ;(outlineInput.element as HTMLInputElement).value = '-1..7x'
    await outlineInput.trigger('input')
    expect((outlineInput.element as HTMLInputElement).value).toBe('1.7')
    await outlineInput.trigger('blur')

    ;(shadowInput.element as HTMLInputElement).value = '0.8.2'
    await shadowInput.trigger('input')
    expect((shadowInput.element as HTMLInputElement).value).toBe('0.82')
    await shadowInput.trigger('blur')

    const updates = wrapper.emitted('update:modelValue') || []
    expect(updates.some(([value]) => value.fontSize === 12)).toBe(true)
    expect(updates.some(([value]) => value.outline === 1.7)).toBe(true)
    expect(updates.some(([value]) => value.shadow === 0.82)).toBe(true)
  })

  it('commits typed color text back into the model on blur', async () => {
    const wrapper = mount(StyleForm, {
      props: {
        modelValue: createAssStyle({ name: 'Default' }),
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    })

    const colorInputs = wrapper.findAll('input.color-text-input')
    const primaryColorInput = colorInputs[0]
    const outlineColorInput = colorInputs[1]

    await primaryColorInput.setValue('#123456')
    await primaryColorInput.trigger('blur')
    await outlineColorInput.setValue('#abcdef')
    await outlineColorInput.trigger('blur')

    const updates = wrapper.emitted('update:modelValue') || []
    expect(updates.some(([value]) => value.primaryColor === '&H00563412')).toBe(true)
    expect(updates.some(([value]) => value.outlineColor === '&H00EFCDAB')).toBe(true)
  })

  it('normalizes font aliases to player-friendly family names', async () => {
    const wrapper = mount(StyleForm, {
      props: {
        modelValue: createAssStyle({ name: 'Default', fontName: 'Arial' }),
        'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
      },
    })

    const fontInput = wrapper.find('input[placeholder="输入或选择字体名称"]')
    expect(fontInput.exists()).toBe(true)

    await fontInput.setValue('苹方')
    await fontInput.trigger('blur')
    await fontInput.setValue('黑体')
    await fontInput.trigger('blur')

    const updates = wrapper.emitted('update:modelValue') || []
    expect(updates.some(([value]) => value.fontName === 'PingFang SC')).toBe(true)
    expect(updates.some(([value]) => value.fontName === 'SimHei')).toBe(true)
  })
})
