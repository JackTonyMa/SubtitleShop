<script setup lang="ts">
import { computed } from 'vue'
import TimeCell from './TimeCell.vue'
import TextCell from './TextCell.vue'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

const props = defineProps<{
  index: number
  item: SubtitleItem
  isSelected: boolean
  styleName: string
  groupSize?: number
}>()

const emit = defineEmits<{
  (e: 'select', event: MouseEvent): void
  (e: 'update', updates: Partial<SubtitleItem>): void
}>()

const duration = computed(() => {
  return props.item.endTime - props.item.startTime
})

const durationFormatted = computed(() => {
  const ms = duration.value
  const seconds = Math.floor(ms / 1000)
  const centis = Math.floor((ms % 1000) / 10)
  return `${seconds}.${centis.toString().padStart(2, '0')}s`
})

function handleStartTimeUpdate(newValue: number) {
  if (newValue >= props.item.endTime) {
    return
  }
  emit('update', { startTime: newValue })
}

function handleEndTimeUpdate(newValue: number) {
  if (newValue <= props.item.startTime) {
    return
  }
  emit('update', { endTime: newValue })
}
</script>

<template>
  <tr
    class="border-b border-gray-200 transition-colors"
    :class="{
      'bg-blue-50': isSelected,
      'cursor-pointer': true
    }"
    @click="emit('select', $event)"
  >
    <td class="px-4 py-2 text-gray-600">{{ index }}</td>
    <td class="px-4 py-2">
      <TimeCell
        :value="item.startTime"
        @update="handleStartTimeUpdate"
      />
    </td>
    <td class="px-4 py-2">
      <TimeCell
        :value="item.endTime"
        @update="handleEndTimeUpdate"
      />
    </td>
    <td class="px-4 py-2 text-gray-600 font-mono text-xs">
      {{ durationFormatted }}
    </td>
    <td class="px-4 py-2 text-gray-600 text-xs">
      <div class="flex items-center gap-2">
        <span>{{ styleName }}</span>
        <span v-if="groupSize && groupSize > 1" class="group-chip">组{{ groupSize }}行</span>
        <span v-if="item.hasInlineOverrides" class="inline-tag-chip" title="该行有内联标签，优先级高于样式">
          内联覆盖
        </span>
      </div>
    </td>
    <td class="px-4 py-2">
      <TextCell
        :value="item.text"
        @update="(text) => emit('update', { text })"
      />
    </td>
  </tr>
</template>

<style scoped>
.group-chip {
  font-size: 10px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
}

.inline-tag-chip {
  font-size: 10px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
}
</style>
