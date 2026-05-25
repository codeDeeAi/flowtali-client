<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ReceiptService } from '@/services/receipt.service'
import ReceiptEditor from './ReceiptEditor.vue'

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
    const res = await ReceiptService.get(orgId.value, id)
    const rec = res.data.data
    initialData.value = {
      number:                   rec.number,
      issueDate:                rec.issue_date ?? '',
      paymentMethod:            rec.payment_method ?? '',
      paidAt:                   rec.paid_at ?? '',
      referenceNumber:          rec.reference_number ?? '',
      currency:                 rec.currency,
      fromName:                 rec.from_name ?? '',
      fromTagline:              rec.from_tagline ?? '',
      fromEmail:                rec.from_email ?? '',
      fromPhone:                rec.from_phone ?? '',
      fromWebsite:              rec.from_website ?? '',
      fromAddress:              rec.from_address ?? '',
      fromBankName:             rec.from_bank_name ?? '',
      fromBankAccountName:      rec.from_bank_account_name ?? '',
      fromBankAccountNumber:    rec.from_bank_account_number ?? '',
      fromBankSortCode:         rec.from_bank_sort_code ?? '',
      fromBankIban:             rec.from_bank_iban ?? '',
      logoUrl:                  rec.logo_url ?? '',
      paymentLinks:             (rec.payment_links ?? []).map((l, i) => ({ id: i + 1, ...l })),
      toName:                   rec.to_name ?? '',
      toCompany:                rec.to_company ?? '',
      toEmail:                  rec.to_email ?? '',
      toPhone:                  rec.to_phone ?? '',
      toAddress:                rec.to_address ?? '',
      items:                    (rec.items ?? []).map((item, i) => ({ id: i + 1, ...item })),
      taxes:                    (rec.taxes ?? []).map((t, i) => ({ id: i + 1, type: 'percent' as 'percent' | 'flat', ...t })),
      discountType:             rec.discount_type,
      discount:                 rec.discount,
      theme:                    rec.theme,
      accentColor:              rec.accent_color,
      fontFamily:               rec.font_family ?? "'DM Sans', sans-serif",
      signatureUrl:             rec.signature_url ?? '',
      stampUrl:                 rec.stamp_url ?? '',
      stamp:                    rec.stamp ?? '',
      balanceDue:               (rec.stamp === 'UNPAID' || rec.stamp === 'PARTIALLY PAID') && rec.stamp_custom_text && isFinite(Number(rec.stamp_custom_text))
                                  ? Number(rec.stamp_custom_text)
                                  : 0,
      showWatermark:            rec.show_watermark,
      watermarkText:            rec.watermark_text ?? '',
      showTopBar:               rec.show_top_bar,
      showLogo:                 rec.show_logo,
      showFooterLine:           rec.show_footer_line,
      showNotes:                rec.show_notes,
      showBankDetails:          rec.show_bank_details,
      showFlowtaliTag:          rec.show_flowtali_tag,
      notes:                    rec.notes ?? '',
      footerText:               rec.footer_text ?? '',
    }
  } catch {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen bg-charcoal-900">
    <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
  </div>

  <div v-else-if="notFound" class="flex flex-col items-center justify-center h-screen bg-charcoal-900">
    <p class="text-cream-faint">Receipt not found</p>
    <button @click="$router.push({ name: 'receipts' })" class="mt-4 text-amber text-sm hover:underline">
      Back to receipts
    </button>
  </div>

  <ReceiptEditor v-else mode="edit" :receipt-id="($route.params.id as string)" :initial-data="initialData" />
</template>
