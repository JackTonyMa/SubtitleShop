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
  <div class="style-form space-y-4">
    <!-- Style Name -->
    <div class="form-group">
      <label class="form-label">样式名称</label>
      <input
        type="text"
        v-model="styleName"
        :disabled="readonly"
        class="form-input"
        placeholder="输入样式名称"
      />
    </div>

    <!-- Font -->
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

    <!-- Font Size -->
    <div class="form-group">
      <label class="form-label flex justify-between">
        <span>字号</span>
        <span class="text-gray-500">{{ style.fontSize }}px</span>
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

    <!-- Colors -->
    <div class="form-group">
      <label class="form-label">主颜色</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          v-model="primaryColorCss"
          :disabled="readonly"
          class="form-color-picker"
        />
        <span class="text-sm text-gray-600 font-mono">{{ primaryColorCss }}</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">描边颜色</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          v-model="outlineColorCss"
          :disabled="readonly"
          class="form-color-picker"
        />
        <span class="text-sm text-gray-600 font-mono">{{ outlineColorCss }}</span>
      </div>
    </div>

    <!-- Text Style Checkboxes -->
    <div class="form-group">
      <label class="form-label">文本样式</label>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="style.bold"
            @change="updateStyle({ bold: ($event.target as HTMLInputElement).checked })"
            :disabled="readonly"
            class="form-checkbox"
          />
          <span class="font-bold">粗体</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="style.italic"
            @change="updateStyle({ italic: ($event.target as HTMLInputElement).checked })"
            :disabled="readonly"
            class="form-checkbox"
          />
          <span class="italic">斜体</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="style.underline"
            @change="updateStyle({ underline: ($event.target as HTMLInputElement).checked })"
            :disabled="readonly"
            class="form-checkbox"
          />
          <span class="underline">下划线</span>
        </label>
      </div>
    </div>

    <!-- Outline Width -->
    <div class="form-group">
      <label class="form-label flex justify-between">
        <span>描边宽度</span>
        <span class="text-gray-500">{{ style.outline }}</span>
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

    <!-- Shadow Depth -->
    <div class="form-group">
      <label class="form-label flex justify-between">
        <span>阴影深度</span>
        <span class="text-gray-500">{{ style.shadow }}</span>
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

    <!-- Position Sliders -->
    <div class="form-group">
      <label class="form-label flex justify-between">
        <span>横向位置</span>
        <span class="text-gray-500">{{ horizontalPosition }}%</span>
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
      <label class="form-label flex justify-between">
        <span>纵向位置</span>
        <span class="text-gray-500">{{ verticalPosition }}%</span>
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
</template>

<style scoped>
.style-form {
  padding: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
}

.form-slider::-webkit-slider-thumb {
  appearance: none;
  width: 1rem;
  height: 1rem;
  background-color: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.form-slider::-webkit-slider-thumb:hover {
  background-color: #2563eb;
}

.form-color-picker {
  width: 3rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  background: none;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
}

.position-hints {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
