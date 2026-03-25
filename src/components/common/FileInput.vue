<template>
  <div class="file-input">
    <input ref="fileInput" type="file" :accept="accept" class="hidden" @change="handleChange" />
    <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" @click="fileInput?.click()">
      {{ buttonText }}
    </button>
    <span v-if="selectedFile" class="ml-2 text-gray-600">{{ selectedFile.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  accept?: string
  buttonText?: string
}

withDefaults(defineProps<Props>(), {
  accept: '.ass,.srt',
  buttonText: '选择文件'
})

const emit = defineEmits<{
  (e: 'select', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    emit('select', file)
  }
}

defineExpose({
  clear: () => {
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
})
</script>

<style scoped>
.hidden {
  display: none;
}

.file-input {
  display: flex;
  align-items: center;
}

.ml-2 {
  margin-left: 0.5rem;
}

.text-gray-600 {
  color: #4b5563;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.text-white {
  color: #ffffff;
}

.rounded {
  border-radius: 0.25rem;
}

.hover\:bg-blue-700:hover {
  background-color: #1d4ed8;
}
</style>
