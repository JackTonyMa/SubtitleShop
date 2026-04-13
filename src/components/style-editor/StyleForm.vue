<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss, cssToAssColor } from '../../utils/assColor'

const FONT_PRESET_OPTIONS = [
  { label: '黑体', value: 'SimHei', aliases: ['黑体', 'heiti', 'simhei'] },
  { label: '宋体', value: 'SimSun', aliases: ['宋体', 'simsun'] },
  { label: '楷体', value: 'KaiTi', aliases: ['楷体', 'kaiti'] },
  { label: '苹方', value: 'PingFang SC', aliases: ['苹方', 'pingfang', 'pingfangsc', 'pingfang sc'] },
  { label: '微软雅黑', value: 'Microsoft YaHei', aliases: ['微软雅黑', 'microsoft yahei', 'microsoftyahei'] },
  { label: '思源黑体', value: 'Source Han Sans SC', aliases: ['思源黑体', 'source han sans', 'source han sans sc', 'sourcehansans', 'sourcehansanssc'] },
  { label: '冬青黑体', value: 'Hiragino Sans GB', aliases: ['冬青黑体', 'hiragino sans gb', 'hiraginosansgb'] },
  { label: '思源宋体', value: 'Source Han Serif SC', aliases: ['思源宋体', 'source han serif', 'source han serif sc', 'sourcehanserif', 'sourcehanserifsc'] },
  { label: '方正清刻', value: 'FZQKBYSJW', aliases: ['方正清刻', 'fzqkbysjw'] },
  { label: '方正幼圆', value: 'YouYuan', aliases: ['方正幼圆', '幼圆', 'youyuan'] },
  { label: 'OPPOSans', value: 'OPPOSans', aliases: ['opposans', 'oppo sans'] },
  { label: 'Arial', value: 'Arial', aliases: ['arial'] },
  { label: 'Helvetica', value: 'Helvetica', aliases: ['helvetica'] },
  { label: 'Roboto', value: 'Roboto', aliases: ['roboto'] },
] as const

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

const fontSizeDraft = ref(String(props.modelValue.fontSize))
const outlineDraft = ref(String(props.modelValue.outline))
const shadowDraft = ref(String(props.modelValue.shadow))
const primaryColorText = ref(assColorToCss(props.modelValue.primaryColor))
const outlineColorText = ref(assColorToCss(props.modelValue.outlineColor))
const fontDropdownOpen = ref(false)
const fontInputRef = ref<HTMLInputElement | null>(null)
const fontDisplayDraft = ref('')

// 根据 fontName (value) 查找对应的 label，找不到则返回 fontName 本身
function getFontLabelByValue(value: string): string {
  const matched = FONT_PRESET_OPTIONS.find(opt => opt.value === value)
  return matched?.label || value
}

// 根据用户输入尝试匹配到 value，匹配不到则返回原始输入值
function resolveFontValueFromInput(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const normalized = trimmed.toLowerCase().replace(/\s+/g, '')
  // 先尝试匹配 label
  const byLabel = FONT_PRESET_OPTIONS.find(opt =>
    opt.label.toLowerCase().replace(/\s+/g, '') === normalized
  )
  if (byLabel) return byLabel.value
  // 再尝试匹配 aliases
  const byAlias = FONT_PRESET_OPTIONS.find(opt =>
    opt.aliases.some(alias => alias.toLowerCase().replace(/\s+/g, '') === normalized)
  )
  if (byAlias) return byAlias.value
  // 最后尝试匹配 value
  const byValue = FONT_PRESET_OPTIONS.find(opt =>
    opt.value.toLowerCase().replace(/\s+/g, '') === normalized
  )
  if (byValue) return byValue.value
  // 都匹配不到，返回原始输入
  return trimmed
}

watch(
  () => props.modelValue.fontName,
  (value) => {
    fontDisplayDraft.value = getFontLabelByValue(value)
  },
  { immediate: true }
)

watch(
  () => props.modelValue.fontSize,
  (value) => {
    fontSizeDraft.value = String(value)
  },
  { immediate: true }
)

watch(
  () => props.modelValue.outline,
  (value) => {
    outlineDraft.value = String(value)
  },
  { immediate: true }
)

watch(
  () => props.modelValue.shadow,
  (value) => {
    shadowDraft.value = String(value)
  },
  { immediate: true }
)

watch(
  () => props.modelValue.primaryColor,
  (value) => {
    primaryColorText.value = assColorToCss(value)
  },
  { immediate: true }
)

watch(
  () => props.modelValue.outlineColor,
  (value) => {
    outlineColorText.value = assColorToCss(value)
  },
  { immediate: true }
)

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

// fontName 不再直接用于输入框，只用于内部读取
// 输入框显示的是 fontDisplayDraft（label 或原始值）

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

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toggleFontDropdown() {
  fontDropdownOpen.value = !fontDropdownOpen.value
}

function selectFontOption(value: string) {
  updateStyle({ fontName: value })
  fontDisplayDraft.value = getFontLabelByValue(value)
  fontDropdownOpen.value = false
}

function handleFontInputBlur() {
  const resolvedValue = resolveFontValueFromInput(fontDisplayDraft.value)
  updateStyle({ fontName: resolvedValue })
  fontDisplayDraft.value = getFontLabelByValue(resolvedValue)
  fontDropdownOpen.value = false
}

function handleFontDropdownClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (fontInputRef.value && !fontInputRef.value.contains(target)) {
    fontDropdownOpen.value = false
  }
}

function updateNumericStyle<K extends 'fontSize' | 'outline' | 'shadow'>(
  key: K,
  rawValue: number,
  min: number,
  max: number
) {
  updateStyle({ [key]: clampNumber(rawValue, min, max) } as Pick<AssStyle, K>)
}

function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function sanitizeDecimalInput(value: string): string {
  const sanitized = value.replace(/[^\d.]/g, '')
  const [integerPart, ...rest] = sanitized.split('.')
  if (rest.length === 0) return sanitized
  return `${integerPart}.${rest.join('')}`
}

function handleNumericDraftInput(
  key: 'fontSize' | 'outline' | 'shadow',
  rawValue: string
) {
  const nextValue = key === 'fontSize'
    ? sanitizeIntegerInput(rawValue)
    : sanitizeDecimalInput(rawValue)

  if (key === 'fontSize') {
    fontSizeDraft.value = nextValue
    return
  }
  if (key === 'outline') {
    outlineDraft.value = nextValue
    return
  }
  shadowDraft.value = nextValue
}

function commitNumericDraft(
  key: 'fontSize' | 'outline' | 'shadow',
  min: number,
  max: number
) {
  const currentDraft = key === 'fontSize'
    ? fontSizeDraft.value
    : key === 'outline'
      ? outlineDraft.value
      : shadowDraft.value
  const fallbackValue = key === 'fontSize'
    ? 8
    : key === 'outline'
      ? style.value.outline
      : style.value.shadow

  if (!currentDraft || currentDraft === '.') {
    updateNumericStyle(key, fallbackValue, min, max)
    return
  }

  const parsed = Number.parseFloat(currentDraft)
  if (Number.isNaN(parsed)) {
    updateNumericStyle(key, fallbackValue, min, max)
    return
  }

  updateNumericStyle(key, parsed, min, max)
}

function isValidCssHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

function handleColorTextInput(kind: 'primary' | 'outline', value: string) {
  if (kind === 'primary') {
    primaryColorText.value = value
    return
  }
  outlineColorText.value = value
}

function commitColorTextInput(kind: 'primary' | 'outline') {
  const currentValue = (kind === 'primary' ? primaryColorText.value : outlineColorText.value).trim()
  if (!isValidCssHexColor(currentValue)) {
    const fallback = kind === 'primary'
      ? assColorToCss(style.value.primaryColor)
      : assColorToCss(style.value.outlineColor)
    if (kind === 'primary') {
      primaryColorText.value = fallback
    } else {
      outlineColorText.value = fallback
    }
    return
  }

  const normalized = currentValue.toLowerCase()
  if (kind === 'primary') {
    primaryColorText.value = normalized
    primaryColorCss.value = normalized
    return
  }
  outlineColorText.value = normalized
  outlineColorCss.value = normalized
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
        <div class="font-combobox" ref="fontInputRef" v-on:click-outside="handleFontDropdownClickOutside">
          <input
            type="text"
            v-model="fontDisplayDraft"
            :disabled="readonly"
            class="font-input"
            placeholder="输入或选择字体名称"
            @blur="handleFontInputBlur"
          />
          <button
            type="button"
            class="font-dropdown-btn"
            :disabled="readonly"
            @click="toggleFontDropdown"
            aria-label="显示字体选项"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="fontDropdownOpen && !readonly" class="font-dropdown">
            <button
              v-for="option in FONT_PRESET_OPTIONS"
              :key="option.value"
              type="button"
              class="font-option"
              :class="{ active: style.fontName === option.value }"
              @click="selectFontOption(option.value)"
            >
              <span class="font-option-label">{{ option.label }}</span>
              <span class="font-option-value">{{ option.value }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>字号</span>
          <span class="form-value">{{ style.fontSize }}px</span>
        </label>
        <div class="control-row">
          <input
            type="range"
            :value="style.fontSize"
            @input="updateStyle({ fontSize: Number(($event.target as HTMLInputElement).value) })"
            :disabled="readonly"
            min="0"
            max="200"
            class="form-slider"
          />
          <input
            type="text"
            inputmode="numeric"
            :value="fontSizeDraft"
            @input="handleNumericDraftInput('fontSize', ($event.target as HTMLInputElement).value)"
            @blur="commitNumericDraft('fontSize', 0, 200)"
            @keydown.enter="commitNumericDraft('fontSize', 0, 200)"
            :disabled="readonly"
            min="0"
            max="200"
            step="1"
            class="form-number-input"
          />
        </div>
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
          <input
            type="text"
            :value="primaryColorText"
            @input="handleColorTextInput('primary', ($event.target as HTMLInputElement).value)"
            @blur="commitColorTextInput('primary')"
            :disabled="readonly"
            class="form-input color-text-input"
            spellcheck="false"
          />
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
          <input
            type="text"
            :value="outlineColorText"
            @input="handleColorTextInput('outline', ($event.target as HTMLInputElement).value)"
            @blur="commitColorTextInput('outline')"
            :disabled="readonly"
            class="form-input color-text-input"
            spellcheck="false"
          />
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
        <div class="control-row">
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
          <input
            type="text"
            inputmode="decimal"
            :value="outlineDraft"
            @input="handleNumericDraftInput('outline', ($event.target as HTMLInputElement).value)"
            @blur="commitNumericDraft('outline', 0, 4)"
            @keydown.enter="commitNumericDraft('outline', 0, 4)"
            :disabled="readonly"
            min="0"
            max="4"
            step="0.1"
            class="form-number-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label with-value">
          <span>阴影深度</span>
          <span class="form-value">{{ style.shadow }}</span>
        </label>
        <div class="control-row">
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
          <input
            type="text"
            inputmode="decimal"
            :value="shadowDraft"
            @input="handleNumericDraftInput('shadow', ($event.target as HTMLInputElement).value)"
            @blur="commitNumericDraft('shadow', 0, 4)"
            @keydown.enter="commitNumericDraft('shadow', 0, 4)"
            :disabled="readonly"
            min="0"
            max="4"
            step="0.1"
            class="form-number-input"
          />
        </div>
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
  padding: 0.5rem 0.65rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem 0.6rem;
}

.form-group-span-2 {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.45rem;
  background-color: #f8fafc;
  min-width: 0;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.form-label.with-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-value {
  font-size: 0.6875rem;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.form-input {
  width: 100%;
  min-width: 0;
  padding: 0.34rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  font-size: 0.75rem;
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
  height: 0.3rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-row .form-slider {
  flex: 1;
}

.form-number-input {
  width: 5.25rem;
  min-width: 5.25rem;
  padding: 0.34rem 0.45rem;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  background-color: white;
  font-variant-numeric: tabular-nums;
}

.form-number-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-slider::-webkit-slider-thumb {
  appearance: none;
  width: 0.78rem;
  height: 0.78rem;
  background-color: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.form-slider::-webkit-slider-thumb:hover {
  background-color: #2563eb;
}

.form-color-picker {
  width: 2rem;
  height: 1.45rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  cursor: pointer;
  background: none;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.color-text-input {
  flex: 1;
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
  gap: 0.4rem 0.65rem;
}

.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  font-size: 0.75rem;
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
  font-size: 0.625rem;
  color: #6b7280;
}

/* Font combobox styles */
.font-combobox {
  position: relative;
  display: flex;
  align-items: center;
}

.font-input {
  width: 100%;
  min-width: 0;
  padding: 0.34rem 0.5rem;
  padding-right: 2rem;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  background-color: white;
  transition: border-color 0.15s ease;
}

.font-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.font-dropdown-btn {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.15s ease;
}

.font-dropdown-btn:hover {
  color: #374151;
}

.font-dropdown-btn:disabled {
  cursor: not-allowed;
  color: #9ca3af;
}

.font-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  max-height: 12rem;
  overflow-y: auto;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.4rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.font-option {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.font-option:hover {
  background-color: #f3f4f6;
}

.font-option.active {
  background-color: #eff6ff;
}

.font-option-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #1f2937;
}

.font-option-value {
  font-size: 0.65rem;
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
