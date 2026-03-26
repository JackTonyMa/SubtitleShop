# Phase 4 - 高级功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现撤销/重做、格式转换、批量操作等高级功能

**Architecture:** 使用命令模式实现撤销/重做，通过 Pinia Store 扩展状态管理，批量操作使用多选和批量更新

**Tech Stack:** Vue 3, TypeScript, Pinia

---

## 文件结构映射

```
src/
├── core/
│   └── history/
│       ├── Command.ts           # 命令基类
│       ├── HistoryManager.ts    # 历史管理器
│       └── commands/            # 具体命令
│           ├── AddSubtitleCommand.ts
│           ├── DeleteSubtitleCommand.ts
│           ├── UpdateSubtitleCommand.ts
│           └── index.ts
├── composables/
│   └── useHistory.ts            # 历史管理 composable
├── plugins/
│   └── converter/               # 格式转换
│       ├── assToSrt.ts
│       ├── srtToAss.ts
│       └── index.ts
└── stores/
    └── subtitle.ts              # 扩展历史相关方法
```

---

## Task 1: 撤销/重做系统 - 基础架构

**Files:**
- Create: `src/core/history/Command.ts`
- Create: `src/core/history/HistoryManager.ts`
- Create: `src/core/history/index.ts`

- [ ] **Step 1: 创建 Command 基类**

Create: `src/core/history/Command.ts`

```typescript
export abstract class Command {
  abstract readonly name: string
  abstract execute(): void
  abstract undo(): void

  // Optional redo - default re-executes
  redo(): void {
    this.execute()
  }
}
```

- [ ] **Step 2: 创建 HistoryManager**

Create: `src/core/history/HistoryManager.ts`

```typescript
import { Command } from './Command'

export class HistoryManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistory = 100

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  execute(command: Command): void {
    command.execute()
    this.undoStack.push(command)
    this.redoStack = [] // Clear redo stack on new action

    // Limit history size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
  }

  undo(): void {
    if (!this.canUndo) return
    const command = this.undoStack.pop()!
    command.undo()
    this.redoStack.push(command)
  }

  redo(): void {
    if (!this.canRedo) return
    const command = this.redoStack.pop()!
    command.redo()
    this.undoStack.push(command)
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
```

- [ ] **Step 3: 创建索引文件**

Create: `src/core/history/index.ts`

```typescript
export * from './Command'
export * from './HistoryManager'
```

- [ ] **Step 4: Commit**

```bash
git add src/core/history
git commit -m "feat: add history manager for undo/redo"
```

---

## Task 2: 创建具体命令类

**Files:**
- Create: `src/core/history/commands/AddSubtitleCommand.ts`
- Create: `src/core/history/commands/DeleteSubtitleCommand.ts`
- Create: `src/core/history/commands/UpdateSubtitleCommand.ts`
- Create: `src/core/history/commands/index.ts`

- [ ] **Step 1: 创建 AddSubtitleCommand**

Create: `src/core/history/commands/AddSubtitleCommand.ts`

```typescript
import { Command } from '../Command'
import { SubtitleItem } from '../../models/SubtitleItem'

interface AddSubtitleParams {
  add: (item: SubtitleItem) => void
  remove: (id: string) => void
  item: SubtitleItem
}

export class AddSubtitleCommand extends Command {
  readonly name = 'Add Subtitle'

  constructor(private params: AddSubtitleParams) {
    super()
  }

  execute(): void {
    this.params.add(this.params.item)
  }

  undo(): void {
    this.params.remove(this.params.item.id)
  }
}
```

- [ ] **Step 2: 创建 DeleteSubtitleCommand**

Create: `src/core/history/commands/DeleteSubtitleCommand.ts`

```typescript
import { Command } from '../Command'
import { SubtitleItem } from '../../models/SubtitleItem'

interface DeleteSubtitleParams {
  add: (item: SubtitleItem) => void
  remove: (id: string) => void
  item: SubtitleItem
}

export class DeleteSubtitleCommand extends Command {
  readonly name = 'Delete Subtitle'
  private index: number = -1

  constructor(private params: DeleteSubtitleParams) {
    super()
  }

  execute(): void {
    // Store index before removing for proper restoration
    this.params.remove(this.params.item.id)
  }

  undo(): void {
    this.params.add(this.params.item)
  }
}
```

- [ ] **Step 3: 创建 UpdateSubtitleCommand**

Create: `src/core/history/commands/UpdateSubtitleCommand.ts`

```typescript
import { Command } from '../Command'
import { SubtitleItem } from '../../models/SubtitleItem'

interface UpdateSubtitleParams {
  update: (id: string, updates: Partial<SubtitleItem>) => void
  id: string
  oldValues: Partial<SubtitleItem>
  newValues: Partial<SubtitleItem>
}

export class UpdateSubtitleCommand extends Command {
  readonly name = 'Update Subtitle'

  constructor(private params: UpdateSubtitleParams) {
    super()
  }

  execute(): void {
    this.params.update(this.params.id, this.params.newValues)
  }

  undo(): void {
    this.params.update(this.params.id, this.params.oldValues)
  }
}
```

- [ ] **Step 4: 创建命令索引**

Create: `src/core/history/commands/index.ts`

```typescript
export * from './AddSubtitleCommand'
export * from './DeleteSubtitleCommand'
export * from './UpdateSubtitleCommand'
```

- [ ] **Step 5: 更新 history 索引**

Edit: `src/core/history/index.ts`

```typescript
export * from './Command'
export * from './HistoryManager'
export * from './commands'
```

- [ ] **Step 6: Commit**

```bash
git add src/core/history/commands
git commit -m "feat: add undo/redo commands for subtitle operations"
```

---

## Task 3: 集成撤销/重做到 Store

**Files:**
- Modify: `src/stores/subtitle.ts`

- [ ] **Step 1: 扩展 Store 支持历史管理**

Edit: `src/stores/subtitle.ts`

Add imports:
```typescript
import { HistoryManager } from '../core/history/HistoryManager'
import {
  AddSubtitleCommand,
  DeleteSubtitleCommand,
  UpdateSubtitleCommand,
} from '../core/history/commands'
```

Add state:
```typescript
const history = new HistoryManager()
```

Add getters:
```typescript
const canUndo = computed(() => history.canUndo)
const canRedo = computed(() => history.canRedo)
```

Modify actions to use commands:
```typescript
function addItem(params: { startTime: number; endTime: number; text: string; style?: string }) {
  const newItem = createSubtitleItem(params)
  history.execute(new AddSubtitleCommand({
    add: (item) => {
      items.value.push(item)
      updateFile()
    },
    remove: (id) => {
      const idx = items.value.findIndex(i => i.id === id)
      if (idx !== -1) {
        items.value.splice(idx, 1)
        updateFile()
      }
    },
    item: newItem,
  }))
  return newItem
}

function removeItem(id: string) {
  const item = items.value.find(i => i.id === id)
  if (!item) return

  history.execute(new DeleteSubtitleCommand({
    add: (i) => {
      items.value.push(i)
      updateFile()
    },
    remove: (itemId) => {
      const idx = items.value.findIndex(i => i.id === itemId)
      if (idx !== -1) {
        items.value.splice(idx, 1)
        updateFile()
      }
    },
    item: { ...item }, // Clone to preserve data
  }))
}

function updateItem(id: string, updates: Partial<Omit<SubtitleItem, 'id'>>) {
  const item = items.value.find(i => i.id === id)
  if (!item) return

  const oldValues: Partial<SubtitleItem> = {}
  const newValues: Partial<SubtitleItem> = {}

  Object.keys(updates).forEach((key) => {
    const k = key as keyof SubtitleItem
    oldValues[k] = item[k] as any
    newValues[k] = updates[k] as any
  })

  history.execute(new UpdateSubtitleCommand({
    update: (itemId, ups) => {
      const target = items.value.find(i => i.id === itemId)
      if (target) {
        Object.assign(target, ups)
        updateFile()
      }
    },
    id,
    oldValues,
    newValues,
  }))
}

function undo() {
  history.undo()
}

function redo() {
  history.redo()
}
```

Update return:
```typescript
return {
  // ... existing exports
  canUndo,
  canRedo,
  undo,
  redo,
}
```

- [ ] **Step 2: 更新工具栏按钮状态**

工具栏中的撤销/重做按钮已经绑定了 canUndo/canRedo，现在应该可以正常工作了。

- [ ] **Step 3: Commit**

```bash
git add src/stores/subtitle.ts
git commit -m "feat: integrate undo/redo into subtitle store"
```

---

## Task 4: 格式转换功能

**Files:**
- Create: `src/plugins/converter/assToSrt.ts`
- Create: `src/plugins/converter/srtToAss.ts`
- Create: `src/plugins/converter/index.ts`

- [ ] **Step 1: 创建 ASS 转 SRT**

Create: `src/plugins/converter/assToSrt.ts`

```typescript
import { SubtitleFile } from '../../core/models/SubtitleFile'
import { SubtitleItem } from '../../core/models/SubtitleItem'
import { msToSrtTime } from '../../utils/time'

interface AssToSrtResult {
  content: string
  warnings: string[]
}

export function assToSrt(file: SubtitleFile): AssToSrtResult {
  const warnings: string[] = []

  if (file.styles.length > 1) {
    warnings.push('多个样式将被合并，样式信息会丢失')
  }

  const lines: string[] = []

  file.items.forEach((item, index) => {
    const hasAssTags = /{[\\\*].*?}/.test(item.text)
    if (hasAssTags) {
      warnings.push(`第 ${index + 1} 行的 ASS 标签将被移除`)
    }

    // Remove ASS tags
    const cleanText = item.text
      .replace(/{[\\\*].*?}/g, '') // Remove tags like {\pos(100,200)}
      .replace(/\\N/g, '\n')       // Convert \N to newline
      .replace(/\\n/g, '\n')       // Convert \n to newline
      .replace(/\\h/g, ' ')        // Convert \h to space

    lines.push(String(index + 1))
    lines.push(`${msToSrtTime(item.startTime)} --> ${msToSrtTime(item.endTime)}`)
    lines.push(cleanText)
    lines.push('')
  })

  return {
    content: lines.join('\n').trim() + '\n',
    warnings,
  }
}
```

- [ ] **Step 2: 创建 SRT 转 ASS**

Create: `src/plugins/converter/srtToAss.ts`

```typescript
import { SubtitleFile, createSubtitleFile } from '../../core/models/SubtitleFile'
import { createDefaultStyle } from '../../core/models/AssStyle'
import { msToAssTime } from '../../utils/time'

interface SrtToAssResult {
  file: SubtitleFile
  warnings: string[]
}

export function srtToAss(srtFile: SubtitleFile): SrtToAssResult {
  const warnings: string[] = []

  // Create Default style if none exists
  const styles = srtFile.styles.length > 0
    ? srtFile.styles
    : [createDefaultStyle()]

  // Build ASS content
  const lines: string[] = []

  // Script Info
  lines.push('[Script Info]')
  lines.push('Title: Converted from SRT')
  lines.push('ScriptType: v4.00+')
  lines.push('')

  // V4+ Styles
  lines.push('[V4+ Styles]')
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')

  styles.forEach(style => {
    const boolToNum = (b: boolean) => b ? '-1' : '0'
    lines.push(`Style: ${style.name},${style.fontName},${style.fontSize},${style.primaryColor},${style.secondaryColor},${style.outlineColor},${style.backColor},${boolToNum(style.bold)},${boolToNum(style.italic)},${boolToNum(style.underline)},${boolToNum(style.strikeout)},${style.scaleX},${style.scaleY},${style.spacing},${style.angle},${style.borderStyle},${style.outline},${style.shadow},${style.alignment},${style.marginL},${style.marginR},${style.marginV},${style.encoding}`)
  })

  lines.push('')

  // Events
  lines.push('[Events]')
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')

  srtFile.items.forEach(item => {
    const text = item.text.replace(/\n/g, '\\N')
    lines.push(`Dialogue: 0,${msToAssTime(item.startTime)},${msToAssTime(item.endTime)},Default,,0,0,0,,${text}`)
  })

  // Create new file with ASS format
  const file = createSubtitleFile({
    filename: srtFile.filename.replace(/\.srt$/i, '.ass'),
    format: 'ass',
    items: srtFile.items,
    styles,
    scriptInfo: {
      Title: 'Converted from SRT',
      ScriptType: 'v4.00+',
    },
  })

  return { file, warnings }
}
```

- [ ] **Step 3: 创建转换器索引**

Create: `src/plugins/converter/index.ts`

```typescript
export * from './assToSrt'
export * from './srtToAss'
```

- [ ] **Step 4: Commit**

```bash
git add src/plugins/converter
git commit -m "feat: add ASS/SRT format conversion"
```

---

## Task 5: 批量操作功能

**Files:**
- Modify: `src/stores/subtitle.ts` - Add batch operations
- Modify: `src/components/toolbar/MainToolbar.vue` - Add batch buttons

- [ ] **Step 1: 添加批量操作方法到 Store**

Edit: `src/stores/subtitle.ts`

Add actions:
```typescript
function deleteSelected() {
  const ids = Array.from(selectedIds.value)
  ids.forEach(id => removeItem(id))
  clearSelection()
}

function shiftTime(offset: number) {
  const ids = Array.from(selectedIds.value)
  ids.forEach(id => {
    const item = items.value.find(i => i.id === id)
    if (item) {
      updateItem(id, {
        startTime: Math.max(0, item.startTime + offset),
        endTime: Math.max(0, item.endTime + offset),
      })
    }
  })
}

function mergeSelected() {
  const selectedItems = items.value.filter(i => selectedIds.value.has(i.id))
  if (selectedItems.length < 2) return

  // Sort by start time
  selectedItems.sort((a, b) => a.startTime - b.startTime)

  const first = selectedItems[0]
  const last = selectedItems[selectedItems.length - 1]

  // Create merged item
  const mergedText = selectedItems.map(i => i.text).join(' ')

  // Delete all selected
  deleteSelected()

  // Add merged
  addItem({
    startTime: first.startTime,
    endTime: last.endTime,
    text: mergedText,
  })
}

function duplicateSelected() {
  const selectedItems = items.value
    .filter(i => selectedIds.value.has(i.id))
    .map(i => ({ ...i }))

  clearSelection()

  selectedItems.forEach(item => {
    const newItem = addItem({
      startTime: item.startTime,
      endTime: item.endTime,
      text: item.text,
      style: item.style,
    })
    selectItem(newItem.id, true)
  })
}
```

Update return:
```typescript
return {
  // ... existing exports
  deleteSelected,
  shiftTime,
  mergeSelected,
  duplicateSelected,
}
```

- [ ] **Step 2: 更新工具栏**

Edit: `src/components/toolbar/MainToolbar.vue`

Add batch operation buttons:
```vue
<div class="w-px h-6 bg-gray-300 mx-2"></div>

<button
  class="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
  :disabled="store.selectedIds.size < 2"
  @click="handleMerge"
  title="合并选中字幕"
>
  合并
</button>

<button
  class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
  :disabled="!hasSelection"
  @click="handleDuplicate"
  title="复制选中 (Ctrl+D)"
>
  复制
</button>

<button
  class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
  :disabled="!hasSelection"
  @click="handleShiftTime"
  title="时间平移"
>
  平移
</button>
```

Add handlers:
```typescript
function handleMerge() {
  store.mergeSelected()
}

function handleDuplicate() {
  store.duplicateSelected()
}

function handleShiftTime() {
  const offset = prompt('输入时间偏移量（毫秒，正数向后，负数向前）:', '1000')
  if (offset) {
    store.shiftTime(parseInt(offset))
  }
}
```

- [ ] **Step 3: 添加批量操作快捷键**

Edit: `src/composables/useKeyboardShortcuts.ts`

Add:
```typescript
// Ctrl+D - Duplicate
if (matchesShortcut(event, 'Ctrl+D')) {
  event.preventDefault()
  store.duplicateSelected()
  return
}
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/subtitle.ts src/components/toolbar/MainToolbar.vue src/composables/useKeyboardShortcuts.ts
git commit -m "feat: add batch operations (merge, duplicate, shift time)"
```

---

## Task 6: 运行完整测试

**Files:**
- All test files

- [ ] **Step 1: 运行所有测试**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- --run
```

- [ ] **Step 2: 验证构建**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```

- [ ] **Step 3: Final Commit**

```bash
git add -A
git commit -m "chore: verify Phase 4 implementation"
```

---

## Phase 4 完成总结

完成 Phase 4 后，项目将具备以下能力：

1. ✅ 撤销/重做系统（命令模式）
2. ✅ 格式转换（ASS ↔ SRT）
3. ✅ 批量操作（合并、复制、时间平移）
4. ✅ 键盘快捷键扩展

**Next Steps:** Phase 5 - 打磨优化（性能、测试、文档、国际化）
