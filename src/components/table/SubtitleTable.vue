<script setup lang="ts">
import { computed } from 'vue'
import { useSubtitleStore } from '../../stores/subtitle'
import SubtitleRow from './SubtitleRow.vue'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

const store = useSubtitleStore()

interface DisplayGroup {
  id: string
  startTime: number
  endTime: number
  itemIds: string[]
}

interface DisplayRow {
  type: 'group' | 'item'
  key: string
  group?: DisplayGroup
  item?: SubtitleItem
  index?: number
}

function getStyleName(styleName: string | undefined): string {
  return styleName || 'Default'
}

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

const displayRows = computed<DisplayRow[]>(() => {
  const items = [...store.items].sort((a, b) => a.startTime - b.startTime)
  const groups: DisplayGroup[] = []

  for (const item of items) {
    const current = groups[groups.length - 1]
    if (!current || item.startTime > current.endTime) {
      groups.push({
        id: `g-${item.id}`,
        startTime: item.startTime,
        endTime: item.endTime,
        itemIds: [item.id],
      })
      continue
    }
    current.endTime = Math.max(current.endTime, item.endTime)
    current.itemIds.push(item.id)
  }

  const rows: DisplayRow[] = []
  const indexMap = new Map(items.map((item, idx) => [item.id, idx + 1]))
  const itemMap = new Map(items.map(item => [item.id, item]))

  for (const group of groups) {
    if (group.itemIds.length > 1) {
      rows.push({ type: 'group', key: `${group.id}-header`, group })
    }
    for (const id of group.itemIds) {
      const item = itemMap.get(id)
      if (!item) continue
      rows.push({
        type: 'item',
        key: item.id,
        item,
        index: indexMap.get(id) || 0,
        group,
      })
    }
  }

  return rows
})
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
          <th class="px-4 py-2 text-left font-semibold text-gray-700 w-32">样式</th>
          <th class="px-4 py-2 text-left font-semibold text-gray-700">文本</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in displayRows" :key="row.key">
          <tr v-if="row.type === 'group'" class="group-row">
            <td colspan="6" class="px-4 py-1.5 text-xs text-gray-600">
              多行组：{{ row.group?.itemIds.length }} 行（时间重叠）
            </td>
          </tr>
          <SubtitleRow
            v-else-if="row.item"
            :index="row.index || 0"
            :item="row.item"
            :group-size="row.group?.itemIds.length"
            :is-selected="store.isSelected(row.item.id)"
            :style-name="getStyleName(row.item.style)"
            @select="(e) => handleSelect(row.item!.id, e)"
            @update="(updates) => handleUpdate(row.item!.id, updates)"
          />
        </template>
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

.group-row {
  background-color: #f8fafc;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}
</style>
