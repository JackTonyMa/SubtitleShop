<script setup lang="ts">
import { computed } from 'vue'
import type { AssStyle } from '../../core/models/AssStyle'
import { assColorToCss } from '../../utils/assColor'

const props = defineProps<{
  style: AssStyle
  previewText?: string
  playResX?: number
  playResY?: number
}>()

const defaultPreviewText = '预览文本\nPreview Text'
const previewHeight = 216

const displayText = computed(() => props.previewText || defaultPreviewText)
const safePlayResX = computed(() => (props.playResX && props.playResX > 0 ? props.playResX : 1920))
const safePlayResY = computed(() => (props.playResY && props.playResY > 0 ? props.playResY : 1080))
const previewScale = computed(() => previewHeight / safePlayResY.value)

// Generate text shadow to simulate ASS outline effect
const textShadow = computed(() => {
  const shadows: string[] = []
  const outlineColor = assColorToCss(props.style.outlineColor)
  const scale = previewScale.value

  if (props.style.outline > 0) {
    const width = Math.max(1, Math.round(props.style.outline * 2 * scale))
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
    const shadowOffset = Math.max(1, Math.round(props.style.shadow * 2 * scale))
    const shadowOpacity = Math.min(0.5, props.style.shadow * 0.15)
    shadows.push(`${shadowOffset}px ${shadowOffset}px ${shadowOffset}px rgba(0, 0, 0, ${shadowOpacity})`)
  }

  return shadows.join(', ')
})

const textColor = computed(() => assColorToCss(props.style.primaryColor))

const fontStyle = computed(() => {
  const scale = previewScale.value
  const styles: Record<string, string> = {
    fontFamily: props.style.fontName,
    fontSize: `${Math.max(8, Math.round(props.style.fontSize * scale))}px`,
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

const textPositionStyle = computed(() => {
  const align = props.style.alignment

  let translateX = '-50%'
  let translateY = '-50%'
  let xPercent = 50
  let yPercent = 50

  if (align === 1 || align === 4 || align === 7) {
    xPercent = Math.max(0, Math.min(100, (props.style.marginL / safePlayResX.value) * 100))
    translateX = '0%'
  } else if (align === 3 || align === 6 || align === 9) {
    xPercent = Math.max(0, Math.min(100, 100 - (props.style.marginR / safePlayResX.value) * 100))
    translateX = '-100%'
  } else {
    xPercent = Math.max(
      0,
      Math.min(
        100,
        50 + ((props.style.marginL - props.style.marginR) / (2 * safePlayResX.value)) * 100
      )
    )
  }
  if (align === 1 || align === 2 || align === 3) {
    yPercent = Math.max(0, Math.min(100, 100 - (props.style.marginV / safePlayResY.value) * 100))
    translateY = '-100%'
  } else if (align === 7 || align === 8 || align === 9) {
    yPercent = Math.max(0, Math.min(100, (props.style.marginV / safePlayResY.value) * 100))
    translateY = '0%'
  } else {
    yPercent = Math.max(
      0,
      Math.min(100, 50 + (props.style.marginV / (safePlayResY.value / 2)) * 50)
    )
  }

  return {
    left: `${xPercent}%`,
    top: `${yPercent}%`,
    transform: `translate(${translateX}, ${translateY})`,
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
    >
      <div
        class="preview-text"
        :style="{ ...fontStyle, ...textPositionStyle }"
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
  width: 100%;
  max-width: 384px;
  aspect-ratio: 16 / 9;
  margin: 0.75rem auto;
  position: relative;
  border-radius: 0.375rem;
  background: radial-gradient(circle at 50% 35%, #1f2a44 0%, #151b2d 55%, #0e1321 100%);
  overflow: hidden;
}

.preview-text {
  position: absolute;
  max-width: 90%;
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
