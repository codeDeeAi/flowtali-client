<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ReceiptService } from '@/services/receipt.service'
import ReceiptEditor from './ReceiptEditor.vue'
import { receiptToForm } from '@/components/receipt/receiptDocument'

const route     = useRoute()
const { t }     = useI18n()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const isLoading   = ref(true)
const notFound    = ref(false)
const initialData = ref<ReturnType<typeof receiptToForm> | undefined>(undefined)

onMounted(async () => {
  if (!orgId.value) { isLoading.value = false; return }
  const id = route.params.id as string
  try {
    const res = await ReceiptService.get(orgId.value, id)
    initialData.value = receiptToForm(res.data.data)
  } catch {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen bg-gray-100">
    <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
  </div>

  <div v-else-if="notFound" class="flex flex-col items-center justify-center h-screen bg-gray-100">
    <p class="text-gray-700">{{ t('receipts.notFound') }}</p>
    <button @click="$router.push({ name: 'receipts' })" class="mt-4 text-green-700 text-sm hover:underline">
      {{ t('receipts.back') }}
    </button>
  </div>

  <ReceiptEditor v-else mode="edit" :receipt-id="($route.params.id as string)" :initial-data="initialData" />
</template>
