<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, InvoiceSharedLinksService, type IInvoice, type IInvoiceSharedLink } from '@/services/invoice.service'
import { ReceiptService, type IReceipt } from '@/services/receipt.service'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'

const router     = useRouter()
const route      = useRoute()
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
const fmtMoney = (n: number) => sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusClass: Record<string, string> = {
  paid: 'status-paid', sent: 'status-due', overdue: 'status-overdue', draft: 'status-draft', void: 'status-draft',
}
const statusLabelMap: Record<string, string> = {
  paid: 'Paid', sent: 'Due', overdue: 'Overdue', draft: 'Draft', void: 'Void',
}

const totalViews  = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks = computed(() => links.value.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length)

function isExpired(link: IInvoiceSharedLink) {
  return !!link.expires_at && new Date(link.expires_at) < new Date()
}
function linkStatusLabel(link: IInvoiceSharedLink) {
  if (!link.is_active) return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link)) return { text: 'Expired', cls: 'text-gray-400 bg-charcoal-700 border-charcoal-600' }
  return { text: 'Active', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function expiryLabel(link: IInvoiceSharedLink) {
  if (!link.expires_at) return 'Never expires'
  if (isExpired(link)) return `Expired ${fmtDate(link.expires_at)}`
  return `Expires ${fmtDate(link.expires_at)}`
}
function linkUrl(token: string) { return `${window.location.origin}/share/i/${token}` }
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify('Link copied to clipboard', 'success')
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const stampColor: Record<string, string> = { 'PAID': '#22c55e', 'PARTIALLY PAID': '#f97316', 'UNPAID': '#ef4444' }

const receiptStampOpts = [
  { value: 'PAID',           label: 'Paid',           color: '#22c55e' },
  { value: 'PARTIALLY PAID', label: 'Partially Paid', color: '#f97316' },
  { value: 'UNPAID',         label: 'Unpaid',         color: '#ef4444' },
  { value: '',               label: 'None',           color: '#9ca3af' },
]

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
    notify(`Receipt ${created.number} created`, 'success')
    await refreshReceipts()
    router.push({ name: 'receipts.edit', params: { id: created.id } })
  } catch {
    notify('Failed to create receipt', 'error')
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
    notify(`${invoice.value.number} marked as paid`, 'success')
  } catch {
    notify('Failed to update invoice', 'error')
  } finally {
    isMarkingPaid.value = false
  }
}

async function handleDelete() {
  if (!invoice.value) return
  isDeleting.value = true
  try {
    await InvoiceService.delete(orgId.value, invoice.value.id)
    notify(`${invoice.value.number} deleted`, 'success')
    router.push({ name: 'invoices' })
  } catch {
    notify('Failed to delete invoice', 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-cream-faint">Invoice not found</p>
      <button @click="router.push({ name: 'invoices' })" class="mt-4 text-amber text-sm hover:underline">Back to invoices</button>
    </div>

    <template v-else-if="invoice">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'invoices' })" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title font-mono">{{ invoice.number }}</h1>
              <span :class="['status-badge', statusClass[invoice.status] ?? 'status-draft']">{{ statusLabelMap[invoice.status] ?? invoice.status }}</span>
            </div>
            <p class="page-subtitle">{{ invoice.to_name || '—' }} · Due {{ formatDate(invoice.due_date) }}</p>
          </div>
        </div>
        <div class="flex items-center flex-wrap gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors" title="Print / PDF">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> Print / PDF</span>
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors"
            title="Share"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> Share</span>
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-amber/20 text-amber text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            @click="openGenerateReceiptModal"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors"
            title="Generate Receipt"
          >
            <Icon icon="lucide:receipt" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> Generate Receipt</span>
            <span v-if="receipts.length > 0" class="ml-0.5 px-1.5 py-0.5 bg-amber/20 text-amber text-[9px] font-bold rounded-full">{{ receipts.length }}</span>
          </button>
          <button
            v-if="invoice.status !== 'paid'"
            @click="markPaid"
            :disabled="isMarkingPaid"
            class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            title="Mark Paid"
          >
            <Icon v-if="isMarkingPaid" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <Icon v-else icon="lucide:check-circle" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Mark Paid</span>
          </button>
          <button @click="router.push({ name: 'invoices.edit', params: { id: invoice.id } })" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-amber hover:bg-amber-light text-charcoal-900 font-semibold rounded-lg transition-colors">
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-2 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors" title="Delete">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Two-column: invoice preview + right panel -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <!-- Invoice document preview (classic style) -->
        <div class="bg-charcoal-700/30 rounded-xl p-3 sm:p-6 overflow-x-auto">
          <div
            class="print-document min-w-[560px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden text-gray-800 relative"
            :style="{ fontFamily: invoice.font_family || '\'DM Sans\', sans-serif', fontSize: '13px' }"
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
                  <div class="text-3xl font-bold text-gray-200 tracking-widest" style="font-family:'Cormorant Garamond',Georgia,serif">INVOICE</div>
                  <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
                </div>
              </div>

              <div class="h-px mb-6" :style="{ backgroundColor: invoice.accent_color + '30' }"></div>

              <div class="flex gap-8 mb-8 text-xs">
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Issue Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</div></div>
                <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Due Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</div></div>
                <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Currency</div><div class="font-semibold text-gray-700">{{ invoice.currency }}</div></div>
                <div v-if="invoice.po_number"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">PO Number</div><div class="font-semibold text-gray-700">{{ invoice.po_number }}</div></div>
              </div>

              <div class="mb-8">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Bill To</div>
                <div class="font-semibold text-gray-800">{{ invoice.to_name || '—' }}</div>
                <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
                <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
                <div v-if="invoice.to_phone" class="text-xs text-gray-500">{{ invoice.to_phone }}</div>
                <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
              </div>

              <table class="w-full mb-6 text-sm" style="border-collapse:collapse">
                <thead>
                  <tr :style="{ backgroundColor: invoice.accent_color + '18' }">
                    <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                    <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rate</th>
                    <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
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
                  <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
                  <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500">
                    <span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span>
                  </div>
                  <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500">
                    <span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span>
                  </div>
                  <div class="h-px bg-gray-200 my-2"></div>
                  <div class="flex justify-between font-bold text-base">
                    <span>Total</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="invoice.show_notes && invoice.notes" class="border-t border-gray-100 pt-6">
                <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Notes</div>
                <p class="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{{ invoice.notes }}</p>
              </div>

              <div v-if="invoice.show_flowtali_tag" class="mt-8 text-center">
                <div class="text-[10px] text-gray-300">Generated with Flowtali · flowtali.com</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column: receipts + shared links -->
        <div class="space-y-4">

          <!-- Receipts panel -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-cream-muted uppercase tracking-wider">Receipts</p>
              <button
                @click="openGenerateReceiptModal"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber hover:text-amber/80 bg-amber/10 hover:bg-amber/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> Generate
              </button>
            </div>

            <!-- Receipt list -->
            <div v-if="receipts.length > 0" class="space-y-2">
              <button
                v-for="rec in receipts"
                :key="rec.id"
                @click="router.push({ name: 'receipts.view', params: { id: rec.id } })"
                class="w-full text-left bg-charcoal-900/50 hover:bg-charcoal-700/50 border border-charcoal-700 hover:border-charcoal-600 rounded-lg p-2.5 transition-colors group"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-semibold text-cream font-mono group-hover:text-amber transition-colors truncate">{{ rec.number }}</span>
                      <span
                        v-if="rec.stamp"
                        class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border"
                        :style="{ color: stampColor[rec.stamp] ?? '#9ca3af', borderColor: (stampColor[rec.stamp] ?? '#9ca3af') + '40', backgroundColor: (stampColor[rec.stamp] ?? '#9ca3af') + '15' }"
                      >{{ rec.stamp }}</span>
                    </div>
                    <p class="text-[10px] text-cream-faint mt-0.5">{{ fmtDate(rec.issue_date) }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-xs font-semibold text-cream">{{ sym }}{{ rec.totals.total.toLocaleString('en', { minimumFractionDigits: 2 }) }}</div>
                    <div class="text-[9px] text-cream-faint capitalize">{{ rec.status }}</div>
                  </div>
                </div>
              </button>
            </div>

            <!-- Empty state -->
            <div v-else class="py-4 text-center">
              <Icon icon="lucide:receipt" class="w-7 h-7 text-cream-faint mx-auto mb-2" />
              <p class="text-[11px] text-cream-faint">No receipts yet</p>
              <button
                @click="openGenerateReceiptModal"
                class="mt-2 text-[11px] text-amber hover:underline"
              >Generate from this invoice</button>
            </div>
          </div>

          <!-- Shared Links -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-cream-muted uppercase tracking-wider">Shared Links</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber hover:text-amber/80 bg-amber/10 hover:bg-amber/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> New Link
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ links.length }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Total</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ totalViews }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Views</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-cream-faint pt-0.5">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" />{{ links.filter(l => l.visibility === 'private').length }} private</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" />{{ links.filter(l => l.visibility === 'public').length }} public</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="links.length > 0" class="space-y-2">
            <div
              v-for="link in links" :key="link.id"
              class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-3.5 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-cream truncate">{{ link.label || 'Shared Link' }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', linkStatusLabel(link).cls]">{{ linkStatusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-cream-faint mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-cream-faint border-charcoal-600 bg-charcoal-700 shrink-0">
                  {{ link.visibility === 'private' ? 'Private' : 'Public' }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-charcoal-900/60 border border-charcoal-700 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-cream-faint truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.is_active || isExpired(link)"
                  class="p-1 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>

              <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-amber shrink-0" />
                <span class="text-[10px] font-mono text-amber tracking-widest">{{ link.access_code }}</span>
              </div>

              <div class="flex items-center gap-3 text-[10px] text-cream-faint border-t border-charcoal-700/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }}</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
              </div>

              <div v-if="link.view_log.length > 0" class="space-y-1 border-t border-charcoal-700/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-cream-faint">Recent Views</p>
                <div v-for="(entry, i) in link.view_log.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-cream-faint">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Links empty state -->
          <div v-else class="bg-charcoal-800 border border-dashed border-charcoal-600 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-cream-faint" />
            <p class="text-xs font-medium text-cream-muted">No shared links yet</p>
            <p class="text-[11px] text-cream-faint">Generate a link to share this invoice with clients</p>
            <button @click="showShareModal = true" class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber/10 hover:bg-amber/15 border border-amber/20 text-amber rounded-lg transition-colors">
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Link
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
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:receipt" class="w-4 h-4 text-amber" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-cream">Generate Receipt</h3>
                  <p class="text-[11px] text-cream-faint">From {{ invoice.number }}</p>
                </div>
              </div>
              <button @click="showGenerateReceiptModal = false" class="p-1 rounded hover:bg-charcoal-700 text-cream-faint transition-colors">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3">

              <!-- Receipt number -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Receipt Number</label>
                <input
                  v-model="receiptForm.number"
                  type="text"
                  class="w-full bg-charcoal-900/60 border border-charcoal-600 rounded-lg px-3 py-2 text-xs text-cream placeholder-cream-faint focus:outline-none focus:border-amber/50 transition-colors"
                  placeholder="REC-001"
                />
              </div>

              <!-- Payment date -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Payment Date</label>
                <input
                  v-model="receiptForm.paidAt"
                  type="date"
                  class="w-full bg-charcoal-900/60 border border-charcoal-600 rounded-lg px-3 py-2 text-xs text-cream focus:outline-none focus:border-amber/50 transition-colors"
                />
              </div>

              <!-- Payment method + Reference in two cols -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Payment Method</label>
                  <input
                    v-model="receiptForm.paymentMethod"
                    type="text"
                    class="w-full bg-charcoal-900/60 border border-charcoal-600 rounded-lg px-3 py-2 text-xs text-cream placeholder-cream-faint focus:outline-none focus:border-amber/50 transition-colors"
                    placeholder="Bank Transfer"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Reference</label>
                  <input
                    v-model="receiptForm.referenceNumber"
                    type="text"
                    class="w-full bg-charcoal-900/60 border border-charcoal-600 rounded-lg px-3 py-2 text-xs text-cream placeholder-cream-faint focus:outline-none focus:border-amber/50 transition-colors"
                    placeholder="TXN-12345"
                  />
                </div>
              </div>

              <!-- Stamp -->
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Status Stamp</label>
                <div class="grid grid-cols-4 gap-1.5">
                  <button
                    v-for="opt in receiptStampOpts"
                    :key="opt.value"
                    @click="receiptForm.stamp = opt.value as any"
                    :class="[
                      'px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors text-center',
                      receiptForm.stamp === opt.value
                        ? 'border-amber/50 bg-amber/10 text-amber'
                        : 'border-charcoal-600 bg-charcoal-900/50 text-cream-faint hover:border-charcoal-500 hover:text-cream'
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
                  <label class="block text-[10px] uppercase tracking-wider text-cream-faint mb-1.5">Balance Due ({{ invoice.currency }})</label>
                  <input
                    v-model.number="receiptForm.balanceDue"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full bg-charcoal-900/60 border border-charcoal-600 rounded-lg px-3 py-2 text-xs text-cream placeholder-cream-faint focus:outline-none focus:border-amber/50 transition-colors"
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
                class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                @click="submitGenerateReceipt"
                :disabled="isGeneratingReceipt || !receiptForm.number"
                class="px-4 py-2 text-xs font-semibold bg-amber hover:bg-amber-light text-charcoal-900 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Icon v-if="isGeneratingReceipt" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                <Icon v-else icon="lucide:receipt" class="w-3 h-3" />
                Generate Receipt
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
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-cream">Delete {{ invoice.number }}?</h3>
                <p class="text-xs text-cream-faint mt-1 leading-relaxed">This invoice will be permanently deleted. This action cannot be undone.</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" :disabled="isDeleting" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                Delete
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
