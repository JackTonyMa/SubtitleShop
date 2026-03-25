# Phase 3 - 样式系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的 ASS 样式系统，包括样式编辑器、预设样式库、样式导入导出功能

**Architecture:** 基于 Vue 3 的组件化设计，样式数据通过 Pinia Store 管理，样式编辑器分为表单和预览两部分，预设样式库存储为常量数组，导入导出使用 JSON 格式

**Tech Stack:** Vue 3, TypeScript, Pinia, HTML Canvas (预览渲染)

---

## 文件结构映射

```
src/
├── components/
│   ├── style-editor/        # 样式编辑器组件
│   │   ├── StyleEditor.vue
│   │   ├── StyleForm.vue
│   │   ├── StylePreview.vue
│   │   ├── StyleList.vue
│   │   ├── ColorPicker.vue
│   │   ├── AlignmentGrid.vue
│   │   └── index.ts
│   └── preset-styles/       # 预设样式
│       └── index.ts
├── composables/
│   ├── useStyleExport.ts
│   └── useStyleImport.ts
├── utils/
│   └── assColor.ts          # ASS 颜色转换工具
└── stores/
    └── subtitle.ts          # (扩展样式相关方法)
```

---

## Task 1: ASS 颜色工具函数

**Files:**
- Create: `src/utils/assColor.ts`
- Create: `src/utils/__tests__/assColor.test.ts`

ASS 颜色格式：`&HAABBGGRR` (Alpha, Blue, Green, Red)

- [ ] **Step 1: 编写颜色工具测试**

Create: `src/utils/__tests__/assColor.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { assColorToCss, cssToAssColor, parseAssColor } from '../assColor'

describe('ASS Color utilities', () => {
  it('should convert ASS color to CSS', () => {
    expect(assColorToCss('&H00FFFFFF')).toBe('#ffffff')
    expect(assColorToCss('&H00000000')).toBe('#000000')
    expect(assColorToCss('&H000000FF')).toBe('#ff0000')
  })

  it('should convert CSS color to ASS', () => {
    expect(cssToAssColor('#ffffff')).toBe('&H00FFFFFF')
    expect(cssToAssColor('#000000')).toBe('&H00000000')
    expect(cssToAssColor('ff0000')).toBe('&H000000FF')
  })

  it('should parse ASS color components', () => {
    const parsed = parseAssColor('&H00FFFFFF')
    expect(parsed.alpha).toBe(0)
    expect(parsed.red).toBe(255)
    expect(parsed.green).toBe(255)
    expect(parsed.blue).toBe(255)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/utils/__tests__/assColor.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现颜色工具函数**

Create: `src/utils/assColor.ts`

```typescript
export interface AssColorComponents {
  alpha: number
  red: number
  green: number
  blue: number
}

/**
 * Convert ASS color format (&HAABBGGRR) to CSS hex (#RRGGBB)
 */
export function assColorToCss(assColor: string): string {
  // Remove &H prefix and get BB GGRR part
  const hex = assColor.replace('&H', '').padStart(8, '0')
  const blue = hex.slice(2, 4)
  const green = hex.slice(4, 6)
  const red = hex.slice(6, 8)
  return `#${red}${green}${blue}`.toLowerCase()
}

/**
 * Convert CSS hex color to ASS format
 */
export function cssToAssColor(cssColor: string): string {
  const hex = cssColor.replace('#', '').padStart(6, '0')
  // CSS: RRGGBB -> ASS: BBGGRR
  const red = hex.slice(0, 2)
  const green = hex.slice(2, 4)
  const blue = hex.slice(4, 6)
  return `&H00${blue}${green}${red}`.toUpperCase()
}

/**
 * Parse ASS color into components
 */
export function parseAssColor(assColor: string): AssColorComponents {
  const hex = assColor.replace('&H', '').padStart(8, '0')
  return {
    alpha: parseInt(hex.slice(0, 2), 16),
    blue: parseInt(hex.slice(2, 4), 16),
    green: parseInt(hex.slice(4, 6), 16),
    red: parseInt(hex.slice(6, 8), 16),
  }
}

/**
 * Format color components to ASS color string
 */
export function formatAssColor(components: AssColorComponents): string {
  const alpha = components.alpha.toString(16).padStart(2, '0')
  const blue = components.blue.toString(16).padStart(2, '0')
  const green = components.green.toString(16).padStart(2, '0')
  const red = components.red.toString(16).padStart(2, '0')
  return `&H${alpha}${blue}${green}${red}`.toUpperCase()
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/utils/__tests__/assColor.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 5: Commit**

```bash
git add src/utils
git commit -m "feat: add ASS color utility functions"
```

---

## Task 2: 预设样式库

**Files:**
- Create: `src/components/preset-styles/index.ts`

- [ ] **Step 1: 创建预设样式库**

Create: `src/components/preset-styles/index.ts`

```typescript
import { AssStyle, createAssStyle } from '../../core/models/AssStyle'

export interface PresetStyle {
  id: string
  name: string
  description: string
  style: Omit<AssStyle, 'id'>
}

export const PRESET_STYLES: PresetStyle[] = [
  {
    id: 'anime',
    name: '动漫风格',
    description: '明亮色彩、描边阴影、底部居中',
    style: {
      name: 'Anime',
      fontName: 'Arial',
      fontSize: 24,
      primaryColor: '&H00FFFF00',      // 黄色
      secondaryColor: '&H000000FF',    // 红色
      outlineColor: '&H00000000',      // 黑色描边
      backColor: '&H80000000',         // 半透明黑阴影
      bold: true,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 2,
      shadow: 2,
      alignment: 2,                    // 底部居中
      marginL: 20,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'movie',
    name: '电影风格',
    description: '简洁白色、细边框、底部居中',
    style: {
      name: 'Movie',
      fontName: 'Arial',
      fontSize: 22,
      primaryColor: '&H00FFFFFF',      // 白色
      secondaryColor: '&H00000000',
      outlineColor: '&H00000000',      // 黑色描边
      backColor: '&H00000000',
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 1,                      // 细边框
      shadow: 0,
      alignment: 2,                    // 底部居中
      marginL: 20,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'documentary',
    name: '纪录片风格',
    description: '专业字体、适中大小、底部左对齐',
    style: {
      name: 'Documentary',
      fontName: 'Helvetica',
      fontSize: 20,
      primaryColor: '&H00FFFFFF',      // 白色
      secondaryColor: '&H00000000',
      outlineColor: '&H00000000',
      backColor: '&H80000000',         // 半透明阴影
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 1,
      shadow: 1,
      alignment: 1,                    // 底部左对齐
      marginL: 40,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'karaoke',
    name: '卡拉OK风格',
    description: '双色歌词、高亮效果',
    style: {
      name: 'Karaoke',
      fontName: 'Arial',
      fontSize: 26,
      primaryColor: '&H00FF00FF',      // 洋红（已唱）
      secondaryColor: '&H0000FFFF',    // 黄色（未唱）
      outlineColor: '&H00000000',
      backColor: '&H80000000',
      bold: true,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 2,                      // 稍宽字距
      angle: 0,
      borderStyle: 1,
      outline: 2,
      shadow: 2,
      alignment: 2,
      marginL: 20,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'minimal',
    name: '极简风格',
    description: '无边框、纯色、居中',
    style: {
      name: 'Minimal',
      fontName: 'Arial',
      fontSize: 24,
      primaryColor: '&H00FFFFFF',      // 白色
      secondaryColor: '&H00000000',
      outlineColor: '&H00000000',
      backColor: '&H00000000',
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 0,                      // 无边框
      shadow: 0,                       // 无阴影
      alignment: 5,                    // 居中
      marginL: 20,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
]

export function getPresetStyleById(id: string): PresetStyle | undefined {
  return PRESET_STYLES.find(s => s.id === id)
}

export function createStyleFromPreset(presetId: string): AssStyle | null {
  const preset = getPresetStyleById(presetId)
  if (!preset) return null
  return createAssStyle(preset.style)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/preset-styles
git commit -m "feat: add preset style library"
```

---

## Task 3: 样式编辑器组件 - StyleEditor

**Files:**
- Create: `src/components/style-editor/StyleEditor.vue`
- Create: `src/components/style-editor/StyleForm.vue`
- Create: `src/components/style-editor/index.ts`

- [ ] **Step 1: 创建 StyleForm 组件**

Create: `src/components/style-editor/StyleForm.vue`

```vue
<template>
  <form class="style-form space-y-4" @submit.prevent>
    <!-- Basic Info -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">样式名称</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="emitUpdate"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">字体</label>
        <input
          v-model="form.fontName"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="emitUpdate"
        />
      </div>
    </div>

    <!-- Font Size -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        字号: {{ form.fontSize }}
      </label>
      <input
        v-model.number="form.fontSize"
        type="range"
        min="8"
        max="72"
        class="w-full"
        @input="emitUpdate"
      />
    </div>

    <!-- Colors -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">主颜色</label>
        <div class="flex items-center gap-2">
          <input
            :value="cssPrimaryColor"
            type="color"
            class="w-10 h-10 rounded cursor-pointer"
            @input="updatePrimaryColor"
          />
          <span class="text-sm text-gray-600">{{ form.primaryColor }}</span>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">描边颜色</label>
        <div class="flex items-center gap-2">
          <input
            :value="cssOutlineColor"
            type="color"
            class="w-10 h-10 rounded cursor-pointer"
            @input="updateOutlineColor"
          />
          <span class="text-sm text-gray-600">{{ form.outlineColor }}</span>
        </div>
      </div>
    </div>

    <!-- Style Buttons -->
    <div class="flex gap-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="form.bold" type="checkbox" @change="emitUpdate" />
        <span class="text-sm font-medium" :class="form.bold ? 'font-bold' : ''">粗体</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="form.italic" type="checkbox" @change="emitUpdate" />
        <span class="text-sm font-medium" :class="form.italic ? 'italic' : ''">斜体</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="form.underline" type="checkbox" @change="emitUpdate" />
        <span class="text-sm underline">下划线</span>
      </label>
    </div>

    <!-- Outline and Shadow -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          描边宽度: {{ form.outline }}
        </label>
        <input
          v-model.number="form.outline"
          type="range"
          min="0"
          max="4"
          step="0.5"
          class="w-full"
          @input="emitUpdate"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          阴影深度: {{ form.shadow }}
        </label>
        <input
          v-model.number="form.shadow"
          type="range"
          min="0"
          max="4"
          step="0.5"
          class="w-full"
          @input="emitUpdate"
        />
      </div>
    </div>

    <!-- Alignment -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">对齐方式</label>
      <div class="grid grid-cols-3 gap-1 w-32">
        <button
          v-for="n in 9"
          :key="n"
          type="button"
          class="w-10 h-10 border rounded hover:bg-gray-100 flex items-center justify-center text-sm"
          :class="form.alignment === n ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'"
          @click="form.alignment = n; emitUpdate()"
        >
          {{ n }}
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-1">{{ alignmentDescription }}</p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss, cssToAssColor } from '../../utils/assColor'

interface Props {
  style: AssStyle
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', updates: Partial<AssStyle>): void
}>()

const form = reactive({ ...props.style })

watch(() => props.style, (newStyle) => {
  Object.assign(form, newStyle)
}, { deep: true })

const cssPrimaryColor = computed(() => assColorToCss(form.primaryColor))
const cssOutlineColor = computed(() => assColorToCss(form.outlineColor))

const alignmentDescription = computed(() => {
  const desc: Record<number, string> = {
    1: '左下', 2: '中下', 3: '右下',
    4: '左中', 5: '居中', 6: '右中',
    7: '左上', 8: '中上', 9: '右上',
  }
  return desc[form.alignment] || ''
})

function updatePrimaryColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  form.primaryColor = cssToAssColor(color)
  emitUpdate()
}

function updateOutlineColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  form.outlineColor = cssToAssColor(color)
  emitUpdate()
}

function emitUpdate() {
  emit('update', { ...form })
}
</script>
```

- [ ] **Step 2: 创建 StylePreview 组件**

Create: `src/components/style-editor/StylePreview.vue`

```vue
<template>
  <div class="style-preview bg-gray-900 rounded-lg overflow-hidden">
    <div class="preview-header px-4 py-2 bg-gray-800 text-white text-sm">
      预览
    </div>
    <div
      class="preview-area relative h-48 flex items-center justify-center"
      :style="previewContainerStyle"
    >
      <div
        class="preview-text"
        :style="previewTextStyle"
      >
        预览文本<br>Preview Text
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss, parseAssColor } from '../../utils/assColor'

interface Props {
  style: AssStyle
}

const props = defineProps<Props>()

const previewContainerStyle = computed(() => {
  // Calculate alignment position
  const align = props.style.alignment
  const justify = [1, 4, 7].includes(align) ? 'flex-start' :
                  [3, 6, 9].includes(align) ? 'flex-end' : 'center'
  const items = [7, 8, 9].includes(align) ? 'flex-start' :
                [1, 2, 3].includes(align) ? 'flex-end' : 'center'

  return {
    justifyContent: justify,
    alignItems: items,
    padding: `${props.style.marginV}px ${props.style.marginR}px ${props.style.marginV}px ${props.style.marginL}px`,
  }
})

const previewTextStyle = computed(() => {
  const primary = assColorToCss(props.style.primaryColor)
  const outline = assColorToCss(props.style.outlineColor)
  const shadow = assColorToCss(props.style.backColor)

  const textShadow: string[] = []

  // Outline effect using multiple shadows
  if (props.style.outline > 0) {
    const width = Math.max(1, props.style.outline * 2)
    for (let x = -width; x <= width; x++) {
      for (let y = -width; y <= width; y++) {
        if (Math.abs(x) + Math.abs(y) <= width && (x !== 0 || y !== 0)) {
          textShadow.push(`${x}px ${y}px 0 ${outline}`)
        }
      }
    }
  }

  // Shadow effect
  if (props.style.shadow > 0) {
    const offset = Math.max(2, props.style.shadow * 3)
    textShadow.push(`${offset}px ${offset}px ${offset / 2}px ${shadow}`)
  }

  return {
    fontFamily: props.style.fontName,
    fontSize: `${props.style.fontSize}px`,
    fontWeight: props.style.bold ? 'bold' : 'normal',
    fontStyle: props.style.italic ? 'italic' : 'normal',
    textDecoration: props.style.underline ? 'underline' : 'none',
    color: primary,
    textShadow: textShadow.join(', '),
    textAlign: 'center',
    lineHeight: '1.4',
  }
})
</script>
```

- [ ] **Step 3: 创建 StyleList 组件**

Create: `src/components/style-editor/StyleList.vue`

```vue
<template>
  <div class="style-list">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-gray-700">样式列表</h3>
      <button
        class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="emit('create')"
      >
        + 新建
      </button>
    </div>

    <div class="space-y-1">
      <div
        v-for="style in styles"
        :key="style.id"
        class="flex items-center justify-between px-3 py-2 rounded cursor-pointer"
        :class="selectedId === style.id ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100 border border-transparent'"
        @click="emit('select', style.id)"
      >
        <span class="text-sm font-medium">{{ style.name }}</span>
        <div class="flex gap-1">
          <button
            class="p-1 text-gray-400 hover:text-blue-600"
            title="复制"
            @click.stop="emit('duplicate', style.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            class="p-1 text-gray-400 hover:text-red-600"
            title="删除"
            @click.stop="emit('delete', style.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Preset Styles -->
    <div class="mt-6">
      <h3 class="text-sm font-medium text-gray-700 mb-2">预设样式</h3>
      <div class="space-y-1">
        <button
          v-for="preset in PRESET_STYLES"
          :key="preset.id"
          class="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100"
          @click="emit('applyPreset', preset.id)"
        >
          <div class="font-medium">{{ preset.name }}</div>
          <div class="text-xs text-gray-500">{{ preset.description }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AssStyle } from '../../core/models/AssStyle'
import { PRESET_STYLES } from '../preset-styles'

interface Props {
  styles: AssStyle[]
  selectedId: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create'): void
  (e: 'delete', id: string): void
  (e: 'duplicate', id: string): void
  (e: 'applyPreset', presetId: string): void
}>()
</script>
```

- [ ] **Step 4: 创建 StyleEditor 主组件**

Create: `src/components/style-editor/StyleEditor.vue`

```vue
<template>
  <div class="style-editor bg-white rounded-lg shadow">
    <div class="flex border-b border-gray-200">
      <h2 class="px-4 py-3 text-lg font-semibold">样式编辑器</h2>
    </div>

    <div class="flex">
      <!-- Style List Sidebar -->
      <div class="w-48 border-r border-gray-200 p-4">
        <StyleList
          :styles="store.styles"
          :selected-id="selectedStyle?.id || null"
          @select="selectStyle"
          @create="createStyle"
          @delete="deleteStyle"
          @duplicate="duplicateStyle"
          @apply-preset="applyPreset"
        />
      </div>

      <!-- Editor Panel -->
      <div class="flex-1 p-4">
        <div v-if="selectedStyle" class="grid grid-cols-2 gap-6">
          <div>
            <StyleForm
              :style="selectedStyle"
              @update="updateStyle"
            />
          </div>
          <div>
            <StylePreview :style="selectedStyle" />
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500">
          选择一个样式进行编辑，或创建新样式
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import { AssStyle, createAssStyle, createDefaultStyle } from '../../core/models/AssStyle'
import { createStyleFromPreset } from '../preset-styles'
import StyleList from './StyleList.vue'
import StyleForm from './StyleForm.vue'
import StylePreview from './StylePreview.vue'

const store = useSubtitleStore()
const selectedStyleId = ref<string | null>(null)

const selectedStyle = computed(() => {
  if (!selectedStyleId.value) return null
  return store.styles.find(s => s.id === selectedStyleId.value) || null
})

function selectStyle(id: string) {
  selectedStyleId.value = id
}

function createStyle() {
  const newStyle = createDefaultStyle()
  newStyle.name = `Style ${store.styles.length + 1}`
  store.addStyle(newStyle)
  selectedStyleId.value = newStyle.id
}

function deleteStyle(id: string) {
  store.removeStyle(id)
  if (selectedStyleId.value === id) {
    selectedStyleId.value = null
  }
}

function duplicateStyle(id: string) {
  const style = store.styles.find(s => s.id === id)
  if (!style) return

  const copy = createAssStyle({
    ...style,
    name: `${style.name} (Copy)`,
  })
  store.addStyle(copy)
  selectedStyleId.value = copy.id
}

function applyPreset(presetId: string) {
  const style = createStyleFromPreset(presetId)
  if (!style) return

  // Ensure unique name
  style.name = `${style.name} ${store.styles.length + 1}`
  store.addStyle(style)
  selectedStyleId.value = style.id
}

function updateStyle(updates: Partial<AssStyle>) {
  if (!selectedStyleId.value) return
  store.updateStyle(selectedStyleId.value, updates)
}
</script>
```

- [ ] **Step 5: 创建索引文件**

Create: `src/components/style-editor/index.ts`

```typescript
export { default as StyleEditor } from './StyleEditor.vue'
export { default as StyleForm } from './StyleForm.vue'
export { default as StylePreview } from './StylePreview.vue'
export { default as StyleList } from './StyleList.vue'
```

- [ ] **Step 6: Commit**

```bash
git add src/components/style-editor
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
git commit -m "feat: add style editor with form, preview, and preset styles"
```

---

## Task 4: 样式导入导出功能

**Files:**
- Create: `src/composables/useStyleExport.ts`
- Create: `src/composables/useStyleImport.ts`

- [ ] **Step 1: 创建样式导出 composable**

Create: `src/composables/useStyleExport.ts`

```typescript
import { useSubtitleStore } from '../stores/subtitle'
import { AssStyle } from '../core/models/AssStyle'

export interface StyleTemplateFile {
  version: string
  name: string
  author?: string
  styles: AssStyle[]
  createdAt: number
}

export function useStyleExport() {
  const store = useSubtitleStore()

  function exportStyles(filename?: string, styleIds?: string[]) {
    const styles = styleIds
      ? store.styles.filter(s => styleIds.includes(s.id))
      : store.styles

    if (styles.length === 0) {
      console.warn('No styles to export')
      return
    }

    const template: StyleTemplateFile = {
      version: '1.0',
      name: filename || 'My Styles',
      styles: styles,
      createdAt: Date.now(),
    }

    const content = JSON.stringify(template, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${filename || 'styles'}.ass-style.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  return { exportStyles }
}
```

- [ ] **Step 2: 创建样式导入 composable**

Create: `src/composables/useStyleImport.ts`

```typescript
import { useSubtitleStore } from '../stores/subtitle'
import { AssStyle, createAssStyle } from '../core/models/AssStyle'
import { StyleTemplateFile } from './useStyleExport'

export function useStyleImport() {
  const store = useSubtitleStore()

  async function importStyles(file: File): Promise<{ success: number; failed: number }> {
    try {
      const content = await file.text()
      const template: StyleTemplateFile = JSON.parse(content)

      if (!template.styles || !Array.isArray(template.styles)) {
        throw new Error('Invalid style template file')
      }

      let success = 0
      let failed = 0

      for (const styleData of template.styles) {
        try {
          // Create new style with unique name if needed
          let name = styleData.name
          const existingNames = store.styles.map(s => s.name)
          let counter = 1
          while (existingNames.includes(name)) {
            name = `${styleData.name} (${counter})`
            counter++
          }

          const style = createAssStyle({
            ...styleData,
            name,
          })
          store.addStyle(style)
          success++
        } catch (e) {
          console.error('Failed to import style:', styleData.name, e)
          failed++
        }
      }

      return { success, failed }
    } catch (e) {
      console.error('Failed to import styles:', e)
      throw e
    }
  }

  return { importStyles }
}
```

- [ ] **Step 3: 更新 composables 索引**

Edit: `src/composables/index.ts`

```typescript
export * from './useFileExport'
export * from './useKeyboardShortcuts'
export * from './useStyleExport'
export * from './useStyleImport'
```

- [ ] **Step 4: Commit**

```bash
git add src/composables
git commit -m "feat: add style import/export functionality"
```

---

## Task 5: 更新 App.vue 集成样式编辑器

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 更新 App.vue 添加样式编辑标签页**

Edit: `src/App.vue`

Add import:
```typescript
import { StyleEditor } from './components/style-editor'
```

Update view switcher to include Style tab:
```vue
<!-- View Switcher -->
<div class="flex border-b border-gray-200">
  <button
    class="px-4 py-2 text-sm font-medium"
    :class="currentView === 'table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
    @click="currentView = 'table'"
  >
    表格
  </button>
  <button
    class="px-4 py-2 text-sm font-medium"
    :class="currentView === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
    @click="currentView = 'timeline'"
  >
    时间轴
  </button>
  <button
    class="px-4 py-2 text-sm font-medium"
    :class="currentView === 'styles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
    @click="currentView = 'styles'"
  >
    样式
  </button>
</div>
```

Add style editor view:
```vue
<!-- Style Editor View -->
<StyleEditor v-else-if="currentView === 'styles'" />
```

- [ ] **Step 2: 验证构建**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate style editor into main app"
```

---

## Task 6: 在表格中添加样式选择

**Files:**
- Modify: `src/components/table/SubtitleTable.vue`
- Modify: `src/components/table/SubtitleRow.vue`

- [ ] **Step 1: 更新 SubtitleTable 添加样式列**

Edit: `src/components/table/SubtitleTable.vue`

Add style column to table header:
```vue
<th class="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">样式</th>
```

Pass style to SubtitleRow:
```vue
<SubtitleRow
  v-for="(item, index) in store.items"
  :key="item.id"
  :index="index + 1"
  :item="item"
  :style-name="getStyleName(item.style)"
  :is-selected="store.isSelected(item.id)"
  @select="store.selectItem(item.id, $event)"
  @update="handleUpdate"
/>
```

Add helper function:
```typescript
function getStyleName(styleId?: string): string {
  if (!styleId) return 'Default'
  const style = store.styles.find(s => s.id === styleId)
  return style?.name || 'Default'
}
```

- [ ] **Step 2: 更新 SubtitleRow 显示样式并支持更改**

Edit: `src/components/table/SubtitleRow.vue`

Add props:
```typescript
interface Props {
  index: number
  item: SubtitleItem
  styleName: string
  isSelected: boolean
}
```

Add style cell:
```vue
<td class="px-4 py-2">
  <span class="text-sm text-gray-600">{{ styleName }}</span>
</td>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/table
git commit -m "feat: add style column to subtitle table"
```

---

## Task 7: 运行完整测试套件

**Files:**
- All test files

- [ ] **Step 1: 运行所有测试**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- --run
```

- [ ] **Step 2: 验证构建**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```

- [ ] **Step 3: Final Commit**

```bash
git add -A
git commit -m "chore: verify Phase 3 implementation"
```

---

## Phase 3 完成总结

完成 Phase 3 后，项目将具备以下能力：

1. ✅ ASS 颜色格式转换工具
2. ✅ 预设样式库（5种风格）
3. ✅ 样式编辑器（表单、预览、列表）
4. ✅ 样式导入/导出（JSON格式）
5. ✅ 样式应用到字幕
6. ✅ 实时预览效果

**Next Steps:** Phase 4 - 高级功能（撤销/重做、格式转换、批量操作）
