<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { InvoiceSharedLinksService, type IInvoice, type IInvoiceSharedLink } from '@/services/invoice.service'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'

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

const symMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R', CHF: 'Fr', AED: 'د.إ' }
const sym      = computed(() => invoice.value ? (symMap[invoice.value.currency] ?? '$') : '$')
const fmtMoney = (n: number) => sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string | null) => {
  if (!d) return '—'
  const [y = '0', m = '1', day = '1'] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function stampColorFor(inv: IInvoice | null) {
  return inv?.stamp_color ?? '#9ca3af'
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

      <!-- ── THEME: CLASSIC ── -->
      <div
        v-if="invoice.theme === 'classic'"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-800 relative"
        :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px', minHeight: '1080px' }"
      >
        <div v-if="invoice.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: invoice.accent_color }"></div>
        <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
        </div>
        <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(invoice), borderColor: stampColorFor(invoice) }">{{ invoice.stamp }}</div>
        </div>
        <div class="p-10" style="position:relative;z-index:3">
          <div class="flex justify-between items-start mb-8">
            <div class="flex items-start gap-4">
              <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-14 w-auto object-contain" />
              <div>
                <div class="text-xl font-bold mb-0.5" :style="{ color: invoice.accent_color }">{{ invoice.from_name }}</div>
                <div v-if="invoice.from_tagline" class="text-xs text-gray-400 mb-1">{{ invoice.from_tagline }}</div>
                <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ invoice.from_address }}</div>
                <div v-if="invoice.from_email" class="text-xs text-gray-400 mt-1">{{ invoice.from_email }}</div>
                <div v-if="invoice.from_phone" class="text-xs text-gray-400">{{ invoice.from_phone }}</div>
                <div v-if="invoice.from_website" class="text-xs text-gray-400">{{ invoice.from_website }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-bold text-gray-200 tracking-widest" style="font-family:var(--font-sans);letter-spacing:0.15em">INVOICE</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
            </div>
          </div>
          <div class="h-px mb-6" :style="{ backgroundColor: invoice.accent_color + '30' }"></div>
          <div class="flex gap-10 mb-8 text-xs">
            <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Issue Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</div></div>
            <div><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Due Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</div></div>
            <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Currency</div><div class="font-semibold text-gray-700">{{ invoice.currency }}</div></div>
            <div v-if="invoice.po_number"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">PO Number</div><div class="font-semibold text-gray-700">{{ invoice.po_number }}</div></div>
          </div>
          <div class="mb-8">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Bill To</div>
            <div class="font-semibold text-gray-800 text-sm">{{ invoice.to_name || '—' }}</div>
            <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
            <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
            <div v-if="invoice.to_phone" class="text-xs text-gray-500">{{ invoice.to_phone }}</div>
            <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
          </div>
          <table class="w-full mb-6" style="border-collapse:collapse">
            <thead>
              <tr :style="{ backgroundColor: invoice.accent_color + '18' }">
                <th class="text-left py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
                <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
                <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #f3f4f6">
                <td class="py-3 px-3 text-gray-700">{{ item.description }}</td>
                <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <div style="width:240px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
              <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500"><span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span></div>
              <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500"><span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span></div>
              <div style="height:1px;background:#e5e7eb;margin:8px 0"></div>
              <div class="flex justify-between font-bold text-base"><span class="text-gray-800">Total</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span></div>
            </div>
          </div>
          <div v-if="invoice.signature_url" class="mb-6 flex flex-col items-end">
            <img :src="invoice.signature_url" alt="Signature" class="h-12 w-auto object-contain" />
            <div style="width:120px;height:1px;background:#d1d5db;margin-top:4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">Authorized Signature</div>
          </div>
          <div v-if="invoice.show_notes && invoice.notes" style="border-top:1px solid #f3f4f6;padding-top:24px;margin-bottom:16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Notes</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ invoice.notes }}</p>
          </div>
          <div v-if="invoice.show_bank_details" style="border-top:1px solid #f3f4f6;padding-top:20px;margin-bottom:16px">
            <div class="text-gray-400 uppercase tracking-widest mb-3" style="font-size:10px">Bank / Payment Details</div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1" style="font-size:12px">
              <div v-if="invoice.from_bank_name" class="flex gap-2"><span class="text-gray-400">Bank:</span><span class="text-gray-700">{{ invoice.from_bank_name }}</span></div>
              <div v-if="invoice.from_bank_account_name" class="flex gap-2"><span class="text-gray-400">Name:</span><span class="text-gray-700">{{ invoice.from_bank_account_name }}</span></div>
              <div v-if="invoice.from_bank_account_number" class="flex gap-2"><span class="text-gray-400">Account:</span><span class="font-mono text-gray-700">{{ invoice.from_bank_account_number }}</span></div>
              <div v-if="invoice.from_bank_sort_code" class="flex gap-2"><span class="text-gray-400">Sort Code:</span><span class="font-mono text-gray-700">{{ invoice.from_bank_sort_code }}</span></div>
              <div v-if="invoice.from_bank_iban" class="flex gap-2"><span class="text-gray-400">IBAN:</span><span class="font-mono text-gray-700">{{ invoice.from_bank_iban }}</span></div>
            </div>
            <div v-if="invoice.payment_links.length" class="flex flex-wrap gap-3 mt-3">
              <div v-for="plink in invoice.payment_links" :key="plink.id" class="flex items-center gap-1.5" style="font-size:11px">
                <span class="text-gray-400 font-medium">{{ plink.type }}:</span>
                <span class="text-blue-600 font-mono">{{ plink.value || '—' }}</span>
              </div>
            </div>
          </div>
          <div v-if="invoice.show_footer_line" style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:24px" class="flex justify-between items-center">
            <div class="text-gray-400" style="font-size:11px">{{ invoice.footer_text || invoice.from_website }}</div>
            <div v-if="invoice.show_flowtali_tag" class="text-gray-300" style="font-size:10px">Generated with Flowtali · flowtali.com</div>
          </div>
          <div v-else-if="invoice.show_flowtali_tag" class="text-center mt-6 text-gray-300" style="font-size:10px">Generated with Flowtali · flowtali.com</div>
        </div>
      </div>

      <!-- ── THEME: MODERN ── -->
      <div
        v-else-if="invoice.theme === 'modern'"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-800 relative flex"
        :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px', minHeight: '1080px' }"
      >
        <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
        </div>
        <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(invoice), borderColor: stampColorFor(invoice) }">{{ invoice.stamp }}</div>
        </div>
        <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: invoice.accent_color, width: '200px', position: 'relative', zIndex: 3 }">
          <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
          <div v-else class="mb-6"></div>
          <div class="text-white font-bold text-lg leading-tight mb-1">{{ invoice.from_name }}</div>
          <div v-if="invoice.from_tagline" class="text-white/70 text-xs mb-4">{{ invoice.from_tagline }}</div>
          <div class="text-white/60 text-xs leading-relaxed whitespace-pre-line mb-2">{{ invoice.from_address }}</div>
          <div v-if="invoice.from_email" class="text-white/60 text-xs">{{ invoice.from_email }}</div>
          <div v-if="invoice.from_phone" class="text-white/60 text-xs">{{ invoice.from_phone }}</div>
          <div v-if="invoice.from_website" class="text-white/60 text-xs">{{ invoice.from_website }}</div>
          <div v-if="invoice.show_bank_details" class="mt-8 pt-6" style="border-top:1px solid rgba(255,255,255,0.2)">
            <div class="text-white/50 uppercase tracking-widest mb-3" style="font-size:9px">Bank / Payment</div>
            <div class="space-y-1 text-xs text-white/70">
              <div v-if="invoice.from_bank_name">{{ invoice.from_bank_name }}</div>
              <div v-if="invoice.from_bank_account_name">{{ invoice.from_bank_account_name }}</div>
              <div v-if="invoice.from_bank_account_number" class="font-mono">{{ invoice.from_bank_account_number }}</div>
              <div v-if="invoice.from_bank_iban" class="font-mono text-[10px]">{{ invoice.from_bank_iban }}</div>
              <div v-for="plink in invoice.payment_links" :key="plink.id" class="text-white/60" style="font-size:10px">
                <span class="text-white/40">{{ plink.type }}:</span> {{ plink.value || '—' }}
              </div>
            </div>
          </div>
          <div class="flex-1"></div>
          <div v-if="invoice.show_flowtali_tag" class="text-white/30 text-center" style="font-size:9px">flowtali.com</div>
        </div>
        <div class="flex-1 p-10" style="position:relative;z-index:3">
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="text-3xl font-bold text-gray-200 tracking-widest" style="letter-spacing:0.12em">INVOICE</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
            </div>
            <div class="text-right text-xs">
              <div class="mb-2"><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">Issue Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</div></div>
              <div><div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">Due Date</div><div class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</div></div>
            </div>
          </div>
          <div class="mb-8 p-4 rounded-lg" :style="{ backgroundColor: invoice.accent_color + '0d' }">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Bill To</div>
            <div class="font-semibold text-gray-800">{{ invoice.to_name || '—' }}</div>
            <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
            <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
            <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
          </div>
          <table class="w-full mb-6" style="border-collapse:collapse">
            <thead><tr :style="{ borderBottom: `2px solid ${invoice.accent_color}` }">
              <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
              <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
              <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
            </tr></thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #f3f4f6">
                <td class="py-3 text-gray-700">{{ item.description }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-6">
            <div style="width:240px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
              <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500"><span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span></div>
              <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500"><span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span></div>
              <div style="height:1px;background:#e5e7eb;margin:8px 0"></div>
              <div class="flex justify-between font-bold text-base"><span class="text-gray-800">Total</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span></div>
            </div>
          </div>
          <div v-if="invoice.signature_url" class="mb-4 flex flex-col items-end">
            <img :src="invoice.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
            <div style="width:120px;height:1px;background:#d1d5db;margin-top:4px"></div>
            <div class="text-gray-400 mt-1" style="font-size:10px">Authorized Signature</div>
          </div>
          <div v-if="invoice.show_notes && invoice.notes" style="border-top:1px solid #f3f4f6;padding-top:20px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Notes</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ invoice.notes }}</p>
          </div>
        </div>
      </div>

      <!-- ── THEME: MINIMAL ── -->
      <div
        v-else-if="invoice.theme === 'minimal'"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-700 relative"
        :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px', minHeight: '1080px' }"
      >
        <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
        </div>
        <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(invoice), borderColor: stampColorFor(invoice) }">{{ invoice.stamp }}</div>
        </div>
        <div class="p-12" style="position:relative;z-index:3">
          <div class="flex justify-between items-start mb-10">
            <div>
              <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-8 w-auto object-contain mb-3" />
              <div class="font-semibold text-gray-900 uppercase tracking-widest text-sm">{{ invoice.from_name }}</div>
              <div v-if="invoice.from_tagline" class="text-gray-400 text-xs mt-0.5">{{ invoice.from_tagline }}</div>
            </div>
            <div class="text-right">
              <div class="text-4xl font-light text-gray-200 tracking-widest uppercase">Invoice</div>
              <div class="font-mono text-xs text-gray-400 mt-2">{{ invoice.number }}</div>
            </div>
          </div>
          <div style="height:1px;background:#e5e7eb;margin-bottom:32px"></div>
          <div class="flex gap-16 mb-8 text-xs">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">From</div>
              <div class="text-gray-500 whitespace-pre-line leading-relaxed">{{ invoice.from_address }}</div>
              <div v-if="invoice.from_email" class="text-gray-500">{{ invoice.from_email }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Bill To</div>
              <div class="font-medium text-gray-700">{{ invoice.to_name || '—' }}</div>
              <div v-if="invoice.to_company" class="text-gray-500">{{ invoice.to_company }}</div>
              <div v-if="invoice.to_email" class="text-gray-500">{{ invoice.to_email }}</div>
              <div v-if="invoice.to_address" class="text-gray-500 whitespace-pre-line">{{ invoice.to_address }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Dates</div>
              <div class="text-gray-400" style="font-size:10px">Issued</div>
              <div class="font-medium text-gray-700 mb-2">{{ formatDate(invoice.issue_date) }}</div>
              <div class="text-gray-400" style="font-size:10px">Due</div>
              <div class="font-medium text-gray-700">{{ formatDate(invoice.due_date) }}</div>
            </div>
          </div>
          <div style="height:1px;background:#e5e7eb;margin-bottom:24px"></div>
          <table class="w-full mb-6" style="border-collapse:collapse">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th class="text-left pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size:9px">Description</th>
              <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size:9px">Qty</th>
              <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size:9px">Unit</th>
              <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size:9px">Rate</th>
              <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size:9px">Amount</th>
            </tr></thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id" style="border-bottom:1px solid #f9fafb">
                <td class="py-3 text-gray-700">{{ item.description }}</td>
                <td class="py-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 text-right text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <div style="width:220px" class="space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-400"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
              <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-400"><span>Discount</span><span class="font-mono">-{{ fmtMoney(invoice.totals.discount_amt) }}</span></div>
              <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-400"><span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span></div>
              <div style="height:1px;background:#111827;margin:8px 0"></div>
              <div class="flex justify-between font-bold text-base text-gray-900"><span>Total</span><span class="font-mono">{{ fmtMoney(invoice.totals.total) }}</span></div>
            </div>
          </div>
          <div v-if="invoice.show_notes && invoice.notes" style="border-top:1px solid #f3f4f6;padding-top:24px;margin-bottom:16px">
            <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:9px">Notes</div>
            <p class="text-gray-400 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ invoice.notes }}</p>
          </div>
          <div v-if="invoice.show_footer_line" style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:24px" class="flex justify-between">
            <div class="text-gray-400" style="font-size:11px">{{ invoice.footer_text || invoice.from_website }}</div>
            <div v-if="invoice.show_flowtali_tag" class="text-gray-300" style="font-size:10px">Generated with Flowtali</div>
          </div>
        </div>
      </div>

      <!-- ── THEME: BOLD ── -->
      <div
        v-else-if="invoice.theme === 'bold'"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-800 relative"
        :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px', minHeight: '1080px' }"
      >
        <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
        </div>
        <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(invoice), borderColor: stampColorFor(invoice) }">{{ invoice.stamp }}</div>
        </div>
        <div :style="{ backgroundColor: invoice.accent_color }" class="px-10 py-8 flex justify-between items-center" style="position:relative;z-index:3">
          <div class="flex items-center gap-4">
            <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-14 w-auto object-contain brightness-0 invert" />
            <div>
              <div class="text-white font-bold text-xl">{{ invoice.from_name }}</div>
              <div v-if="invoice.from_tagline" class="text-white/70 text-sm">{{ invoice.from_tagline }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-white font-black text-5xl tracking-widest" style="letter-spacing:0.15em">INVOICE</div>
            <div class="font-mono text-white/70 text-sm mt-1">{{ invoice.number }}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-6 px-10 py-5 bg-gray-50 border-b border-gray-200" style="position:relative;z-index:3">
          <div class="text-xs">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Contact</div>
            <div v-if="invoice.from_email" class="text-gray-600">{{ invoice.from_email }}</div>
            <div v-if="invoice.from_phone" class="text-gray-600">{{ invoice.from_phone }}</div>
          </div>
          <div class="text-xs">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Address</div>
            <div class="text-gray-600 whitespace-pre-line">{{ invoice.from_address }}</div>
          </div>
          <div class="text-xs text-right">
            <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Issue Date</div>
            <div class="text-gray-700 font-medium">{{ formatDate(invoice.issue_date) }}</div>
            <div class="text-gray-400 uppercase tracking-widest mt-2 mb-1" style="font-size:9px">Due Date</div>
            <div class="text-gray-700 font-medium">{{ formatDate(invoice.due_date) }}</div>
          </div>
        </div>
        <div class="px-10 py-8" style="position:relative;z-index:3">
          <div class="mb-8">
            <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size:10px">Bill To</div>
            <div class="font-semibold text-gray-800 text-sm">{{ invoice.to_name || '—' }}</div>
            <div v-if="invoice.to_company" class="text-xs text-gray-500">{{ invoice.to_company }}</div>
            <div v-if="invoice.to_email" class="text-xs text-gray-500">{{ invoice.to_email }}</div>
            <div v-if="invoice.to_address" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.to_address }}</div>
          </div>
          <table class="w-full mb-6" style="border-collapse:collapse">
            <thead><tr :style="{ backgroundColor: invoice.accent_color }">
              <th class="text-left py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
              <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
              <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
              <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
              <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
            </tr></thead>
            <tbody>
              <tr v-for="(item, idx) in invoice.items" :key="item.id" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }">
                <td class="py-3 px-4 text-gray-700">{{ item.description }}</td>
                <td class="py-3 px-4 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-4 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-4 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-4 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <div style="width:260px">
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
                <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500"><span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span></div>
                <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500"><span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span></div>
              </div>
              <div :style="{ backgroundColor: invoice.accent_color }" class="flex justify-between font-bold text-base text-white px-4 py-3 rounded mt-3">
                <span>Total Due</span><span class="font-mono">{{ fmtMoney(invoice.totals.total) }}</span>
              </div>
            </div>
          </div>
          <div v-if="invoice.show_notes && invoice.notes" style="border-top:1px solid #f3f4f6;padding-top:20px;margin-bottom:16px">
            <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size:10px">Notes</div>
            <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ invoice.notes }}</p>
          </div>
          <div v-if="invoice.show_footer_line" style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px" class="flex justify-between">
            <div class="text-gray-400 text-xs">{{ invoice.footer_text || invoice.from_website }}</div>
            <div v-if="invoice.show_flowtali_tag" class="text-gray-300" style="font-size:10px">Generated with Flowtali · flowtali.com</div>
          </div>
        </div>
      </div>

      <!-- ── THEME: EXECUTIVE ── -->
      <div
        v-else
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-800 relative"
        :style="{ fontFamily: invoice.font_family || 'Geist Sans, sans-serif', fontSize: '13px', minHeight: '1080px' }"
      >
        <div v-if="invoice.show_watermark && invoice.watermark_text" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ invoice.watermark_text }}</span>
        </div>
        <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(invoice), borderColor: stampColorFor(invoice) }">{{ invoice.stamp }}</div>
        </div>
        <div class="p-10" style="position:relative;z-index:3">
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="p-5 rounded border" :style="{ borderColor: invoice.accent_color + '40' }">
              <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size:9px">From</div>
              <img v-if="invoice.logo_url && invoice.show_logo" :src="invoice.logo_url" alt="Logo" class="h-10 w-auto object-contain mb-3" />
              <div class="font-bold text-gray-800 text-sm">{{ invoice.from_name }}</div>
              <div v-if="invoice.from_tagline" class="text-xs text-gray-400 mb-2">{{ invoice.from_tagline }}</div>
              <div class="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{{ invoice.from_address }}</div>
              <div v-if="invoice.from_email" class="text-xs text-gray-500 mt-1">{{ invoice.from_email }}</div>
              <div v-if="invoice.from_phone" class="text-xs text-gray-500">{{ invoice.from_phone }}</div>
            </div>
            <div class="p-5 rounded border" :style="{ borderColor: invoice.accent_color + '40' }">
              <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size:9px">Invoice Details</div>
              <div class="text-3xl font-black tracking-widest text-gray-200 mb-3" style="letter-spacing:0.1em">INVOICE</div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-gray-400">Number</span><span class="font-mono font-semibold text-gray-700">{{ invoice.number }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Issue Date</span><span class="font-semibold text-gray-700">{{ formatDate(invoice.issue_date) }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Due Date</span><span class="font-semibold text-gray-700">{{ formatDate(invoice.due_date) }}</span></div>
                <div style="border-top:1px solid #f3f4f6;padding-top:8px;margin-top:8px">
                  <div class="text-gray-400 mb-1" style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em">Bill To</div>
                  <div class="font-semibold text-gray-800">{{ invoice.to_name || '—' }}</div>
                  <div v-if="invoice.to_company" class="text-gray-500">{{ invoice.to_company }}</div>
                  <div v-if="invoice.to_email" class="text-gray-500">{{ invoice.to_email }}</div>
                  <div v-if="invoice.to_address" class="text-gray-500 whitespace-pre-line">{{ invoice.to_address }}</div>
                </div>
              </div>
            </div>
          </div>
          <table class="w-full mb-6" style="border-collapse:collapse;border:1px solid #e5e7eb">
            <thead><tr :style="{ backgroundColor: invoice.accent_color + '14', borderBottom: `2px solid ${invoice.accent_color}` }">
              <th class="text-left py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
              <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
              <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
              <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
              <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
            </tr></thead>
            <tbody>
              <tr v-for="(item, idx) in invoice.items" :key="item.id" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }">
                <td class="py-3 px-4 text-gray-700">{{ item.description }}</td>
                <td class="py-3 px-4 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-4 text-center text-gray-400 text-xs">{{ item.unit }}</td>
                <td class="py-3 px-4 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-4 text-right font-semibold text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div v-if="invoice.show_notes && invoice.notes">
                <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size:9px">Notes</div>
                <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ invoice.notes }}</p>
              </div>
              <div v-if="invoice.show_bank_details" :class="invoice.show_notes && invoice.notes ? 'mt-4' : ''">
                <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-2" style="font-size:9px">Payment Details</div>
                <div class="text-xs text-gray-600 space-y-0.5">
                  <div v-if="invoice.from_bank_name">Bank: {{ invoice.from_bank_name }}</div>
                  <div v-if="invoice.from_bank_account_number" class="font-mono">Account: {{ invoice.from_bank_account_number }}</div>
                  <div v-if="invoice.from_bank_iban" class="font-mono">IBAN: {{ invoice.from_bank_iban }}</div>
                  <div v-for="plink in invoice.payment_links" :key="plink.id">
                    <span class="text-gray-400">{{ plink.type }}:</span> <span class="text-blue-500 font-mono">{{ plink.value || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div :style="{ color: invoice.accent_color }" class="uppercase tracking-widest font-bold mb-3" style="font-size:9px">Summary</div>
              <div class="space-y-1.5 text-sm border rounded p-4" :style="{ borderColor: invoice.accent_color + '30' }">
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(invoice.totals.subtotal) }}</span></div>
                <div v-if="invoice.totals.discount_amt > 0" class="flex justify-between text-gray-500"><span>Discount</span><span class="font-mono text-red-500">-{{ fmtMoney(invoice.totals.discount_amt) }}</span></div>
                <div v-if="invoice.totals.taxes_total > 0" class="flex justify-between text-gray-500"><span>Tax</span><span class="font-mono">{{ fmtMoney(invoice.totals.taxes_total) }}</span></div>
                <div style="height:1px;background:#e5e7eb;margin:8px 0"></div>
                <div class="flex justify-between font-bold text-base"><span class="text-gray-800">Total</span><span class="font-mono" :style="{ color: invoice.accent_color }">{{ fmtMoney(invoice.totals.total) }}</span></div>
              </div>
              <div v-if="invoice.signature_url" class="mt-6 flex flex-col items-end">
                <img :src="invoice.signature_url" alt="Signature" class="h-10 w-auto object-contain" />
                <div style="width:120px;height:1px;background:#d1d5db;margin-top:4px"></div>
                <div class="text-gray-400 mt-1" style="font-size:10px">Authorized Signature</div>
              </div>
            </div>
          </div>
          <div v-if="invoice.show_footer_line" style="border-top:2px solid;margin-top:24px;padding-top:16px" :style="{ borderColor: invoice.accent_color + '40' }" class="flex justify-between">
            <div class="text-gray-400 text-xs">{{ invoice.footer_text || invoice.from_website }}</div>
            <div v-if="invoice.show_flowtali_tag" class="text-gray-300" style="font-size:10px">Generated with Flowtali · flowtali.com</div>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400">Shared via Flowtali · flowtali.com</p>
    </div>

  </div>
</template>

<style>
@media print {
  header { display: none !important; }
  body * { visibility: hidden; }
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
