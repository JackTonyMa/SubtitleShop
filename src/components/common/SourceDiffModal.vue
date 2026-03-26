<script setup lang="ts">
import { computed, watch, onBeforeUnmount, ref, nextTick } from 'vue'
import { buildSideBySideDiff } from '../../utils/diff'

const props = defineProps<{
  visible: boolean
  filename?: string
  originalContent: string
  currentContent: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const diffRows = computed(() =>
  buildSideBySideDiff(props.originalContent, props.currentContent).map((row, index) => ({
    ...row,
    index,
    changed: row.type !== 'equal',
  }))
)

const changedCount = computed(() => diffRows.value.filter(row => row.changed).length)
const changedRowIndexes = computed(() =>
  diffRows.value.filter(row => row.changed).map(row => row.index)
)
const activeChangedIndex = ref(0)

const originalPaneRef = ref<HTMLElement | null>(null)
const currentPaneRef = ref<HTMLElement | null>(null)
const syncingScroll = ref(false)

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

function syncScroll(source: 'original' | 'current') {
  if (syncingScroll.value) return
  const sourceEl = source === 'original' ? originalPaneRef.value : currentPaneRef.value
  const targetEl = source === 'original' ? currentPaneRef.value : originalPaneRef.value
  if (!sourceEl || !targetEl) return
  syncingScroll.value = true
  targetEl.scrollTop = sourceEl.scrollTop
  targetEl.scrollLeft = sourceEl.scrollLeft
  requestAnimationFrame(() => {
    syncingScroll.value = false
  })
}

function jumpToChanged(direction: 1 | -1) {
  if (changedRowIndexes.value.length === 0) return
  const total = changedRowIndexes.value.length
  activeChangedIndex.value = (activeChangedIndex.value + direction + total) % total
  jumpToActiveChanged()
}

function jumpToActiveChanged() {
  if (changedRowIndexes.value.length === 0) return
  const rowIndex = changedRowIndexes.value[activeChangedIndex.value]
  const selector = `[data-row-index="${rowIndex}"]`
  const left = originalPaneRef.value?.querySelector(selector) as HTMLElement | null
  const right = currentPaneRef.value?.querySelector(selector) as HTMLElement | null
  left?.scrollIntoView({ block: 'center' })
  right?.scrollIntoView({ block: 'center' })
}

const originalBodyOverflow = typeof document !== 'undefined' ? document.body.style.overflow : ''

function lockBodyScroll() {
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  document.body.style.overflow = originalBodyOverflow
}

watch(
  () => props.visible,
  async (visible) => {
    if (typeof document === 'undefined') return
    if (visible) {
      lockBodyScroll()
      activeChangedIndex.value = 0
      await nextTick()
      jumpToActiveChanged()
    } else {
      unlockBodyScroll()
    }
  },
  { immediate: true }
)

watch(changedRowIndexes, async () => {
  if (!props.visible) return
  activeChangedIndex.value = 0
  await nextTick()
  jumpToActiveChanged()
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    unlockBodyScroll()
  }
})
</script>

<template>
  <div
    v-if="visible"
    class="source-modal-overlay"
    @click="handleOverlayClick"
  >
    <div class="source-modal-panel">
      <div class="source-modal-header">
        <div>
          <h3 class="source-modal-title">源文件视图</h3>
          <p class="source-modal-meta">
            {{ filename || '未命名文件' }} · 变更行 {{ changedCount }}
          </p>
        </div>
        <div class="header-actions">
          <button
            class="nav-btn"
            :disabled="changedRowIndexes.length === 0"
            @click="jumpToChanged(-1)"
          >
            上一个差异
          </button>
          <button
            class="nav-btn"
            :disabled="changedRowIndexes.length === 0"
            @click="jumpToChanged(1)"
          >
            下一个差异
          </button>
          <button class="close-btn" @click="$emit('close')">关闭</button>
        </div>
      </div>

      <div class="source-modal-body">
        <div class="source-column">
          <div class="source-column-header">原始文件</div>
          <div
            ref="originalPaneRef"
            class="source-column-content"
            @scroll="syncScroll('original')"
          >
            <div
              v-for="row in diffRows"
              :key="`o-${row.index}`"
              class="source-line"
              :class="{
                changed: row.changed,
                added: row.type === 'add',
                removed: row.type === 'remove',
                focused: row.index === changedRowIndexes[activeChangedIndex],
              }"
              :data-row-index="row.index"
            >
              <span class="line-no">{{ row.originalLineNumber || '' }}</span>
              <span class="line-text">{{ row.originalText || ' ' }}</span>
            </div>
          </div>
        </div>

        <div class="source-column">
          <div class="source-column-header">实时文件</div>
          <div
            ref="currentPaneRef"
            class="source-column-content"
            @scroll="syncScroll('current')"
          >
            <div
              v-for="row in diffRows"
              :key="`c-${row.index}`"
              class="source-line"
              :class="{
                changed: row.changed,
                added: row.type === 'add',
                removed: row.type === 'remove',
                focused: row.index === changedRowIndexes[activeChangedIndex],
              }"
              :data-row-index="row.index"
            >
              <span class="line-no">{{ row.currentLineNumber || '' }}</span>
              <span class="line-text">{{ row.currentText || ' ' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.source-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overscroll-behavior: contain;
}

.source-modal-panel {
  width: min(95vw, 1500px);
  height: min(90vh, 920px);
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.source-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.source-modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.source-modal-meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.close-btn {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.375rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nav-btn {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.375rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}

.nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.source-modal-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
}

.source-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
}

.source-column:last-child {
  border-right: none;
}

.source-column-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: #4b5563;
  font-weight: 600;
}

.source-column-content {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.source-line {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 0.75rem;
  padding: 0.1rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  white-space: pre;
}

.source-line.changed {
  background: #fff7ed;
}

.source-line.added {
  background: #ecfdf3;
}

.source-line.removed {
  background: #fef2f2;
}

.source-line.focused {
  outline: 1px solid #f59e0b;
  outline-offset: -1px;
  background: #fef3c7;
}

.line-no {
  color: #9ca3af;
  text-align: right;
}

.line-text {
  color: #111827;
}

@media (max-width: 1000px) {
  .source-modal-body {
    grid-template-columns: 1fr;
  }

  .source-column {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
