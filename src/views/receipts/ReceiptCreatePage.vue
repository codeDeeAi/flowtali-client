<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ReceiptEditor from './ReceiptEditor.vue'

const initialData = ref<Record<string, any> | undefined>(undefined)

onMounted(() => {
  const raw = sessionStorage.getItem('receipt_prefill')
  if (raw) {
    try { initialData.value = JSON.parse(raw) } catch {}
    sessionStorage.removeItem('receipt_prefill')
  }
})
</script>

<template>
  <ReceiptEditor mode="create" :initial-data="initialData" />
</template>
