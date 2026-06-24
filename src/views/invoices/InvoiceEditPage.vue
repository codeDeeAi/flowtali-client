<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService } from '@/services/invoice.service'
import InvoiceEditor from './InvoiceEditor.vue'

const route     = useRoute()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const isLoading   = ref(true)
const notFound    = ref(false)
const initialData = ref<Record<string, any> | undefined>(undefined)

onMounted(async () => {
  if (!orgId.value) { isLoading.value = false; return }
  const id = route.params.id as string
  try {
    const res = await InvoiceService.get(orgId.value, id)
    const inv = res.data.data
    initialData.value = {
      number:                   inv.number,
      issueDate:                inv.issue_date ?? '',
      dueDate:                  inv.due_date ?? '',
      paymentTerms:             inv.payment_terms ?? 'Net 30',
      currency:                 inv.currency,
      poNumber:                 inv.po_number ?? '',
      fromName:                 inv.from_name ?? '',
      fromTagline:              inv.from_tagline ?? '',
      fromEmail:                inv.from_email ?? '',
      fromPhone:                inv.from_phone ?? '',
      fromWebsite:              inv.from_website ?? '',
      fromAddress:              inv.from_address ?? '',
      fromBankName:             inv.from_bank_name ?? '',
      fromBankAccountName:      inv.from_bank_account_name ?? '',
      fromBankAccountNumber:    inv.from_bank_account_number ?? '',
      fromBankSortCode:         inv.from_bank_sort_code ?? '',
      fromBankIban:             inv.from_bank_iban ?? '',
      logoUrl:                  inv.logo_url ?? '',
      paymentLinks:             (inv.payment_links ?? []).map((l, i) => ({ id: i + 1, ...l })),
      toName:                   inv.to_name ?? '',
      toCompany:                inv.to_company ?? '',
      toEmail:                  inv.to_email ?? '',
      toPhone:                  inv.to_phone ?? '',
      toAddress:                inv.to_address ?? '',
      items:                    (inv.items ?? []).map((item, i) => ({ id: i + 1, ...item })),
      taxes:                    (inv.taxes ?? []).map((t, i) => ({ id: i + 1, type: 'percent' as 'percent' | 'flat', ...t })),
      discountType:             inv.discount_type,
      discount:                 inv.discount,
      theme:                    inv.theme,
      accentColor:              inv.accent_color,
      fontFamily:               inv.font_family ?? "var(--font-sans)",
      signatureUrl:             inv.signature_url ?? '',
      stampUrl:                 inv.stamp_url ?? '',
      stamp:                    inv.stamp ?? '',
      stampCustomText:          inv.stamp_custom_text ?? '',
      showWatermark:            inv.show_watermark,
      watermarkText:            inv.watermark_text ?? '',
      showTopBar:               inv.show_top_bar,
      showLogo:                 inv.show_logo,
      showFooterLine:           inv.show_footer_line,
      showNotes:                inv.show_notes,
      showBankDetails:          inv.show_bank_details,
      showFlowtaliTag:          inv.show_flowtali_tag,
      notes:                    inv.notes ?? '',
      footerText:               inv.footer_text ?? '',
    }
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
    <p class="text-gray-700">Invoice not found</p>
    <button @click="$router.push({ name: 'invoices' })" class="mt-4 text-green-700 text-sm hover:underline">
      Back to invoices
    </button>
  </div>

  <InvoiceEditor v-else mode="edit" :invoice-id="($route.params.id as string)" :initial-data="initialData" />
</template>
