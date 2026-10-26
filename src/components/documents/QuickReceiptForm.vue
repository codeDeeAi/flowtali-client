<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification.ts'
import { usePermissions } from '@/composables/usePermissions'
import { InvoiceService, type IInvoice } from '@/services/invoice.service'
import { ReceiptService, type IReceiptDraftData } from '@/services/receipt.service'
import { ClientService } from '@/services/client.service'
import QuickClientPicker from './QuickClientPicker.vue'
import QuickLineItems from './QuickLineItems.vue'
import DescribeItBar from './DescribeItBar.vue'
import type { IAiParsedDocument } from '@/services/ai.service'
import {
  PAYMENT_METHODS, QUICK_CURRENCIES, blankClient, currencySymbol, subtotalOf, taxAmountOf, toApiItems, todayIso,
  type QuickClient, type QuickLineItem,
} from './quickDocument'

const props = defineProps<{ projectId?: string; initialClient?: QuickClient | null }>()
const emit  = defineEmits<{ 'open-full': [prefill: Record<string, unknown>] }>()

const route     = useRoute()
const router    = useRouter()
const { t, locale } = useI18n()
const { notify } = useNotification()
const { can }   = usePermissions()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

type Source = 'invoice' | 'standalone'
const preselectedInvoice = typeof route.query.invoice_id === 'string' ? route.query.invoice_id : ''
const source = ref<Source>(preselectedInvoice || can('invoices.read') ? 'invoice' : 'standalone')

// ─── Shared payment fields ────────────────────────────────────────────────────
const paidAt    = ref(todayIso())
const method    = ref('Bank Transfer')
const reference = ref('')
const saving    = ref(false)

// ─── From an invoice ──────────────────────────────────────────────────────────
const invoices        = ref<IInvoice[]>([])
const invoicesLoading = ref(false)
const invoiceSearch   = ref('')
const selectedId      = ref(preselectedInvoice)
const paidSoFar       = ref(0)
const amount          = ref<number | null>(null)

const openInvoices = computed(() => {
  const q = invoiceSearch.value.trim().toLowerCase()
  return invoices.value
    .filter(i => !['paid', 'void'].includes(i.status))
    .filter(i => !q || [i.number, i.to_name, i.to_company].some(v => v?.toLowerCase().includes(q)))
    .slice(0, 8)
})
const selected     = computed(() => invoices.value.find(i => i.id === selectedId.value) ?? null)
const invoiceTotal = computed(() => Number(selected.value?.totals?.total ?? 0))
const outstanding  = computed(() => Math.max(Math.round((invoiceTotal.value - paidSoFar.value) * 100) / 100, 0))
const balanceAfter = computed(() => Math.max(Math.round((outstanding.value - (amount.value ?? 0)) * 100) / 100, 0))

async function loadInvoices() {
  if (!orgId.value || !can('invoices.read')) return
  invoicesLoading.value = true
  try {
    const { data } = await InvoiceService.list(orgId.value, { per_page: 100 })
    invoices.value = data.data.data
    // A preselected invoice may sit outside the first page.
    if (selectedId.value && !selected.value) {
      const res = await InvoiceService.get(orgId.value, selectedId.value)
      invoices.value.unshift(res.data.data)
    }
  } catch {
    // Leave the list empty; standalone still works.
  } finally {
    invoicesLoading.value = false
  }
}

// Keyed on the loaded invoice, so a preselected one gets its amount once the list arrives.
watch(() => selected.value?.id, async (id) => {
  paidSoFar.value = 0
  amount.value = null
  if (!id) return
  try {
    const { data } = await ReceiptService.listByInvoice(orgId.value, id)
    paidSoFar.value = data.data.data
      .filter(r => r.status !== 'void')
      .reduce((s, r) => s + Number(r.amount_paid ?? 0), 0)
  } catch {
    // Assume nothing paid yet; the API computes the real balance.
  }
  amount.value = outstanding.value
}, { immediate: true })

// ─── Standalone ───────────────────────────────────────────────────────────────
const draft      = ref<IReceiptDraftData | null>(null)
const client     = ref<QuickClient>(blankClient())
const saveClient = ref(true)
const items      = ref<QuickLineItem[]>([{ id: 1, description: '', qty: 1, rate: 0 }])
const currency   = ref('USD')
const applyTax   = ref(false)

// Client handed in from a client or project page: prefill the standalone form
// and narrow the invoice list to that client's open invoices.
watch(() => props.initialClient, (c) => {
  if (!c) return
  if (!client.value.name) client.value = { ...c }
  if (!invoiceSearch.value && !selectedId.value) invoiceSearch.value = c.company || c.name
}, { immediate: true })

const defaultTax = computed(() => {
  const tax = draft.value?.defaults?.tax
  return tax?.label && Number(tax.rate) > 0 ? tax : null
})
const subtotal = computed(() => subtotalOf(items.value))
const taxAmt   = computed(() => applyTax.value ? taxAmountOf(subtotal.value, defaultTax.value) : 0)
const total    = computed(() => subtotal.value + taxAmt.value)

onMounted(async () => {
  loadInvoices()
  if (!orgId.value) return
  try {
    const { data } = await ReceiptService.draftData(orgId.value)
    draft.value = data.data
    currency.value = data.data.organization?.default_currency || 'USD'
    applyTax.value = !!defaultTax.value
  } catch {
    // Defaults are filled by the API on save anyway.
  }
})

// ─── Formatting ───────────────────────────────────────────────────────────────
const money = (n: number, code: string) =>
  currencySymbol(code) + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const invoiceCurrency = computed(() => selected.value?.currency ?? 'USD')

// ─── Save ─────────────────────────────────────────────────────────────────────
async function recordForInvoice() {
  if (!selected.value) return notify(t('quickCreate.validation.invoice'), 'error')
  if (!amount.value || amount.value <= 0) return notify(t('quickCreate.validation.amount'), 'error')

  saving.value = true
  try {
    const { data } = await ReceiptService.recordInvoicePayment(orgId.value, selected.value.id, {
      amount:           amount.value,
      paid_at:          paidAt.value || null,
      payment_method:   method.value || null,
      reference_number: reference.value || null,
    })
    const { receipt, balance_due } = data.data
    notify(
      balance_due > 0
        ? t('quickCreate.toasts.partialRecorded', { number: receipt.number, balance: money(balance_due, invoiceCurrency.value) })
        : t('quickCreate.toasts.paidRecorded', { number: receipt.number, invoice: selected.value.number }),
      'success',
    )
    router.push({ name: 'receipts.view', params: { id: receipt.id } })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    notify(e.response?.data?.message ?? t('quickCreate.toasts.saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

async function ensureClient() {
  if (client.value.clientId || !saveClient.value || !can('clients.create')) return
  try {
    const c = client.value
    await ClientService.create(orgId.value, {
      full_name:   c.name.trim(),
      company:     c.company || null,
      email:       c.email || null,
      client_type: c.company ? 'organization' : 'individual',
    })
  } catch {
    notify(t('quickCreate.toasts.clientNotSaved'), 'warning')
  }
}

async function recordStandalone() {
  if (!client.value.name.trim()) return notify(t('quickCreate.validation.client'), 'error')
  if (items.value.some(i => !i.description.trim())) return notify(t('quickCreate.validation.description'), 'error')
  if (total.value <= 0) return notify(t('quickCreate.validation.amount'), 'error')

  saving.value = true
  try {
    await ensureClient()
    const c = client.value
    const { data } = await ReceiptService.create(orgId.value, {
      // Sender, bank, branding and number come from Document defaults on the API.
      status:           'finalized',
      issue_date:       todayIso(),
      paid_at:          paidAt.value || null,
      payment_method:   method.value || null,
      reference_number: reference.value || null,
      amount_paid:      Math.round(total.value * 100) / 100,
      currency:         currency.value,
      to_name:          c.name.trim(),
      to_company:       c.company || null,
      to_email:         c.email || null,
      to_phone:         c.phone || null,
      to_address:       c.address || null,
      items:            toApiItems(items.value),
      taxes:            applyTax.value && defaultTax.value ? [defaultTax.value] : [],
      stamp:            'PAID',
      ...(props.projectId ? { project_id: props.projectId } : {}),
    })
    notify(t('quickCreate.toasts.receiptSaved', { number: data.data.number }), 'success')
    router.push({ name: 'receipts.view', params: { id: data.data.id } })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    notify(e.response?.data?.message ?? t('quickCreate.toasts.saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

// Describe it fills the standalone form ("Cash from Jane, 2 hours consulting at 80").
function applyParsed(doc: IAiParsedDocument) {
  source.value = 'standalone'
  if (doc.client.name) {
    const saved = draft.value?.clients.find(c => c.id === doc.client.id)
    client.value = {
      clientId: doc.client.id,
      name:     doc.client.name,
      company:  doc.client.company,
      email:    doc.client.email,
      phone:    saved?.phone ?? '',
      address:  saved?.address ?? '',
    }
  }
  if (doc.items.length) {
    items.value = doc.items.map((i, idx) => ({ id: idx + 1, description: i.description, qty: i.qty, rate: i.rate }))
  }
  if (doc.currency && QUICK_CURRENCIES.some(c => c.code === doc.currency)) currency.value = doc.currency
  if (doc.payment_method) method.value = PAYMENT_METHODS.includes(doc.payment_method) ? doc.payment_method : 'Other'
}

const submit = () => (source.value === 'invoice' ? recordForInvoice() : recordStandalone())

function openFull() {
  const c = client.value
  emit('open-full', {
    toName: c.name, toCompany: c.company, toEmail: c.email, toPhone: c.phone, toAddress: c.address,
    items: items.value.map((i, idx) => ({ id: idx + 1, description: i.description, qty: Number(i.qty) || 0, unit: 'items', rate: Number(i.rate) || 0 })),
    currency: currency.value,
    paidAt: paidAt.value,
    paymentMethod: method.value,
    referenceNumber: reference.value,
    taxes: applyTax.value && defaultTax.value
      ? [{ id: 1, ...defaultTax.value }]
      : [{ id: 1, label: 'Tax', rate: 0, type: 'percent' }],
  })
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">

    <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 md:p-5 space-y-6">
      <DescribeItBar kind="receipt" @parsed="applyParsed" />

      <!-- Source -->
      <div v-if="can('invoices.read')" class="grid grid-cols-2 gap-2">
        <button
          v-for="opt in (['invoice', 'standalone'] as const)" :key="opt" type="button"
          @click="source = opt"
          :class="['flex items-start gap-2.5 text-left p-3 rounded-lg border transition-colors',
            source === opt ? 'border-green-700 bg-green-700/10' : 'border-gray-500 hover:border-gray-600']"
        >
          <Icon :icon="opt === 'invoice' ? 'lucide:file-check' : 'lucide:receipt'" class="w-4 h-4 mt-0.5 text-gray-900 shrink-0" />
          <span>
            <span class="block text-sm text-gray-1000">{{ t(`quickCreate.receipt.${opt}`) }}</span>
            <span class="block text-[11px] text-gray-700">{{ t(`quickCreate.receipt.${opt}Hint`) }}</span>
          </span>
        </button>
      </div>

      <!-- From an invoice -->
      <template v-if="source === 'invoice'">
        <section class="space-y-2">
          <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.receipt.whichInvoice') }}</h3>

          <div v-if="selected" class="flex items-center justify-between gap-3 p-3 border border-green-700/50 bg-green-700/5 rounded-lg">
            <div class="min-w-0">
              <p class="text-sm text-gray-1000 font-mono">{{ selected.number }}</p>
              <p class="text-[11px] text-gray-700 truncate">{{ selected.to_company || selected.to_name || '—' }} · {{ money(invoiceTotal, selected.currency) }}</p>
            </div>
            <button v-if="!preselectedInvoice" type="button" @click="selectedId = ''" class="text-xs text-gray-900 hover:text-gray-1000 shrink-0">
              {{ t('quickCreate.receipt.change') }}
            </button>
          </div>

          <template v-else>
            <div class="relative">
              <Icon icon="lucide:search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" />
              <input v-model="invoiceSearch" type="text" class="app-inp w-full text-sm pl-8" :placeholder="t('quickCreate.receipt.searchInvoicePh')" />
            </div>
            <div v-if="invoicesLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
              <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> {{ t('quickCreate.loading') }}
            </div>
            <div v-else-if="openInvoices.length" class="border border-gray-400 rounded-lg divide-y divide-gray-400 overflow-hidden">
              <button
                v-for="inv in openInvoices" :key="inv.id" type="button"
                @click="selectedId = inv.id"
                class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-300 transition-colors"
              >
                <span class="min-w-0">
                  <span class="block text-sm text-gray-1000 font-mono">{{ inv.number }}</span>
                  <span class="block text-[11px] text-gray-700 truncate">{{ inv.to_company || inv.to_name || '—' }}</span>
                </span>
                <span class="text-sm font-mono text-gray-1000 shrink-0">{{ money(Number(inv.totals?.total ?? 0), inv.currency) }}</span>
              </button>
            </div>
            <p v-else class="text-xs text-gray-700 py-2">{{ t('quickCreate.receipt.noOpenInvoices') }}</p>
          </template>
        </section>

        <section v-if="selected" class="space-y-2">
          <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.receipt.amountReceived') }}</h3>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-900 font-mono">{{ currencySymbol(selected.currency) }}</span>
            <input v-model.number="amount" type="number" min="0" step="any" class="app-inp text-sm w-40 font-mono" />
            <button
              v-if="amount !== outstanding" type="button" @click="amount = outstanding"
              class="text-xs text-gray-900 hover:text-gray-1000 underline"
            >{{ t('quickCreate.receipt.payInFull') }}</button>
          </div>
          <p class="text-[11px] text-gray-700">
            <template v-if="paidSoFar > 0">{{ t('quickCreate.receipt.paidSoFar', { amount: money(paidSoFar, selected.currency) }) }} · </template>
            <span v-if="balanceAfter > 0" class="text-amber-400">{{ t('quickCreate.receipt.partial', { balance: money(balanceAfter, selected.currency) }) }}</span>
            <span v-else class="text-green-700">{{ t('quickCreate.receipt.full') }}</span>
          </p>
        </section>
      </template>

      <!-- Standalone -->
      <template v-else>
        <section class="space-y-2">
          <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.receipt.receivedFrom') }}</h3>
          <QuickClientPicker
            v-model="client"
            v-model:save-client="saveClient"
            :clients="draft?.clients ?? []"
            :can-save-client="can('clients.create')"
          />
        </section>
        <section class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.items.forWhat') }}</h3>
            <select v-model="currency" class="app-select text-xs py-1" :aria-label="t('quickCreate.currency')">
              <option v-for="cur in QUICK_CURRENCIES" :key="cur.code" :value="cur.code">{{ cur.code }} ({{ cur.sym }})</option>
            </select>
          </div>
          <QuickLineItems v-model="items" :symbol="currencySymbol(currency)" />
        </section>
      </template>

      <!-- Payment details -->
      <section class="space-y-3">
        <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.receipt.paymentDetails') }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="m in PAYMENT_METHODS" :key="m" type="button" @click="method = m"
            :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
              method === m ? 'border-green-700 bg-green-700/10 text-gray-1000' : 'border-gray-500 text-gray-900 hover:border-gray-600']"
          >{{ m }}</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="text-[11px] text-gray-700">{{ t('quickCreate.receipt.paidOn') }}</span>
            <input v-model="paidAt" type="date" class="app-inp w-full text-sm" />
          </label>
          <label class="space-y-1">
            <span class="text-[11px] text-gray-700">{{ t('quickCreate.receipt.reference') }}</span>
            <input v-model="reference" type="text" class="app-inp w-full text-sm" :placeholder="t('quickCreate.receipt.referencePh')" />
          </label>
        </div>
      </section>
    </div>

    <!-- Summary & actions -->
    <aside class="bg-gray-200 border border-gray-400 rounded-xl p-4 md:p-5 space-y-4 lg:sticky lg:top-4">
      <div v-if="source === 'invoice'" class="space-y-1.5 text-sm">
        <div class="flex justify-between text-gray-900">
          <span>{{ t('quickCreate.receipt.invoiceTotal') }}</span>
          <span class="font-mono">{{ selected ? money(invoiceTotal, selected.currency) : '—' }}</span>
        </div>
        <div class="flex justify-between text-gray-1000 font-semibold text-base pt-2 border-t border-gray-400">
          <span>{{ t('quickCreate.receipt.receiving') }}</span>
          <span class="font-mono">{{ selected ? money(amount ?? 0, selected.currency) : '—' }}</span>
        </div>
      </div>
      <div v-else class="space-y-1.5 text-sm">
        <div class="flex justify-between text-gray-900">
          <span>{{ t('quickCreate.subtotal') }}</span><span class="font-mono">{{ money(subtotal, currency) }}</span>
        </div>
        <label v-if="defaultTax" class="flex justify-between items-center text-gray-900 cursor-pointer select-none">
          <span class="flex items-center gap-2">
            <input v-model="applyTax" type="checkbox" class="accent-green-700" />
            {{ defaultTax.label }} {{ defaultTax.type === 'percent' ? `${defaultTax.rate}%` : '' }}
          </span>
          <span class="font-mono">{{ money(taxAmt, currency) }}</span>
        </label>
        <div class="flex justify-between text-gray-1000 font-semibold text-base pt-2 border-t border-gray-400">
          <span>{{ t('quickCreate.receipt.received') }}</span><span class="font-mono">{{ money(total, currency) }}</span>
        </div>
      </div>

      <p class="text-[11px] text-gray-700 flex items-center gap-1.5">
        <Icon icon="lucide:hash" class="w-3 h-3" />
        {{ draft?.next_number ? t('quickCreate.numberAuto', { number: draft.next_number }) : t('quickCreate.numberAutoShort') }}
      </p>

      <div class="space-y-2">
        <button
          type="button" @click="submit" :disabled="saving || (source === 'invoice' && !selected)"
          class="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon :icon="saving ? 'lucide:loader-2' : 'lucide:check'" :class="['w-4 h-4', saving && 'animate-spin']" />
          {{ source === 'invoice' ? t('quickCreate.receipt.recordPayment') : t('quickCreate.receipt.issueReceipt') }}
        </button>
        <button
          v-if="source === 'standalone'" type="button" @click="openFull"
          class="w-full flex items-center justify-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 py-1.5"
        >
          {{ t('quickCreate.openFull') }} <Icon icon="lucide:arrow-right" class="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  </div>
</template>
