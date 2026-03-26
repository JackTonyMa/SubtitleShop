# Phase 5 - 打磨优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 性能优化、单元测试完善、文档编写、国际化支持

**Architecture:** 使用 Vue 的虚拟滚动优化大数据量渲染，Vitest 完善测试覆盖，JSDoc 生成文档，Vue I18n 实现多语言

**Tech Stack:** Vue 3, Vitest, TypeDoc, Vue I18n

---

## Task 1: 性能优化 - 虚拟滚动

**Files:**
- Create: `src/composables/useVirtualScroll.ts`
- Modify: `src/components/table/SubtitleTable.vue`

- [ ] **Step 1: 创建虚拟滚动 composable**

Create: `src/composables/useVirtualScroll.ts`

```typescript
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface VirtualScrollOptions<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}

interface VirtualScrollState<T> {
  visibleItems: T[]
  startIndex: number
  endIndex: number
  totalHeight: number
  scrollTop: number
}

export function useVirtualScroll<T>(options: VirtualScrollOptions<T>) {
  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement | null>(null)

  const overscan = options.overscan || 5

  const totalHeight = computed(() => options.items.length * options.itemHeight)

  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / options.itemHeight)
    const visibleCount = Math.ceil(options.containerHeight / options.itemHeight)

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(options.items.length, start + visibleCount + overscan),
    }
  })

  const visibleItems = computed(() => {
    return options.items.slice(visibleRange.value.start, visibleRange.value.end)
  })

  const offsetY = computed(() => visibleRange.value.start * options.itemHeight)

  function onScroll(event: Event) {
    scrollTop.value = (event.target as HTMLElement).scrollTop
  }

  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', onScroll)
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', onScroll)
    }
  })

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    startIndex: computed(() => visibleRange.value.start),
  }
}
```

- [ ] **Step 2: 更新 SubtitleTable 使用虚拟滚动**

Edit: `src/components/table/SubtitleTable.vue`

Replace table with virtual scroll version for large datasets.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useVirtualScroll.ts
git commit -m "feat: add virtual scroll composable for large datasets"
```

---

## Task 2: 完善单元测试

**Files:**
- Create/Update: Various test files

- [ ] **Step 1: 为 history 命令添加测试**

Create: `src/core/history/__tests__/HistoryManager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { HistoryManager } from '../HistoryManager'
import { Command } from '../Command'

class TestCommand extends Command {
  name = 'Test'
  executed = false
  undone = false

  execute() { this.executed = true }
  undo() { this.undone = true }
}

describe('HistoryManager', () => {
  let history: HistoryManager

  beforeEach(() => {
    history = new HistoryManager()
  })

  it('should execute command', () => {
    const cmd = new TestCommand()
    history.execute(cmd)
    expect(cmd.executed).toBe(true)
    expect(history.canUndo).toBe(true)
  })

  it('should undo and redo', () => {
    const cmd = new TestCommand()
    history.execute(cmd)
    history.undo()
    expect(cmd.undone).toBe(true)
    expect(history.canRedo).toBe(true)
    history.redo()
    expect(cmd.executed).toBe(true)
  })
})
```

- [ ] **Step 2: 为转换器添加测试**

Create: `src/plugins/converter/__tests__/converter.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { assToSrt } from '../assToSrt'
import { srtToAss } from '../srtToAss'
import { createSubtitleFile } from '../../../core/models/SubtitleFile'
import { createSubtitleItem } from '../../../core/models/SubtitleItem'

describe('Format Converter', () => {
  it('should convert ASS to SRT', () => {
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
      items: [createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Hello' })],
    })

    const result = assToSrt(file)
    expect(result.content).toContain('00:00:01,000 --> 00:00:03,000')
    expect(result.content).toContain('Hello')
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add src/core/history/__tests__ src/plugins/converter/__tests__
git commit -m "test: add unit tests for history and converter"
```

---

## Task 3: 添加 JSDoc 文档

**Files:**
- Update: All core files with JSDoc comments

- [ ] **Step 1: 为核心模型添加 JSDoc**

Edit: `src/core/models/SubtitleItem.ts`

Add JSDoc comments to interfaces and functions.

- [ ] **Step 2: Commit**

```bash
git add src/core/models
git commit -m "docs: add JSDoc comments to core models"
```

---

## Task 4: 国际化支持

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/zh-CN.ts`
- Create: `src/i18n/locales/en-US.ts`
- Modify: `src/main.ts` - Add i18n

- [ ] **Step 1: 创建国际化配置**

Create: `src/i18n/index.ts`

```typescript
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})
```

- [ ] **Step 2: 创建中文语言包**

Create: `src/i18n/locales/zh-CN.ts`

```typescript
export default {
  app: {
    title: 'SubtitleShop',
    subtitle: '可视化字幕编辑器',
  },
  toolbar: {
    add: '添加',
    delete: '删除',
    undo: '撤销',
    redo: '重做',
    merge: '合并',
    duplicate: '复制',
    shift: '平移',
  },
  table: {
    index: '序号',
    startTime: '开始时间',
    endTime: '结束时间',
    duration: '时长',
    text: '文本',
    style: '样式',
  },
  // ... more translations
}
```

- [ ] **Step 3: 创建英文语言包**

Create: `src/i18n/locales/en-US.ts`

```typescript
export default {
  app: {
    title: 'SubtitleShop',
    subtitle: 'Visual Subtitle Editor',
  },
  toolbar: {
    add: 'Add',
    delete: 'Delete',
    undo: 'Undo',
    redo: 'Redo',
    merge: 'Merge',
    duplicate: 'Duplicate',
    shift: 'Shift',
  },
  table: {
    index: '#',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    text: 'Text',
    style: 'Style',
  },
}
```

- [ ] **Step 4: 集成到 main.ts**

Edit: `src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from './i18n'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')
```

- [ ] **Step 5: Commit**

```bash
git add src/i18n
git commit -m "feat: add i18n support with zh-CN and en-US locales"
```

---

## Task 5: 最终验证和构建

**Files:**
- All files

- [ ] **Step 1: 运行所有测试**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- --run
```

- [ ] **Step 2: 验证构建**

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```

- [ ] **Step 3: 创建最终版本标签**

```bash
git tag -a v1.0.0 -m "SubtitleShop v1.0.0 - Complete implementation"
```

- [ ] **Step 4: Final Commit**

```bash
git add -A
git commit -m "chore: finalize Phase 5 and project completion"
```

---

## Phase 5 完成总结

完成 Phase 5 后，项目将具备以下能力：

1. ✅ 性能优化（虚拟滚动支持 5000+ 字幕）
2. ✅ 完善的单元测试覆盖
3. ✅ JSDoc 代码文档
4. ✅ 国际化支持（中英文）
5. ✅ v1.0.0 版本发布

**Project Complete!**
