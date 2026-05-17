<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSharedLinksStore } from '@/stores/sharedLinks'

const route = useRoute()
const store = useSharedLinksStore()

const token   = route.params.token as string
const link    = computed(() => store.byToken(token))
const loading = ref(true)
const locked  = ref(false)
const invalid = ref(false)
const codeInput = ref('')
const codeError = ref('')
const unlocked  = ref(false)

// ── Mock invoice data (same as InvoiceViewPage) ───────────────────────────────
interface LineItem { id: number; description: string; qty: number; rate: number }
interface Invoice {
  id: number; number: string; status: string; stamp: string
  fromName: string; fromEmail: string; fromPhone: string; fromAddress: string
  toName: string;  toEmail: string;  toPhone: string;  toAddress: string
  issueDate: string; dueDate: string; currency: string; discount: number; tax: number
  notes: string; accentColor: string; items: LineItem[]
}
const mockInvoices: Invoice[] = [
  { id: 1, number: 'INV-0042', status: 'Paid', stamp: 'PAID',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Globex Corp', toEmail: 'billing@globex.com', toPhone: '+1 212 555 0100', toAddress: '742 Evergreen Terrace\nSpringfield, IL 62701',
    issueDate: '2025-03-15', dueDate: '2025-04-14', currency: 'USD', discount: 0, tax: 0, accentColor: '#E8A83E',
    notes: 'Payment due within 30 days. Thank you for your business.',
    items: [{ id: 1, description: 'Brand Identity Design', qty: 1, rate: 3500 }, { id: 2, description: 'Web Development (40h)', qty: 40, rate: 100 }, { id: 3, description: 'Hosting Setup', qty: 1, rate: 1050 }] },
  { id: 2, number: 'INV-0041', status: 'Due', stamp: '',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Pixel Works', toEmail: 'accounts@pxl.io', toPhone: '+44 20 7946 0958', toAddress: '10 Downing St\nLondon SW1A 2AA',
    issueDate: '2025-03-10', dueDate: '2025-04-10', currency: 'GBP', discount: 5, tax: 20, accentColor: '#a78bfa',
    notes: 'Includes 20% VAT. Payment via bank transfer preferred.',
    items: [{ id: 1, description: 'UI Component Library', qty: 1, rate: 2800 }, { id: 2, description: 'Design Review Session', qty: 2, rate: 200 }] },
  { id: 3, number: 'INV-0040', status: 'Overdue', stamp: '',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Nova Agency', toEmail: 'finance@nova.co', toPhone: '+233 30 295 0100', toAddress: 'Ring Road Central\nAccra, Ghana',
    issueDate: '2025-02-28', dueDate: '2025-03-28', currency: 'USD', discount: 0, tax: 0, accentColor: '#f87171',
    notes: 'This invoice is overdue. Please arrange payment immediately.',
    items: [{ id: 1, description: 'Campaign Visuals', qty: 1, rate: 5800 }] },
  { id: 4, number: 'INV-0039', status: 'Paid', stamp: 'PAID',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Bright Minds', toEmail: 'pay@brightminds.io', toPhone: '+1 512 555 0100', toAddress: '1600 Pennsylvania Ave\nAustin, TX 78701',
    issueDate: '2025-02-20', dueDate: '2025-03-20', currency: 'USD', discount: 0, tax: 0, accentColor: '#4ade80',
    notes: 'Thank you for your prompt payment!',
    items: [{ id: 1, description: 'Logo Design', qty: 1, rate: 1200 }] },
  { id: 5, number: 'INV-0038', status: 'Draft', stamp: 'DRAFT',
    fromName: 'Acme Design Studio', fromEmail: 'hello@acme.studio', fromPhone: '+1 415 555 0199', fromAddress: '123 Design Street\nSan Francisco, CA 94105',
    toName: 'Studio X', toEmail: 'hello@studiox.co', toPhone: '+1 415 555 0199', toAddress: '555 Mission St\nSan Francisco, CA 94105',
    issueDate: '2025-03-18', dueDate: '2025-04-17', currency: 'USD', discount: 0, tax: 0, accentColor: '#e8a83e',
    notes: 'Production design and creative direction for Q2 campaign.',
    items: [{ id: 1, description: 'Production Design', qty: 1, rate: 4200 }, { id: 2, description: 'Creative Direction', qty: 20, rate: 140 }] },
]

const invoice = ref<Invoice | null>(null)

onMounted(async () => {
  await new Promise(r => setTimeout(r, 400))
  loading.value = false

  if (!link.value) { invalid.value = true; return }

  const l = link.value
  if (!l.isActive || store.isExpired(l)) { invalid.value = true; return }

  if (l.visibility === 'private') {
    locked.value = true
    return
  }

  // Public — load immediately
  invoice.value = mockInvoices.find(i => i.id === l.resourceId) ?? null
  if (!invoice.value) { invalid.value = true; return }
  store.recordView(token)
})

function submitCode() {
  codeError.value = ''
  if (!link.value) return
  if (codeInput.value.trim().toUpperCase() !== link.value.accessCode.toUpperCase()) {
    codeError.value = 'Incorrect access code. Please try again.'
    return
  }
  locked.value  = false
  unlocked.value = true
  invoice.value = mockInvoices.find(i => i.id === link.value!.resourceId) ?? null
  if (!invoice.value) { invalid.value = true; return }
  store.recordView(token)
}

const currencySymbol: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'CA$', AUD: 'A$', JPY: '¥', INR: '₹', ZAR: 'R',
}
const sym         = computed(() => invoice.value ? (currencySymbol[invoice.value.currency] ?? '$') : '$')
const subtotal    = computed(() => invoice.value?.items.reduce((s, i) => s + i.qty * i.rate, 0) ?? 0)
const discountAmt = computed(() => subtotal.value * ((invoice.value?.discount ?? 0) / 100))
const taxAmt      = computed(() => (subtotal.value - discountAmt.value) * ((invoice.value?.tax ?? 0) / 100))
const total       = computed(() => subtotal.value - discountAmt.value + taxAmt.value)
const fmtMoney    = (n: number) => sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">

    <!-- Minimal top bar -->
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center">
          <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-white" />
        </div>
        <span class="text-sm font-bold text-gray-800" style="font-family: 'DM Sans', sans-serif">Flowtali</span>
      </div>
      <button v-if="invoice" @click="window.print()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg transition-colors">
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
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:lock" class="w-6 h-6 text-amber-500" />
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
            class="w-full px-3 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-gray-800 tracking-widest uppercase"
          />
          <p v-if="codeError" class="text-xs text-red-500">{{ codeError }}</p>
        </div>
        <button @click="submitCode" class="w-full py-2.5 text-sm font-semibold bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors">
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

      <!-- Document -->
      <div class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-gray-800" style="font-family: 'DM Sans', sans-serif; font-size: 13px;">
        <div class="h-1.5 w-full" :style="{ backgroundColor: invoice.accentColor }"></div>
        <div class="p-10">
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="text-xl font-bold mb-0.5" :style="{ color: invoice.accentColor }">{{ invoice.fromName }}</div>
              <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ invoice.fromAddress }}</div>
              <div v-if="invoice.fromEmail" class="text-xs text-gray-400 mt-1">{{ invoice.fromEmail }}</div>
              <div v-if="invoice.fromPhone" class="text-xs text-gray-400">{{ invoice.fromPhone }}</div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-gray-700 tracking-wide" style="font-family: 'Cormorant Garamond', serif">INVOICE</div>
              <div class="font-mono text-sm text-gray-400 mt-1">{{ invoice.number }}</div>
            </div>
          </div>
          <div class="flex gap-8 mb-8 text-xs">
            <div><div class="text-gray-400 uppercase tracking-wider mb-1">Issue Date</div><div class="font-medium text-gray-700">{{ formatDate(invoice.issueDate) }}</div></div>
            <div><div class="text-gray-400 uppercase tracking-wider mb-1">Due Date</div><div class="font-medium text-gray-700">{{ formatDate(invoice.dueDate) }}</div></div>
            <div v-if="invoice.currency !== 'USD'"><div class="text-gray-400 uppercase tracking-wider mb-1">Currency</div><div class="font-medium text-gray-700">{{ invoice.currency }}</div></div>
          </div>
          <div class="mb-8">
            <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Bill To</div>
            <div class="font-semibold text-gray-800">{{ invoice.toName }}</div>
            <div v-if="invoice.toEmail" class="text-xs text-gray-500">{{ invoice.toEmail }}</div>
            <div v-if="invoice.toPhone" class="text-xs text-gray-500">{{ invoice.toPhone }}</div>
            <div v-if="invoice.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ invoice.toAddress }}</div>
          </div>
          <table class="w-full mb-6 text-sm">
            <thead>
              <tr :style="{ backgroundColor: invoice.accentColor + '18' }">
                <th class="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                <th class="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rate</th>
                <th class="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id" class="border-b border-gray-100">
                <td class="py-3 px-3 text-gray-700">{{ item.description }}</td>
                <td class="py-3 px-3 text-center text-gray-500">{{ item.qty }}</td>
                <td class="py-3 px-3 text-right text-gray-500">{{ fmtMoney(item.rate) }}</td>
                <td class="py-3 px-3 text-right font-medium text-gray-800">{{ fmtMoney(item.qty * item.rate) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-end mb-6">
            <div class="w-56 space-y-1.5 text-sm">
              <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="invoice.discount > 0" class="flex justify-between text-gray-500"><span>Discount ({{ invoice.discount }}%)</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
              <div v-if="invoice.tax > 0" class="flex justify-between text-gray-500"><span>Tax ({{ invoice.tax }}%)</span><span class="font-mono">{{ fmtMoney(taxAmt) }}</span></div>
              <div class="h-px bg-gray-200 my-2"></div>
              <div class="flex justify-between font-bold text-base"><span>Total</span><span class="font-mono" :style="{ color: invoice.accentColor }">{{ fmtMoney(total) }}</span></div>
            </div>
          </div>
          <div v-if="invoice.notes" class="border-t border-gray-100 pt-6">
            <div class="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Notes</div>
            <p class="text-xs text-gray-500 leading-relaxed">{{ invoice.notes }}</p>
          </div>
          <div class="mt-8 text-center"><div class="text-[10px] text-gray-300">Generated with Flowtali · flowtali.io</div></div>
          <div v-if="invoice.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none" style="transform:rotate(-25deg)">
            <div class="text-5xl font-extrabold tracking-widest border-4 px-6 py-3 rounded opacity-20"
              :style="{ color: invoice.stamp === 'PAID' ? '#4ade80' : invoice.stamp === 'VOID' ? '#f87171' : '#9ca3af', borderColor: 'currentColor' }">
              {{ invoice.stamp }}
            </div>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400">Shared via Flowtali · flowtali.io</p>
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
