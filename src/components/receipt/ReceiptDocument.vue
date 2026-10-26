<script setup lang="ts">
/**
 * Single source of truth for how a receipt looks — the receipt counterpart of
 * InvoiceDocument. The editor preview, the owner view page, the public shared
 * link and print/PDF all render through it, so they can't drift apart.
 *
 * Binds to the editor's camelCase `form` shape (see receiptToForm for saved
 * receipts), which keeps the theme templates identical to the editor's.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReceiptDocModel } from './receiptDocument'

/** A4 width in CSS pixels at 96dpi — the page is always laid out at this width. */
const PAGE_WIDTH = 794

const props = withDefaults(defineProps<{
  form: ReceiptDocModel
  /** Colour of the org's saved stamp, when the stamp isn't a built-in one. */
  stampColor?: string | null
  /** Fixed zoom factor (editor). Ignored when `fit` is set. */
  zoom?: number
  /** Scale the A4 page down to whatever width the container gives us. */
  fit?: boolean
}>(), { stampColor: null, zoom: 1, fit: false })

const { t, locale } = useI18n()

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ',
}
const sym = computed(() => CURRENCY_SYMBOLS[props.form.currency] ?? '$')

const fmtMoney = (n: number | null | undefined) =>
  sym.value + Number(n ?? 0).toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Totals ───────────────────────────────────────────────────────────────────
const subtotal = computed(() => props.form.items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0))
const discountAmt = computed(() =>
  props.form.discountType === 'percent'
    ? subtotal.value * Number(props.form.discount) / 100
    : Number(props.form.discount),
)
const taxesTotal = computed(() =>
  props.form.taxes.reduce((s, tax) => {
    if (tax.type === 'flat') return s + Number(tax.rate)
    return s + (subtotal.value - discountAmt.value) * Number(tax.rate) / 100
  }, 0),
)
const total = computed(() => subtotal.value - discountAmt.value + taxesTotal.value)
/** What this receipt acknowledges — less than the total for a partial payment. */
const received = computed(() => props.form.amountPaid ?? total.value)

const OWES = ['UNPAID', 'PARTIALLY PAID']
const balanceDueAmt = computed(() =>
  OWES.includes(props.form.stamp) && props.form.balanceDue > 0 ? props.form.balanceDue : 0,
)

const BUILT_IN_STAMPS: Record<string, string> = {
  'PAID': '#22c55e', 'PARTIALLY PAID': '#f97316', 'UNPAID': '#ef4444',
}
const stampColorFor = (label: string) => BUILT_IN_STAMPS[label] ?? props.stampColor ?? '#9ca3af'

// ─── Page scaling (same approach as InvoiceDocument) ─────────────────────────
const frame = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const fitScale = ref(1)
const pageHeight = ref(0)
let ro: ResizeObserver | null = null

const measure = () => {
  if (props.fit && frame.value) {
    fitScale.value = Math.min(1, frame.value.clientWidth / PAGE_WIDTH)
  }
  if (page.value) pageHeight.value = page.value.offsetHeight
}

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (frame.value) ro.observe(frame.value)
  if (page.value) ro.observe(page.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

const scale = computed(() => (props.fit ? fitScale.value : props.zoom))

/** Reserve the scaled height so the page doesn't overlap what follows it. */
const frameStyle = computed(() =>
  pageHeight.value ? { height: `${pageHeight.value * scale.value}px` } : {},
)

const scalerStyle = computed(() => ({
  width: `${PAGE_WIDTH}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))
</script>

<template>
  <div ref="frame" class="receipt-doc-frame" :style="frameStyle">
    <div ref="page" class="print-zoom-wrapper" :style="scalerStyle">
      <!-- ══ THEME: CLASSIC ══ -->
      <div v-if="form.theme === 'classic'" class="print-document bg-white shadow-2xl relative overflow-hidden" :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }">
        <div v-if="form.showTopBar" class="h-1.5 w-full" :style="{ backgroundColor: form.accentColor }"></div>
        <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
        </div>
        <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
        </div>
        <div class="p-10" style="position: relative; z-index: 3">
          <!-- Header -->
          <div class="flex justify-between items-start mb-8">
            <div class="flex items-start gap-4">
              <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-14 w-auto object-contain" />
              <div>
                <div class="text-xl font-bold mb-0.5" :style="{ color: form.accentColor }">{{ form.fromName || 'Your Company' }}</div>
                <div v-if="form.fromTagline" class="text-xs text-gray-400 mb-1">{{ form.fromTagline }}</div>
                <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
                <div v-if="form.fromEmail" class="text-xs text-gray-400 mt-1">{{ form.fromEmail }}</div>
                <div v-if="form.fromPhone" class="text-xs text-gray-400">{{ form.fromPhone }}</div>
                <div v-if="form.fromWebsite" class="text-xs text-gray-400">{{ form.fromWebsite }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-bold text-gray-200 tracking-widest" style="font-family: var(--font-sans); letter-spacing: 0.15em">RECEIPT</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ form.number }}</div>
            </div>
          </div>

          <div class="h-px mb-6" :style="{ backgroundColor: form.accentColor + '30' }"></div>

          <!-- Payment info row -->
          <div class="flex gap-8 mb-8 text-xs flex-wrap">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.issueDate') }}</div>
              <div class="font-semibold text-gray-700">{{ formatDate(form.issueDate) }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.paymentDate') }}</div>
              <div class="font-semibold text-gray-700">{{ formatDate(form.paidAt) }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.paymentMethod') }}</div>
              <div class="font-semibold text-gray-700">{{ form.paymentMethod || '—' }}</div>
            </div>
            <div v-if="form.referenceNumber">
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('receiptEditor.preview.reference') }}</div>
              <div class="font-semibold font-mono text-gray-700">{{ form.referenceNumber }}</div>
            </div>
            <div v-if="form.currency !== 'USD'">
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.currency') }}</div>
              <div class="font-semibold text-gray-700">{{ form.currency }}</div>
            </div>
          </div>

          <!-- Received From -->
          <div class="mb-8">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('receiptEditor.preview.receivedFrom') }}</div>
            <div class="font-semibold text-gray-800 text-sm">{{ form.toName || '—' }}</div>
            <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
            <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
            <div v-if="form.toPhone" class="text-xs text-gray-500">{{ form.toPhone }}</div>
            <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr :style="{ backgroundColor: form.accentColor + '18' }">
                <th class="text-left py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
                <td class="py-3 px-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end mb-8">
            <div style="width: 260px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="form.discount > 0" class="flex justify-between text-gray-500">
                <span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span>
                <span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span>
              </div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500">
                  <span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span>
                  <span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span>
                </div>
              </template>
              <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base">
                <span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span>
                <span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(received) }}</span>
              </div>
              <template v-if="balanceDueAmt > 0">
                <div style="height: 1px; background: #fecaca; margin: 6px 0"></div>
                <div class="flex justify-between font-bold text-base">
                  <span style="color: #dc2626">{{ t('receiptEditor.items.balanceDue') }}</span>
                  <span class="font-mono" style="color: #dc2626">{{ fmtMoney(balanceDueAmt) }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Bank details received to -->
          <div v-if="form.showBankDetails && (form.fromBankName || form.fromBankAccountNumber)" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-3" style="font-size:10px">{{ t('receiptEditor.preview.paymentReceivedTo') }}</div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1" style="font-size: 12px">
              <div v-if="form.fromBankName" class="flex gap-2"><span class="text-gray-400">{{ t('document.bankInline.bank') }}:</span><span class="text-gray-700">{{ form.fromBankName }}</span></div>
              <div v-if="form.fromBankAccountName" class="flex gap-2"><span class="text-gray-400">{{ t('document.bankInline.name') }}:</span><span class="text-gray-700">{{ form.fromBankAccountName }}</span></div>
              <div v-if="form.fromBankAccountNumber" class="flex gap-2"><span class="text-gray-400">{{ t('document.bankInline.account') }}:</span><span class="font-mono text-gray-700">{{ form.fromBankAccountNumber }}</span></div>
              <div v-if="form.fromBankSortCode" class="flex gap-2"><span class="text-gray-400">{{ t('document.bankInline.sortCode') }}:</span><span class="font-mono text-gray-700">{{ form.fromBankSortCode }}</span></div>
              <div v-if="form.fromBankIban" class="flex gap-2"><span class="text-gray-400">{{ t('document.bankInline.iban') }}:</span><span class="font-mono text-gray-700">{{ form.fromBankIban }}</span></div>
            </div>
          </div>

          <!-- Signature -->
          <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
            <img :src="form.signatureUrl" alt="Signature" class="h-12 w-auto object-contain" />
            <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size: 10px">{{ t('document.authorizedSignature') }}</div>
          </div>

          <!-- Notes -->
          <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ form.notes }}</p>
          </div>

          <!-- Footer -->
          <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px" class="flex justify-between items-center">
            <div class="text-gray-400" style="font-size: 11px">{{ form.footerText || form.fromWebsite }}</div>
            <div v-if="form.showFlowtaliTag" class="text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
          </div>
          <div v-else-if="form.showFlowtaliTag" class="text-center mt-6 text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
        </div>
      </div>

      <!-- ══ THEME: MODERN ══ -->
      <div v-else-if="form.theme === 'modern'" class="print-document bg-white shadow-2xl relative overflow-hidden flex" :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }">
        <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
        </div>
        <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
        </div>
        <!-- Left sidebar -->
        <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: form.accentColor, width: '200px', position: 'relative', zIndex: 3 }">
          <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
          <div v-else class="mb-6"></div>
          <div class="text-white font-bold text-lg leading-tight mb-1">{{ form.fromName }}</div>
          <div v-if="form.fromTagline" class="text-white/70 text-xs mb-4">{{ form.fromTagline }}</div>
          <div class="text-white/60 text-xs leading-relaxed whitespace-pre-line mb-2">{{ form.fromAddress }}</div>
          <div v-if="form.fromEmail" class="text-white/60 text-xs">{{ form.fromEmail }}</div>
          <div v-if="form.fromPhone" class="text-white/60 text-xs">{{ form.fromPhone }}</div>
          <div v-if="form.fromWebsite" class="text-white/60 text-xs">{{ form.fromWebsite }}</div>
          <div v-if="form.showBankDetails && form.fromBankName" class="mt-8 pt-6" style="border-top: 1px solid rgba(255,255,255,0.2)">
            <div class="text-white/50 uppercase tracking-widest mb-3" style="font-size:9px">{{ t('receiptEditor.preview.receivedTo') }}</div>
            <div class="space-y-1 text-xs text-white/70">
              <div v-if="form.fromBankName">{{ form.fromBankName }}</div>
              <div v-if="form.fromBankAccountName">{{ form.fromBankAccountName }}</div>
              <div v-if="form.fromBankAccountNumber" class="font-mono">{{ form.fromBankAccountNumber }}</div>
              <div v-if="form.fromBankSortCode" class="font-mono">{{ form.fromBankSortCode }}</div>
            </div>
          </div>
          <div class="flex-1"></div>
          <div v-if="form.showFlowtaliTag" class="text-white/30 text-center" style="font-size:9px">flowtali.com</div>
        </div>
        <!-- Right content -->
        <div class="flex-1 p-10" style="position: relative; z-index: 3">
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="text-3xl font-bold text-gray-200 tracking-widest" style="letter-spacing: 0.12em">RECEIPT</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ form.number }}</div>
            </div>
            <div class="text-right text-xs space-y-2">
              <div><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('document.issueDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(form.issueDate) }}</div></div>
              <div><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('document.paymentDate') }}</div><div class="font-semibold text-gray-700">{{ formatDate(form.paidAt) }}</div></div>
              <div><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('receiptEditor.preview.method') }}</div><div class="font-semibold text-gray-700">{{ form.paymentMethod }}</div></div>
              <div v-if="form.referenceNumber"><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('receiptEditor.preview.reference') }}</div><div class="font-semibold font-mono text-gray-700">{{ form.referenceNumber }}</div></div>
            </div>
          </div>
          <!-- Received From -->
          <div class="mb-8 p-4 rounded-lg" :style="{ backgroundColor: form.accentColor + '0d' }">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('receiptEditor.preview.receivedFrom') }}</div>
            <div class="font-semibold text-gray-800">{{ form.toName || '—' }}</div>
            <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
            <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
            <div v-if="form.toPhone" class="text-xs text-gray-500">{{ form.toPhone }}</div>
            <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
          </div>
          <!-- Items -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr :style="{ borderBottom: `2px solid ${form.accentColor}` }">
                <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
                <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
                <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
                <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
                <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
                <td class="py-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <!-- Totals -->
          <div class="flex justify-end mb-6">
            <div style="width: 260px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
              </template>
              <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(received) }}</span></div>
              <template v-if="balanceDueAmt > 0">
                <div style="height: 1px; background: #fecaca; margin: 6px 0"></div>
                <div class="flex justify-between font-bold text-base"><span style="color: #dc2626">{{ t('receiptEditor.items.balanceDue') }}</span><span class="font-mono" style="color: #dc2626">{{ fmtMoney(balanceDueAmt) }}</span></div>
              </template>
            </div>
          </div>
          <div v-if="form.signatureUrl" class="mb-4 flex flex-col items-end">
            <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">{{ t('document.authorizedSignature') }}</div>
          </div>
          <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 20px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ form.notes }}</p>
          </div>
          <div v-if="form.footerText" class="mt-4 text-gray-400 text-xs">{{ form.footerText }}</div>
        </div>
      </div>

      <!-- ══ THEME: MINIMAL ══ -->
      <div v-else-if="form.theme === 'minimal'" class="print-document bg-white shadow-2xl relative overflow-hidden" :style="{ fontFamily: form.fontFamily, color: '#374151', fontSize: '13px', minHeight: '1080px' }">
        <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
        </div>
        <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
        </div>
        <div class="p-12" style="position: relative; z-index: 3">
          <div class="flex justify-between items-start mb-10">
            <div>
              <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-8 w-auto object-contain mb-3" />
              <div class="font-semibold text-gray-900 uppercase tracking-widest text-sm">{{ form.fromName }}</div>
              <div v-if="form.fromTagline" class="text-gray-400 text-xs mt-0.5">{{ form.fromTagline }}</div>
              <div class="text-gray-400 text-xs mt-1 whitespace-pre-line">{{ form.fromAddress }}</div>
              <div v-if="form.fromEmail" class="text-gray-400 text-xs">{{ form.fromEmail }}</div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-light text-gray-200 tracking-widest uppercase">Receipt</div>
              <div class="font-mono text-xs text-gray-400 mt-2">{{ form.number }}</div>
            </div>
          </div>
          <div style="height: 1px; background: #111827; margin-bottom: 32px"></div>
          <!-- Payment info -->
          <div class="flex gap-10 mb-8 text-xs">
            <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('document.issueDate') }}</div><div class="text-gray-700 font-medium">{{ formatDate(form.issueDate) }}</div></div>
            <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('document.paymentDate') }}</div><div class="text-gray-700 font-medium">{{ formatDate(form.paidAt) }}</div></div>
            <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('receiptEditor.preview.method') }}</div><div class="text-gray-700 font-medium">{{ form.paymentMethod }}</div></div>
            <div v-if="form.referenceNumber"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('receiptEditor.preview.reference') }}</div><div class="text-gray-700 font-mono font-medium">{{ form.referenceNumber }}</div></div>
          </div>
          <!-- Received From -->
          <div class="mb-8">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('receiptEditor.preview.receivedFrom') }}</div>
            <div class="font-medium text-gray-800">{{ form.toName || '—' }}</div>
            <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
            <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
          </div>
          <!-- Items -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead><tr style="border-bottom: 1px solid #111827">
              <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-medium" style="font-size:9px">{{ t('document.table.description') }}</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-medium" style="font-size:9px">{{ t('document.table.qty') }}</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-medium" style="font-size:9px">{{ t('document.table.unit') }}</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-medium" style="font-size:9px">{{ t('document.table.rate') }}</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-medium" style="font-size:9px">{{ t('document.table.amount') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
                <td class="py-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <!-- Totals -->
          <div class="flex justify-end mb-8">
            <div style="width: 260px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
              </template>
              <div style="height: 1px; background: #111827; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base"><span>{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(received) }}</span></div>
              <template v-if="balanceDueAmt > 0">
                <div style="height: 1px; background: #fecaca; margin: 6px 0"></div>
                <div class="flex justify-between font-bold text-base"><span style="color: #dc2626">{{ t('receiptEditor.items.balanceDue') }}</span><span class="font-mono" style="color: #dc2626">{{ fmtMoney(balanceDueAmt) }}</span></div>
              </template>
            </div>
          </div>
          <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
            <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">{{ t('document.authorizedSignature') }}</div>
          </div>
          <div v-if="form.showNotes && form.notes" class="mb-6">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line text-xs">{{ form.notes }}</p>
          </div>
          <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px" class="flex justify-between items-center">
            <div class="text-gray-400 text-xs">{{ form.footerText || form.fromWebsite }}</div>
            <div v-if="form.showFlowtaliTag" class="text-gray-300 text-xs">flowtali.com</div>
          </div>
        </div>
      </div>

      <!-- ══ THEME: BOLD ══ -->
      <div v-else-if="form.theme === 'bold'" class="print-document bg-white shadow-2xl relative overflow-hidden" :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }">
        <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
        </div>
        <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
        </div>
        <!-- Bold header -->
        <div class="p-8 pb-6" :style="{ backgroundColor: form.accentColor, position: 'relative', zIndex: 3 }">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-12 w-auto object-contain brightness-0 invert" />
              <div>
                <div class="text-white font-bold text-xl">{{ form.fromName }}</div>
                <div v-if="form.fromTagline" class="text-white/70 text-xs">{{ form.fromTagline }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-white font-black text-3xl tracking-widest">RECEIPT</div>
              <div class="text-white/80 font-mono text-sm mt-1">{{ form.number }}</div>
            </div>
          </div>
        </div>
        <!-- Payment badges -->
        <div class="px-8 py-4 flex gap-6 text-xs" :style="{ backgroundColor: form.accentColor + '15', position: 'relative', zIndex: 3 }">
          <div><span class="text-gray-500 uppercase tracking-wide" style="font-size:9px">{{ t('document.paymentDate') }}</span><div class="font-semibold text-gray-800 mt-0.5">{{ formatDate(form.paidAt) }}</div></div>
          <div><span class="text-gray-500 uppercase tracking-wide" style="font-size:9px">{{ t('receiptEditor.preview.method') }}</span><div class="font-semibold text-gray-800 mt-0.5">{{ form.paymentMethod }}</div></div>
          <div v-if="form.referenceNumber"><span class="text-gray-500 uppercase tracking-wide" style="font-size:9px">{{ t('receiptEditor.preview.reference') }}</span><div class="font-semibold font-mono text-gray-800 mt-0.5">{{ form.referenceNumber }}</div></div>
          <div><span class="text-gray-500 uppercase tracking-wide" style="font-size:9px">{{ t('document.issueDate') }}</span><div class="font-semibold text-gray-800 mt-0.5">{{ formatDate(form.issueDate) }}</div></div>
        </div>
        <div class="p-8 pt-6" style="position: relative; z-index: 3">
          <div class="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('receiptEditor.preview.receivedFrom') }}</div>
              <div class="font-semibold text-gray-800">{{ form.toName || '—' }}</div>
              <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
              <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
              <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('receiptEditor.preview.issuedBy') }}</div>
              <div class="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
              <div v-if="form.fromEmail" class="text-xs text-gray-500">{{ form.fromEmail }}</div>
              <div v-if="form.fromWebsite" class="text-xs text-gray-500">{{ form.fromWebsite }}</div>
            </div>
          </div>
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead><tr :style="{ backgroundColor: form.accentColor + '18' }">
              <th class="text-left py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
              <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
              <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
              <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
              <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
                <td class="py-3 px-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <div style="width: 260px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
              </template>
              <div class="h-px" :style="{ background: form.accentColor + '40' }"></div>
              <div class="flex justify-between font-bold text-base p-3 rounded" :style="{ backgroundColor: form.accentColor + '15' }">
                <span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span>
                <span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(received) }}</span>
              </div>
              <template v-if="balanceDueAmt > 0">
                <div class="flex justify-between font-bold text-base p-3 rounded mt-1" style="background: #fef2f2">
                  <span style="color: #dc2626">{{ t('receiptEditor.items.balanceDue') }}</span>
                  <span class="font-mono" style="color: #dc2626">{{ fmtMoney(balanceDueAmt) }}</span>
                </div>
              </template>
            </div>
          </div>
          <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
            <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">{{ t('document.authorizedSignature') }}</div>
          </div>
          <div v-if="form.showNotes && form.notes" class="mb-4">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 text-xs leading-relaxed whitespace-pre-line">{{ form.notes }}</p>
          </div>
          <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px" class="flex justify-between items-center">
            <div class="text-gray-400 text-xs">{{ form.footerText || form.fromWebsite }}</div>
            <div v-if="form.showFlowtaliTag" class="text-gray-300 text-xs">flowtali.com</div>
          </div>
        </div>
      </div>

      <!-- ══ THEME: EXECUTIVE ══ -->
      <div v-else-if="form.theme === 'executive'" class="print-document bg-white shadow-2xl relative overflow-hidden" :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }">
        <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
        </div>
        <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
        </div>
        <div class="p-10" style="position: relative; z-index: 3">
          <!-- Header with border boxes -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="border-2 rounded-lg p-5" :style="{ borderColor: form.accentColor + '40' }">
              <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-10 w-auto object-contain mb-3" />
              <div class="font-bold text-gray-900 text-base">{{ form.fromName }}</div>
              <div v-if="form.fromTagline" class="text-gray-400 text-xs mt-0.5">{{ form.fromTagline }}</div>
              <div class="text-gray-400 text-xs mt-2 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
              <div v-if="form.fromEmail" class="text-xs text-gray-400 mt-1">{{ form.fromEmail }}</div>
              <div v-if="form.fromWebsite" class="text-xs text-gray-400">{{ form.fromWebsite }}</div>
            </div>
            <div class="border-2 rounded-lg p-5" :style="{ borderColor: form.accentColor + '40' }">
              <div class="flex justify-between items-start mb-3">
                <div class="text-2xl font-bold tracking-widest text-gray-200 uppercase">Receipt</div>
                <div class="font-mono text-sm text-gray-400">{{ form.number }}</div>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-gray-400">{{ t('document.issueDate') }}</span><span class="font-medium text-gray-700">{{ formatDate(form.issueDate) }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">{{ t('document.paymentDate') }}</span><span class="font-medium text-gray-700">{{ formatDate(form.paidAt) }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">{{ t('receiptEditor.preview.method') }}</span><span class="font-medium text-gray-700">{{ form.paymentMethod }}</span></div>
                <div v-if="form.referenceNumber" class="flex justify-between"><span class="text-gray-400">{{ t('receiptEditor.preview.reference') }}</span><span class="font-mono font-medium text-gray-700">{{ form.referenceNumber }}</span></div>
              </div>
            </div>
          </div>
          <!-- Received From -->
          <div class="mb-6 p-4 border rounded-lg" :style="{ borderColor: form.accentColor + '30', backgroundColor: form.accentColor + '05' }">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('receiptEditor.preview.receivedFrom') }}</div>
            <div class="font-semibold text-gray-800">{{ form.toName || '—' }}</div>
            <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
            <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
            <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
          </div>
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead><tr style="border-bottom: 2px solid #e5e7eb">
              <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
                <td class="py-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <div class="border-2 rounded-lg p-4" style="width: 280px" :style="{ borderColor: form.accentColor + '40' }">
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
                <template v-for="tax in form.taxes" :key="tax.id">
                  <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
                </template>
                <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
                <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(received) }}</span></div>
                <template v-if="balanceDueAmt > 0">
                  <div style="height: 1px; background: #fecaca; margin: 6px 0"></div>
                  <div class="flex justify-between font-bold text-base"><span style="color: #dc2626">{{ t('receiptEditor.items.balanceDue') }}</span><span class="font-mono" style="color: #dc2626">{{ fmtMoney(balanceDueAmt) }}</span></div>
                </template>
              </div>
            </div>
          </div>
          <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
            <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">{{ t('document.authorizedSignature') }}</div>
          </div>
          <div v-if="form.showNotes && form.notes" class="mb-4">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 text-xs leading-relaxed whitespace-pre-line">{{ form.notes }}</p>
          </div>
          <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px" class="flex justify-between items-center">
            <div class="text-gray-400 text-xs">{{ form.footerText || form.fromWebsite }}</div>
            <div v-if="form.showFlowtaliTag" class="text-gray-300 text-xs">flowtali.com</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.receipt-doc-frame {
  width: 100%;
  overflow: hidden;
}

@media print {
  .receipt-doc-frame {
    height: auto !important;
    overflow: visible;
  }
  .print-zoom-wrapper {
    width: 100% !important;
    transform: none !important;
  }
}
</style>
