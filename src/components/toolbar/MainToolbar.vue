<template>
  <div
    v-if="isSplitOnly"
    class="toolbar flex items-center gap-2 p-3 bg-gray-100 border-b border-gray-200"
  >
    <button
      class="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.items.length === 0 || splitLoading || cleanLoading"
      @click="handleSplitBilingual"
      title="拆分带换行的双语字幕为两行，保持时间轴一致并提取内联样式"
    >
      {{ splitLoading ? '处理中...' : '拆分双语字幕' }}
    </button>
    <button
      class="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.items.length === 0 || splitLoading || cleanLoading"
      @click="cleanDialogVisible = true"
      title="清理 Dialogue 文本块中的中文符号"
    >
      清理中文符号
    </button>
    <span v-if="splitResultMessage" class="split-result">{{ splitResultMessage }}</span>
  </div>
  <div
    v-else
    class="toolbar flex items-center gap-2 p-3 bg-gray-100 border-b border-gray-200"
  >
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
      @click="store.undo"
      title="撤销 (Ctrl+Z)"
    >
      ↶ 撤销
    </button>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
      :disabled="!store.canRedo"
      @click="store.redo"
      title="重做 (Ctrl+Y)"
    >
      ↷ 重做
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.selectedIds.size < 2"
      @click="store.mergeSelected"
      title="合并选中字幕"
    >
      合并
    </button>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!hasSelection"
      @click="store.duplicateSelected"
      title="复制选中 (Ctrl+D)"
    >
      复制
    </button>

    <button
      class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!hasSelection"
      @click="handleShiftTime"
      title="时间平移"
    >
      时间+
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <select
      v-model="batchStyleName"
      class="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
      title="选择要应用到全部字幕的样式"
    >
      <option v-for="style in store.styles" :key="style.name" :value="style.name">
        {{ style.name }}
      </option>
    </select>

    <button
      class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.items.length === 0 || store.styles.length === 0 || !batchStyleName"
      @click="handleApplyStyleToAll"
      title="将选中样式应用到全部字幕"
    >
      统一样式
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <input
      v-model="findText"
      class="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white w-36"
      placeholder="查找文本"
      title="批量查找文本"
    />

    <input
      v-model="replaceText"
      class="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white w-36"
      placeholder="替换为"
      title="批量替换文本"
    />

    <button
      class="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canBatchReplaceSelected"
      @click="handleBatchReplace(true)"
      title="将查找文本批量替换到选中字幕（含内联标签行）"
    >
      替换选中
    </button>

    <button
      class="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canBatchReplaceAll"
      @click="handleBatchReplace(false)"
      title="将查找文本批量替换到全部字幕（含内联标签行）"
    >
      替换全部
    </button>

    <button
      class="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.items.length === 0"
      @click="handleSplitBilingual"
      title="拆分带换行的双语字幕为两行，保持时间轴一致并提取内联样式"
    >
      拆分双语
    </button>

    <div class="w-px h-6 bg-gray-300 mx-2"></div>

    <span class="text-sm text-gray-600">
      {{ store.items.length }} 条字幕
      <span v-if="store.selectedIds.size > 0">({{ store.selectedIds.size }} 选中)</span>
    </span>
  </div>
  <div v-if="splitLoading" class="split-loading-overlay">
    <div class="split-loading-panel">
      <span class="spinner" />
      <span>正在拆分双语字幕，请稍候...</span>
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
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'

const props = withDefaults(defineProps<{
  mode?: 'full' | 'split-only'
}>(), {
  mode: 'full',
})

const store = useSubtitleStore()

const isSplitOnly = computed(() => props.mode === 'split-only')
const hasSelection = computed(() => store.selectedIds.size > 0)
const batchStyleName = ref('')
const findText = ref('')
const replaceText = ref('')
const canBatchReplaceAll = computed(() => store.items.length > 0 && findText.value.length > 0)
const canBatchReplaceSelected = computed(() => store.selectedIds.size > 0 && findText.value.length > 0)
const splitLoading = ref(false)
const cleanLoading = ref(false)
const splitResultMessage = ref('')
const cleanDialogVisible = ref(false)
const cleanReplacement = ref(' ')

watch(
  () => store.styles,
  (styles) => {
    if (styles.length === 0) {
      batchStyleName.value = ''
      return
    }
    if (!styles.some(style => style.name === batchStyleName.value)) {
      batchStyleName.value = styles[0].name
    }
  },
  { immediate: true, deep: true }
)

function handleAdd() {
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
  store.deleteSelected()
}

function handleShiftTime() {
  // Shift forward by 1 second (1000ms)
  store.shiftTime(1000)
}

function handleApplyStyleToAll() {
  if (!batchStyleName.value) return
  store.applyStyleToAll(batchStyleName.value)
}

function handleBatchReplace(onlySelected: boolean) {
  if (!findText.value) return
  store.batchReplaceText(findText.value, replaceText.value, onlySelected)
}

function clearSplitMessageLater() {
  window.setTimeout(() => {
    splitResultMessage.value = ''
  }, 3000)
}

async function handleSplitBilingual() {
  if (splitLoading.value) return
  splitResultMessage.value = ''
  splitLoading.value = true
  await nextTick()
  await new Promise(resolve => window.setTimeout(resolve, 0))

  const onlySelected = store.selectedIds.size > 0
  const changed = store.splitBilingualLines(onlySelected)
  splitLoading.value = false
  splitResultMessage.value = changed > 0
    ? `处理成功：已拆分 ${changed} 条字幕`
    : '未发现可拆分的双语字幕'
  clearSplitMessageLater()
}

async function handleCleanChinesePunctuation() {
  if (cleanLoading.value) return
  splitResultMessage.value = ''
  cleanLoading.value = true
  await nextTick()
  await new Promise(resolve => window.setTimeout(resolve, 0))

  const onlySelected = store.selectedIds.size > 0
  const changed = store.cleanChinesePunctuation(cleanReplacement.value, onlySelected)
  cleanLoading.value = false
  cleanDialogVisible.value = false
  splitResultMessage.value = changed > 0
    ? `处理成功：已清理 ${changed} 条字幕`
    : '未发现可清理的中文符号'
  clearSplitMessageLater()
}
</script>

<style scoped>
.split-result {
  font-size: 12px;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 999px;
  padding: 4px 10px;
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
