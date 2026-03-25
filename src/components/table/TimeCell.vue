<script setup lang="ts">
import { ref, computed } from 'vue'
import { msToAssTime, assTimeToMs } from '../../utils/time'

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

const isEditing = ref(false)
const editValue = ref('')
const error = ref('')

const displayValue = computed(() => {
  return msToAssTime(props.value)
})

function startEdit() {
  isEditing.value = true
  editValue.value = displayValue.value
  error.value = ''
}

function validateAndCommit() {
  error.value = ''
  try {
    const newMs = assTimeToMs(editValue.value)
    emit('update', newMs)
    isEditing.value = false
  } catch (e) {
    error.value = '无效的时间格式'
  }
}

function handleBlur() {
  validateAndCommit()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    validateAndCommit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    isEditing.value = false
    editValue.value = displayValue.value
    error.value = ''
  }
}
</script>

<template>
  <div class="time-cell">
    <div
      v-if="!isEditing"
      class="time-display cursor-pointer hover:bg-blue-50 px-2 py-1 rounded font-mono"
      @click="startEdit"
    >
      {{ displayValue }}
    </div>
    <div v-else class="time-edit">
      <input
        v-model="editValue"
        type="text"
        class="w-full px-2 py-1 text-sm border rounded font-mono"
        :class="{ 'border-red-500': error }"
        @blur="handleBlur"
        @keydown="handleKeydown"
        ref="(el) => { if (el) el.focus() }"
      />
      <div v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</div>
    </div>
  </div>
</template>
