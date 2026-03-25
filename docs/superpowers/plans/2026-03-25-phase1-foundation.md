# Phase 1 - 基础框架实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 SubtitleShop 基础框架，包括项目初始化、插件系统、数据模型和 ASS/SRT 解析器

**Architecture:** 采用 Vue 3 + Vite + TypeScript 技术栈，设计模块化插件架构，核心引擎提供基础数据模型和插件管理能力，解析器作为独立插件实现

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Tailwind CSS, localForage, Vitest

---

## 文件结构映射

```
src/
├── core/
│   ├── models/              # 数据模型
│   │   ├── SubtitleItem.ts
│   │   ├── AssStyle.ts
│   │   ├── SubtitleFile.ts
│   │   └── Project.ts
│   ├── history/
│   │   └── HistoryManager.ts
│   └── plugins/
│       ├── PluginManager.ts
│       ├── BasePlugin.ts
│       └── types.ts
├── plugins/
│   ├── parser-ass/
│   │   ├── index.ts
│   │   ├── parser.ts
│   │   ├── serializer.ts
│   │   └── utils.ts
│   └── parser-srt/
│       ├── index.ts
│       ├── parser.ts
│       └── serializer.ts
├── stores/
│   └── subtitle.ts
├── composables/
│   └── useStorage.ts
├── utils/
│   └── time.ts
├── App.vue
├── main.ts
└── vite-env.d.ts
```

---

## Task 1: 项目初始化 (Vite + Vue 3 + TypeScript)

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: 使用 Vite 创建项目**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use || (nvm install && nvm use) && npm create vite@latest . -- --template vue-ts
```
Expected: Project created with Vue 3 + TypeScript template

- [ ] **Step 2: 安装依赖**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm install pinia tailwindcss @tailwindcss/vite localforage
```
Expected: Dependencies installed

- [ ] **Step 3: 安装开发依赖**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm install -D vitest @vue/test-utils jsdom @types/node
```
Expected: Dev dependencies installed

- [ ] **Step 4: 配置 Tailwind CSS**

Edit: `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Create: `src/style.css`

```css
@import "tailwindcss";
```

- [ ] **Step 5: 配置 Vitest**

Edit: `package.json` (add scripts)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

- [ ] **Step 6: 验证项目可以运行**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: Build succeeds without errors

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize project with Vite + Vue 3 + TypeScript"
```

---

## Task 2: 数据模型定义

**Files:**
- Create: `src/core/models/SubtitleItem.ts`
- Create: `src/core/models/AssStyle.ts`
- Create: `src/core/models/SubtitleFile.ts`
- Create: `src/core/models/Project.ts`
- Create: `src/core/models/index.ts`

- [ ] **Step 1: 编写 SubtitleItem 模型测试**

Create: `src/core/models/__tests__/SubtitleItem.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { SubtitleItem, createSubtitleItem } from '../SubtitleItem'

describe('SubtitleItem', () => {
  it('should create a subtitle item with default values', () => {
    const item = createSubtitleItem({
      startTime: 1000,
      endTime: 3000,
      text: 'Hello',
    })

    expect(item.startTime).toBe(1000)
    expect(item.endTime).toBe(3000)
    expect(item.text).toBe('Hello')
    expect(item.id).toBeDefined()
    expect(item.style).toBeUndefined()
    expect(item.effect).toBeUndefined()
  })

  it('should validate time range', () => {
    expect(() =>
      createSubtitleItem({
        startTime: 5000,
        endTime: 3000,
        text: 'Invalid',
      })
    ).toThrow('Start time must be less than end time')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/core/models/__tests__/SubtitleItem.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现 SubtitleItem 模型**

Create: `src/core/models/SubtitleItem.ts`

```typescript
export interface SubtitleItem {
  id: string
  startTime: number
  endTime: number
  text: string
  style?: string
  effect?: string
}

export function createSubtitleItem(params: Omit<SubtitleItem, 'id'>): SubtitleItem {
  if (params.startTime >= params.endTime) {
    throw new Error('Start time must be less than end time')
  }

  return {
    id: generateId(),
    ...params,
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/core/models/__tests__/SubtitleItem.test.ts
```
Expected: PASS - 2 tests passed

- [ ] **Step 5: 编写 AssStyle 模型测试**

Create: `src/core/models/__tests__/AssStyle.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { AssStyle, createDefaultStyle, createAssStyle } from '../AssStyle'

describe('AssStyle', () => {
  it('should create default style', () => {
    const style = createDefaultStyle()

    expect(style.name).toBe('Default')
    expect(style.fontName).toBe('Arial')
    expect(style.fontSize).toBe(20)
    expect(style.primaryColor).toBe('&H00FFFFFF')
    expect(style.alignment).toBe(2)
  })

  it('should create custom style', () => {
    const style = createAssStyle({
      name: 'Custom',
      fontName: 'Helvetica',
      fontSize: 24,
    })

    expect(style.name).toBe('Custom')
    expect(style.fontName).toBe('Helvetica')
    expect(style.fontSize).toBe(24)
  })
})
```

- [ ] **Step 6: 实现 AssStyle 模型**

Create: `src/core/models/AssStyle.ts`

```typescript
export interface AssStyle {
  id: string
  name: string
  fontName: string
  fontSize: number
  primaryColor: string
  secondaryColor: string
  outlineColor: string
  backColor: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  scaleX: number
  scaleY: number
  spacing: number
  angle: number
  borderStyle: number
  outline: number
  shadow: number
  alignment: number
  marginL: number
  marginR: number
  marginV: number
  encoding: number
}

export const DEFAULT_STYLE: Omit<AssStyle, 'id'> = {
  name: 'Default',
  fontName: 'Arial',
  fontSize: 20,
  primaryColor: '&H00FFFFFF',
  secondaryColor: '&H000000FF',
  outlineColor: '&H00000000',
  backColor: '&H80000000',
  bold: false,
  italic: false,
  underline: false,
  strikeout: false,
  scaleX: 100,
  scaleY: 100,
  spacing: 0,
  angle: 0,
  borderStyle: 1,
  outline: 2,
  shadow: 0,
  alignment: 2,
  marginL: 10,
  marginR: 10,
  marginV: 10,
  encoding: 1,
}

export function createDefaultStyle(): AssStyle {
  return {
    id: generateId(),
    ...DEFAULT_STYLE,
  }
}

export function createAssStyle(overrides: Partial<AssStyle> = {}): AssStyle {
  return {
    ...createDefaultStyle(),
    ...overrides,
    id: generateId(),
  }
}

function generateId(): string {
  return `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

- [ ] **Step 7: 编写 SubtitleFile 模型测试**

Create: `src/core/models/__tests__/SubtitleFile.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { SubtitleFile, createSubtitleFile } from '../SubtitleFile'
import { createSubtitleItem } from '../SubtitleItem'

describe('SubtitleFile', () => {
  it('should create empty subtitle file', () => {
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
    })

    expect(file.filename).toBe('test.ass')
    expect(file.format).toBe('ass')
    expect(file.items).toEqual([])
    expect(file.styles).toEqual([])
    expect(file.createdAt).toBeDefined()
    expect(file.updatedAt).toBeDefined()
  })

  it('should create subtitle file with items', () => {
    const item = createSubtitleItem({
      startTime: 1000,
      endTime: 3000,
      text: 'Test',
    })

    const file = createSubtitleFile({
      filename: 'test.srt',
      format: 'srt',
      items: [item],
    })

    expect(file.items).toHaveLength(1)
    expect(file.items[0].text).toBe('Test')
  })
})
```

- [ ] **Step 8: 实现 SubtitleFile 模型**

Create: `src/core/models/SubtitleFile.ts`

```typescript
import { SubtitleItem } from './SubtitleItem'
import { AssStyle } from './AssStyle'

export interface SubtitleFile {
  id: string
  filename: string
  format: 'ass' | 'srt'
  items: SubtitleItem[]
  styles: AssStyle[]
  scriptInfo?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export function createSubtitleFile(params: {
  filename: string
  format: 'ass' | 'srt'
  items?: SubtitleItem[]
  styles?: AssStyle[]
  scriptInfo?: Record<string, string>
}): SubtitleFile {
  const now = Date.now()

  return {
    id: generateId(),
    filename: params.filename,
    format: params.format,
    items: params.items ?? [],
    styles: params.styles ?? [],
    scriptInfo: params.scriptInfo,
    createdAt: now,
    updatedAt: now,
  }
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

- [ ] **Step 9: 编写 Project 模型测试**

Create: `src/core/models/__tests__/Project.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { Project, createProject } from '../Project'

describe('Project', () => {
  it('should create empty project', () => {
    const project = createProject({
      name: 'Test Project',
    })

    expect(project.name).toBe('Test Project')
    expect(project.files).toEqual([])
    expect(project.settings).toEqual({})
  })
})
```

- [ ] **Step 10: 实现 Project 模型**

Create: `src/core/models/Project.ts`

```typescript
import { SubtitleFile } from './SubtitleFile'

export interface ProjectSettings {
  defaultStyle?: string
  autoSave?: boolean
}

export interface Project {
  id: string
  name: string
  files: SubtitleFile[]
  settings: ProjectSettings
}

export function createProject(params: {
  name: string
  files?: SubtitleFile[]
  settings?: ProjectSettings
}): Project {
  return {
    id: generateId(),
    name: params.name,
    files: params.files ?? [],
    settings: params.settings ?? {},
  }
}

function generateId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

- [ ] **Step 11: 创建模型索引文件**

Create: `src/core/models/index.ts`

```typescript
export * from './SubtitleItem'
export * from './AssStyle'
export * from './SubtitleFile'
export * from './Project'
```

- [ ] **Step 12: 运行所有模型测试**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/core/models/__tests__
```
Expected: PASS - All tests passed

- [ ] **Step 13: Commit**

```bash
git add src/core/models
git commit -m "feat: add core data models (SubtitleItem, AssStyle, SubtitleFile, Project)"
```

---

## Task 3: 插件系统基础架构

**Files:**
- Create: `src/core/plugins/types.ts`
- Create: `src/core/plugins/BasePlugin.ts`
- Create: `src/core/plugins/PluginManager.ts`
- Create: `src/core/plugins/index.ts`

- [ ] **Step 1: 编写插件类型定义测试**

Create: `src/core/plugins/__tests__/PluginManager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PluginManager } from '../PluginManager'
import { BasePlugin } from '../BasePlugin'

describe('PluginManager', () => {
  let manager: PluginManager

  beforeEach(() => {
    manager = new PluginManager()
  })

  it('should register a plugin', () => {
    const plugin = new BasePlugin('test-plugin', 'Test Plugin')
    manager.register(plugin)

    expect(manager.get('test-plugin')).toBe(plugin)
  })

  it('should throw when registering duplicate plugin', () => {
    const plugin = new BasePlugin('test-plugin', 'Test Plugin')
    manager.register(plugin)

    expect(() => manager.register(plugin)).toThrow('Plugin test-plugin already registered')
  })

  it('should get all plugins', () => {
    const plugin1 = new BasePlugin('plugin-1', 'Plugin 1')
    const plugin2 = new BasePlugin('plugin-2', 'Plugin 2')

    manager.register(plugin1)
    manager.register(plugin2)

    expect(manager.getAll()).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/core/plugins/__tests__/PluginManager.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现插件类型定义**

Create: `src/core/plugins/types.ts`

```typescript
export interface PluginMetadata {
  id: string
  name: string
  version: string
  description?: string
  author?: string
}

export interface IPlugin {
  readonly metadata: PluginMetadata
  activate(): void
  deactivate(): void
}

export type PluginCategory = 'parser' | 'exporter' | 'converter' | 'editor'

export interface ParserPlugin extends IPlugin {
  category: 'parser'
  supportedFormats: string[]
  parse(content: string): unknown
  serialize(data: unknown): string
}
```

- [ ] **Step 4: 实现 BasePlugin 基类**

Create: `src/core/plugins/BasePlugin.ts`

```typescript
import { IPlugin, PluginMetadata } from './types'

export abstract class BasePlugin implements IPlugin {
  readonly metadata: PluginMetadata

  constructor(id: string, name: string, version = '1.0.0') {
    this.metadata = {
      id,
      name,
      version,
    }
  }

  activate(): void {
    // Override in subclass
  }

  deactivate(): void {
    // Override in subclass
  }
}
```

- [ ] **Step 5: 实现 PluginManager**

Create: `src/core/plugins/PluginManager.ts`

```typescript
import { IPlugin } from './types'

export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map()

  register(plugin: IPlugin): void {
    const { id } = plugin.metadata

    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} already registered`)
    }

    this.plugins.set(id, plugin)
    plugin.activate()
  }

  unregister(id: string): void {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.deactivate()
      this.plugins.delete(id)
    }
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id)
  }

  getAll(): IPlugin[] {
    return Array.from(this.plugins.values())
  }

  clear(): void {
    this.plugins.forEach((plugin) => plugin.deactivate())
    this.plugins.clear()
  }
}
```

- [ ] **Step 6: 创建插件索引文件**

Create: `src/core/plugins/index.ts`

```typescript
export * from './types'
export * from './BasePlugin'
export * from './PluginManager'
```

- [ ] **Step 7: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/core/plugins/__tests__/PluginManager.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 8: Commit**

```bash
git add src/core/plugins
git commit -m "feat: add plugin system architecture (types, BasePlugin, PluginManager)"
```

---

## Task 4: 时间工具函数

**Files:**
- Create: `src/utils/time.ts`

- [ ] **Step 1: 编写时间工具测试**

Create: `src/utils/__tests__/time.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  msToAssTime,
  msToSrtTime,
  assTimeToMs,
  srtTimeToMs,
  parseAssTime,
  parseSrtTime,
} from '../time'

describe('Time utilities', () => {
  describe('msToAssTime', () => {
    it('should convert milliseconds to ASS time format', () => {
      expect(msToAssTime(3661001)).toBe('1:01:01.01')
      expect(msToAssTime(0)).toBe('0:00:00.00')
      expect(msToAssTime(61000)).toBe('0:01:01.00')
    })
  })

  describe('msToSrtTime', () => {
    it('should convert milliseconds to SRT time format', () => {
      expect(msToSrtTime(3661001)).toBe('01:01:01,001')
      expect(msToSrtTime(0)).toBe('00:00:00,000')
    })
  })

  describe('assTimeToMs', () => {
    it('should parse ASS time format to milliseconds', () => {
      expect(assTimeToMs('1:01:01.01')).toBe(3661010)
      expect(assTimeToMs('0:00:00.00')).toBe(0)
    })
  })

  describe('srtTimeToMs', () => {
    it('should parse SRT time format to milliseconds', () => {
      expect(srtTimeToMs('01:01:01,001')).toBe(3661001)
      expect(srtTimeToMs('00:00:00,000')).toBe(0)
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/utils/__tests__/time.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现时间工具函数**

Create: `src/utils/time.ts`

```typescript
/**
 * Convert milliseconds to ASS time format (h:mm:ss.cc)
 */
export function msToAssTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

/**
 * Convert milliseconds to SRT time format (hh:mm:ss,mmm)
 */
export function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Parse ASS time format (h:mm:ss.cc) to milliseconds
 */
export function assTimeToMs(time: string): number {
  const match = time.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/)
  if (!match) {
    throw new Error(`Invalid ASS time format: ${time}`)
  }

  const [, hours, minutes, seconds, centiseconds] = match
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(centiseconds) * 10
  )
}

/**
 * Parse SRT time format (hh:mm:ss,mmm) to milliseconds
 */
export function srtTimeToMs(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/)
  if (!match) {
    throw new Error(`Invalid SRT time format: ${time}`)
  }

  const [, hours, minutes, seconds, milliseconds] = match
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds)
  )
}

/**
 * Parse time string (auto-detect format) to milliseconds
 */
export function parseAssTime(time: string): number {
  return assTimeToMs(time)
}

/**
 * Parse SRT time string to milliseconds
 */
export function parseSrtTime(time: string): number {
  return srtTimeToMs(time)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/utils/__tests__/time.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 5: Commit**

```bash
git add src/utils
git commit -m "feat: add time utility functions for ASS/SRT format conversion"
```

---

## Task 5: ASS 解析器插件

**Files:**
- Create: `src/plugins/parser-ass/parser.ts`
- Create: `src/plugins/parser-ass/serializer.ts`
- Create: `src/plugins/parser-ass/utils.ts`
- Create: `src/plugins/parser-ass/index.ts`

- [ ] **Step 1: 编写 ASS 解析器测试**

Create: `src/plugins/parser-ass/__tests__/parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseAss, serializeAss } from '../parser'

describe('ASS Parser', () => {
  const sampleAss = `[Script Info]
Title: Test
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello World
Dialogue: 0,0:00:04.00,0:00:07.00,Default,,0,0,0,,Second line
`

  it('should parse ASS file', () => {
    const result = parseAss(sampleAss)

    expect(result.scriptInfo).toBeDefined()
    expect(result.scriptInfo?.Title).toBe('Test')
    expect(result.styles).toHaveLength(1)
    expect(result.styles[0].name).toBe('Default')
    expect(result.items).toHaveLength(2)
    expect(result.items[0].text).toBe('Hello World')
    expect(result.items[0].startTime).toBe(1000)
    expect(result.items[0].endTime).toBe(3000)
  })

  it('should serialize ASS file', () => {
    const parsed = parseAss(sampleAss)
    const serialized = serializeAss(parsed)

    expect(serialized).toContain('[Script Info]')
    expect(serialized).toContain('[V4+ Styles]')
    expect(serialized).toContain('[Events]')
    expect(serialized).toContain('Hello World')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/plugins/parser-ass/__tests__/parser.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现 ASS 解析器**

Create: `src/plugins/parser-ass/parser.ts`

```typescript
import { SubtitleFile } from '../../../core/models/SubtitleFile'
import { SubtitleItem } from '../../../core/models/SubtitleItem'
import { AssStyle, createAssStyle } from '../../../core/models/AssStyle'
import { assTimeToMs } from '../../../utils/time'

interface AssSection {
  scriptInfo: Record<string, string>
  styles: AssStyle[]
  items: SubtitleItem[]
}

export function parseAss(content: string): Partial<SubtitleFile> {
  const lines = content.split(/\r?\n/)
  const section: AssSection = {
    scriptInfo: {},
    styles: [],
    items: [],
  }

  let currentSection = ''
  let styleFormat: string[] = []
  let eventFormat: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1)
      continue
    }

    if (trimmed === '') continue

    switch (currentSection) {
      case 'Script Info':
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':')
          section.scriptInfo[key.trim()] = valueParts.join(':').trim()
        }
        break

      case 'V4+ Styles':
        if (trimmed.startsWith('Format:')) {
          styleFormat = trimmed.replace('Format:', '').split(',').map((s) => s.trim())
        } else if (trimmed.startsWith('Style:')) {
          const styleData = trimmed.replace('Style:', '').split(',').map((s) => s.trim())
          const style = parseStyle(styleFormat, styleData)
          section.styles.push(style)
        }
        break

      case 'Events':
        if (trimmed.startsWith('Format:')) {
          eventFormat = trimmed.replace('Format:', '').split(',').map((s) => s.trim())
        } else if (trimmed.startsWith('Dialogue:')) {
          const dialogueData = trimmed.replace('Dialogue:', '').split(',').map((s) => s.trim())
          const item = parseDialogue(eventFormat, dialogueData)
          section.items.push(item)
        }
        break
    }
  }

  return {
    format: 'ass',
    scriptInfo: section.scriptInfo,
    styles: section.styles,
    items: section.items,
  }
}

function parseStyle(format: string[], data: string[]): AssStyle {
  const getValue = (name: string, defaultValue: string | number | boolean): string | number | boolean => {
    const index = format.indexOf(name)
    if (index === -1 || index >= data.length) return defaultValue
    const value = data[index]
    if (typeof defaultValue === 'boolean') return value === '-1'
    if (typeof defaultValue === 'number') return parseFloat(value)
    return value
  }

  return createAssStyle({
    name: getValue('Name', '') as string,
    fontName: getValue('Fontname', 'Arial') as string,
    fontSize: getValue('Fontsize', 20) as number,
    primaryColor: getValue('PrimaryColour', '&H00FFFFFF') as string,
    secondaryColor: getValue('SecondaryColour', '&H000000FF') as string,
    outlineColor: getValue('OutlineColour', '&H00000000') as string,
    backColor: getValue('BackColour', '&H80000000') as string,
    bold: getValue('Bold', false) as boolean,
    italic: getValue('Italic', false) as boolean,
    underline: getValue('Underline', false) as boolean,
    strikeout: getValue('StrikeOut', false) as boolean,
    scaleX: getValue('ScaleX', 100) as number,
    scaleY: getValue('ScaleY', 100) as number,
    spacing: getValue('Spacing', 0) as number,
    angle: getValue('Angle', 0) as number,
    borderStyle: getValue('BorderStyle', 1) as number,
    outline: getValue('Outline', 2) as number,
    shadow: getValue('Shadow', 0) as number,
    alignment: getValue('Alignment', 2) as number,
    marginL: getValue('MarginL', 10) as number,
    marginR: getValue('MarginR', 10) as number,
    marginV: getValue('MarginV', 10) as number,
    encoding: getValue('Encoding', 1) as number,
  })
}

function parseDialogue(format: string[], data: string[]): SubtitleItem {
  const getValue = (name: string): string => {
    const index = format.indexOf(name)
    if (index === -1 || index >= data.length) return ''
    return data[index]
  }

  // Text is the last field and may contain commas
  const textIndex = format.indexOf('Text')
  const textParts = data.slice(textIndex)
  const text = textParts.join(', ').trim()

  return {
    id: generateId(),
    startTime: assTimeToMs(getValue('Start')),
    endTime: assTimeToMs(getValue('End')),
    text,
    style: getValue('Style'),
    effect: getValue('Effect'),
  }
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function serializeAss(file: Partial<SubtitleFile>): string {
  const lines: string[] = []

  // Script Info
  lines.push('[Script Info]')
  if (file.scriptInfo) {
    for (const [key, value] of Object.entries(file.scriptInfo)) {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push('')

  // V4+ Styles
  lines.push('[V4+ Styles]')
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')

  if (file.styles) {
    for (const style of file.styles) {
      lines.push(serializeStyle(style))
    }
  }
  lines.push('')

  // Events
  lines.push('[Events]')
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')

  if (file.items) {
    for (const item of file.items) {
      lines.push(serializeDialogue(item))
    }
  }

  return lines.join('\n')
}

function serializeStyle(style: AssStyle): string {
  const boolToNum = (b: boolean) => (b ? '-1' : '0')
  const fields = [
    style.name,
    style.fontName,
    style.fontSize,
    style.primaryColor,
    style.secondaryColor,
    style.outlineColor,
    style.backColor,
    boolToNum(style.bold),
    boolToNum(style.italic),
    boolToNum(style.underline),
    boolToNum(style.strikeout),
    style.scaleX,
    style.scaleY,
    style.spacing,
    style.angle,
    style.borderStyle,
    style.outline,
    style.shadow,
    style.alignment,
    style.marginL,
    style.marginR,
    style.marginV,
    style.encoding,
  ]
  return `Style: ${fields.join(',')}`
}

function serializeDialogue(item: SubtitleItem): string {
  const { msToAssTime } = await import('../../../utils/time')
  const fields = [
    '0',
    msToAssTime(item.startTime),
    msToAssTime(item.endTime),
    item.style || 'Default',
    '',
    '0',
    '0',
    '0',
    item.effect || '',
    item.text,
  ]
  return `Dialogue: ${fields.join(',')}`
}
```

- [ ] **Step 4: 修复 serializeAss 中的动态导入**

Edit: `src/plugins/parser-ass/parser.ts`

Replace the dynamic import with static import at top:

```typescript
import { SubtitleFile } from '../../../core/models/SubtitleFile'
import { SubtitleItem } from '../../../core/models/SubtitleItem'
import { AssStyle, createAssStyle } from '../../../core/models/AssStyle'
import { assTimeToMs, msToAssTime } from '../../../utils/time'
```

Then update serializeDialogue:

```typescript
function serializeDialogue(item: SubtitleItem): string {
  const fields = [
    '0',
    msToAssTime(item.startTime),
    msToAssTime(item.endTime),
    item.style || 'Default',
    '',
    '0',
    '0',
    '0',
    item.effect || '',
    item.text,
  ]
  return `Dialogue: ${fields.join(',')}`
}
```

- [ ] **Step 5: 实现 ASS 解析器插件入口**

Create: `src/plugins/parser-ass/index.ts`

```typescript
import { BasePlugin } from '../../core/plugins/BasePlugin'
import { ParserPlugin } from '../../core/plugins/types'
import { parseAss, serializeAss } from './parser'

export class AssParserPlugin extends BasePlugin implements ParserPlugin {
  category = 'parser' as const
  supportedFormats = ['ass', 'ssa']

  constructor() {
    super('parser-ass', 'ASS Parser', '1.0.0')
  }

  parse(content: string): unknown {
    return parseAss(content)
  }

  serialize(data: unknown): string {
    return serializeAss(data as Parameters<typeof serializeAss>[0])
  }
}

export { parseAss, serializeAss }
export default AssParserPlugin
```

- [ ] **Step 6: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/plugins/parser-ass/__tests__/parser.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 7: Commit**

```bash
git add src/plugins/parser-ass
git commit -m "feat: add ASS parser plugin with parse and serialize functions"
```

---

## Task 6: SRT 解析器插件

**Files:**
- Create: `src/plugins/parser-srt/parser.ts`
- Create: `src/plugins/parser-srt/index.ts`

- [ ] **Step 1: 编写 SRT 解析器测试**

Create: `src/plugins/parser-srt/__tests__/parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseSrt, serializeSrt } from '../parser'

describe('SRT Parser', () => {
  const sampleSrt = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:04,000 --> 00:00:07,000
Second line
With multiple lines

3
00:00:08,500 --> 00:00:10,200
Third entry
`

  it('should parse SRT file', () => {
    const result = parseSrt(sampleSrt)

    expect(result.format).toBe('srt')
    expect(result.items).toHaveLength(3)
    expect(result.items[0].text).toBe('Hello World')
    expect(result.items[0].startTime).toBe(1000)
    expect(result.items[0].endTime).toBe(3000)
    expect(result.items[1].text).toBe('Second line\nWith multiple lines')
  })

  it('should serialize SRT file', () => {
    const parsed = parseSrt(sampleSrt)
    const serialized = serializeSrt(parsed)

    expect(serialized).toContain('1')
    expect(serialized).toContain('00:00:01,000 --> 00:00:03,000')
    expect(serialized).toContain('Hello World')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/plugins/parser-srt/__tests__/parser.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现 SRT 解析器**

Create: `src/plugins/parser-srt/parser.ts`

```typescript
import { SubtitleFile } from '../../../core/models/SubtitleFile'
import { SubtitleItem } from '../../../core/models/SubtitleItem'
import { srtTimeToMs, msToSrtTime } from '../../../utils/time'

export function parseSrt(content: string): Partial<SubtitleFile> {
  const blocks = content.trim().split(/\n\s*\n/)
  const items: SubtitleItem[] = []

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/)
    if (lines.length < 2) continue

    // First line is the index number (we can skip it)
    // Second line is the time range
    const timeLine = lines[1]
    const timeMatch = timeLine.match(/(.+?)\s*-->\s*(.+)/)

    if (!timeMatch) continue

    const [, startTime, endTime] = timeMatch

    // Remaining lines are the text
    const textLines = lines.slice(2)
    const text = textLines.join('\n')

    items.push({
      id: generateId(),
      startTime: srtTimeToMs(startTime.trim()),
      endTime: srtTimeToMs(endTime.trim()),
      text,
    })
  }

  return {
    format: 'srt',
    items,
    styles: [],
  }
}

export function serializeSrt(file: Partial<SubtitleFile>): string {
  const lines: string[] = []

  if (file.items) {
    for (let i = 0; i < file.items.length; i++) {
      const item = file.items[i]
      lines.push(String(i + 1))
      lines.push(`${msToSrtTime(item.startTime)} --> ${msToSrtTime(item.endTime)}`)
      lines.push(item.text)
      lines.push('')
    }
  }

  return lines.join('\n').trim() + '\n'
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

- [ ] **Step 4: 实现 SRT 解析器插件入口**

Create: `src/plugins/parser-srt/index.ts`

```typescript
import { BasePlugin } from '../../core/plugins/BasePlugin'
import { ParserPlugin } from '../../core/plugins/types'
import { parseSrt, serializeSrt } from './parser'

export class SrtParserPlugin extends BasePlugin implements ParserPlugin {
  category = 'parser' as const
  supportedFormats = ['srt']

  constructor() {
    super('parser-srt', 'SRT Parser', '1.0.0')
  }

  parse(content: string): unknown {
    return parseSrt(content)
  }

  serialize(data: unknown): string {
    return serializeSrt(data as Parameters<typeof serializeSrt>[0])
  }
}

export { parseSrt, serializeSrt }
export default SrtParserPlugin
```

- [ ] **Step 5: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/plugins/parser-srt/__tests__/parser.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 6: Commit**

```bash
git add src/plugins/parser-srt
git commit -m "feat: add SRT parser plugin with parse and serialize functions"
```

---

## Task 7: 状态管理 (Pinia Store)

**Files:**
- Create: `src/stores/subtitle.ts`
- Create: `src/stores/index.ts`

- [ ] **Step 1: 编写 Store 测试**

Create: `src/stores/__tests__/subtitle.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubtitleStore } from '../subtitle'
import { createSubtitleFile } from '../../core/models/SubtitleFile'
import { createSubtitleItem } from '../../core/models/SubtitleItem'

describe('Subtitle Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have empty initial state', () => {
    const store = useSubtitleStore()

    expect(store.currentFile).toBeNull()
    expect(store.items).toEqual([])
    expect(store.styles).toEqual([])
  })

  it('should load a file', () => {
    const store = useSubtitleStore()
    const file = createSubtitleFile({
      filename: 'test.ass',
      format: 'ass',
      items: [createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Test' })],
    })

    store.loadFile(file)

    expect(store.currentFile).toEqual(file)
    expect(store.items).toHaveLength(1)
  })

  it('should add an item', () => {
    const store = useSubtitleStore()
    const file = createSubtitleFile({ filename: 'test.ass', format: 'ass' })
    store.loadFile(file)

    store.addItem({ startTime: 1000, endTime: 3000, text: 'New item' })

    expect(store.items).toHaveLength(1)
    expect(store.items[0].text).toBe('New item')
  })

  it('should remove an item', () => {
    const store = useSubtitleStore()
    const item = createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Test' })
    const file = createSubtitleFile({ filename: 'test.ass', format: 'ass', items: [item] })
    store.loadFile(file)

    store.removeItem(item.id)

    expect(store.items).toHaveLength(0)
  })

  it('should update an item', () => {
    const store = useSubtitleStore()
    const item = createSubtitleItem({ startTime: 1000, endTime: 3000, text: 'Test' })
    const file = createSubtitleFile({ filename: 'test.ass', format: 'ass', items: [item] })
    store.loadFile(file)

    store.updateItem(item.id, { text: 'Updated' })

    expect(store.items[0].text).toBe('Updated')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/stores/__tests__/subtitle.test.ts
```
Expected: FAIL - Module not found

- [ ] **Step 3: 实现 Subtitle Store**

Create: `src/stores/subtitle.ts`

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { SubtitleFile, createSubtitleFile } from '../core/models/SubtitleFile'
import { SubtitleItem, createSubtitleItem } from '../core/models/SubtitleItem'
import { AssStyle, createDefaultStyle } from '../core/models/AssStyle'

export const useSubtitleStore = defineStore('subtitle', () => {
  // State
  const currentFile = ref<SubtitleFile | null>(null)
  const items = ref<SubtitleItem[]>([])
  const styles = ref<AssStyle[]>([])
  const selectedIds = ref<Set<string>>(new Set())

  // Getters
  const hasFile = computed(() => currentFile.value !== null)
  const selectedItems = computed(() =>
    items.value.filter((item) => selectedIds.value.has(item.id))
  )
  const isSelected = (id: string) => selectedIds.value.has(id)

  // Actions
  function loadFile(file: SubtitleFile) {
    currentFile.value = file
    items.value = [...file.items]
    styles.value = file.styles.length > 0 ? [...file.styles] : [createDefaultStyle()]
    selectedIds.value.clear()
  }

  function unloadFile() {
    currentFile.value = null
    items.value = []
    styles.value = []
    selectedIds.value.clear()
  }

  function addItem(params: { startTime: number; endTime: number; text: string; style?: string }) {
    const newItem = createSubtitleItem(params)
    items.value.push(newItem)
    updateFile()
    return newItem
  }

  function removeItem(id: string) {
    const index = items.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      selectedIds.value.delete(id)
      updateFile()
    }
  }

  function updateItem(id: string, updates: Partial<Omit<SubtitleItem, 'id'>>) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      Object.assign(item, updates)
      updateFile()
    }
  }

  function selectItem(id: string, multi = false) {
    if (!multi) {
      selectedIds.value.clear()
    }
    selectedIds.value.add(id)
  }

  function deselectItem(id: string) {
    selectedIds.value.delete(id)
  }

  function clearSelection() {
    selectedIds.value.clear()
  }

  function addStyle(style: AssStyle) {
    styles.value.push(style)
    updateFile()
  }

  function removeStyle(id: string) {
    const index = styles.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      styles.value.splice(index, 1)
      updateFile()
    }
  }

  function updateStyle(id: string, updates: Partial<Omit<AssStyle, 'id'>>) {
    const style = styles.value.find((s) => s.id === id)
    if (style) {
      Object.assign(style, updates)
      updateFile()
    }
  }

  function updateFile() {
    if (currentFile.value) {
      currentFile.value.items = [...items.value]
      currentFile.value.styles = [...styles.value]
      currentFile.value.updatedAt = Date.now()
    }
  }

  function getExportData(): Partial<SubtitleFile> {
    return {
      format: currentFile.value?.format ?? 'ass',
      scriptInfo: currentFile.value?.scriptInfo,
      styles: [...styles.value],
      items: [...items.value],
    }
  }

  return {
    currentFile,
    items,
    styles,
    selectedIds,
    hasFile,
    selectedItems,
    isSelected,
    loadFile,
    unloadFile,
    addItem,
    removeItem,
    updateItem,
    selectItem,
    deselectItem,
    clearSelection,
    addStyle,
    removeStyle,
    updateStyle,
    getExportData,
  }
})
```

- [ ] **Step 4: 创建 Store 索引文件**

Create: `src/stores/index.ts`

```typescript
export * from './subtitle'
```

- [ ] **Step 5: 配置 Pinia 入口**

Edit: `src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 6: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test -- src/stores/__tests__/subtitle.test.ts
```
Expected: PASS - All tests passed

- [ ] **Step 7: Commit**

```bash
git add src/stores src/main.ts
git commit -m "feat: add Pinia store for subtitle state management"
```

---

## Task 8: 基础 UI 组件

**Files:**
- Create: `src/components/common/FileInput.vue`
- Create: `src/components/common/index.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建基础文件输入组件**

Create: `src/components/common/FileInput.vue`

```vue
<template>
  <div class="file-input">
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      class="hidden"
      @change="handleChange"
    />
    <button
      type="button"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      @click="fileInput?.click()"
    >
      {{ buttonText }}
    </button>
    <span v-if="selectedFile" class="ml-2 text-gray-600">
      {{ selectedFile.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  accept?: string
  buttonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.ass,.srt',
  buttonText: '选择文件',
})

const emit = defineEmits<{
  (e: 'select', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    emit('select', file)
  }
}

function clear() {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

defineExpose({ clear })
</script>
```

- [ ] **Step 2: 创建组件索引文件**

Create: `src/components/common/index.ts`

```typescript
export { default as FileInput } from './FileInput.vue'
```

- [ ] **Step 3: 更新 App.vue**

Edit: `src/App.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">SubtitleShop</h1>
      <p class="text-gray-600">可视化字幕编辑器</p>
    </header>

    <main>
      <div v-if="!store.hasFile" class="text-center py-12">
        <p class="text-gray-500 mb-4">请选择字幕文件开始编辑</p>
        <FileInput @select="handleFileSelect" />
      </div>

      <div v-else class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">
            {{ store.currentFile?.filename }}
          </h2>
          <button
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            @click="store.unloadFile()"
          >
            关闭文件
          </button>
        </div>

        <div class="text-gray-600">
          <p>字幕条数: {{ store.items.length }}</p>
          <p>样式数量: {{ store.styles.length }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useSubtitleStore } from './stores/subtitle'
import { FileInput } from './components/common'
import { parseAss } from './plugins/parser-ass'
import { parseSrt } from './plugins/parser-srt'
import { createSubtitleFile } from './core/models/SubtitleFile'

const store = useSubtitleStore()

async function handleFileSelect(file: File) {
  const content = await file.text()
  const extension = file.name.split('.').pop()?.toLowerCase()

  let parsed: Partial<ReturnType<typeof parseAss>>
  let format: 'ass' | 'srt'

  if (extension === 'srt') {
    parsed = parseSrt(content)
    format = 'srt'
  } else {
    parsed = parseAss(content)
    format = 'ass'
  }

  const subtitleFile = createSubtitleFile({
    filename: file.name,
    format,
    items: parsed.items ?? [],
    styles: parsed.styles ?? [],
    scriptInfo: parsed.scriptInfo,
  })

  store.loadFile(subtitleFile)
}
</script>
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: PASS - Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components src/App.vue
git commit -m "feat: add basic UI components and main App layout"
```

---

## Task 9: 文件导出功能

**Files:**
- Create: `src/composables/useFileExport.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建文件导出组合式函数**

Create: `src/composables/useFileExport.ts`

```typescript
import { useSubtitleStore } from '../stores/subtitle'
import { serializeAss } from '../plugins/parser-ass'
import { serializeSrt } from '../plugins/parser-srt'

export function useFileExport() {
  const store = useSubtitleStore()

  function exportFile(filename?: string) {
    if (!store.hasFile) {
      console.warn('No file to export')
      return
    }

    const data = store.getExportData()
    const format = data.format ?? 'ass'
    const content = format === 'srt' ? serializeSrt(data) : serializeAss(data)

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename ?? store.currentFile?.filename ?? `export.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  return { exportFile }
}
```

- [ ] **Step 2: 创建组合式函数索引**

Create: `src/composables/index.ts`

```typescript
export * from './useFileExport'
export * from './useStorage'
```

- [ ] **Step 3: 更新 App.vue 添加导出按钮**

Edit: `src/App.vue`

Add import:
```typescript
import { useFileExport } from './composables/useFileExport'
```

Add in setup:
```typescript
const { exportFile } = useFileExport()
```

Add export button after "关闭文件" button:
```vue
<button
  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-2"
  @click="exportFile()"
>
  导出文件
</button>
```

- [ ] **Step 4: 运行构建确认成功**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: PASS - Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/composables src/App.vue
git commit -m "feat: add file export functionality"
```

---

## Task 10: 运行完整测试套件

**Files:**
- All test files

- [ ] **Step 1: 运行所有测试**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm test
```
Expected: PASS - All tests passed

- [ ] **Step 2: 验证最终构建**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use && npm run build
```
Expected: PASS - Build succeeds with no errors

- [ ] **Step 3: 创建 .nvmrc 文件**

Run:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && node -v | sed 's/^v//' > .nvmrc
```

- [ ] **Step 4: Final Commit**

```bash
git add .nvmrc
git commit -m "chore: add .nvmrc for Node version management"
```

---

## Phase 1 完成总结

完成 Phase 1 后，项目将具备以下能力：

1. ✅ Vue 3 + TypeScript + Vite 项目框架
2. ✅ Tailwind CSS 样式系统
3. ✅ Vitest 测试框架
4. ✅ 核心数据模型 (SubtitleItem, AssStyle, SubtitleFile, Project)
5. ✅ 插件系统架构 (PluginManager, BasePlugin)
6. ✅ ASS/SRT 解析器插件
7. ✅ 时间格式转换工具
8. ✅ Pinia 状态管理
9. ✅ 基础 UI (文件导入/导出)

**Next Steps:** Phase 2 - 核心编辑功能 (表格视图、时间轴编辑器、基础编辑操作)
