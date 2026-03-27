<script setup lang="ts">
import { computed } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { PRESET_STYLES } from '../../components/preset-styles'
import { assColorToCss } from '../../utils/assColor'

const props = defineProps<{
  styles: AssStyle[]
  selectedStyleName: string | null
  activePresetId?: string | null
  hideUnusedStyles: boolean
  hiddenUnusedStyleCount: number
  styleReferenceCounts: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'select', styleName: string): void
  (e: 'new'): void
  (e: 'copy', styleName: string): void
  (e: 'rename', styleName: string): void
  (e: 'delete', styleName: string): void
  (e: 'previewPreset', presetId: string): void
  (e: 'updateHideUnusedStyles', value: boolean): void
}>()

const visibleStyles = computed(() => {
  if (!props.hideUnusedStyles) return props.styles
  return props.styles.filter(style => (props.styleReferenceCounts[style.name] || 0) > 0)
})

function handleSelect(styleName: string) {
  emit('select', styleName)
}

function handleNew() {
  emit('new')
}

function handleCopy() {
  if (props.selectedStyleName) {
    emit('copy', props.selectedStyleName)
  }
}

function handleRename() {
  if (props.selectedStyleName) {
    emit('rename', props.selectedStyleName)
  }
}

function handleDelete() {
  if (props.selectedStyleName && props.styles.length > 1) {
    emit('delete', props.selectedStyleName)
  }
}

function handlePreviewPreset(presetId: string) {
  emit('previewPreset', presetId)
}

function getStyleIconStyle(style: AssStyle) {
  return {
    fontFamily: style.fontName,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    color: assColorToCss(style.primaryColor),
  }
}

</script>

<template>
  <div class="style-list">
    <!-- Project Styles Section -->
    <div class="list-section">
      <div class="section-header">
        <span class="section-title">内置样式</span>
        <div class="section-header-meta">
          <span class="section-count">{{ visibleStyles.length }}</span>
          <span v-if="hiddenUnusedStyleCount > 0" class="section-hidden-note">已隐藏 {{ hiddenUnusedStyleCount }} 条</span>
        </div>
      </div>
      <label class="section-toggle">
        <input
          type="checkbox"
          :checked="hideUnusedStyles"
          @change="emit('updateHideUnusedStyles', ($event.target as HTMLInputElement).checked)"
        />
        <span>仅显示有引用的样式</span>
      </label>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          class="action-btn primary"
          @click="handleNew"
          title="新建样式"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>新建</span>
        </button>
        <button
          class="action-btn"
          @click="handleCopy"
          :disabled="!selectedStyleName"
          title="复制当前样式"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span>复制</span>
        </button>
        <button
          class="action-btn"
          @click="handleRename"
          :disabled="!selectedStyleName"
          title="重命名当前样式"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5h2m-7 7l9-9a2.828 2.828 0 114 4l-9 9-4 1 1-4z"/>
          </svg>
          <span>重命名</span>
        </button>
        <button
          class="action-btn danger"
          @click="handleDelete"
          :disabled="!selectedStyleName || styles.length <= 1"
          title="删除当前样式"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <span>删除</span>
        </button>
      </div>

      <!-- Styles List -->
      <div class="styles-list">
        <button
          v-for="style in visibleStyles"
          :key="style.name"
          class="style-item"
          :class="{ active: style.name === selectedStyleName && !activePresetId }"
          @click="handleSelect(style.name)"
        >
          <div class="style-icon" :style="getStyleIconStyle(style)">
            Aa
          </div>
          <div class="style-item-content">
            <span class="style-name-row">
              <span class="style-name">{{ style.name }}</span>
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Presets Section -->
    <div class="list-section">
      <div class="section-header">
        <span class="section-title">预设样式</span>
      </div>

      <div class="presets-list">
        <button
          v-for="preset in PRESET_STYLES"
          :key="preset.id"
          class="preset-item"
          :class="{ active: preset.id === activePresetId }"
          type="button"
          @click="handlePreviewPreset(preset.id)"
          title="预设样式（仅展示）"
        >
          <div class="preset-icon" :style="{
            fontFamily: preset.style.fontName,
            fontWeight: preset.style.bold ? 'bold' : 'normal',
            fontStyle: preset.style.italic ? 'italic' : 'normal',
            color: assColorToCss(preset.style.primaryColor),
          }">
            Aa
          </div>
          <div class="preset-info">
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-description">{{ preset.description }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-header-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.section-count {
  font-size: 0.75rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.section-hidden-note {
  font-size: 0.68rem;
  color: #9a3412;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #4b5563;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 42px;
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.55rem;
  background-color: white;
  color: #374151;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
}

.action-btn span {
  white-space: nowrap;
}

.action-btn svg {
  flex: 0 0 auto;
}

.action-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-color: #2563eb;
  color: white;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
}

.action-btn.primary:hover:not(:disabled) {
  background-color: #2563eb;
  border-color: #2563eb;
}

.action-btn.danger {
  color: #dc2626;
}

.action-btn.danger:hover:not(:disabled) {
  background-color: #fef2f2;
  border-color: #fca5a5;
}

.styles-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.style-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.style-item:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

.style-item.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.style-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.style-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.style-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #9ca3af;
  border-radius: 0.375rem;
  font-size: 1rem;
  border: 1px solid #6b7280;
  flex-shrink: 0;
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.preset-item:hover {
  background-color: #f9fafb;
  border-color: #3b82f6;
}

.preset-item.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15);
}

.preset-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #9ca3af;
  border-radius: 0.375rem;
  font-size: 1rem;
  color: #374151;
  border: 1px solid #6b7280;
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.preset-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.preset-description {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
