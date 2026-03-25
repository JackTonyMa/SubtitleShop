<script setup lang="ts">
import { computed } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss } from '../../utils/assColor'

const props = defineProps<{
  style: AssStyle
  previewText?: string
}>()

const defaultPreviewText = '预览文本\nPreview Text'

const displayText = computed(() => props.previewText || defaultPreviewText)

// Generate text shadow to simulate ASS outline effect
const textShadow = computed(() => {
  const shadows: string[] = []
  const outlineColor = assColorToCss(props.style.outlineColor)

  if (props.style.outline > 0) {
    const width = Math.max(1, props.style.outline * 2)
    for (let x = -width; x <= width; x++) {
      for (let y = -width; y <= width; y++) {
        if (Math.abs(x) + Math.abs(y) <= width && (x !== 0 || y !== 0)) {
          shadows.push(`${x}px ${y}px 0 ${outlineColor}`)
        }
      }
    }
  }

  // Add shadow if depth > 0
  if (props.style.shadow > 0) {
    const shadowOffset = Math.max(1, props.style.shadow * 2)
    const shadowOpacity = Math.min(0.5, props.style.shadow * 0.15)
    shadows.push(`${shadowOffset}px ${shadowOffset}px ${shadowOffset}px rgba(0, 0, 0, ${shadowOpacity})`)
  }

  return shadows.join(', ')
})

const textColor = computed(() => assColorToCss(props.style.primaryColor))

const fontStyle = computed(() => {
  const styles: Record<string, string> = {
    fontFamily: props.style.fontName,
    fontSize: `${props.style.fontSize}px`,
    color: textColor.value,
    fontWeight: props.style.bold ? 'bold' : 'normal',
    fontStyle: props.style.italic ? 'italic' : 'normal',
    textDecoration: props.style.underline ? 'underline' : 'none',
  }

  // Add text shadow for outline effect
  if (textShadow.value) {
    styles.textShadow = textShadow.value
  }

  return styles
})

// Calculate alignment based on ASS alignment values
// 1-3: bottom, 4-6: middle, 7-9: top
// 1,4,7: left, 2,5,8: center, 3,6,9: right
const containerStyle = computed(() => {
  const align = props.style.alignment

  let justifyContent = 'center'
  let alignItems = 'center'

  // Horizontal alignment
  if (align === 1 || align === 4 || align === 7) {
    justifyContent = 'flex-start'
  } else if (align === 3 || align === 6 || align === 9) {
    justifyContent = 'flex-end'
  }

  // Vertical alignment
  if (align === 1 || align === 2 || align === 3) {
    alignItems = 'flex-end'
  } else if (align === 7 || align === 8 || align === 9) {
    alignItems = 'flex-start'
  }

  return {
    justifyContent,
    alignItems,
  }
})

const textAlignment = computed(() => {
  const align = props.style.alignment
  if (align === 1 || align === 4 || align === 7) return 'left'
  if (align === 3 || align === 6 || align === 9) return 'right'
  return 'center'
})
</script>

<template>
  <div class="style-preview">
    <div class="preview-header">
      <span class="preview-title">样式预览</span>
    </div>
    <div
      class="preview-canvas"
      :style="containerStyle"
    >
      <div
        class="preview-text"
        :style="fontStyle"
        :class="[`text-${textAlignment}`]"
      >
        <template v-for="(line, index) in displayText.split('\n')" :key="index">
          <div v-if="index > 0" class="preview-line-break" />
          {{ line }}
        </template>
      </div>
    </div>
    <div class="preview-info">
      <span class="text-xs text-gray-500">{{ style.name }}</span>
      <span class="text-xs text-gray-400">{{ style.fontName }} {{ style.fontSize }}px</span>
    </div>
  </div>
</template>

<style scoped>
.style-preview {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #1a1a2e; /* Dark background like video player */
}

.preview-header {
  padding: 0.5rem 0.75rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.preview-canvas {
  min-height: 160px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.preview-text {
  white-space: pre-wrap;
  line-height: 1.4;
  transition: all 0.15s ease;
}

.preview-line-break {
  height: 0.5em;
}

.preview-info {
  padding: 0.5rem 0.75rem;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}
</style>
