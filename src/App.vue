<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
            class="px-4 py-2 text-sm font-medium"
            :class="currentView === 'styles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
            @click="currentView = 'styles'"
          >
            样式
          </button>
          <button
            class="px-4 py-2 text-sm font-medium"
            :class="currentView === 'table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'"
            @click="currentView = 'table'"
          >
            表格视图
          </button>
        </div>

        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold">{{ store.currentFile?.filename }}</h2>
            <div class="flex gap-2">
              <button
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                @click="sourceViewVisible = true"
              >
                源文件视图
              </button>
              <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click="handleExportFile">
                导出
              </button>
              <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" @click="handleCloseFile">
                关闭
              </button>
            </div>
          </div>

          <!-- Table View -->
          <SubtitleTable v-if="currentView === 'table'" class="max-h-96" />

          <!-- Styles View -->
          <StyleEditor v-else-if="currentView === 'styles'" />
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
  width: min(1920px, 98vw);
  margin: 0 auto;
  padding: 1.25rem 1.5rem 1.75rem;
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
</style>
