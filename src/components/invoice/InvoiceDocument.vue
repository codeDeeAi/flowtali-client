<script setup lang="ts">
/**
 * Single source of truth for how an invoice document looks.
 *
 * Renders every theme (classic / modern / minimal / bold / executive) from the
 * API-shaped invoice payload, so the editor preview, the owner view page, the
 * public shared link and the print/PDF output can never drift apart again.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { IInvoice, IInvoiceBankAccount } from '@/services/invoice.service'

/** A4 width in CSS pixels at 96dpi — the page is always laid out at this width. */
const PAGE_WIDTH = 794

const props = withDefaults(defineProps<{
  doc: IInvoice
  /** Fixed zoom factor (editor). Ignored when `fit` is set. */
  zoom?: number
  /** Scale the A4 page down to whatever width the container gives us. */
  fit?: boolean
}>(), { zoom: 1, fit: false })

const { t, locale } = useI18n()

const THEMES = ['classic', 'modern', 'minimal', 'bold', 'executive'] as const
const theme = computed(() =>
  (THEMES as readonly string[]).includes(props.doc.theme) ? props.doc.theme : 'classic',
)

const stampColor = computed(() => props.doc.stamp_color || '#9ca3af')

const fontFamily = computed(() => props.doc.font_family || 'var(--font-sans)')

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ',
}

const sym = computed(() => CURRENCY_SYMBOLS[props.doc.currency] ?? '$')

const fmtMoney = (n: number | null | undefined) =>
  sym.value + Number(n ?? 0).toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null | undefined) => {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Bank accounts ────────────────────────────────────────────────────────────
const BANK_FIELDS = ['bank_name', 'account_name', 'account_number', 'sort_code', 'iban', 'swift'] as const

const hasBankContent = (b: IInvoiceBankAccount) =>
  BANK_FIELDS.some(f => (b[f] ?? '').toString().trim() !== '')

/**
 * The accounts to print. The API normalises this, but the editor preview and
 * any response predating multi-account support may only carry the flat
 * `from_bank_*` fields — those still render as a single account.
 */
const bankAccounts = computed<IInvoiceBankAccount[]>(() => {
  const list = (props.doc.bank_accounts ?? []).filter(hasBankContent)
  if (list.length) return list

  const legacy: IInvoiceBankAccount = {
    bank_name: props.doc.from_bank_name,
    account_name: props.doc.from_bank_account_name,
    account_number: props.doc.from_bank_account_number,
    sort_code: props.doc.from_bank_sort_code,
    iban: props.doc.from_bank_iban,
  }
  return hasBankContent(legacy) ? [legacy] : []
})

/** Rows for one account, blanks dropped. `compact` shortens the sort-code label. */
const bankRows = (b: IInvoiceBankAccount, compact = false) => {
  const rows: { label: string; value: string; mono: boolean }[] = [
    { label: t('document.bankInline.bank'), value: b.bank_name ?? '', mono: false },
    { label: t('document.bankInline.name'), value: b.account_name ?? '', mono: false },
    { label: t('document.bankInline.account'), value: b.account_number ?? '', mono: true },
    { label: t(compact ? 'document.bankInline.sort' : 'document.bankInline.sortCode'), value: b.sort_code ?? '', mono: true },
    { label: t('document.bankInline.iban'), value: b.iban ?? '', mono: true },
    { label: t('document.bankInline.swift'), value: b.swift ?? '', mono: true },
  ]
  return rows.filter(r => r.value.trim() !== '')
}

/**
 * A heading only earns its place when it tells the reader something: a named
 * or currency-tagged account, or one of several. A lone unlabelled account
 * renders exactly as it did before multi-account support.
 */
const bankHeading = (b: IInvoiceBankAccount, i: number) => {
  // Users often name an account after its currency — don't print "NGN · NGN".
  const parts = [b.label, b.currency]
    .map(v => (v ?? '').trim())
    .filter(v => v !== '')
  const named = [...new Set(parts.map(v => v.toUpperCase()))].length === 1
    ? parts[0]!
    : parts.join(' · ')
  if (named) return named
  return bankAccounts.value.length > 1 ? t('document.accountN', { n: i + 1 }) : ''
}

// ─── Page scaling ─────────────────────────────────────────────────────────────
// The page is always laid out at A4 width and then scaled, so the editor
// preview, the view page and the shared link render byte-identical markup.
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
  <div ref="frame" class="invoice-doc-frame" :style="frameStyle">
    <div ref="page" class="print-zoom-wrapper" :style="scalerStyle">
      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- THEME: CLASSIC                                                  -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <div
        v-if="theme === 'classic'"
        class="print-document bg-white shadow-2xl relative overflow-hidden"
        :style="{ fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
      >
        <!-- Top accent bar -->
        <div v-if="doc.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: doc.accent_color }"></div>

        <!-- Watermark -->
        <div
          v-if="doc.show_watermark && doc.watermark_text"
          class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style="transform: rotate(-35deg); z-index: 1"
        >
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ doc.watermark_text }}</span>
        </div>

        <!-- Stamp overlay -->
        <div
          v-if="doc.stamp"
          class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style="transform: rotate(-25deg); z-index: 2"
        >
          <div
            class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]"
            :style="{ color: stampColor, borderColor: stampColor }"
          >{{ doc.stamp }}</div>
        </div>

        <div class="p-10" style="position: relative; z-index: 3">
          <!-- Header -->
          <div class="flex justify-between items-start mb-8">
            <div class="flex items-start gap-4">
              <img v-if="doc.logo_url && doc.show_logo" :src="doc.logo_url" alt="Logo" class="h-14 w-auto object-contain" />
              <div>
                <div class="text-xl font-bold mb-0.5" :style="{ color: doc.accent_color }">{{ doc.from_name || 'Your Studio' }}</div>
                <div v-if="doc.from_tagline" class="text-xs text-gray-400 mb-1">{{ doc.from_tagline }}</div>
                <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ doc.from_address }}</div>
                <div v-if="doc.from_email" class="text-xs text-gray-400 mt-1">{{ doc.from_email }}</div>
                <div v-if="doc.from_phone" class="text-xs text-gray-400">{{ doc.from_phone }}</div>
                <div v-if="doc.from_website" class="text-xs text-gray-400">{{ doc.from_website }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-bold text-gray-200 tracking-widest" style="font-family: var(--font-sans); letter-spacing: 0.15em">{{ t('document.invoiceWord') }}</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ doc.number }}</div>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-px mb-6" :style="{ backgroundColor: doc.accent_color + '30' }"></div>

          <!-- Dates row -->
          <div class="flex gap-10 mb-8 text-xs">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.issueDate') }}</div>
              <div class="font-semibold text-gray-700">{{ formatDate(doc.issue_date) }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.dueDate') }}</div>
              <div class="font-semibold text-gray-700">{{ formatDate(doc.due_date) }}</div>
            </div>
            <div v-if="doc.currency !== 'USD'">
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.currency') }}</div>
              <div class="font-semibold text-gray-700">{{ doc.currency }}</div>
            </div>
            <div v-if="doc.po_number">
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('document.poNumber') }}</div>
              <div class="font-semibold text-gray-700">{{ doc.po_number }}</div>
            </div>
          </div>

          <!-- Bill To -->
          <div class="mb-8">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.billTo') }}</div>
            <div class="font-semibold text-gray-800 text-sm">{{ doc.to_name || '—' }}</div>
            <div v-if="doc.to_company" class="text-xs text-gray-500">{{ doc.to_company }}</div>
            <div v-if="doc.to_email" class="text-xs text-gray-500">{{ doc.to_email }}</div>
            <div v-if="doc.to_phone" class="text-xs text-gray-500">{{ doc.to_phone }}</div>
            <div v-if="doc.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ doc.to_address }}</div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr :style="{ backgroundColor: doc.accent_color + '18' }">
                <th class="text-left py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in doc.items" :key="i" style="border-bottom: 1px solid #f3f4f6">
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
            <div style="width: 240px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500">
                <span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.subtotal) }}</span>
              </div>
              <div v-if="doc.discount > 0" class="flex justify-between text-gray-500">
                <span>{{ t('document.discount') }}{{ doc.discount_type === 'percent' ? ` (${doc.discount}%)` : '' }}</span>
                <span class="font-mono text-red-500">-{{ fmtMoney(doc.totals.discount_amt) }}</span>
              </div>
              <template v-for="(tax, i) in doc.taxes" :key="i">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500">
                  <span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span>
                  <span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (doc.totals.subtotal - doc.totals.discount_amt) * tax.rate / 100) }}</span>
                </div>
              </template>
              <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base">
                <span class="text-gray-800">{{ t('document.total') }}</span>
                <span class="font-mono" :style="{ color: doc.accent_color }">{{ fmtMoney(doc.totals.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Signature -->
          <div v-if="doc.signature_url" class="mb-6 flex flex-col items-end">
            <img :src="doc.signature_url" alt="Signature" class="h-12 w-auto object-contain" />
            <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size: 10px">{{ t('document.authorizedSignature') }}</div>
          </div>

          <!-- Notes -->
          <div v-if="doc.show_notes && doc.notes" style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ doc.notes }}</p>
          </div>

          <!-- Bank details + Payment links -->
          <div v-if="doc.show_bank_details" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-3" style="font-size:10px">{{ t('document.paymentDetails') }}</div>
            <!-- One account keeps the original two-column pair layout; several sit side by side. -->
            <div
              v-if="bankAccounts.length === 1"
              class="grid grid-cols-2 gap-x-6 gap-y-1"
              style="font-size: 12px"
            >
              <div v-for="(row, r) in bankRows(bankAccounts[0]!)" :key="r" class="flex gap-2">
                <span class="text-gray-400">{{ row.label }}:</span>
                <span :class="row.mono ? 'font-mono text-gray-700' : 'text-gray-700'">{{ row.value }}</span>
              </div>
            </div>
            <div v-else class="grid gap-x-6 gap-y-3" :style="{ gridTemplateColumns: `repeat(${bankAccounts.length}, minmax(0, 1fr))`, fontSize: '12px' }">
              <div v-for="(bank, i) in bankAccounts" :key="i">
                <div class="text-gray-500 font-semibold mb-1" style="font-size: 10px">{{ bankHeading(bank, i) }}</div>
                <div v-for="(row, r) in bankRows(bank, true)" :key="r" class="flex gap-1.5" style="font-size: 11px">
                  <span class="text-gray-400 shrink-0">{{ row.label }}:</span>
                  <span :class="row.mono ? 'font-mono text-gray-700 break-all' : 'text-gray-700'">{{ row.value }}</span>
                </div>
              </div>
            </div>
            <div v-if="doc.payment_links.length" class="flex flex-wrap gap-3 mt-3">
              <div v-for="(link, i) in doc.payment_links" :key="i" class="flex items-center gap-1.5" style="font-size: 11px">
                <span class="text-gray-400 font-medium">{{ link.type }}:</span>
                <span class="text-blue-600 font-mono">{{ link.value || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="doc.show_footer_line" style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px" class="flex justify-between items-center">
            <div class="text-gray-400" style="font-size: 11px">{{ doc.footer_text || doc.from_website }}</div>
            <div v-if="doc.show_flowtali_tag" class="text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
          </div>
          <div v-else-if="doc.show_flowtali_tag" class="text-center mt-6 text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- THEME: MODERN                                                   -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <div
        v-else-if="theme === 'modern'"
        class="print-document bg-white shadow-2xl relative overflow-hidden flex"
        :style="{ fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
      >
        <!-- Watermark -->
        <div v-if="doc.show_watermark && doc.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ doc.watermark_text }}</span>
        </div>
        <!-- Stamp -->
        <div v-if="doc.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor, borderColor: stampColor }">{{ doc.stamp }}</div>
        </div>

        <!-- Left sidebar -->
        <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: doc.accent_color, width: '200px', position: 'relative', zIndex: 3 }">
          <img v-if="doc.logo_url && doc.show_logo" :src="doc.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
          <div v-else class="mb-6"></div>
          <div class="text-white font-bold text-lg leading-tight mb-1">{{ doc.from_name }}</div>
          <div v-if="doc.from_tagline" class="text-white/70 text-xs mb-4">{{ doc.from_tagline }}</div>
          <div class="text-white/60 text-xs leading-relaxed whitespace-pre-line mb-2">{{ doc.from_address }}</div>
          <div v-if="doc.from_email" class="text-white/60 text-xs">{{ doc.from_email }}</div>
          <div v-if="doc.from_phone" class="text-white/60 text-xs">{{ doc.from_phone }}</div>
          <div v-if="doc.from_website" class="text-white/60 text-xs">{{ doc.from_website }}</div>

          <!-- Bank details in sidebar -->
          <div v-if="doc.show_bank_details" class="mt-8 pt-6" style="border-top: 1px solid rgba(255,255,255,0.2)">
            <div class="text-white/50 uppercase tracking-widest mb-3" style="font-size:9px">{{ t('document.bankPayment') }}</div>
            <!-- The sidebar is only 200px wide, so accounts stack with a hairline between. -->
            <div class="space-y-2 text-xs text-white/70">
              <div
                v-for="(bank, i) in bankAccounts" :key="i"
                :class="i > 0 ? 'pt-2' : ''"
                :style="i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.15)' } : {}"
              >
                <div v-if="bankHeading(bank, i)" class="text-white/40 uppercase tracking-wider mb-0.5" style="font-size:9px">
                  {{ bankHeading(bank, i) }}
                </div>
                <div
                  v-for="(row, r) in bankRows(bank, true)" :key="r"
                  :class="row.mono ? 'font-mono break-all' : ''"
                  :style="row.mono ? { fontSize: '10px' } : {}"
                >{{ row.value }}</div>
              </div>
              <div v-for="(link, i) in doc.payment_links" :key="`l${i}`" class="text-white/60" style="font-size:10px">
                <span class="text-white/40">{{ link.type }}:</span> {{ link.value || '—' }}
              </div>
            </div>
          </div>

          <div class="flex-1"></div>
          <div v-if="doc.show_flowtali_tag" class="text-white/30 text-center" style="font-size:9px">flowtali.com</div>
        </div>

        <!-- Right content -->
        <div class="flex-1 p-10" style="position: relative; z-index: 3">
          <!-- Header row -->
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="text-3xl font-bold text-gray-200 tracking-widest" style="letter-spacing: 0.12em">{{ t('document.invoiceWord') }}</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ doc.number }}</div>
            </div>
            <div class="text-right text-xs">
              <div class="mb-2">
                <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('document.issueDate') }}</div>
                <div class="font-semibold text-gray-700">{{ formatDate(doc.issue_date) }}</div>
              </div>
              <div>
                <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('document.dueDate') }}</div>
                <div class="font-semibold text-gray-700">{{ formatDate(doc.due_date) }}</div>
              </div>
              <div v-if="doc.po_number" class="mt-2">
                <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">{{ t('document.poNumber') }}</div>
                <div class="font-semibold text-gray-700">{{ doc.po_number }}</div>
              </div>
            </div>
          </div>

          <!-- Bill To -->
          <div class="mb-8 p-4 rounded-lg" :style="{ backgroundColor: doc.accent_color + '0d' }">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.billTo') }}</div>
            <div class="font-semibold text-gray-800">{{ doc.to_name || '—' }}</div>
            <div v-if="doc.to_company" class="text-xs text-gray-500">{{ doc.to_company }}</div>
            <div v-if="doc.to_email" class="text-xs text-gray-500">{{ doc.to_email }}</div>
            <div v-if="doc.to_phone" class="text-xs text-gray-500">{{ doc.to_phone }}</div>
            <div v-if="doc.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ doc.to_address }}</div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr :style="{ borderBottom: `2px solid ${doc.accent_color}` }">
                <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.description') }}</th>
                <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.qty') }}</th>
                <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.unit') }}</th>
                <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.rate') }}</th>
                <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in doc.items" :key="i" style="border-bottom: 1px solid #f3f4f6">
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
            <div style="width: 240px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.subtotal) }}</span></div>
              <div v-if="doc.discount > 0" class="flex justify-between text-gray-500"><span>{{ t('document.discount') }}{{ doc.discount_type === 'percent' ? ` (${doc.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(doc.totals.discount_amt) }}</span></div>
              <template v-for="(tax, i) in doc.taxes" :key="i">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (doc.totals.subtotal - doc.totals.discount_amt) * tax.rate / 100) }}</span></div>
              </template>
              <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ t('document.total') }}</span><span class="font-mono" :style="{ color: doc.accent_color }">{{ fmtMoney(doc.totals.total) }}</span></div>
            </div>
          </div>

          <!-- Signature -->
          <div v-if="doc.signature_url" class="mb-4 flex flex-col items-end">
            <img :src="doc.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">{{ t('document.authorizedSignature') }}</div>
          </div>

          <!-- Notes -->
          <div v-if="doc.show_notes && doc.notes" style="border-top: 1px solid #f3f4f6; padding-top: 20px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ doc.notes }}</p>
          </div>

          <div v-if="doc.footer_text" class="mt-4 text-gray-400 text-xs">{{ doc.footer_text }}</div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- THEME: MINIMAL                                                  -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <div
        v-else-if="theme === 'minimal'"
        class="print-document bg-white shadow-2xl relative overflow-hidden"
        :style="{ fontFamily, color: '#374151', fontSize: '13px', minHeight: '1080px' }"
      >
        <!-- Watermark -->
        <div v-if="doc.show_watermark && doc.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ doc.watermark_text }}</span>
        </div>
        <!-- Stamp -->
        <div v-if="doc.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor, borderColor: stampColor }">{{ doc.stamp }}</div>
        </div>

        <div class="p-12" style="position: relative; z-index: 3">
          <!-- Header -->
          <div class="flex justify-between items-start mb-10">
            <div>
              <img v-if="doc.logo_url && doc.show_logo" :src="doc.logo_url" alt="Logo" class="h-8 w-auto object-contain mb-3" />
              <div class="font-semibold text-gray-900 uppercase tracking-widest text-sm">{{ doc.from_name }}</div>
              <div v-if="doc.from_tagline" class="text-gray-400 text-xs mt-0.5">{{ doc.from_tagline }}</div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-light text-gray-200 tracking-widest uppercase">{{ t('document.invoiceWord') }}</div>
              <div class="font-mono text-xs text-gray-400 mt-2">{{ doc.number }}</div>
            </div>
          </div>

          <div style="height: 1px; background: #e5e7eb; margin-bottom: 32px"></div>

          <!-- Info row -->
          <div class="flex gap-16 mb-8 text-xs">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.from') }}</div>
              <div class="text-gray-500 whitespace-pre-line leading-relaxed">{{ doc.from_address }}</div>
              <div v-if="doc.from_email" class="text-gray-500">{{ doc.from_email }}</div>
              <div v-if="doc.from_phone" class="text-gray-500">{{ doc.from_phone }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.billTo') }}</div>
              <div class="font-medium text-gray-700">{{ doc.to_name || '—' }}</div>
              <div v-if="doc.to_company" class="text-gray-500">{{ doc.to_company }}</div>
              <div v-if="doc.to_email" class="text-gray-500">{{ doc.to_email }}</div>
              <div v-if="doc.to_address" class="text-gray-500 whitespace-pre-line">{{ doc.to_address }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.dates') }}</div>
              <div class="text-gray-400" style="font-size: 10px">{{ t('document.issued') }}</div>
              <div class="font-medium text-gray-700 mb-2">{{ formatDate(doc.issue_date) }}</div>
              <div class="text-gray-400" style="font-size: 10px">{{ t('document.due') }}</div>
              <div class="font-medium text-gray-700">{{ formatDate(doc.due_date) }}</div>
              <div v-if="doc.po_number" class="mt-2">
                <div class="text-gray-400" style="font-size: 10px">{{ t('document.po') }}</div>
                <div class="font-medium text-gray-700">{{ doc.po_number }}</div>
              </div>
            </div>
          </div>

          <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px"></div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb">
                <th class="text-left pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">{{ t('document.table.description') }}</th>
                <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">{{ t('document.table.qty') }}</th>
                <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">{{ t('document.table.unit') }}</th>
                <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">{{ t('document.table.rate') }}</th>
                <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in doc.items" :key="i" style="border-bottom: 1px solid #f9fafb">
                <td class="py-3 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end mb-8">
            <div style="width: 220px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-400"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.subtotal) }}</span></div>
              <div v-if="doc.discount > 0" class="flex justify-between text-gray-400"><span>{{ t('document.discount') }}</span><span class="font-mono">-{{ fmtMoney(doc.totals.discount_amt) }}</span></div>
              <template v-for="(tax, i) in doc.taxes" :key="i">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-400"><span>{{ tax.label }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (doc.totals.subtotal - doc.totals.discount_amt) * tax.rate / 100) }}</span></div>
              </template>
              <div style="height: 1px; background: #111827; margin: 8px 0"></div>
              <div class="flex justify-between font-bold text-base text-gray-900"><span>{{ t('document.total') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.total) }}</span></div>
            </div>
          </div>

          <!-- Signature -->
          <div v-if="doc.signature_url" class="mb-6 flex flex-col items-end">
            <img :src="doc.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size: 10px">{{ t('document.authorizedSignature') }}</div>
          </div>

          <!-- Notes -->
          <div v-if="doc.show_notes && doc.notes" style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size: 9px">{{ t('document.notes') }}</div>
            <p class="text-gray-400 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ doc.notes }}</p>
          </div>

          <!-- Bank details + Payment links -->
          <div v-if="doc.show_bank_details" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size: 9px">{{ t('document.paymentDetails') }}</div>
            <div class="text-gray-500" style="font-size: 12px">
              <div class="grid gap-x-8 gap-y-2" :style="{ gridTemplateColumns: `repeat(${Math.min(bankAccounts.length, 2)}, minmax(0, 1fr))` }">
                <div v-for="(bank, i) in bankAccounts" :key="i" class="space-y-0.5">
                  <div v-if="bankHeading(bank, i)" class="text-gray-400 uppercase tracking-wider" style="font-size: 9px">
                    {{ bankHeading(bank, i) }}
                  </div>
                  <div v-for="(row, r) in bankRows(bank, true)" :key="r" :class="row.mono ? 'font-mono break-all' : ''">
                    {{ row.label }}: {{ row.value }}
                  </div>
                </div>
              </div>
              <div v-for="(link, i) in doc.payment_links" :key="`l${i}`" class="mt-1">
                <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono text-xs">{{ link.value || '—' }}</span>
              </div>
            </div>
          </div>

          <div v-if="doc.show_footer_line" style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px" class="flex justify-between">
            <div class="text-gray-400" style="font-size: 11px">{{ doc.footer_text || doc.from_website }}</div>
            <div v-if="doc.show_flowtali_tag" class="text-gray-300" style="font-size: 10px">{{ t('document.generatedShort') }}</div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- THEME: BOLD                                                     -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <div
        v-else-if="theme === 'bold'"
        class="print-document bg-white shadow-2xl relative overflow-hidden"
        :style="{ fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
      >
        <!-- Watermark -->
        <div v-if="doc.show_watermark && doc.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ doc.watermark_text }}</span>
        </div>
        <!-- Stamp -->
        <div v-if="doc.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor, borderColor: stampColor }">{{ doc.stamp }}</div>
        </div>

        <!-- Full-width header -->
        <div :style="{ backgroundColor: doc.accent_color }" class="px-10 py-8 flex justify-between items-center" style="position: relative; z-index: 3">
          <div class="flex items-center gap-4">
            <img v-if="doc.logo_url && doc.show_logo" :src="doc.logo_url" alt="Logo" class="h-14 w-auto object-contain brightness-0 invert" />
            <div>
              <div class="text-white font-bold text-xl">{{ doc.from_name }}</div>
              <div v-if="doc.from_tagline" class="text-white/70 text-sm">{{ doc.from_tagline }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-white font-black text-5xl tracking-widest" style="letter-spacing: 0.15em">{{ t('document.invoiceWord') }}</div>
            <div class="font-mono text-white/70 text-sm mt-1">{{ doc.number }}</div>
          </div>
        </div>

        <!-- Company info row -->
        <div class="grid grid-cols-3 gap-6 px-10 py-5 bg-gray-50 border-b border-gray-200" style="position: relative; z-index: 3">
          <div class="text-xs">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.contact') }}</div>
            <div v-if="doc.from_email" class="text-gray-600">{{ doc.from_email }}</div>
            <div v-if="doc.from_phone" class="text-gray-600">{{ doc.from_phone }}</div>
            <div v-if="doc.from_website" class="text-gray-600">{{ doc.from_website }}</div>
          </div>
          <div class="text-xs">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.address') }}</div>
            <div class="text-gray-600 whitespace-pre-line">{{ doc.from_address }}</div>
          </div>
          <div class="text-xs text-right">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.issueDate') }}</div>
            <div class="text-gray-700 font-medium">{{ formatDate(doc.issue_date) }}</div>
            <div class="text-gray-400 uppercase tracking-widest mt-2 mb-1" style="font-size: 9px">{{ t('document.dueDate') }}</div>
            <div class="text-gray-700 font-medium">{{ formatDate(doc.due_date) }}</div>
            <div v-if="doc.po_number" class="mt-2">
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">{{ t('document.poNumber') }}</div>
              <div class="text-gray-700 font-medium">{{ doc.po_number }}</div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="px-10 py-8" style="position: relative; z-index: 3">
          <!-- Bill To -->
          <div class="mb-8">
            <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">{{ t('document.billTo') }}</div>
            <div class="font-semibold text-gray-800 text-sm">{{ doc.to_name || '—' }}</div>
            <div v-if="doc.to_company" class="text-xs text-gray-500">{{ doc.to_company }}</div>
            <div v-if="doc.to_email" class="text-xs text-gray-500">{{ doc.to_email }}</div>
            <div v-if="doc.to_phone" class="text-xs text-gray-500">{{ doc.to_phone }}</div>
            <div v-if="doc.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ doc.to_address }}</div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse;">
            <thead>
              <tr :style="{ backgroundColor: doc.accent_color }">
                <th class="text-left py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.description') }}</th>
                <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.qty') }}</th>
                <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.unit') }}</th>
                <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.rate') }}</th>
                <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in doc.items" :key="idx" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }">
                <td class="py-3 px-4 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 px-4 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-4 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-4 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-4 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end mb-8">
            <div style="width: 260px">
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.subtotal) }}</span></div>
                <div v-if="doc.discount > 0" class="flex justify-between text-gray-500"><span>{{ t('document.discount') }}{{ doc.discount_type === 'percent' ? ` (${doc.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(doc.totals.discount_amt) }}</span></div>
                <template v-for="(tax, i) in doc.taxes" :key="i">
                  <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (doc.totals.subtotal - doc.totals.discount_amt) * tax.rate / 100) }}</span></div>
                </template>
              </div>
              <div :style="{ backgroundColor: doc.accent_color }" class="flex justify-between font-bold text-base text-white px-4 py-3 rounded mt-3">
                <span>{{ t('document.totalDue') }}</span>
                <span class="font-mono">{{ fmtMoney(doc.totals.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Signature -->
          <div v-if="doc.signature_url" class="mb-6 flex flex-col items-end">
            <img :src="doc.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
            <div class="text-gray-400 mt-1" style="font-size: 10px">{{ t('document.authorizedSignature') }}</div>
          </div>

          <!-- Notes -->
          <div v-if="doc.show_notes && doc.notes" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
            <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">{{ t('document.notes') }}</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ doc.notes }}</p>
          </div>

          <!-- Bank + Payment links -->
          <div v-if="doc.show_bank_details" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
            <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">{{ t('document.paymentDetails') }}</div>
            <!-- One account keeps the original two-column pair layout; several sit side by side. -->
            <div v-if="bankAccounts.length === 1" class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
              <div v-for="(row, r) in bankRows(bankAccounts[0]!)" :key="r" :class="row.mono ? 'font-mono' : ''">
                {{ row.label }}: {{ row.value }}
              </div>
            </div>
            <div v-else class="grid gap-x-6 gap-y-3 text-xs text-gray-600" :style="{ gridTemplateColumns: `repeat(${bankAccounts.length}, minmax(0, 1fr))` }">
              <div v-for="(bank, i) in bankAccounts" :key="i">
                <div :style="{ color: doc.accent_color }" class="uppercase tracking-wider font-bold mb-1" style="font-size: 9px">
                  {{ bankHeading(bank, i) }}
                </div>
                <div v-for="(row, r) in bankRows(bank, true)" :key="r" :class="row.mono ? 'font-mono break-all' : ''" style="font-size: 11px">
                  {{ row.label }}: {{ row.value }}
                </div>
              </div>
            </div>
            <div v-if="doc.payment_links.length" class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 mt-2">
              <div v-for="(link, i) in doc.payment_links" :key="i">
                <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono">{{ link.value || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="doc.show_footer_line" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px" class="flex justify-between">
            <div class="text-gray-400 text-xs">{{ doc.footer_text || doc.from_website }}</div>
            <div v-if="doc.show_flowtali_tag" class="text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- THEME: EXECUTIVE                                                -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <div
        v-else-if="theme === 'executive'"
        class="print-document bg-white shadow-2xl relative overflow-hidden"
        :style="{ fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
      >
        <!-- Watermark -->
        <div v-if="doc.show_watermark && doc.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ doc.watermark_text }}</span>
        </div>
        <!-- Stamp -->
        <div v-if="doc.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor, borderColor: stampColor }">{{ doc.stamp }}</div>
        </div>

        <div class="p-10" style="position: relative; z-index: 3">
          <!-- Two-col top section -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <!-- Company details box -->
            <div class="p-5 rounded border" :style="{ borderColor: doc.accent_color + '40' }">
              <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">{{ t('document.from') }}</div>
              <img v-if="doc.logo_url && doc.show_logo" :src="doc.logo_url" alt="Logo" class="h-10 w-auto object-contain mb-3" />
              <div class="font-bold text-gray-800 text-sm">{{ doc.from_name }}</div>
              <div v-if="doc.from_tagline" class="text-xs text-gray-400 mb-2">{{ doc.from_tagline }}</div>
              <div class="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{{ doc.from_address }}</div>
              <div v-if="doc.from_email" class="text-xs text-gray-500 mt-1">{{ doc.from_email }}</div>
              <div v-if="doc.from_phone" class="text-xs text-gray-500">{{ doc.from_phone }}</div>
              <div v-if="doc.from_website" class="text-xs text-gray-500">{{ doc.from_website }}</div>
            </div>
            <!-- Invoice details box -->
            <div class="p-5 rounded border" :style="{ borderColor: doc.accent_color + '40' }">
              <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">{{ t('document.invoiceDetails') }}</div>
              <div class="text-3xl font-black tracking-widest text-gray-200 mb-3" style="letter-spacing: 0.1em">{{ t('document.invoiceWord') }}</div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-400">{{ t('document.number') }}</span>
                  <span class="font-mono font-semibold text-gray-700">{{ doc.number }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">{{ t('document.issueDate') }}</span>
                  <span class="font-semibold text-gray-700">{{ formatDate(doc.issue_date) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">{{ t('document.dueDate') }}</span>
                  <span class="font-semibold text-gray-700">{{ formatDate(doc.due_date) }}</span>
                </div>
                <div v-if="doc.currency !== 'USD'" class="flex justify-between">
                  <span class="text-gray-400">{{ t('document.currency') }}</span>
                  <span class="font-semibold text-gray-700">{{ doc.currency }}</span>
                </div>
                <div v-if="doc.po_number" class="flex justify-between">
                  <span class="text-gray-400">{{ t('document.poNumber') }}</span>
                  <span class="font-semibold text-gray-700">{{ doc.po_number }}</span>
                </div>
                <div style="border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px">
                  <div class="text-gray-400 mb-1" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em">{{ t('document.billTo') }}</div>
                  <div class="font-semibold text-gray-800">{{ doc.to_name || '—' }}</div>
                  <div v-if="doc.to_company" class="text-gray-500">{{ doc.to_company }}</div>
                  <div v-if="doc.to_email" class="text-gray-500">{{ doc.to_email }}</div>
                  <div v-if="doc.to_address" class="text-gray-500 whitespace-pre-line">{{ doc.to_address }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items table -->
          <table class="w-full mb-6" style="border-collapse: collapse; border: 1px solid #e5e7eb">
            <thead>
              <tr :style="{ backgroundColor: doc.accent_color + '14', borderBottom: `2px solid ${doc.accent_color}` }">
                <th class="text-left py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.description') }}</th>
                <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.qty') }}</th>
                <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.unit') }}</th>
                <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.rate') }}</th>
                <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">{{ t('document.table.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in doc.items" :key="idx" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }">
                <td class="py-3 px-4 text-gray-700">{{ item.description || '—' }}</td>
                <td class="py-3 px-4 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-4 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-4 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-4 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals + Notes row -->
          <div class="grid grid-cols-2 gap-6 mb-6">
            <!-- Notes / Bank -->
            <div>
              <div v-if="doc.show_notes && doc.notes">
                <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 9px">{{ t('document.notes') }}</div>
                <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ doc.notes }}</p>
              </div>
              <div v-if="doc.show_bank_details" :class="doc.show_notes && doc.notes ? 'mt-4' : ''">
                <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 9px">{{ t('document.paymentDetails') }}</div>
                <div class="text-xs text-gray-600 space-y-2">
                  <div v-for="(bank, i) in bankAccounts" :key="i" class="space-y-0.5">
                    <div v-if="bankHeading(bank, i)" class="text-gray-400 uppercase tracking-wider" style="font-size: 9px">
                      {{ bankHeading(bank, i) }}
                    </div>
                    <div v-for="(row, r) in bankRows(bank, true)" :key="r" :class="row.mono ? 'font-mono break-all' : ''">
                      {{ row.label }}: {{ row.value }}
                    </div>
                  </div>
                  <div v-for="(link, i) in doc.payment_links" :key="`l${i}`">
                    <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono">{{ link.value || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Totals -->
            <div>
              <div :style="{ color: doc.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">{{ t('document.summary') }}</div>
              <div class="space-y-1.5 text-sm border rounded p-4" :style="{ borderColor: doc.accent_color + '30' }">
                <div class="flex justify-between text-gray-500"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(doc.totals.subtotal) }}</span></div>
                <div v-if="doc.discount > 0" class="flex justify-between text-gray-500"><span>{{ t('document.discount') }}{{ doc.discount_type === 'percent' ? ` (${doc.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(doc.totals.discount_amt) }}</span></div>
                <template v-for="(tax, i) in doc.taxes" :key="i">
                  <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (doc.totals.subtotal - doc.totals.discount_amt) * tax.rate / 100) }}</span></div>
                </template>
                <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
                <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ t('document.total') }}</span><span class="font-mono" :style="{ color: doc.accent_color }">{{ fmtMoney(doc.totals.total) }}</span></div>
              </div>

              <!-- Signature -->
              <div v-if="doc.signature_url" class="mt-6 flex flex-col items-end">
                <img :src="doc.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
                <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
                <div class="text-gray-400 mt-1" style="font-size: 10px">{{ t('document.authorizedSignature') }}</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="doc.show_footer_line" style="border-top: 2px solid; margin-top: 24px; padding-top: 16px" :style="{ borderColor: doc.accent_color + '40' }" class="flex justify-between">
            <div class="text-gray-400 text-xs">{{ doc.footer_text || doc.from_website }}</div>
            <div v-if="doc.show_flowtali_tag" class="text-gray-300" style="font-size: 10px">{{ t('document.generatedWith') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invoice-doc-frame {
  width: 100%;
  overflow: hidden;
}

@media print {
  .invoice-doc-frame {
    height: auto !important;
    overflow: visible;
  }
  .print-zoom-wrapper {
    width: 100% !important;
    transform: none !important;
  }
}
</style>
