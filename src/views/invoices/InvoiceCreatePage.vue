<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import InvoiceEditor from './InvoiceEditor.vue'
import QuickInvoiceForm from '@/components/documents/QuickInvoiceForm.vue'
import CreateModeHeader from '@/components/documents/CreateModeHeader.vue'
import { useCreateMode } from '@/composables/useCreateMode'
import { useDocumentClient } from '@/composables/useDocumentClient'
import { clientToEditorFields } from '@/components/documents/quickDocument'

const route = useRoute()
const { t } = useI18n()
const projectId = route.query.project_id as string | undefined
const { mode, isEmbed } = useCreateMode('invoice')
const { client, ready } = useDocumentClient()

// Data typed in Quick mode, carried into the full editor.
const prefill = ref<Record<string, unknown> | undefined>(undefined)
function openFull(data: Record<string, unknown>) {
  prefill.value = data
  mode.value = 'full'
}
// The full editor reads its prefill once on mount, so it waits for the client lookup.
const editorPrefill = computed(() =>
  prefill.value ?? (client.value ? clientToEditorFields(client.value) : undefined),
)
</script>

<template>
  <div v-if="mode === 'quick'" class="p-4 md:p-6 space-y-5 min-h-full">
    <CreateModeHeader
      v-model="mode"
      :title="t('quickCreate.invoice.title')"
      :subtitle="t('quickCreate.invoice.subtitle')"
      back-route="invoices"
    />
    <QuickInvoiceForm :project-id="projectId" :initial-client="client" @open-full="openFull" />
  </div>

  <div v-else class="relative">
    <InvoiceEditor v-if="ready || prefill" mode="create" :project-id="projectId" :prefill="editorPrefill" />
    <button
      v-if="!isEmbed"
      type="button" @click="mode = 'quick'"
      class="fixed bottom-4 left-4 md:left-auto md:right-4 z-30 flex items-center gap-1.5 text-xs bg-gray-200 border border-gray-500 hover:border-green-700 text-gray-1000 px-3 py-2 rounded-full shadow-lg transition-colors"
    >
      <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-green-700" /> {{ t('quickCreate.switchToQuick') }}
    </button>
  </div>
</template>
