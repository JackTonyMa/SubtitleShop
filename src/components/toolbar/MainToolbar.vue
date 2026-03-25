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
</script>
