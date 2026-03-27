<script setup lang="ts">
import { computed } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss, cssToAssColor } from '../../utils/assColor'

const props = withDefaults(defineProps<{
  modelValue: AssStyle
  playResX?: number
  playResY?: number
  readonly?: boolean
}>(), {
  playResX: 1920,
  playResY: 1080,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: AssStyle): void
}>()

const style = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const primaryColorCss = computed({
  get: () => assColorToCss(style.value.primaryColor),
  set: (value: string) => {
    style.value = { ...style.value, primaryColor: cssToAssColor(value) }
  }
})

const outlineColorCss = computed({
  get: () => assColorToCss(style.value.outlineColor),
  set: (value: string) => {
    style.value = { ...style.value, outlineColor: cssToAssColor(value) }
  }
});

const styleName = computed({
  get: () => style.value.name,
  set: (value: string) => {
    updateStyle({ name: value })
  }
})

const fontName = computed({
  get: () => style.value.fontName,
  set: (value: string) => {
    updateStyle({ fontName: value })
  }
})

const horizontalPosition = computed({
  get: () => {
    const align = style.value.alignment
    const resX = props.playResX
    if (align === 1 || align === 4 || align === 7) {
      return Math.round((style.value.marginL / resX) * 100)
    }
    if (align === 3 || align === 6 || align === 9) {
      return Math.round(100 - (style.value.marginR / resX) * 100)
    }
    return Math.round(50 + ((style.value.marginL - style.value.marginR) / (2 * resX)) * 100)
  },
  set: (value: number) => {
    const safe = Math.max(0, Math.min(100, value))
    const verticalBand = getVerticalBand(style.value.alignment)
    const delta = ((safe - 50) / 50) * props.playResX
    updateStyle({
      alignment: verticalBand === 'top' ? 8 : verticalBand === 'middle' ? 5 : 2,
      marginL: delta >= 0 ? Math.round(delta) : 0,
      marginR: delta < 0 ? Math.round(-delta) : 0,
    })
  }
})

const verticalPosition = computed({
  get: () => {
    const align = style.value.alignment
    const resY = props.playResY
    if (align === 7 || align === 8 || align === 9) {
      return Math.round((style.value.marginV / resY) * 100)
    }
    if (align === 1 || align === 2 || align === 3) {
      return Math.round(100 - (style.value.marginV / resY) * 100)
    }
    return Math.round(50 + (style.value.marginV / (resY / 2)) * 50)
  },
  set: (value: number) => {
    const safe = Math.max(0, Math.min(100, value))
    const verticalBand = getVerticalBand(style.value.alignment)
    let marginV = 0
    if (verticalBand === 'top') {
      marginV = Math.round((safe / 100) * props.playResY)
    } else if (verticalBand === 'bottom') {
      marginV = Math.round(((100 - safe) / 100) * props.playResY)
    } else {
      marginV = Math.round(((safe - 50) / 50) * (props.playResY / 2))
    }
    updateStyle({
      alignment: verticalBand === 'top' ? 8 : verticalBand === 'middle' ? 5 : 2,
      marginV,
    })
  }
})

function getVerticalBand(alignment: number): 'top' | 'middle' | 'bottom' {
  if (alignment >= 7) return 'top'
  if (alignment >= 4) return 'middle'
  return 'bottom'
}

function updateStyle(updates: Partial<AssStyle>) {
  style.value = { ...style.value, ...updates }
}

</script>

<template>
  <div class="style-form">
    <div class="form-grid">
      <div class="form-group form-group-span-2">
        <label class="form-label">样式名称</label>
        <input
          type="text"
          v-model="styleName"
          :disabled="readonly"
          class="form-input"
          placeholder="输入样式名称"
        />
      </div>

      <div class="form-group">
        <label class="form-label">字体</label>
        <input
          type="text"
          v-model="fontName"
          :disabled="readonly"
          class="form-input"
          placeholder="输入字体名称"
        />
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>字号</span>
          <span class="form-value">{{ style.fontSize }}px</span>
        </label>
        <input
          type="range"
          :value="style.fontSize"
          @input="updateStyle({ fontSize: Number(($event.target as HTMLInputElement).value) })"
          :disabled="readonly"
          min="8"
          max="200"
          class="form-slider"
        />
      </div>

      <div class="form-group">
        <label class="form-label">主颜色</label>
        <div class="color-row">
          <input
            type="color"
            v-model="primaryColorCss"
            :disabled="readonly"
            class="form-color-picker"
          />
          <span class="color-code">{{ primaryColorCss }}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">描边颜色</label>
        <div class="color-row">
          <input
            type="color"
            v-model="outlineColorCss"
            :disabled="readonly"
            class="form-color-picker"
          />
          <span class="color-code">{{ outlineColorCss }}</span>
        </div>
      </div>

      <div class="form-group form-group-span-2">
        <label class="form-label">文本样式</label>
        <div class="toggle-row">
          <label class="toggle-item">
            <input
              type="checkbox"
              :checked="style.bold"
              @change="updateStyle({ bold: ($event.target as HTMLInputElement).checked })"
              :disabled="readonly"
              class="form-checkbox"
            />
            <span class="toggle-label bold">粗体</span>
          </label>
          <label class="toggle-item">
            <input
              type="checkbox"
              :checked="style.italic"
              @change="updateStyle({ italic: ($event.target as HTMLInputElement).checked })"
              :disabled="readonly"
              class="form-checkbox"
            />
            <span class="toggle-label italic">斜体</span>
          </label>
          <label class="toggle-item">
            <input
              type="checkbox"
              :checked="style.underline"
              @change="updateStyle({ underline: ($event.target as HTMLInputElement).checked })"
              :disabled="readonly"
              class="form-checkbox"
            />
            <span class="toggle-label underline">下划线</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>描边宽度</span>
          <span class="form-value">{{ style.outline }}</span>
        </label>
        <input
          type="range"
          :value="style.outline"
          @input="updateStyle({ outline: Number(($event.target as HTMLInputElement).value) })"
          :disabled="readonly"
          min="0"
          max="4"
          step="0.5"
          class="form-slider"
        />
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>阴影深度</span>
          <span class="form-value">{{ style.shadow }}</span>
        </label>
        <input
          type="range"
          :value="style.shadow"
          @input="updateStyle({ shadow: Number(($event.target as HTMLInputElement).value) })"
          :disabled="readonly"
          min="0"
          max="4"
          step="0.5"
          class="form-slider"
        />
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>横向位置</span>
          <span class="form-value">{{ horizontalPosition }}%</span>
        </label>
        <input
          type="range"
          :value="horizontalPosition"
          @input="horizontalPosition = Number(($event.target as HTMLInputElement).value)"
          :disabled="readonly"
          min="0"
          max="100"
          step="1"
          class="form-slider"
        />
        <div class="position-hints">
          <span>左</span>
          <span>中</span>
          <span>右</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>纵向位置</span>
          <span class="form-value">{{ verticalPosition }}%</span>
        </label>
        <input
          type="range"
          :value="verticalPosition"
          @input="verticalPosition = Number(($event.target as HTMLInputElement).value)"
          :disabled="readonly"
          min="0"
          max="100"
          step="1"
          class="form-slider"
        />
        <div class="position-hints">
          <span>上</span>
          <span>中</span>
          <span>下</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-form {
  padding: 0.8rem 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem 0.9rem;
}

.form-group-span-2 {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  background-color: #f8fafc;
  min-width: 0;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.form-label.with-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-value {
  font-size: 0.75rem;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.form-input {
  width: 100%;
  min-width: 0;
  padding: 0.45rem 0.65rem;
  border: 1px solid #d1d5db;
  border-radius: 0.45rem;
  font-size: 0.8125rem;
  background-color: white;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-slider {
  width: 100%;
  height: 0.38rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
}

.form-slider::-webkit-slider-thumb {
  appearance: none;
  width: 0.85rem;
  height: 0.85rem;
  background-color: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.form-slider::-webkit-slider-thumb:hover {
  background-color: #2563eb;
}

.form-color-picker {
  width: 2.3rem;
  height: 1.65rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.45rem;
  cursor: pointer;
  background: none;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.color-code {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
}

.toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 0.9rem;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.toggle-label.bold {
  font-weight: 700;
}

.toggle-label.italic {
  font-style: italic;
}

.toggle-label.underline {
  text-decoration: underline;
}

.position-hints {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #6b7280;
}

@media (max-width: 860px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-group-span-2 {
    grid-column: auto;
  }
}

@media (max-width: 620px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
