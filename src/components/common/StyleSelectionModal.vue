<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AssStyleCandidate } from '../../plugins/parser-ass/parser'

const props = defineProps<{
  visible: boolean
  candidates: AssStyleCandidate[]
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm', selectedIds: string[]): void
}>()

const selected = ref<string[]>([])

watch(
  () => [props.visible, props.candidates] as const,
  () => {
    if (!props.visible) return
    selected.value = props.candidates.map(candidate => candidate.id)
  },
  { immediate: true, deep: true }
)

function toggle(id: string, checked: boolean) {
  if (checked) {
    if (!selected.value.includes(id)) selected.value.push(id)
  } else {
    selected.value = selected.value.filter(item => item !== id)
  }
}
</script>

<template>
  <div v-if="visible" class="selection-overlay" @click.self="$emit('close')">
    <div class="selection-panel">
      <div class="selection-header">
        <h3>选择要保留的 Style</h3>
        <button class="close-btn" @click="$emit('close')">关闭</button>
      </div>
      <p class="selection-desc">
        检测到多个散落的 <code>Style:</code> 定义。请选择修正后保留的条目。
      </p>
      <p class="selection-notice">
        提醒：如果保留多条同名 Style，修正时会自动重命名以避免冲突。
      </p>

      <div class="selection-list">
        <label
          v-for="candidate in candidates"
          :key="candidate.id"
          class="selection-item"
        >
          <input
            type="checkbox"
            :checked="selected.includes(candidate.id)"
            @change="toggle(candidate.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="selection-name">{{ candidate.name }}</span>
          <code class="selection-line">{{ candidate.line }}</code>
        </label>
      </div>

      <div class="selection-actions">
        <button class="confirm-btn" @click="$emit('confirm', selected)">应用修正</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.selection-panel {
  width: min(900px, 96vw);
  max-height: 84vh;
  background: white;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.selection-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.selection-desc {
  margin: 0;
  padding: 0.75rem 1rem;
  color: #4b5563;
  font-size: 0.875rem;
  border-bottom: 1px solid #f3f4f6;
}

.selection-notice {
  margin: 0;
  padding: 0.625rem 1rem;
  color: #9a3412;
  background: #fff7ed;
  font-size: 0.8125rem;
  border-bottom: 1px solid #fed7aa;
}

.selection-list {
  overflow: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selection-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.5rem;
  align-items: start;
}

.selection-name {
  font-weight: 600;
  color: #1f2937;
}

.selection-line {
  font-size: 0.75rem;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

.selection-actions {
  border-top: 1px solid #e5e7eb;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: flex-end;
}

.confirm-btn {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: white;
  border-radius: 0.375rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
}

.close-btn {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.375rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}
</style>
