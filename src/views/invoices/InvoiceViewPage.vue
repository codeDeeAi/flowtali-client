<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, InvoiceSharedLinksService, type IInvoice, type IInvoiceSharedLink } from '@/services/invoice.service'
import { ReceiptService, type IReceipt } from '@/services/receipt.service'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'

const router     = useRouter()
const route      = useRoute()
const { t, locale } = useI18n()
const { notify } = useNotification()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')
const showShareModal = ref(false)

const invoice  = ref<IInvoice | null>(null)
const links    = ref<IInvoiceSharedLink[]>([])
const receipts = ref<IReceipt[]>([])
const loading  = ref(true)
const notFound = ref(false)
const showDeleteConfirm        = ref(false)
const isDeleting               = ref(false)
const isMarkingPaid            = ref(false)
const showGenerateReceiptModal = ref(false)
const isGeneratingReceipt      = ref(false)

const receiptForm = reactive({
  number:          '',
  paidAt:          new Date().toISOString().slice(0, 10),
  paymentMethod:   '',
  referenceNumber: '',
  stamp:           'PAID' as 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | '',
  balanceDue:      0,
})

const showsBalanceDue = computed(() => receiptForm.stamp === 'PARTIALLY PAID' || receiptForm.stamp === 'UNPAID')

onMounted(async () => {
  if (!orgId.value) return
  const id = route.params.id as string
  try {
    const [invRes, linksRes, receiptsRes] = await Promise.all([
      InvoiceService.get(orgId.value, id),
      InvoiceSharedLinksService.list(orgId.value, id),
      ReceiptService.listByInvoice(orgId.value, id),
    ])
    invoice.value  = invRes.data.data
    links.value    = linksRes.data.data
    receipts.value = receiptsRes.data.data.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

async function refreshLinks() {
  if (!invoice.value) return
  try {
    const res = await InvoiceSharedLinksService.list(orgId.value, invoice.value.id)
    links.value = res.data.data
  } catch {}
}

async function refreshReceipts() {
  if (!invoice.value) return
  try {
    const res = await ReceiptService.listByInvoice(orgId.value, invoice.value.id)
    receipts.value = res.data.data.data
  } catch {}
}

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const sym     = computed(() => invoice.value ? (symMap[invoice.value.currency] ?? '$') : '$')
const fmtMoney = (n: number) => sym.value + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusClass: Record<string, string> = {
  paid: 'status-paid', sent: 'status-due', overdue: 'status-overdue', draft: 'status-draft', void: 'status-draft',
}
const statusLabel = (status: string) => t(`invoices.status.${status}`)

const totalViews  = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks = computed(() => links.value.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length)

function isExpired(link: IInvoiceSharedLink) {
  return !!link.expires_at && new Date(link.expires_at) < new Date()
}
function linkStatusLabel(link: IInvoiceSharedLink) {
  if (!link.is_active) return { text: t('invoiceView.links.statusRevoked'), cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link)) return { text: t('invoiceView.links.statusExpired'), cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { text: t('invoiceView.links.statusActive'), cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function expiryLabel(link: IInvoiceSharedLink) {
  if (!link.expires_at) return t('invoiceView.links.neverExpires')
  if (isExpired(link)) return t('invoiceView.links.expiredOn', { date: fmtDate(link.expires_at) })
  return t('invoiceView.links.expiresOn', { date: fmtDate(link.expires_at) })
}
function linkUrl(token: string) { return `${window.location.origin}/share/i/${token}` }
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify(t('invoiceView.toasts.linkCopied'), 'success')
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return t('invoiceView.links.never')
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const stampColor: Record<string, string> = { 'PAID': '#22c55e', 'PARTIALLY PAID': '#f97316', 'UNPAID': '#ef4444' }

const receiptStampOpts = computed(() => [
  { value: 'PAID',           label: t('invoiceView.stamps.paid'),          color: '#22c55e' },
  { value: 'PARTIALLY PAID', label: t('invoiceView.stamps.partiallyPaid'), color: '#f97316' },
  { value: 'UNPAID',         label: t('invoiceView.stamps.unpaid'),        color: '#ef4444' },
  { value: '',               label: t('invoiceView.stamps.none'),          color: '#9ca3af' },
])

function openGenerateReceiptModal() {
  if (!invoice.value) return
  const inv = invoice.value
  receiptForm.number          = inv.number.replace(/^INV-?/i, 'REC-')
  receiptForm.paidAt          = new Date().toISOString().slice(0, 10)
  receiptForm.paymentMethod   = ''
  receiptForm.referenceNumber = ''
  receiptForm.stamp           = 'PAID'
  receiptForm.balanceDue      = 0
  showGenerateReceiptModal.value = true
}

async function submitGenerateReceipt() {
  if (!invoice.value) return
  const inv = invoice.value
  isGeneratingReceipt.value = true
  try {
    const payload: Record<string, any> = {
      invoice_id:       inv.id,
      number:           receiptForm.number,
      issue_date:       new Date().toISOString().slice(0, 10),
      paid_at:          receiptForm.paidAt || null,
      payment_method:   receiptForm.paymentMethod || null,
      reference_number: receiptForm.referenceNumber || null,
      currency:         inv.currency,
      from_name:                inv.from_name,
      from_tagline:             inv.from_tagline,
      from_email:               inv.from_email,
      from_phone:               inv.from_phone,
      from_website:             inv.from_website,
      from_address:             inv.from_address,
      from_bank_name:           inv.from_bank_name,
      from_bank_account_name:   inv.from_bank_account_name,
      from_bank_account_number: inv.from_bank_account_number,
      from_bank_sort_code:      inv.from_bank_sort_code,
      from_bank_iban:           inv.from_bank_iban,
      logo_url:                 inv.logo_url,
      payment_links:            (inv.payment_links ?? []).map(({ id: _id, ...l }) => l),
      to_name:                  inv.to_name,
      to_company:               inv.to_company,
      to_email:                 inv.to_email,
      to_phone:                 inv.to_phone,
      to_address:               inv.to_address,
      items:                    (inv.items ?? []).map(({ id: _id, ...item }) => item),
      taxes:                    (inv.taxes ?? []).map(({ id: _id, ...t }) => t),
      discount_type:            inv.discount_type,
      discount:                 inv.discount,
      theme:                    inv.theme,
      accent_color:             inv.accent_color,
      font_family:              inv.font_family,
      signature_url:            inv.signature_url,
      stamp:                    receiptForm.stamp || null,
      stamp_custom_text:        (receiptForm.stamp === 'PARTIALLY PAID' || receiptForm.stamp === 'UNPAID') && receiptForm.balanceDue > 0
                                  ? String(receiptForm.balanceDue)
                                  : null,
      show_top_bar:             inv.show_top_bar,
      show_logo:                inv.show_logo,
      show_footer_line:         inv.show_footer_line,
      show_notes:               false,
      show_bank_details:        inv.show_bank_details,
      show_flowtali_tag:        inv.show_flowtali_tag,
      notes:                    '',
      footer_text:              inv.footer_text,
      status:                   'draft',
    }

    const res = await ReceiptService.create(orgId.value, payload)
    const created = res.data.data
    showGenerateReceiptModal.value = false
    notify(t('invoiceView.toasts.receiptCreated', { number: created.number }), 'success')
    await refreshReceipts()
    router.push({ name: 'receipts.edit', params: { id: created.id } })
  } catch {
    notify(t('invoiceView.toasts.receiptFailed'), 'error')
  } finally {
    isGeneratingReceipt.value = false
  }
}

const handlePrint = () => window.print()

async function markPaid() {
  if (!invoice.value) return
  isMarkingPaid.value = true
  try {
    const res = await InvoiceService.update(orgId.value, invoice.value.id, { status: 'paid' })
    invoice.value = res.data.data
    notify(t('invoices.toasts.markedPaid', { number: invoice.value.number }), 'success')
  } catch {
    notify(t('invoices.toasts.updateFailed'), 'error')
  } finally {
    isMarkingPaid.value = false
  }
}

async function handleDelete() {
  if (!invoice.value) return
  isDeleting.value = true
  try {
    await InvoiceService.delete(orgId.value, invoice.value.id)
    notify(t('invoices.toasts.deleted', { number: invoice.value.number }), 'success')
    router.push({ name: 'invoices' })
  } catch {
    notify(t('invoices.toasts.deleteFailed'), 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-gray-700">{{ t('invoices.notFound') }}</p>
      <button @click="router.push({ name: 'invoices' })" class="mt-4 text-green-700 text-sm hover:underline">{{ t('invoices.back') }}</button>
    </div>

    <template v-else-if="invoice">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'invoices' })" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title font-mono">{{ invoice.number }}</h1>
              <span :class="['status-badge', statusClass[invoice.status] ?? 'status-draft']">{{ statusLabel(invoice.status) }}</span>
            </div>
            <p class="page-subtitle">{{ invoice.to_name || '—' }} · {{ t('invoiceView.dueOn', { date: formatDate(invoice.due_date) }) }}</p>
          </div>
        </div>
        <div class="flex items-center flex-wrap gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors" :title="t('invoiceView.actions.print')">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceView.actions.print') }}</span>
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors"
            :title="t('invoiceView.actions.share')"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceView.actions.share') }}</span>
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-green-700/20 text-green-700 text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            @click="openGenerateReceiptModal"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors"
            :title="t('invoiceView.actions.generateReceipt')"
          >
            <Icon icon="lucide:receipt" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceView.actions.generateReceipt') }}</span>
            <span v-if="receipts.length > 0" class="ml-0.5 px-1.5 py-0.5 bg-green-700/20 text-green-700 text-[9px] font-bold rounded-full">{{ receipts.length }}</span>
          </button>
          <button
            v-if="invoice.status !== 'paid'"
            @click="markPaid"
            :disabled="isMarkingPaid"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            :title="t('invoiceView.actions.markPaid')"
          >
            <Icon v-if="isMarkingPaid" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <Icon v-else icon="lucide:check-circle" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('invoiceView.actions.markPaid') }}</span>
          </button>
          <button @click="router.push({ name: 'invoices.edit', params: { id: invoice.id } })" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-green-700 hover:bg-green-800 text-bg-100 font-semibold rounded-lg transition-colors">
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> {{ t('invoiceView.actions.edit') }}
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-2 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors" :title="t('invoiceView.actions.delete')">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Two-column: invoice preview + right panel -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <!-- Invoice document preview (classic style) -->
        <div class="bg-gray-400/30 rounded-xl p-3 sm:p-6 overflow-x-auto">
          <div
            class="print-document min-w-[560px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden text-gray-800 relative"
            :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px' }"
          >
            <div class="h-1.5 w-full" :style="{ backgroundColor: invoice.accent_color }"></div>

            <!-- Watermark -->
            <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
            </div>
            <!-- Stamp -->
            <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-5xl font-extrabold tracking-widest border-4 px-6 py-3 rounded opacity-[0.15]"
                :style="{ color: invoice.stamp_color ?? '#9ca3af', borderColor: invoice.stamp_color ?? '#9ca3af' }"
              >{{ invoice.stamp }}</div>
            </div>

            <div class="p-10" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div class="flex items-start gap-4">
                  <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-12 w-auto object-contain" />
                  <div>
                    <div class="text-xl font-bold mb-0.5" :style="{ color: invoice.accent_color }">{{ invoice.from_name }}</div>
                    <div v-if="invoice.from_tagline" class="text-xs text-gray-400 mb-1">{{ invoice.from_tagline }}</div>
                    <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ invoice.from_address }}</div>
                    <div v-if="invoice.from_email" class="text-xs text-gray-400 mt-1">{{ invoice.from_email }}</div>
                    <div v-if="invoice.from_phone" class="text-xs text-gray-400">{{ invoice.from_phone }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-bold text-gray-200 tracking-widest" style="font-family:var(--font-sans)">{{ t('document.invoiceWord') }}</div>
                  <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
                </div>
              </div>

              <div class="h-px mb-6" :style="{ backgroundColor: invoice.accent_color + '30' }"></div>

              <div class="flex gap-8 mb-8 text-xs">
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.issueDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</div></div>
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.dueDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</div></div>
                <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.currency') }}</div><div class="font-semibold text-gray-700">{{ invoice.currency }}</div></div>
                <div v-if="invoice.po_number"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.poNumber') }}</div><div class="font-semibold text-gray-700">{{ invoice.po_number }}</div></div>
              </div>

              <div class="mb-8">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">{{ t('document.billTo') }}</div>
                <div class="font-semibold text-gray-800">{{ invoice.to_name || '—' }}</div>
                <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
                <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
                <div v-if="invoice.to_phone" class="text-xs text-gray-500">{{ invoice.to_phone }}</div>
                <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
              </div>

              <table class="w-full mb-6 text-sm" style="border-collapse:collapse">
                <thead>
                  <tr :style="{ backgroundColor: invoice.accent_color + '18' }">
                    <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.description') }}</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.qty') }}</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.unit') }}</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.rate') }}</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ t('document.table.amount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #f3f4f6">
                    <td class="py-3 px-3 text-gray-700">{{ item.description }}</td>
                    <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                    <td class="py-3 px-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                    <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                    <td class="py-3 px-3 text-right font-medium text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="flex justify-end mb-6">
                <div class="w-56 space-y-1.5 text-sm">
                  <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
                  <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500">
                    <span>{{ t('document.discount') }}</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span>
                  </div>
                  <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500">
                    <span>{{ t('document.tax') }}</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span>
                  </div>
                  <div class="h-px bg-gray-200 my-2"></div>
                  <div class="flex justify-between font-bold text-base">
                    <span>{{ t('document.total') }}</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="invoice.show_notes && invoice.notes" class="border-t border-gray-100 pt-6">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">{{ t('document.notes') }}</div>
                <p class="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{{ invoice.notes }}</p>
              </div>

              <div v-if="invoice.show_flowtali_tag" class="mt-8 text-center">
                <div class="text-[10px] text-gray-300">{{ t('document.generatedWith') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column: receipts + shared links -->
        <div class="space-y-4">

          <!-- Receipts panel -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-gray-900 uppercase tracking-wider">{{ t('invoiceView.receiptsPanel.title') }}</p>
              <button
                @click="openGenerateReceiptModal"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 hover:text-green-700/80 bg-green-700/10 hover:bg-green-700/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('invoiceView.receiptsPanel.generate') }}
              </button>
            </div>

            <!-- Receipt list -->
            <div v-if="receipts.length > 0" class="space-y-2">
              <button
                v-for="rec in receipts"
                :key="rec.id"
                @click="router.push({ name: 'receipts.view', params: { id: rec.id } })"
                class="w-full text-left bg-gray-100/50 hover:bg-gray-400/50 border border-gray-400 hover:border-gray-500 rounded-lg p-2.5 transition-colors group"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-semibold text-gray-1000 font-mono group-hover:text-green-700 transition-colors truncate">{{ rec.number }}</span>
                      <span
                        v-if="rec.stamp"
                        class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border"
                        :style="{ color: stampColor[rec.stamp] ?? '#9ca3af', borderColor: (stampColor[rec.stamp] ?? '#9ca3af') + '40', backgroundColor: (stampColor[rec.stamp] ?? '#9ca3af') + '15' }"
                      >{{ rec.stamp }}</span>
                    </div>
                    <p class="text-[10px] text-gray-700 mt-0.5">{{ fmtDate(rec.issue_date) }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-xs font-semibold text-gray-1000">{{ sym }}{{ rec.totals.total.toLocaleString(locale, { minimumFractionDigits: 2 }) }}</div>
                    <div class="text-[9px] text-gray-700">{{ t(`common.status.${rec.status}`) }}</div>
                  </div>
                </div>
              </button>
            </div>

            <!-- Empty state -->
            <div v-else class="py-4 text-center">
              <Icon icon="lucide:receipt" class="w-7 h-7 text-gray-700 mx-auto mb-2" />
              <p class="text-[11px] text-gray-700">{{ t('invoiceView.receiptsPanel.empty') }}</p>
              <button
                @click="openGenerateReceiptModal"
                class="mt-2 text-[11px] text-green-700 hover:underline"
              >{{ t('invoiceView.receiptsPanel.generateFrom') }}</button>
            </div>
          </div>

          <!-- Shared Links -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-gray-900 uppercase tracking-wider">{{ t('invoiceView.links.title') }}</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 hover:text-green-700/80 bg-green-700/10 hover:bg-green-700/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('invoiceView.links.newLink') }}
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ links.length }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.total') }}</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.active') }}</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ totalViews }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">{{ t('invoiceView.links.views') }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-700 pt-0.5">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" />{{ t('invoiceView.links.private', { count: links.filter(l => l.visibility === 'private').length }) }}</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" />{{ t('invoiceView.links.public', { count: links.filter(l => l.visibility === 'public').length }) }}</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="links.length > 0" class="space-y-2">
            <div
              v-for="link in links" :key="link.id"
              class="bg-gray-200 border border-gray-400 rounded-xl p-3.5 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-gray-1000 truncate">{{ link.label || t('invoiceView.links.defaultLabel') }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', linkStatusLabel(link).cls]">{{ linkStatusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-gray-700 border-gray-500 bg-gray-400 shrink-0">
                  {{ link.visibility === 'private' ? t('invoiceView.links.visibilityPrivate') : t('invoiceView.links.visibilityPublic') }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-gray-100/60 border border-gray-400 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-gray-700 truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.is_active || isExpired(link)"
                  class="p-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>

              <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-green-700 shrink-0" />
                <span class="text-[10px] font-mono text-green-700 tracking-widest">{{ link.access_code }}</span>
              </div>

              <div class="flex items-center gap-3 text-[10px] text-gray-700 border-t border-gray-400/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }}</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
              </div>

              <div v-if="link.view_log.length > 0" class="space-y-1 border-t border-gray-400/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-gray-700">{{ t('invoiceView.links.recentViews') }}</p>
                <div v-for="(entry, i) in link.view_log.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-gray-700">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Links empty state -->
          <div v-else class="bg-gray-200 border border-dashed border-gray-500 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-gray-700" />
            <p class="text-xs font-medium text-gray-900">{{ t('invoiceView.links.emptyTitle') }}</p>
            <p class="text-[11px] text-gray-700">{{ t('invoiceView.links.emptyBody') }}</p>
            <button @click="showShareModal = true" class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-700/10 hover:bg-green-700/15 border border-green-700/20 text-green-700 rounded-lg transition-colors">
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoiceView.links.createLink') }}
            </button>
          </div>

        </div>

      </div><!-- /two-column grid -->

    </template>

    <!-- Share modal -->
    <ShareLinkModal
      v-if="showShareModal && invoice"
      resource-type="invoice"
      :org-id="orgId"
      :resource-id="invoice.id"
      :resource-name="invoice.number"
      @close="showShareModal = false; refreshLinks()"
    />

    <!-- Generate Receipt Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showGenerateReceiptModal && invoice"
          class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click.self="showGenerateReceiptModal = false"
        >
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-green-700/10 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:receipt" class="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-1000">{{ t('invoiceView.generateModal.title') }}</h3>
                  <p class="text-[11px] text-gray-700">{{ t('invoiceView.generateModal.from', { number: invoice.number }) }}</p>
                </div>
              </div>
              <button @click="showGenerateReceiptModal = false" class="p-1 rounded hover:bg-gray-400 text-gray-700 transition-colors">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3">

              <!-- Receipt number -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.receiptNumber') }}</label>
                <input
                  v-model="receiptForm.number"
                  type="text"
                  class="w-full bg-gray-100/60 border border-gray-500 rounded-lg px-3 py-2 text-xs text-gray-1000 placeholder-gray-700 focus:outline-none focus:border-green-700/50 transition-colors"
                  placeholder="REC-001"
                />
              </div>

              <!-- Payment date -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.paymentDate') }}</label>
                <input
                  v-model="receiptForm.paidAt"
                  type="date"
                  class="w-full bg-gray-100/60 border border-gray-500 rounded-lg px-3 py-2 text-xs text-gray-1000 focus:outline-none focus:border-green-700/50 transition-colors"
                />
              </div>

              <!-- Payment method + Reference in two cols -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.paymentMethod') }}</label>
                  <input
                    v-model="receiptForm.paymentMethod"
                    type="text"
                    class="w-full bg-gray-100/60 border border-gray-500 rounded-lg px-3 py-2 text-xs text-gray-1000 placeholder-gray-700 focus:outline-none focus:border-green-700/50 transition-colors"
                    :placeholder="t('invoiceView.generateModal.paymentMethodPlaceholder')"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.reference') }}</label>
                  <input
                    v-model="receiptForm.referenceNumber"
                    type="text"
                    class="w-full bg-gray-100/60 border border-gray-500 rounded-lg px-3 py-2 text-xs text-gray-1000 placeholder-gray-700 focus:outline-none focus:border-green-700/50 transition-colors"
                    placeholder="TXN-12345"
                  />
                </div>
              </div>

              <!-- Stamp -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.statusStamp') }}</label>
                <div class="grid grid-cols-4 gap-1.5">
                  <button
                    v-for="opt in receiptStampOpts"
                    :key="opt.value"
                    @click="receiptForm.stamp = opt.value as any"
                    :class="[
                      'px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors text-center',
                      receiptForm.stamp === opt.value
                        ? 'border-green-700/50 bg-green-700/10 text-green-700'
                        : 'border-gray-500 bg-gray-100/50 text-gray-700 hover:border-gray-500 hover:text-gray-1000'
                    ]"
                  >
                    <span v-if="opt.value" class="block w-1.5 h-1.5 rounded-full mx-auto mb-1" :style="{ backgroundColor: opt.color }"></span>
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Balance due (shown for PARTIALLY PAID / UNPAID) -->
              <Transition name="slide-down">
                <div v-if="showsBalanceDue">
                  <label class="block text-[10px] uppercase tracking-wider text-gray-700 mb-1.5">{{ t('invoiceView.generateModal.balanceDue', { currency: invoice.currency }) }}</label>
                  <input
                    v-model.number="receiptForm.balanceDue"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full bg-gray-100/60 border border-gray-500 rounded-lg px-3 py-2 text-xs text-gray-1000 placeholder-gray-700 focus:outline-none focus:border-green-700/50 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </Transition>

            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-1">
              <button
                @click="showGenerateReceiptModal = false"
                :disabled="isGeneratingReceipt"
                class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50"
              >{{ t('invoices.deleteModal.cancel') }}</button>
              <button
                @click="submitGenerateReceipt"
                :disabled="isGeneratingReceipt || !receiptForm.number"
                class="px-4 py-2 text-xs font-semibold bg-green-700 hover:bg-green-800 text-bg-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Icon v-if="isGeneratingReceipt" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                <Icon v-else icon="lucide:receipt" class="w-3 h-3" />
                {{ t('invoiceView.generateModal.generate') }}
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm && invoice" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">{{ t('invoices.deleteModal.title', { number: invoice.number }) }}</h3>
                <p class="text-xs text-gray-700 mt-1 leading-relaxed">{{ t('invoices.deleteModal.body') }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50">{{ t('invoices.deleteModal.cancel') }}</button>
              <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                {{ t('invoices.deleteModal.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>

<style>
@media print {
  body * { visibility: hidden; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; box-shadow: none !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
