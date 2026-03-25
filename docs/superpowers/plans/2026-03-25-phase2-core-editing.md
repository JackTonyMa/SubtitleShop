# Phase 2 - 核心编辑实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现字幕编辑核心功能，包括表格视图、时间轴编辑器、基础编辑操作（增删改）

**Architecture:** 基于 Vue 3 组件化设计，表格视图使用虚拟滚动处理大量数据，时间轴使用 Canvas/SVG 实现高性能渲染，编辑操作通过 Pinia Store 管理状态变更

**Tech Stack:** Vue 3, TypeScript, Pinia, Canvas API, CSS Grid/Flexbox

---

## 文件结构映射

```
src/
├── components/
│   ├── common/              # 通用组件
│   │   ├── FileInput.vue    # (已存在)
│   │   └── index.ts
│   ├── table/               # 表格视图组件
│   │   ├── SubtitleTable.vue
│   │   ├── SubtitleRow.vue
│   │   ├── TimeCell.vue
│   │   ├── TextCell.vue
│   │   └── index.ts
│   ├── timeline/            # 时间轴组件
│   │   ├── TimelineEditor.vue
│   │   ├── TimelineRuler.vue
│   │   ├── TimelineTrack.vue
│   │   ├── TimelineSubtitleBlock.vue
│   │   ├── Playhead.vue
│   │   └── index.ts
│   └── toolbar/             # 工具栏组件
│       ├── MainToolbar.vue
│       └── index.ts
├── composables/
│   ├── useFileExport.ts     # (已存在)
│   ├── useKeyboardShortcuts.ts
│   └── index.ts
├── stores/
│   ├── subtitle.ts          # (已存在，需扩展)
│   └── index.ts
└── utils/
    ├── time.ts              # (已存在)
    ├── keyboard.ts          # 键盘快捷键常量
    └── index.ts
```

---

## Task 1: 表格视图组件 - SubtitleTable

**Files:**
- Create: `src/components/table/SubtitleTable.vue`
- Create: `src/components/table/SubtitleRow.vue`
- Create: `src/components/table/TimeCell.vue`
- Create: `src/components/table/TextCell.vue`
- Create: `src/components/table/index.ts`

- [ ] **Step 1: 创建表格组件测试**

Create: `src/components/table/__tests__/SubtitleTable.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SubtitleTable from '../SubtitleTable.vue'
import { useSubtitleStore } from '../../../stores/subtitle'
import { createSubtitleFile } from '../../../core/models/SubtitleFile'
import { createSubtitleItem } from '../../../core/models/SubtitleItem'

describe('SubtitleTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render subtitle items', () => {
    const store = useSubtitleStore()
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
      items: [
        createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Hello' }),
        createSubtitleItem({ startTime: 4000, endTime: 7000, text: 'World' }),
      ],
    })
    store.loadFile(file)

    const wrapper = mount(SubtitleTable)
    expect(wrapper.findAll('[data-testid="subtitle-row"]')).toHaveLength(2)
  })

  it('should display time in formatted way', () => {
    const store = useSubtitleStore()
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
      items: [createSubtitleItem({ startTime: 61000, endTime: 63000, text: 'Test' })],
    })
    store.loadFile(file)

    const wrapper = mount(SubtitleTable)
    expect(wrapper.text()).toContain('0:01:01.00')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/components/table/__tests__/SubtitleTable.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现 SubtitleTable 组件**

Create: `src/components/table/SubtitleTable.vue`

```vue
<template>
  <div class="subtitle-table w-full overflow-auto" data-testid="subtitle-table">
    <table class="w-full border-collapse">
      <thead class="bg-gray-100 sticky top-0">
        <tr>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700 w-16">#</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">开始时间</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">结束时间</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">时长</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">文本</th>
        </tr>
      </thead>
      <tbody>
        <SubtitleRow
          v-for="(item, index) in store.items"
          :key="item.id"
          :index="index + 1"
          :item="item"
          :is-selected="store.isSelected(item.id)"
          @select="store.selectItem(item.id, $event)"
          @update="handleUpdate"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useSubtitleStore } from '../../stores/subtitle'
import SubtitleRow from './SubtitleRow.vue'

const store = useSubtitleStore()

function handleUpdate(id: string, updates: { startTime?: number; endTime?: number; text?: string }) {
  store.updateItem(id, updates)
}
</script>
```

- [ ] **Step 4: 实现 SubtitleRow 组件**

Create: `src/components/table/SubtitleRow.vue`

```vue
<template>
  <tr
    class="subtitle-row border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
    :class="{ 'bg-blue-100': isSelected }"
    data-testid="subtitle-row"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <td class="px-4 py-2 text-sm text-gray-600">{{ index }}</td>
    <td class="px-4 py-2">
      <TimeCell
        :value="item.startTime"
        @update="(v) => emitUpdate('startTime', v)"
      />
    </td>
    <td class="px-4 py-2">
      <TimeCell
        :value="item.endTime"
        @update="(v) => emitUpdate('endTime', v)"
      />
    </td>
    <td class="px-4 py-2 text-sm text-gray-600">{{ formatDuration }}</td>
    <td class="px-4 py-2">
      <TextCell
        :value="item.text"
        @update="(v) => emitUpdate('text', v)"
      />
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SubtitleItem } from '../../core/models/SubtitleItem'
import { msToAssTime } from '../../utils/time'
import TimeCell from './TimeCell.vue'
import TextCell from './TextCell.vue'

interface Props {
  index: number
  item: SubtitleItem
  isSelected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', multi: boolean): void
  (e: 'update', updates: { startTime?: number; endTime?: number; text?: string }): void
}>()

const formatDuration = computed(() => {
  const duration = props.item.endTime - props.item.startTime
  return msToAssTime(duration)
})

function handleClick(event: MouseEvent) {
  emit('select', event.ctrlKey || event.metaKey)
}

function handleDoubleClick() {
  // Double click behavior - could open detailed editor
}

function emitUpdate(key: 'startTime' | 'endTime' | 'text', value: number | string) {
  emit('update', { [key]: value })
}
</script>
```

- [ ] **Step 5: 实现 TimeCell 组件**

Create: `src/components/table/TimeCell.vue`

```vue
<template>
  <div class="time-cell">
    <input
      v-if="isEditing"
      ref="inputRef"
      v-model="editValue"
      type="text"
      class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      @blur="handleBlur"
      @keydown.enter="handleBlur"
      @keydown.escape="handleCancel"
    />
    <span
      v-else
      class="text-sm font-mono text-gray-700 cursor-pointer hover:text-blue-600"
      @click="startEditing"
    >
      {{ displayValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { msToAssTime, assTimeToMs } from '../../utils/time'

interface Props {
  value: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const displayValue = computed(() => msToAssTime(props.value))

function startEditing() {
  editValue.value = displayValue.value
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function handleBlur() {
  try {
    const newValue = assTimeToMs(editValue.value)
    if (newValue !== props.value) {
      emit('update', newValue)
    }
  } catch (e) {
    // Invalid format, revert to original
  }
  isEditing.value = false
}

function handleCancel() {
  isEditing.value = false
}
</script>
```

- [ ] **Step 6: 实现 TextCell 组件**

Create: `src/components/table/TextCell.vue`

```vue
<template>
  <div class="text-cell">
    <input
      v-if="isEditing"
      ref="inputRef"
      v-model="editValue"
      type="text"
      class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      @blur="handleBlur"
      @keydown.enter="handleBlur"
      @keydown.escape="handleCancel"
    />
    <span
      v-else
      class="text-sm text-gray-800 cursor-pointer hover:text-blue-600 truncate block max-w-md"
      @click="startEditing"
      :title="props.value"
    >
      {{ displayValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Props {
  value: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const displayValue = computed(() => {
  // Replace newlines with visible indicator
  return props.value.replace(/\n/g, ' ↵ ')
})

function startEditing() {
  editValue.value = props.value
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function handleBlur() {
  if (editValue.value !== props.value) {
    emit('update', editValue.value)
  }
  isEditing.value = false
}

function handleCancel() {
  isEditing.value = false
}
</script>
```

- [ ] **Step 7: 创建表格组件索引**

Create: `src/components/table/index.ts`

```typescript
export { default as SubtitleTable } from './SubtitleTable.vue'
export { default as SubtitleRow } from './SubtitleRow.vue'
export { default as TimeCell } from './TimeCell.vue'
export { default as TextCell } from './TextCell.vue'
```

- [ ] **Step 8: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/components/table/__tests__/SubtitleTable.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 9: Commit**

```bash
git add src/components/table
git commit -m "feat: add subtitle table components with editable cells"
```

---

## Task 2: 更新 App.vue 集成表格视图

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 修改 App.vue 添加表格视图**

Edit: `src/App.vue`

Add import:
```typescript
import { SubtitleTable } from './components/table'
```

Update template to show table when file loaded:
```vue
<div v-else class="bg-white rounded-lg shadow p-6">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-semibold">{{ store.currentFile?.filename }}</h2>
    <div class="flex gap-2">
      <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click="exportFile">
        导出
      </button>
      <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" @click="store.unloadFile">
        关闭
      </button>
    </div>
  </div>

  <SubtitleTable class="max-h-96" />
</div>
```

- [ ] **Step 2: 运行构建确认成功**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: PASS - Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate subtitle table into main app"
```

---

## Task 3: 工具栏组件 - MainToolbar

**Files:**
- Create: `src/components/toolbar/MainToolbar.vue`
- Create: `src/components/toolbar/index.ts`

- [ ] **Step 1: 创建工具栏组件**

Create: `src/components/toolbar/MainToolbar.vue`

```vue
<template>
  <div class="toolbar flex items-center gap-2 p-3 bg-gray-100 border-b border-gray-200">
    <button
      class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
      @click="handleAdd"
      title="添加字幕 (Ctrl+N)"
    >
      <span>+</span> 添加
    </button>

    <button
      class="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!hasSelection"
      @click="handleDelete"
      title="删除选中 (Delete)"
    >
      删除
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
      :disabled="!store.canUndo"
      @click="handleUndo"
      title="撤销 (Ctrl+Z)"
    >
      ↶ 撤销
    </button>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
      :disabled="!store.canRedo"
      @click="handleRedo"
      title="重做 (Ctrl+Y)"
    >
      ↷ 重做
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <span class="text-sm text-gray-600">
      {{ store.items.length }} 条字幕
      <span v-if="store.selectedIds.size > 0">({{ store.selectedIds.size }} 选中)</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'

const store = useSubtitleStore()

const hasSelection = computed(() => store.selectedIds.size > 0)

function handleAdd() {
  // Add new subtitle after the last one or at current time
  const lastItem = store.items[store.items.length - 1]
  const startTime = lastItem ? lastItem.endTime + 500 : 0
  const endTime = startTime + 2000

  store.addItem({
    startTime,
    endTime,
    text: 'New subtitle',
  })
}

function handleDelete() {
  const ids = Array.from(store.selectedIds)
  ids.forEach(id => store.removeItem(id))
  store.clearSelection()
}

function handleUndo() {
  // TODO: Implement undo
}

function handleRedo() {
  // TODO: Implement redo
}
</script>
```

- [ ] **Step 2: 创建工具栏索引**

Create: `src/components/toolbar/index.ts`

```typescript
export { default as MainToolbar } from './MainToolbar.vue'
```

- [ ] **Step 3: 更新 App.vue 添加工具栏**

Edit: `src/App.vue`

Add import:
```typescript
import { MainToolbar } from './components/toolbar'
```

Update template:
```vue
<div v-else class="bg-white rounded-lg shadow">
  <MainToolbar />
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">{{ store.currentFile?.filename }}</h2>
      <div class="flex gap-2">
        <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click="exportFile">
          导出
        </button>
        <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" @click="store.unloadFile">
          关闭
        </button>
      </div>
    </div>

    <SubtitleTable class="max-h-96" />
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/toolbar src/App.vue
git commit -m "feat: add main toolbar with add/delete buttons"
```

---

## Task 4: 时间轴编辑器基础 - TimelineEditor

**Files:**
- Create: `src/components/timeline/TimelineEditor.vue`
- Create: `src/components/timeline/TimelineRuler.vue`
- Create: `src/components/timeline/TimelineTrack.vue`
- Create: `src/components/timeline/TimelineSubtitleBlock.vue`
- Create: `src/components/timeline/index.ts`

- [ ] **Step 1: 创建时间轴编辑器测试**

Create: `src/components/timeline/__tests__/TimelineEditor.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TimelineEditor from '../TimelineEditor.vue'
import { useSubtitleStore } from '../../../stores/subtitle'
import { createSubtitleFile } from '../../../core/models/SubtitleFile'
import { createSubtitleItem } from '../../../core/models/SubtitleItem'

describe('TimelineEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render timeline with subtitles', () => {
    const store = useSubtitleStore()
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
      items: [
        createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Hello' }),
      ],
    })
    store.loadFile(file)

    const wrapper = mount(TimelineEditor, {
      props: { duration: 10000 }
    })

    expect(wrapper.find('[data-testid="timeline-editor"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 实现 TimelineEditor 组件**

Create: `src/components/timeline/TimelineEditor.vue`

```vue
<template>
  <div class="timeline-editor relative" data-testid="timeline-editor">
    <!-- Timeline Ruler -->
    <TimelineRuler
      :duration="duration"
      :zoom="zoom"
      @seek="handleSeek"
    />

    <!-- Tracks Container -->
    <div class="tracks-container relative bg-gray-900 overflow-hidden" :style="{ height: trackHeight + 'px' }">
      <!-- Time Grid Lines -->
      <div class="absolute inset-0 pointer-events-none">
        <div
          v-for="mark in timeMarks"
          :key="mark.time"
          class="absolute top-0 bottom-0 w-px bg-gray-700"
          :style="{ left: mark.position + '%' }"
        ></div>
      </div>

      <!-- Subtitle Track -->
      <TimelineTrack
        :items="store.items"
        :duration="duration"
        :zoom="zoom"
        @select="store.selectItem"
        @update="handleItemUpdate"
      />

      <!-- Playhead -->
      <div
        class="playhead absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
        :style="{ left: playheadPosition + '%' }"
      >
        <div class="w-3 h-3 bg-red-500 transform -translate-x-1/2 rotate-45 -mt-1.5"></div>
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="zoom-controls flex items-center gap-2 p-2 bg-gray-100">
      <button
        class="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        @click="zoomOut"
        :disabled="zoom <= 0.5"
      >
        -
      </button>
      <span class="text-sm text-gray-600">{{ Math.round(zoom * 100) }}%</span>
      <button
        class="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        @click="zoomIn"
        :disabled="zoom >= 5"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import TimelineRuler from './TimelineRuler.vue'
import TimelineTrack from './TimelineTrack.vue'

interface Props {
  duration?: number  // Total duration in ms (default 1 hour)
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3600000, // 1 hour
})

const store = useSubtitleStore()
const zoom = ref(1)
const currentTime = ref(0)

const trackHeight = ref(100)

const playheadPosition = computed(() => {
  return (currentTime.value / props.duration) * 100 * zoom.value
})

const timeMarks = computed(() => {
  const marks = []
  const step = 60000 / zoom.value // 1 minute divided by zoom
  for (let t = 0; t <= props.duration; t += step) {
    marks.push({
      time: t,
      position: (t / props.duration) * 100,
    })
  }
  return marks
})

function handleSeek(time: number) {
  currentTime.value = time
}

function handleItemUpdate(id: string, updates: { startTime?: number; endTime?: number }) {
  store.updateItem(id, updates)
}

function zoomIn() {
  zoom.value = Math.min(zoom.value * 1.2, 5)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value / 1.2, 0.5)
}
</script>
```

- [ ] **Step 3: 实现 TimelineRuler 组件**

Create: `src/components/timeline/TimelineRuler.vue`

```vue
<template>
  <div class="timeline-ruler relative h-8 bg-gray-800 border-b border-gray-700 select-none">
    <div
      v-for="tick in ticks"
      :key="tick.time"
      class="absolute top-0 h-full flex flex-col items-center"
      :style="{ left: tick.position + '%' }"
    >
      <div class="w-px h-2 bg-gray-500"></div>
      <span class="text-xs text-gray-400 mt-0.5 transform -translate-x-1/2 whitespace-nowrap">
        {{ tick.label }}
      </span>
    </div>

    <!-- Clickable area for seeking -->
    <div
      class="absolute inset-0 cursor-pointer"
      @click="handleClick"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { msToAssTime } from '../../utils/time'

interface Props {
  duration: number
  zoom: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

const ticks = computed(() => {
  const ticks = []
  const visibleDuration = props.duration / props.zoom
  const step = Math.max(1000, Math.floor(visibleDuration / 10)) // At least 1 second, ~10 ticks visible

  for (let t = 0; t <= props.duration; t += step) {
    ticks.push({
      time: t,
      position: (t / props.duration) * 100,
      label: formatTime(t),
    })
  }
  return ticks
})

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function handleClick(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const time = percent * props.duration
  emit('seek', Math.max(0, Math.min(time, props.duration)))
}
</script>
```

- [ ] **Step 4: 实现 TimelineTrack 组件**

Create: `src/components/timeline/TimelineTrack.vue`

```vue
<template>
  <div class="timeline-track relative h-full py-2">
    <TimelineSubtitleBlock
      v-for="item in items"
      :key="item.id"
      :item="item"
      :duration="duration"
      :is-selected="isSelected(item.id)"
      @select="emit('select', item.id, $event)"
      @update="emit('update', item.id, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useSubtitleStore } from '../../stores/subtitle'
import { SubtitleItem } from '../../core/models/SubtitleItem'
import TimelineSubtitleBlock from './TimelineSubtitleBlock.vue'

interface Props {
  items: SubtitleItem[]
  duration: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', id: string, multi: boolean): void
  (e: 'update', id: string, updates: { startTime?: number; endTime?: number }): void
}>()

const store = useSubtitleStore()

function isSelected(id: string): boolean {
  return store.isSelected(id)
}
</script>
```

- [ ] **Step 5: 实现 TimelineSubtitleBlock 组件**

Create: `src/components/timeline/TimelineSubtitleBlock.vue`

```vue
<template>
  <div
    class="subtitle-block absolute h-10 rounded cursor-pointer select-none overflow-hidden flex items-center px-2 text-sm transition-all"
    :class="{
      'bg-blue-600 text-white': isSelected,
      'bg-blue-400 text-white hover:bg-blue-500': !isSelected,
    }"
    :style="blockStyle"
    @click="handleClick"
  >
    <span class="truncate">{{ item.text }}</span>

    <!-- Resize handles -->
    <div
      class="resize-handle-left absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/30"
      @mousedown.stop="handleResizeStart('left', $event)"
    ></div>
    <div
      class="resize-handle-right absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/30"
      @mousedown.stop="handleResizeStart('right', $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SubtitleItem } from '../../core/models/SubtitleItem'

interface Props {
  item: SubtitleItem
  duration: number
  isSelected: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', multi: boolean): void
  (e: 'update', updates: { startTime?: number; endTime?: number }): void
}>()

const blockStyle = computed(() => {
  const left = (props.item.startTime / props.duration) * 100
  const width = ((props.item.endTime - props.item.startTime) / props.duration) * 100
  return {
    left: `${left}%`,
    width: `${Math.max(width, 0.5)}%`, // Minimum width for visibility
  }
})

function handleClick(event: MouseEvent) {
  emit('select', event.ctrlKey || event.metaKey)
}

// Resize functionality
const isResizing = ref(false)
const resizeEdge = ref<'left' | 'right' | null>(null)
const startX = ref(0)
const startTime = ref(0)
const endTime = ref(0)

function handleResizeStart(edge: 'left' | 'right', event: MouseEvent) {
  isResizing.value = true
  resizeEdge.value = edge
  startX.value = event.clientX
  startTime.value = props.item.startTime
  endTime.value = props.item.endTime

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(event: MouseEvent) {
  if (!isResizing.value) return

  const deltaX = event.clientX - startX.value
  const deltaPercent = deltaX / (window.innerWidth * 0.8) // Approximate timeline width
  const deltaTime = deltaPercent * props.duration

  if (resizeEdge.value === 'left') {
    const newStartTime = Math.max(0, Math.min(startTime.value + deltaTime, props.item.endTime - 100))
    emit('update', { startTime: newStartTime })
  } else {
    const newEndTime = Math.max(props.item.startTime + 100, Math.min(endTime.value + deltaTime, props.duration))
    emit('update', { endTime: newEndTime })
  }
}

function handleResizeEnd() {
  isResizing.value = false
  resizeEdge.value = null
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}
</script>
```

- [ ] **Step 6: 创建时间轴索引**

Create: `src/components/timeline/index.ts`

```typescript
export { default as TimelineEditor } from './TimelineEditor.vue'
export { default as TimelineRuler } from './TimelineRuler.vue'
export { default as TimelineTrack } from './TimelineTrack.vue'
export { default as TimelineSubtitleBlock } from './TimelineSubtitleBlock.vue'
```

- [ ] **Step 7: Commit**

```bash
git add src/components/timeline
git commit -m "feat: add timeline editor with ruler, track, and subtitle blocks"
```

---

## Task 5: 更新 App.vue 集成时间轴编辑器

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 添加视图切换和时间轴**

Edit: `src/App.vue`

Add imports:
```typescript
import { ref } from 'vue'
import { TimelineEditor } from './components/timeline'

const currentView = ref<'table' | 'timeline'>('table')
```

Update template:
```vue
<div v-else class="bg-white rounded-lg shadow">
  <MainToolbar />

  <!-- View Switcher -->
  <div class="flex border-b border-gray-200">
    <button
      class="px-4 py-2 text-sm font-medium"
      :class="currentView === 'table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
      @click="currentView = 'table'"
    >
      表格视图
    </button>
    <button
      class="px-4 py-2 text-sm font-medium"
      :class="currentView === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
      @click="currentView = 'timeline'"
    >
      时间轴
    </button>
  </div>

  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">{{ store.currentFile?.filename }}</h2>
      <div class="flex gap-2">
        <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click="exportFile">
          导出
        </button>
        <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" @click="store.unloadFile">
          关闭
        </button>
      </div>
    </div>

    <!-- Table View -->
    <SubtitleTable v-if="currentView === 'table'" class="max-h-96" />

    <!-- Timeline View -->
    <TimelineEditor v-else :duration="600000" />
  </div>
</div>
```

- [ ] **Step 2: 运行构建确认**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate timeline editor with view switcher"
```

---

## Task 6: 键盘快捷键支持

**Files:**
- Create: `src/utils/keyboard.ts`
- Create: `src/composables/useKeyboardShortcuts.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建键盘常量**

Create: `src/utils/keyboard.ts`

```typescript
export const KeyboardShortcuts = {
  // Editing
  NEW_SUBTITLE: 'Ctrl+N',
  DELETE_SUBTITLE: 'Delete',
  DUPLICATE_SUBTITLE: 'Ctrl+D',

  // History
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',

  // Selection
  SELECT_ALL: 'Ctrl+A',
  ESCAPE: 'Escape',

  // Navigation
  NEXT_SUBTITLE: 'ArrowDown',
  PREV_SUBTITLE: 'ArrowUp',
} as const

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+')
  const key = parts.pop()?.toLowerCase()

  if (event.key.toLowerCase() !== key) return false

  const needsCtrl = parts.includes('Ctrl')
  const needsShift = parts.includes('Shift')
  const needsAlt = parts.includes('Alt')

  if (needsCtrl && !event.ctrlKey && !event.metaKey) return false
  if (needsShift && !event.shiftKey) return false
  if (needsAlt && !event.altKey) return false

  return true
}
```

- [ ] **Step 2: 创建键盘快捷键 composable**

Create: `src/composables/useKeyboardShortcuts.ts`

```typescript
import { onMounted, onUnmounted } from 'vue'
import { useSubtitleStore } from '../stores/subtitle'
import { KeyboardShortcuts, matchesShortcut } from '../utils/keyboard'

export function useKeyboardShortcuts() {
  const store = useSubtitleStore()

  function handleKeydown(event: KeyboardEvent) {
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (matchesShortcut(event, KeyboardShortcuts.ESCAPE)) {
        (event.target as HTMLElement).blur()
        event.preventDefault()
      }
      return
    }

    // New subtitle
    if (matchesShortcut(event, KeyboardShortcuts.NEW_SUBTITLE)) {
      event.preventDefault()
      const lastItem = store.items[store.items.length - 1]
      const startTime = lastItem ? lastItem.endTime + 500 : 0
      store.addItem({
        startTime,
        endTime: startTime + 2000,
        text: 'New subtitle',
      })
      return
    }

    // Delete selected
    if (matchesShortcut(event, KeyboardShortcuts.DELETE_SUBTITLE)) {
      event.preventDefault()
      const ids = Array.from(store.selectedIds)
      ids.forEach(id => store.removeItem(id))
      store.clearSelection()
      return
    }

    // Select all
    if (matchesShortcut(event, KeyboardShortcuts.SELECT_ALL)) {
      event.preventDefault()
      store.items.forEach(item => store.selectItem(item.id, true))
      return
    }

    // Escape - clear selection
    if (matchesShortcut(event, KeyboardShortcuts.ESCAPE)) {
      event.preventDefault()
      store.clearSelection()
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {}
}
```

- [ ] **Step 3: 更新 App.vue 使用键盘快捷键**

Edit: `src/App.vue`

Add import:
```typescript
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

// In setup
useKeyboardShortcuts()
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/keyboard.ts src/composables/useKeyboardShortcuts.ts src/App.vue
git commit -m "feat: add keyboard shortcuts for editing operations"
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
Expected: All tests pass

- [ ] **Step 2: 验证构建**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Final Commit**

```bash
git add -A
git commit -m "chore: verify Phase 2 implementation"
```

---

## Phase 2 完成总结

完成 Phase 2 后，项目将具备以下能力：

1. ✅ 表格视图 - 可编辑的字幕列表，支持时间/文本编辑
2. ✅ 时间轴编辑器 - 可视化时间轴，支持选择和调整
3. ✅ 基础编辑操作 - 添加、删除、修改字幕
4. ✅ 工具栏 - 快速访问常用操作
5. ✅ 键盘快捷键 - 提高编辑效率
6. ✅ 视图切换 - 表格/时间轴两种模式

**Next Steps:** Phase 3 - 样式系统 (ASS 样式编辑器、样式管理、预设样式库)
