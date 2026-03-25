<script setup lang="ts">
import { ref } from 'vue'
import { useSubtitleStore } from './stores/subtitle'
import { useFileExport } from './composables/useFileExport'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { FileInput } from './components/common'
import { SubtitleTable } from './components/table'
import { MainToolbar } from './components/toolbar'
import { TimelineEditor } from './components/timeline'
import { parseAss } from './plugins/parser-ass/parser'
import { parseSrt } from './plugins/parser-srt/parser'
import { createSubtitleFile } from './core/models/SubtitleFile'

const store = useSubtitleStore()
const { exportFile } = useFileExport()
useKeyboardShortcuts()
const fileInputRef = ref<InstanceType<typeof FileInput> | null>(null)
const errorMessage = ref('')
const currentView = ref<'table' | 'timeline'>('table')

async function handleFileSelect(file: File) {
  errorMessage.value = ''

  try {
    const content = await file.text()
    const extension = file.name.split('.').pop()?.toLowerCase()

    let parsedData: ReturnType<typeof parseAss>

    if (extension === 'srt') {
      parsedData = parseSrt(content)
    } else if (extension === 'ass' || extension === 'ssa') {
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
  currentView.value = 'table'
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

          <!-- Timeline View -->
          <TimelineEditor v-else :duration="600000" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f5f5f5;
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.file-input-section {
  background: white;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
