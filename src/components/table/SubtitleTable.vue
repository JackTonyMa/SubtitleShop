<script setup lang="ts">
import { useSubtitleStore } from '../../stores/subtitle'
import SubtitleRow from './SubtitleRow.vue'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

const store = useSubtitleStore()

function handleSelect(id: string, event: MouseEvent) {
  const multi = event.ctrlKey || event.metaKey
  if (store.isSelected(id) && multi) {
    store.deselectItem(id)
  } else {
    store.selectItem(id, multi)
  }
}

function handleUpdate(id: string, updates: Partial<SubtitleItem>) {
  store.updateItem(id, updates)
}
</script>

<template>
  <div class="subtitle-table-container overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-100 sticky top-0 z-10">
        <tr>
          <th class="px-4 py-2 text-left font-semibold text-gray-700 w-16">#</th>
          <th class="px-4 py-2 text-left font-semibold text-gray-700 w-32">开始时间</th>
          <th class="px-4 py-2 text-left font-semibold text-gray-700 w-32">结束时间</th>
          <th class="px-4 py-2 text-left font-semibold text-gray-700 w-24">时长</th>
          <th class="px-4 py-2 text-left font-semibold text-gray-700">文本</th>
        </tr>
      </thead>
      <tbody>
        <SubtitleRow
          v-for="(item, index) in store.items"
          :key="item.id"
          :index="index + 1"
          :item="item"
          :is-selected="store.isSelected(item.id)"
          @select="(e) => handleSelect(item.id, e)"
          @update="(updates) => handleUpdate(item.id, updates)"
        />
      </tbody>
    </table>
    <div
      v-if="store.items.length === 0"
      class="text-center py-8 text-gray-500"
    >
      没有字幕数据
    </div>
  </div>
</template>

<style scoped>
.subtitle-table-container {
  max-height: 70vh;
}

th {
  border-bottom: 2px solid #e5e7eb;
}

tr:hover {
  background-color: #f9fafb;
}
</style>
