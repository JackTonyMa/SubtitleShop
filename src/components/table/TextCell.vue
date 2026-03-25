<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

const isEditing = ref(false)
const editValue = ref('')

const displayValue = computed(() => {
  // Show newlines as ↵ symbol
  return props.value.replace(/\n/g, '↵') || '\u00A0'
})

function startEdit() {
  isEditing.value = true
  editValue.value = props.value
}

function commit() {
  emit('update', editValue.value)
  isEditing.value = false
}

function cancel() {
  isEditing.value = false
  editValue.value = props.value
}

function handleBlur() {
  commit()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}
</script>

<template>
  <div class="text-cell">
    <div
      v-if="!isEditing"
      class="text-display cursor-pointer hover:bg-blue-50 px-2 py-1 rounded min-h-[1.5em]"
      @click="startEdit"
    >
      {{ displayValue }}
    </div>
    <div v-else class="text-edit">
      <input
        v-model="editValue"
        type="text"
        class="w-full px-2 py-1 text-sm border rounded"
        @blur="handleBlur"
        @keydown="handleKeydown"
        ref="(el) => { if (el) el.focus() }"
      />
    </div>
  </div>
</template>
