<script setup lang="ts">
import { computed } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss, cssToAssColor } from '../../utils/assColor'

const props = defineProps<{
  modelValue: AssStyle
}>()

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

function updateStyle(updates: Partial<AssStyle>) {
  style.value = { ...style.value, ...updates }
}

// Alignment grid: 1 2 3 / 4 5 6 / 7 8 9
// Where 2=bottom-center, 5=center, 8=top-center
const alignments = [
  { value: 7, label: '左下' },
  { value: 8, label: '中下' },
  { value: 9, label: '右下' },
  { value: 4, label: '左中' },
  { value: 5, label: '中心' },
  { value: 6, label: '右中' },
  { value: 1, label: '左上' },
  { value: 2, label: '中上' },
  { value: 3, label: '右上' },
]
</script>

<template>
  <div class="style-form space-y-4">
    <!-- Style Name -->
    <div class="form-group">
      <label class="form-label">样式名称</label>
      <input
        type="text"
        v-model="style.name"
        class="form-input"
        placeholder="输入样式名称"
      />
    </div>

    <!-- Font -->
    <div class="form-group">
      <label class="form-label">字体</label>
      <input
        type="text"
        v-model="style.fontName"
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
        min="8"
        max="72"
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
            class="form-checkbox"
          />
          <span class="font-bold">粗体</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="style.italic"
            @change="updateStyle({ italic: ($event.target as HTMLInputElement).checked })"
            class="form-checkbox"
          />
          <span class="italic">斜体</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="style.underline"
            @change="updateStyle({ underline: ($event.target as HTMLInputElement).checked })"
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
        min="0"
        max="4"
        step="0.5"
        class="form-slider"
      />
    </div>

    <!-- Alignment Grid -->
    <div class="form-group">
      <label class="form-label">对齐方式</label>
      <div class="alignment-grid">
        <button
          v-for="align in alignments"
          :key="align.value"
          type="button"
          @click="updateStyle({ alignment: align.value })"
          :class="[
            'alignment-btn',
            style.alignment === align.value ? 'active' : ''
          ]"
          :title="align.label"
        >
          <span class="alignment-dot" :class="`align-${align.value}`" />
        </button>
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

.alignment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  width: fit-content;
}

.alignment-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.15s ease;
}

.alignment-btn:hover {
  background-color: #f3f4f6;
}

.alignment-btn.active {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.alignment-dot {
  width: 0.5rem;
  height: 0.5rem;
  background-color: #6b7280;
  border-radius: 50%;
}

.alignment-btn.active .alignment-dot {
  background-color: white;
}

/* Position dots according to alignment values */
.align-1 { align-self: flex-start; justify-self: flex-start; }
.align-2 { align-self: flex-start; justify-self: center; }
.align-3 { align-self: flex-start; justify-self: flex-end; }
.align-4 { align-self: center; justify-self: flex-start; }
.align-5 { align-self: center; justify-self: center; }
.align-6 { align-self: center; justify-self: flex-end; }
.align-7 { align-self: flex-end; justify-self: flex-start; }
.align-8 { align-self: flex-end; justify-self: center; }
.align-9 { align-self: flex-end; justify-self: flex-end; }
</style>
