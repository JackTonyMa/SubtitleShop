<script setup lang="ts">
import TimelineSubtitleBlock from './TimelineSubtitleBlock.vue'
import type { SubtitleItem } from '../../core/models/SubtitleItem'

defineProps<{
  items: SubtitleItem[]
  duration: number
  zoom: number
}>()

const emit = defineEmits<{
  (e: 'select', id: string, multi: boolean): void
  (e: 'update', id: string, updates: Partial<SubtitleItem>): void
}>()

function handleSelect(id: string, multi: boolean) {
  emit('select', id, multi)
}

function handleUpdate(id: string, updates: Partial<SubtitleItem>) {
  emit('update', id, updates)
}
</script>

<template>
  <div class="timeline-track relative h-full py-4">
    <TimelineSubtitleBlock
      v-for="item in items"
      :key="item.id"
      :item="item"
      :duration="duration"
      :zoom="zoom"
      @select="(multi) => handleSelect(item.id, multi)"
      @update="(updates) => handleUpdate(item.id, updates)"
    />
  </div>
</template>

<style scoped>
.timeline-track {
  position: relative;
}
</style>
