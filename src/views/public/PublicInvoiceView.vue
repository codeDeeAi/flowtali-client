<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { InvoiceSharedLinksService, type IInvoice, type IInvoiceSharedLink } from '@/services/invoice.service'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
import InvoiceDocument from '@/components/invoice/InvoiceDocument.vue'

const route = useRoute()
const token = route.params.token as string

const loading     = ref(true)
const invalid     = ref(false)
const locked      = ref(false)
const unlocked    = ref(false)
const codeInput   = ref('')
const codeError   = ref('')
const codeLoading = ref(false)

const link    = ref<IInvoiceSharedLink | null>(null)
const invoice = ref<IInvoice | null>(null)

onMounted(async () => {
  try {
    const res = await InvoiceSharedLinksService.getByToken(token)
    link.value    = res.data.data.link
    invoice.value = res.data.data.invoice
    InvoiceSharedLinksService.recordView(token)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 403) {
      locked.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
})

async function submitCode() {
  codeError.value = ''
  if (!codeInput.value.trim()) return
  codeLoading.value = true
  try {
    const res = await InvoiceSharedLinksService.getByToken(token, codeInput.value.trim())
    link.value    = res.data.data.link
    invoice.value = res.data.data.invoice
    locked.value  = false
    unlocked.value = true
    InvoiceSharedLinksService.recordView(token)
  } catch (err: any) {
    const msg = err?.response?.data?.message
    codeError.value = msg ?? 'Incorrect access code. Please try again.'
  } finally {
    codeLoading.value = false
  }
}

const printPage = () => window.print()
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">

    <!-- Minimal top bar -->
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <FlowtaliLogo variant="full" :size="16" theme="light" />
      <button v-if="invoice" @click="printPage()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg transition-colors">
        <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
      </button>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-400 animate-spin" />
    </div>

    <!-- Invalid / expired / revoked -->
    <div v-else-if="invalid" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center max-w-sm">
        <div class="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:link-2-off" class="w-7 h-7 text-gray-400" />
        </div>
        <h2 class="text-lg font-semibold text-gray-800 mb-2">Link unavailable</h2>
        <p class="text-sm text-gray-500 leading-relaxed">This link has expired, been revoked, or doesn't exist. Contact the sender for a new link.</p>
      </div>
    </div>

    <!-- Access code gate -->
    <div v-else-if="locked" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 w-full max-w-sm space-y-5">
        <div class="text-center">
          <div class="w-12 h-12 rounded-xl bg-green-700-50 border border-green-700-200 flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:lock" class="w-6 h-6 text-green-700-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-800">Access Required</h2>
          <p class="text-sm text-gray-500 mt-1">Enter the access code to view this invoice</p>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Access Code</label>
          <input
            v-model="codeInput"
            @keydown.enter="submitCode"
            type="text"
            placeholder="e.g. ABC123"
            class="w-full px-3 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-green-700-400 focus:ring-2 focus:ring-amber-400/20 text-gray-800 tracking-widest uppercase"
          />
          <p v-if="codeError" class="text-xs text-red-500">{{ codeError }}</p>
        </div>
        <button
          @click="submitCode"
          :disabled="codeLoading"
          class="w-full py-2.5 text-sm font-semibold bg-green-700-400 hover:bg-green-700-500 text-white rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Icon v-if="codeLoading" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
          View Invoice
        </button>
      </div>
    </div>

    <!-- Invoice content -->
    <div v-else-if="invoice" class="flex-1 py-8 px-4 flex flex-col items-center gap-6">

      <!-- Unlocked notice -->
      <div v-if="unlocked" class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
        <Icon icon="lucide:unlock" class="w-3.5 h-3.5" /> Access granted
      </div>

      <!-- Invoice document — shared with the editor preview, view page and PDF -->
      <div class="w-full max-w-[794px]">
        <InvoiceDocument :doc="invoice" fit />
      </div>

      <p class="text-xs text-gray-400">Shared via Flowtali · flowtali.com</p>
    </div>

  </div>
</template>

<style>
@media print {
  header { display: none !important; }
  body * { visibility: hidden; }
  .print-zoom-wrapper { transform: none !important; width: 100% !important; margin: 0 !important; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    box-shadow: none !important; border: none !important; border-radius: 0 !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
