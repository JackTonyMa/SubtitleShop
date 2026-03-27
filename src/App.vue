<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSubtitleStore } from './stores/subtitle'
import { useFileExport } from './composables/useFileExport'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { FileInput, SourceDiffModal, StyleSelectionModal } from './components/common'
import { SubtitleTable } from './components/table'
import { StyleEditor } from './components/style-editor'
import {
  parseAss,
  analyzeAssStructure,
  collectAssStyleCandidates,
  hasScatteredStyleCandidates,
  normalizeAssStructureWithSelectedStyles,
  serializeAss,
  type AssStyleCandidate
} from './plugins/parser-ass/parser'
import { parseSrt, serializeSrt } from './plugins/parser-srt/parser'
import { createSubtitleFile } from './core/models/SubtitleFile'

const store = useSubtitleStore()
const { exportFile } = useFileExport()
useKeyboardShortcuts()
const fileInputRef = ref<InstanceType<typeof FileInput> | null>(null)
const errorMessage = ref('')
const importWarningMessage = ref('')
const snapshotContent = ref('')
const baselineSerializedContent = ref('')
const workingCopyContent = ref('')
const isWorkingCopyMaterialized = ref(false)
const sourceViewVisible = ref(false)
const styleSelectionVisible = ref(false)
const pendingStyleCandidates = ref<AssStyleCandidate[]>([])
const pendingNormalizeBaseContent = ref('')
const currentView = ref<'table' | 'styles'>('styles')
const splitLoading = ref(false)
const cleanLoading = ref(false)
const cleanDialogVisible = ref(false)
const cleanReplacement = ref(' ')
const topActionMessage = ref('')
const currentSerializedContent = computed(() => {
  if (!store.hasFile) return ''
  const data = store.getExportData()
  const format = data.format ?? 'ass'
  return format === 'srt' ? serializeSrt(data) : serializeAss(data)
})
const sourceViewCurrentContent = computed(() => workingCopyContent.value)

watch(
  currentSerializedContent,
  (serialized) => {
    if (!store.hasFile) return
    if (!snapshotContent.value) return

    // Working copy is initialized as an exact raw snapshot.
    // Once edits diverge from import baseline, materialize to serialized content
    // and keep it in sync thereafter.
    if (!isWorkingCopyMaterialized.value) {
      if (serialized !== baselineSerializedContent.value) {
        isWorkingCopyMaterialized.value = true
        workingCopyContent.value = serialized
      }
      return
    }

    workingCopyContent.value = serialized
  },
  { immediate: true }
)

async function handleFileSelect(file: File) {
  errorMessage.value = ''
  importWarningMessage.value = ''

  try {
    const content = await file.text()
    snapshotContent.value = content
    workingCopyContent.value = content
    isWorkingCopyMaterialized.value = false
    const extension = file.name.split('.').pop()?.toLowerCase()

    let parsedData: ReturnType<typeof parseAss>

    if (extension === 'srt') {
      parsedData = parseSrt(content)
    } else if (extension === 'ass' || extension === 'ssa') {
      const analysis = analyzeAssStructure(content)
      if (analysis.hasIssues) {
        importWarningMessage.value =
          `检测到非规范 ASS 结构：重复 [V4+ Styles] ${analysis.duplicateStyleSections} 处、重复 [Events] ${analysis.duplicateEventSections} 处、` +
          `多余 Format 行 ${analysis.extraStyleFormatLines + analysis.extraEventFormatLines} 处。` +
          `继续编辑并导出后会自动修正为单一 [V4+ Styles]/[Events] 结构。`
      }
      parsedData = parseAss(content)
    } else {
      errorMessage.value = '不支持的文件格式。请上传 .ass, .ssa 或 .srt 文件。'
      return
    }

    const subtitleFile = createSubtitleFile({
      filename: file.name,
      format: extension === 'srt' ? 'srt' : 'ass',
      items: parsedData.items,
      styles: parsedData.styles,
      scriptInfo: parsedData.scriptInfo,
    })

    store.loadFile(subtitleFile)
    baselineSerializedContent.value =
      subtitleFile.format === 'srt'
        ? serializeSrt({
            items: subtitleFile.items,
            format: 'srt',
            filename: subtitleFile.filename,
          })
        : serializeAss({
            items: subtitleFile.items,
            styles: subtitleFile.styles,
            scriptInfo: subtitleFile.scriptInfo,
            format: 'ass',
            filename: subtitleFile.filename,
          })
  } catch (error) {
    console.error('Failed to parse file:', error)
    errorMessage.value = '文件解析失败，请检查文件格式是否正确。'
  }
}

function handleExportFile() {
  exportFile()
}

function clearTopActionMessageLater() {
  window.setTimeout(() => {
    topActionMessage.value = ''
  }, 3000)
}

async function handleSplitBilingual() {
  if (splitLoading.value || !store.hasFile || store.items.length === 0) return
  topActionMessage.value = ''
  splitLoading.value = true
  await nextTick()
  await new Promise(resolve => window.setTimeout(resolve, 0))

  const onlySelected = store.selectedIds.size > 0
  const changed = store.splitBilingualLines(onlySelected)
  splitLoading.value = false
  topActionMessage.value = changed > 0
    ? `处理成功：已拆分 ${changed} 条字幕`
    : '未发现可拆分的双行字幕'
  clearTopActionMessageLater()
}

async function handleCleanChinesePunctuation() {
  if (cleanLoading.value || !store.hasFile) return
  topActionMessage.value = ''
  cleanLoading.value = true
  await nextTick()
  await new Promise(resolve => window.setTimeout(resolve, 0))

  const onlySelected = store.selectedIds.size > 0
  const changed = store.cleanChinesePunctuation(cleanReplacement.value, onlySelected)
  cleanLoading.value = false
  cleanDialogVisible.value = false
  topActionMessage.value = changed > 0
    ? `处理成功：已清理 ${changed} 条字幕`
    : '未发现可清理的中文符号'
  clearTopActionMessageLater()
}

function handleCloseFile() {
  store.unloadFile()
  fileInputRef.value?.clear()
  errorMessage.value = ''
  importWarningMessage.value = ''
  snapshotContent.value = ''
  baselineSerializedContent.value = ''
  workingCopyContent.value = ''
  isWorkingCopyMaterialized.value = false
  sourceViewVisible.value = false
  styleSelectionVisible.value = false
  pendingStyleCandidates.value = []
  pendingNormalizeBaseContent.value = ''
  currentView.value = 'table'
}

function handleFixAssStructure() {
  if (!store.hasFile || (store.currentFile?.format ?? 'ass') !== 'ass') return

  const base = sourceViewCurrentContent.value || snapshotContent.value
  const candidates = collectAssStyleCandidates(base)
  pendingNormalizeBaseContent.value = base
  pendingStyleCandidates.value = candidates

  if (hasScatteredStyleCandidates(candidates)) {
    styleSelectionVisible.value = true
    return
  }

  applyStructureNormalization(candidates.map(item => item.id))
}

function applyStructureNormalization(selectedStyleIds: string[]) {
  const base = pendingNormalizeBaseContent.value || sourceViewCurrentContent.value || snapshotContent.value
  const normalized = normalizeAssStructureWithSelectedStyles(base, selectedStyleIds)
  const current = store.currentFile
  if (current) {
    const reparsed = parseAss(normalized)
    const normalizedFile = createSubtitleFile({
      filename: current.filename,
      format: 'ass',
      items: reparsed.items,
      styles: reparsed.styles,
      scriptInfo: reparsed.scriptInfo,
    })
    store.loadFile(normalizedFile)
    baselineSerializedContent.value = serializeAss({
      items: normalizedFile.items,
      styles: normalizedFile.styles,
      scriptInfo: normalizedFile.scriptInfo,
      format: 'ass',
      filename: normalizedFile.filename,
    })
  }
  isWorkingCopyMaterialized.value = false
  workingCopyContent.value = normalized
  importWarningMessage.value = ''
  styleSelectionVisible.value = false
}

</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">SubtitleShop</h1>
    </header>

    <main class="main-content">
      <!-- File Input Section -->
      <div v-if="!store.hasFile" class="file-input-section">
        <h2 class="section-title">导入字幕文件</h2>
        <FileInput
          ref="fileInputRef"
          accept=".ass,.ssa,.srt"
          button-text="选择文件"
          @select="handleFileSelect"
        />
        <p class="hint">支持 .ass, .ssa, .srt 格式</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>

      <!-- File Info Section -->
      <div v-else class="file-info-section">
        <div
          v-if="importWarningMessage"
          class="mb-3 flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <span>{{ importWarningMessage }}</span>
          <button
            class="shrink-0 rounded border border-amber-500 bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600"
            @click="handleFixAssStructure"
          >
            立即修正
          </button>
        </div>
        <!-- View Switcher -->
        <div class="flex border-b border-gray-200">
          <button
            class="px-3 py-1.5 text-sm font-medium"
            :class="currentView === 'styles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
            @click="currentView = 'styles'"
          >
            样式
          </button>
          <button
            class="px-3 py-1.5 text-sm font-medium"
            :class="currentView === 'table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
            @click="currentView = 'table'"
          >
            表格视图
          </button>
        </div>

        <div class="p-3">
          <div class="flex justify-between items-center gap-2 mb-2">
            <h2 class="text-sm font-semibold truncate pr-2">{{ store.currentFile?.filename }}</h2>
            <div class="flex gap-1.5 shrink-0">
              <button
                class="px-2.5 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="store.items.length === 0 || splitLoading || cleanLoading"
                @click="handleSplitBilingual"
                title="拆分带换行的双行字幕为两行，保持时间轴一致并提取内联样式"
              >
                {{ splitLoading ? '处理中...' : '拆分双行字幕' }}
              </button>
              <button
                class="px-2.5 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="store.items.length === 0 || splitLoading || cleanLoading"
                @click="cleanDialogVisible = true"
                title="清理 Dialogue 文本块中的中文符号"
              >
                清理中文符号
              </button>
              <button
                class="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                @click="sourceViewVisible = true"
              >
                源文件视图
              </button>
              <button class="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" @click="handleExportFile">
                导出
              </button>
              <button class="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" @click="handleCloseFile">
                关闭
              </button>
            </div>
          </div>
          <div v-if="topActionMessage" class="mb-2">
            <span class="top-action-result">{{ topActionMessage }}</span>
          </div>

          <!-- Table View -->
          <template v-if="currentView === 'table'">
            <SubtitleTable class="max-h-96" />
          </template>

          <!-- Styles View -->
          <template v-else-if="currentView === 'styles'">
            <StyleEditor />
          </template>
        </div>
      </div>
    </main>
    <SourceDiffModal
      :visible="sourceViewVisible"
      :filename="store.currentFile?.filename"
      :original-content="snapshotContent"
      :current-content="sourceViewCurrentContent"
      @close="sourceViewVisible = false"
    />
    <StyleSelectionModal
      :visible="styleSelectionVisible"
      :candidates="pendingStyleCandidates"
      @close="styleSelectionVisible = false"
      @confirm="applyStructureNormalization"
    />
    <div v-if="splitLoading" class="split-loading-overlay">
      <div class="split-loading-panel">
        <span class="spinner" />
        <span>正在拆分双行字幕，请稍候...</span>
      </div>
    </div>
    <div v-if="cleanLoading" class="split-loading-overlay">
      <div class="split-loading-panel">
        <span class="spinner" />
        <span>正在清理中文符号，请稍候...</span>
      </div>
    </div>
    <div v-if="cleanDialogVisible" class="clean-modal-overlay" @click.self="cleanDialogVisible = false">
      <div class="clean-modal-panel">
        <h4 class="clean-modal-title">清理中文符号</h4>
        <p class="clean-modal-desc">处理范围：Dialogue 的 Text 文本块（存在选中行时仅处理选中）。</p>
        <label class="clean-modal-field">
          <span>替换目标</span>
          <select v-model="cleanReplacement" class="clean-modal-select">
            <option value=" ">空格（默认）</option>
            <option value="">删除</option>
            <option value=",">英文逗号 ,</option>
            <option value=".">英文句号 .</option>
            <option value="-">短横线 -</option>
          </select>
        </label>
        <div class="clean-modal-actions">
          <button class="clean-btn ghost" @click="cleanDialogVisible = false">取消</button>
          <button class="clean-btn primary" :disabled="cleanLoading" @click="handleCleanChinesePunctuation">
            开始清理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3f4f6 0%, #eef2f7 100%);
}

.header {
  background-color: #1a1a2e;
  color: white;
  padding: 1rem 2rem;
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.main-content {
  width: min(1920px, 99vw);
  margin: 0 auto;
  padding: 0.6rem 0.5rem 0.5rem;
}

.top-action-result {
  font-size: 12px;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 999px;
  padding: 3px 9px;
}

.file-input-section {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid #d6deeb;
  border-radius: 14px;
  padding: 2.5rem;
  text-align: center;
  backdrop-filter: blur(3px);
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  color: #333;
}

.hint {
  margin-top: 1rem;
  color: #666;
  font-size: 0.875rem;
}

.error {
  margin-top: 1rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.file-info-section {
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.file-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #333;
}

.file-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  font-size: 0.875rem;
  color: #666;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.subtitle-list {
  margin-top: 1rem;
}

.list-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
  background: #f9fafb;
  border-radius: 4px;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 500px;
  overflow-y: auto;
}

.list-item {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.list-item:hover {
  background-color: #f9fafb;
}

.list-item.selected {
  background-color: #eff6ff;
}

.item-time {
  font-size: 0.75rem;
  color: #666;
  font-family: monospace;
}

.subtitle-table-container {
  margin-top: 1rem;
  max-height: 600px;
}

.clean-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.clean-modal-panel {
  width: min(420px, 94vw);
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.clean-modal-title {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.clean-modal-desc {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

.clean-modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}

.clean-modal-select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  color: #111827;
}

.clean-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.clean-btn {
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  border: 1px solid transparent;
}

.clean-btn.ghost {
  background: #fff;
  border-color: #d1d5db;
  color: #374151;
}

.clean-btn.primary {
  background: #ea580c;
  color: #fff;
}

.split-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(15, 23, 42, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-loading-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 12px 16px;
  color: #1f2937;
  font-size: 14px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-top-color: #0f766e;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
