---
name: SubtitleShop Design
description: 可视化字幕编辑器设计文档
type: project
---

# SubtitleShop 设计文档

## 项目概述

**项目名称：** SubtitleShop
**日期：** 2026-03-25
**类型：** Web 应用

### 目标用户

字幕爱好者和开源贡献者，需要功能全面且可扩展的字幕编辑工具。

### 核心需求

- 支持 ASS 和 SRT 字幕格式
- 可视化编辑字幕时间轴
- 完整的 ASS 样式编辑功能
- 格式转换（ASS ↔ SRT）
- 纯本地存储，保护隐私

## 技术栈

| 类别 | 技术选型 |
|------|----------|
| 框架 | Vue 3 + TypeScript |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| 样式 | Tailwind CSS |
| 存储 | IndexedDB (localForage) |

## 架构设计

采用模块化插件架构，核心引擎 + 插件系统，解析器、编辑器、导出器都是独立模块。

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer (Vue 3)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Timeline    │ │ Table View  │ │ Style Panel │            │
│  │ Editor      │ │             │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                      Plugin Manager                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Parser Plugin │ Editor Plugin │ Export Plugin │ ...  │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Core Engine                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Subtitle    │ │ Style       │ │ Time        │            │
│  │ Model       │ │ Engine      │ │ Utils       │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                      Storage Layer                           │
│           IndexedDB / LocalStorage / File System            │
└─────────────────────────────────────────────────────────────┘
```

**Why:** 插件架构便于社区贡献和功能扩展，符合开源项目的定位。
**How to apply:** 所有格式解析、导出、编辑功能都作为插件实现，核心引擎只提供基础能力。

## 数据模型

### SubtitleItem

单条字幕数据。

```typescript
interface SubtitleItem {
  id: string
  startTime: number        // 毫秒
  endTime: number          // 毫秒
  text: string             // 纯文本或 ASS 标签
  style?: AssStyle         // ASS 样式引用
  effect?: string          // 特效代码
}
```

### AssStyle

完整的 ASS 样式定义。

```typescript
interface AssStyle {
  id: string
  name: string
  fontName: string
  fontSize: number
  primaryColor: string     // &HAABBGGRR
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
  angle: number            // 旋转角度
  borderStyle: number
  outline: number          // 边框宽度
  shadow: number           // 阴影深度
  alignment: number        // 位置对齐 1-9
  marginL: number
  marginR: number
  marginV: number
  encoding: number
}
```

### SubtitleFile

字幕文件数据。

```typescript
interface SubtitleFile {
  id: string
  filename: string
  format: 'ass' | 'srt'
  items: SubtitleItem[]
  styles: AssStyle[]       // ASS 专用
  scriptInfo?: Record<string, string>  // ASS Header 信息
  createdAt: number
  updatedAt: number
}
```

### Project

项目数据，支持多文件。

```typescript
interface Project {
  id: string
  name: string
  files: SubtitleFile[]
  settings: ProjectSettings
}
```

### HistoryManager

操作历史管理，支持撤销/重做。

```typescript
interface HistoryState {
  type: 'edit' | 'add' | 'delete' | 'move' | 'style'
  items: SubtitleItem[]
  timestamp: number
}

interface HistoryManager {
  undoStack: HistoryState[]
  redoStack: HistoryState[]
  push(state: HistoryState): void
  undo(): HistoryState | null
  redo(): HistoryState | null
  canUndo: boolean
  canRedo: boolean
}
```

## 核心模块

### 1. Parser Plugin

负责 ASS/SRT 格式的解析与序列化。

- 支持插件扩展其他格式
- 解析时保留原始格式信息
- 序列化时保证格式正确性

### 2. Editor Core

字幕编辑核心功能。

- 字幕数据模型管理
- 操作历史（撤销/重做）
- 选区管理
- 批量操作支持

### 3. Style Engine

ASS 完整样式支持。

- 所有 ASS 样式属性
- 样式继承与覆盖
- 实时预览渲染

### 4. Timeline Editor

可视化时间轴编辑器。

- 拖拽调整字幕时间
- 缩放与滚动
- 多轨道显示
- 时间刻度显示
- 播放头指示器

### 5. Table Editor

传统列表视图编辑。

- 表格形式展示字幕
- 直接编辑时间码
- 直接编辑文本
- 支持排序、筛选

### 6. Format Converter

格式转换功能。

- ASS → SRT 转换
- SRT → ASS 转换
- 转换提示与警告

## UI 设计

### 主界面布局

```
┌──────────────────────────────────────────────────────────┐
│  工具栏：导入 | 导出 | ↶ ↷ | + 添加字幕 | 时间轴/列表    │
├─────────┬────────────────────────────────────────────────┤
│ 文件    │  时间轴区域                                    │
│ 列表    │  ┌──────┐    ┌────────┐    ┌────┐             │
│         │  │字幕1 │    │ 字幕2  │    │字幕3│             │
│ 样式    │  └──────┘    └────────┘    └────┘             │
│ 列表    ├────────────────────────────────────────────────┤
│         │  字幕列表（表格视图）                          │
│         │  # | 开始时间 | 结束时间 | 样式 | 文本         │
│         │  1 | 00:00:01 | 00:00:03 | Default | 你好世界 │
│         │  2 | 00:00:04 | 00:00:07 | Title | 欢迎使用   │
└─────────┴────────────────────────────────────────────────┘
```

### 样式编辑器

- **字体设置**：字体名称、大小、粗体/斜体/下划线/删除线
- **颜色设置**：主要、次要、边框、阴影颜色（颜色选择器）
- **效果设置**：边框、阴影、旋转、缩放、字间距
- **位置对齐**：9宫格选择器
- **实时预览**：所有修改实时显示

### 样式模板

样式仅在项目内创建和复用，不提供跨项目导入/导出功能。

- **创建样式**：新建空白样式或基于现有样式复制
- **编辑样式**：修改样式属性，实时预览效果
- **删除样式**：删除未使用的样式（使用中的样式需先解除关联）
- **应用样式**：为字幕条目指定样式
- **样式列表**：左侧边栏显示当前项目的所有样式

## 格式转换规则

### ASS → SRT

1. 时间格式转换：`h:mm:ss.cc` → `h:mm:ss,mmm`
2. 移除所有样式定义
3. 清除文本中的 ASS 标签（可选）
4. 保留纯文本和换行符
5. 显示警告提示样式丢失

### SRT → ASS

1. 时间格式转换：`h:mm:ss,mmm` → `h:mm:ss.cc`
2. 自动创建 Default 样式
3. 保留纯文本和换行符
4. 生成标准 ASS 文件头
5. 用户可后续编辑样式

## 目录结构

```
src/
├── core/                    # 核心引擎
│   ├── models/              # 数据模型 (SubtitleItem, AssStyle, etc.)
│   ├── history/             # 操作历史管理
│   └── plugins/             # 插件系统
├── plugins/                 # 官方插件
│   ├── parser-ass/          # ASS 解析器插件
│   ├── parser-srt/          # SRT 解析器插件
│   ├── exporter/            # 导出插件
│   └── converter/           # 格式转换插件
├── components/              # Vue 组件
│   ├── timeline/            # 时间轴组件
│   ├── table/               # 表格编辑组件
│   ├── style-editor/        # 样式编辑器组件
│   └── common/              # 通用组件
├── stores/                  # Pinia 状态管理
├── composables/             # Vue 组合式函数
├── utils/                   # 工具函数
└── App.vue                  # 应用入口
```

## 开发阶段

### Phase 1 - 基础框架

- 项目搭建（Vite + Vue 3 + TypeScript）
- 插件系统设计
- 数据模型定义
- ASS/SRT 解析器实现

### Phase 2 - 核心编辑

- 表格视图实现
- 时间轴编辑器实现
- 基础编辑操作（添加、删除、修改）
- 文件导入导出

### Phase 3 - 样式系统

- ASS 样式编辑器
- 样式管理（创建、编辑、删除、复制）
- 样式应用与切换
- 实时预览

### Phase 4 - 高级功能

- 格式转换
- 撤销/重做
- 快捷键支持
- 批量操作

### Phase 5 - 打磨优化

- 性能优化
- 单元测试
- 文档编写
- 国际化支持

## 非功能性需求

### 性能

- 支持至少 5000 条字幕的文件
- 时间轴滚动流畅（60fps）
- 操作响应时间 < 100ms

### 可访问性

- 键盘导航支持
- 高对比度模式
- 屏幕阅读器友好

### 浏览器支持

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## 未来扩展

以下功能不在当前范围，但架构设计时应预留扩展能力：

- 视频预览功能
- 云同步存储
- 协作编辑
- 更多格式支持（VTT、SSA 等）
- AI 辅助翻译
- 跨项目样式模板导入/导出
- 预设样式库