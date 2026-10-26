<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification.ts'
import { usePermissions } from '@/composables/usePermissions'
import { InvoiceService, InvoiceSharedLinksService, type IInvoiceDraftData, type RecurrenceFrequency } from '@/services/invoice.service'
import { ClientService } from '@/services/client.service'
import QuickClientPicker from './QuickClientPicker.vue'
import QuickLineItems from './QuickLineItems.vue'
import DescribeItBar from './DescribeItBar.vue'
import type { IAiParsedDocument } from '@/services/ai.service'
import {
  QUICK_CURRENCIES, addDaysIso, blankClient, currencySymbol, subtotalOf, taxAmountOf, toApiItems, todayIso,
  type QuickClient, type QuickLineItem,
} from './quickDocument'

const props = defineProps<{ projectId?: string; initialClient?: QuickClient | null }>()
const emit  = defineEmits<{ 'open-full': [prefill: Record<string, unknown>] }>()

const router    = useRouter()
const { t, locale } = useI18n()
const { notify } = useNotification()
const { can }   = usePermissions()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

// ─── State ────────────────────────────────────────────────────────────────────
const draft      = ref<IInvoiceDraftData | null>(null)
const loading    = ref(true)
const saving     = ref<'draft' | 'link' | null>(null)
const client     = ref<QuickClient>(blankClient())
const saveClient = ref(true)
const items      = ref<QuickLineItem[]>([{ id: 1, description: '', qty: 1, rate: 0 }])
const currency   = ref('USD')
const issueDate  = ref(todayIso())
const terms      = ref('Net 30')
const applyTax   = ref(false)
const notes      = ref('')
const showNotes  = ref(false)
const repeat     = ref<RecurrenceFrequency | ''>('')
const repeatSend = ref(false)
const REPEAT_OPTIONS: RecurrenceFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly']

// Client handed in from a client or project page (resolves asynchronously).
watch(() => props.initialClient, (c) => {
  if (c && !client.value.name) client.value = { ...c }
}, { immediate: true })

// Due-date chips. Anything the org set as its default is offered too.
const termDays: Record<string, number> = {
  'Due on Receipt': 0, 'Net 7': 7, 'Net 14': 14, 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60,
}
const termOptions = computed(() => {
  const base = ['Due on Receipt', 'Net 7', 'Net 14', 'Net 30']
  // Also offer the org default and whatever is currently picked (e.g. by Describe it).
  const extra = [draft.value?.defaults?.payment_terms, terms.value]
    .filter((x): x is string => !!x && !base.includes(x) && x in termDays)
  return [...base, ...new Set(extra)]
})
const termLabel = (term: string) =>
  term === 'Due on Receipt' ? t('quickCreate.invoice.dueOnReceipt') : t('quickCreate.invoice.inDays', { n: termDays[term] })
const dueDate = computed(() => addDaysIso(issueDate.value, termDays[terms.value] ?? 30))

const defaultTax = computed(() => {
  const tax = draft.value?.defaults?.tax
  return tax?.label && Number(tax.rate) > 0 ? tax : null
})

onMounted(async () => {
  if (!orgId.value) return
  try {
    const { data } = await InvoiceService.draftData(orgId.value)
    draft.value = data.data
    const d = data.data.defaults
    currency.value = data.data.organization?.default_currency || 'USD'
    if (d?.payment_terms && d.payment_terms in termDays) terms.value = d.payment_terms
    applyTax.value = !!defaultTax.value
    if (d?.notes) notes.value = d.notes
  } catch {
    // Quick mode still works without defaults — the API fills them on save.
  } finally {
    loading.value = false
  }
})

// ─── Totals ───────────────────────────────────────────────────────────────────
const sym      = computed(() => currencySymbol(currency.value))
const subtotal = computed(() => subtotalOf(items.value))
const taxAmt   = computed(() => applyTax.value ? taxAmountOf(subtotal.value, defaultTax.value) : 0)
const total    = computed(() => subtotal.value + taxAmt.value)
const money    = (n: number) => sym.value + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate  = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })

const sender = computed(() => {
  const org = draft.value?.organization
  const profile = org?.invoice_profiles.find(p => p.id === draft.value?.defaults?.profile_id)
  return profile?.name ?? org?.name ?? ''
})

// ─── Save ─────────────────────────────────────────────────────────────────────
function validate(): string | null {
  if (!client.value.name.trim()) return t('quickCreate.validation.client')
  if (items.value.some(i => !i.description.trim())) return t('quickCreate.validation.description')
  if (total.value <= 0) return t('quickCreate.validation.amount')
  return null
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
    // The invoice matters more than the address book — carry on.
    notify(t('quickCreate.toasts.clientNotSaved'), 'warning')
  }
}

async function save(kind: 'draft' | 'link') {
  const error = validate()
  if (error) return notify(error, 'error')
  if (!orgId.value) return

  saving.value = kind
  try {
    await ensureClient()
    const c = client.value
    const { data } = await InvoiceService.create(orgId.value, {
      // Sender, bank, branding and number come from Document defaults on the API.
      status:        kind === 'link' ? 'sent' : 'draft',
      issue_date:    issueDate.value,
      due_date:      dueDate.value,
      payment_terms: terms.value,
      currency:      currency.value,
      to_name:       c.name.trim(),
      to_company:    c.company || null,
      to_email:      c.email || null,
      to_phone:      c.phone || null,
      to_address:    c.address || null,
      items:         toApiItems(items.value),
      taxes:         applyTax.value && defaultTax.value ? [defaultTax.value] : [],
      notes:         notes.value || null,
      ...(props.projectId ? { project_id: props.projectId } : {}),
    })
    const invoice = data.data

    if (repeat.value) {
      try {
        // The API schedules the next copy one cycle after the issue date.
        await InvoiceService.setRecurrence(orgId.value, invoice.id, {
          frequency: repeat.value,
          auto_send: repeatSend.value && !!client.value.email,
        })
      } catch {
        notify(t('recurring.failed'), 'warning')
      }
    }

    if (kind === 'link') {
      try {
        const { data: link } = await InvoiceSharedLinksService.create(orgId.value, invoice.id, { visibility: 'public', validity_days: null })
        await navigator.clipboard.writeText(`${window.location.origin}/share/i/${link.data.token}`)
        notify(t('quickCreate.toasts.linkCopied', { number: invoice.number }), 'success')
      } catch {
        notify(t('quickCreate.toasts.linkFailed', { number: invoice.number }), 'warning')
      }
    } else {
      notify(t('quickCreate.toasts.invoiceSaved', { number: invoice.number }), 'success')
    }
    router.push({ name: 'invoices.view', params: { id: invoice.id } })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    notify(e.response?.data?.message ?? t('quickCreate.toasts.saveFailed'), 'error')
  } finally {
    saving.value = null
  }
}

// ─── Describe it ──────────────────────────────────────────────────────────────
function applyParsed(doc: IAiParsedDocument) {
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
  if (doc.due_days !== null) {
    // Snap to the closest standard term.
    const closest = Object.entries(termDays).reduce((best, cur) =>
      Math.abs(cur[1] - doc.due_days!) < Math.abs(best[1] - doc.due_days!) ? cur : best)
    terms.value = closest[0]
  }
  if (doc.notes) {
    notes.value = doc.notes
    showNotes.value = true
  }
}

// ─── Hand-off to the full editor ──────────────────────────────────────────────
const EDITOR_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']

function openFull() {
  const c = client.value
  const prefill: Record<string, unknown> = {
    toName: c.name, toCompany: c.company, toEmail: c.email, toPhone: c.phone, toAddress: c.address,
    items: items.value.map((i, idx) => ({ id: idx + 1, description: i.description, qty: Number(i.qty) || 0, unit: 'items', rate: Number(i.rate) || 0 })),
    currency: currency.value,
    issueDate: issueDate.value,
    paymentTerms: EDITOR_TERMS.includes(terms.value) ? terms.value : 'Custom',
    dueDate: dueDate.value,
    taxes: applyTax.value && defaultTax.value
      ? [{ id: 1, ...defaultTax.value }]
      : [{ id: 1, label: 'Tax', rate: 0, type: 'percent' }],
    notes: notes.value,
  }
  emit('open-full', prefill)
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">

    <!-- ── Form ──────────────────────────────────────────────────────────── -->
    <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 md:p-5 space-y-6">
      <DescribeItBar kind="invoice" @parsed="applyParsed" />

      <section class="space-y-2">
        <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.invoice.billTo') }}</h3>
        <QuickClientPicker
          v-model="client"
          v-model:save-client="saveClient"
          :clients="draft?.clients ?? []"
          :can-save-client="can('clients.create')"
        />
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.items.title') }}</h3>
          <select v-model="currency" class="app-select text-xs py-1" :aria-label="t('quickCreate.currency')">
            <option v-for="cur in QUICK_CURRENCIES" :key="cur.code" :value="cur.code">{{ cur.code }} ({{ cur.sym }})</option>
          </select>
        </div>
        <QuickLineItems v-model="items" :symbol="sym" />
      </section>

      <section class="space-y-2">
        <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('quickCreate.invoice.due') }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="term in termOptions" :key="term" type="button"
            @click="terms = term"
            :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
              terms === term ? 'border-green-700 bg-green-700/10 text-gray-1000' : 'border-gray-500 text-gray-900 hover:border-gray-600']"
          >{{ termLabel(term) }}</button>
        </div>
        <p class="text-[11px] text-gray-700">{{ t('quickCreate.invoice.dueOn', { date: fmtDate(dueDate) }) }}</p>
      </section>

      <section class="space-y-2">
        <h3 class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('recurring.action') }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="f in (['', ...REPEAT_OPTIONS] as const)" :key="f || 'never'" type="button" @click="repeat = f"
            :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
              repeat === f ? 'border-green-700 bg-green-700/10 text-gray-1000' : 'border-gray-500 text-gray-900 hover:border-gray-600']"
          >{{ f ? t(`recurring.freq.${f}`) : t('quickCreate.invoice.repeatNever') }}</button>
        </div>
        <label v-if="repeat" class="flex items-center gap-2 text-xs text-gray-900 cursor-pointer select-none">
          <input v-model="repeatSend" type="checkbox" class="accent-green-700" :disabled="!client.email" />
          {{ client.email ? t('recurring.autoSendHint', { email: client.email }) : t('recurring.autoSendNoEmail') }}
        </label>
      </section>

      <section class="space-y-2">
        <button
          type="button" @click="showNotes = !showNotes"
          class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-700 hover:text-gray-1000"
        >
          <Icon :icon="showNotes ? 'lucide:chevron-down' : 'lucide:chevron-right'" class="w-3 h-3" />
          {{ t('quickCreate.notes') }}
          <span v-if="!showNotes && notes" class="normal-case tracking-normal text-gray-700/70 truncate max-w-48">— {{ notes }}</span>
        </button>
        <textarea v-if="showNotes" v-model="notes" rows="3" class="app-inp w-full text-sm resize-none" :placeholder="t('quickCreate.notesPh')" />
      </section>
    </div>

    <!-- ── Summary & actions ─────────────────────────────────────────────── -->
    <aside class="bg-gray-200 border border-gray-400 rounded-xl p-4 md:p-5 space-y-4 lg:sticky lg:top-4">
      <div class="space-y-1.5 text-sm">
        <div class="flex justify-between text-gray-900">
          <span>{{ t('quickCreate.subtotal') }}</span><span class="font-mono">{{ money(subtotal) }}</span>
        </div>
        <label v-if="defaultTax" class="flex justify-between items-center text-gray-900 cursor-pointer select-none">
          <span class="flex items-center gap-2">
            <input v-model="applyTax" type="checkbox" class="accent-green-700" />
            {{ defaultTax.label }} {{ defaultTax.type === 'percent' ? `${defaultTax.rate}%` : '' }}
          </span>
          <span class="font-mono">{{ money(taxAmt) }}</span>
        </label>
        <div class="flex justify-between text-gray-1000 font-semibold text-base pt-2 border-t border-gray-400">
          <span>{{ t('quickCreate.total') }}</span><span class="font-mono">{{ money(total) }}</span>
        </div>
      </div>

      <div class="text-[11px] text-gray-700 space-y-1">
        <p class="flex items-center gap-1.5">
          <Icon icon="lucide:hash" class="w-3 h-3" />
          {{ draft?.next_number ? t('quickCreate.numberAuto', { number: draft.next_number }) : t('quickCreate.numberAutoShort') }}
        </p>
        <p v-if="sender" class="flex items-center gap-1.5">
          <Icon icon="lucide:building-2" class="w-3 h-3" /> {{ t('quickCreate.from', { name: sender }) }}
        </p>
        <p class="flex items-center gap-1.5">
          <Icon icon="lucide:sliders-horizontal" class="w-3 h-3" />
          <span>{{ t('quickCreate.defaultsHint') }}
            <RouterLink :to="{ name: 'org-preferences' }" class="underline hover:text-gray-1000">{{ t('quickCreate.defaultsLink') }}</RouterLink>
          </span>
        </p>
      </div>

      <div class="space-y-2">
        <button
          type="button" @click="save('link')" :disabled="!!saving || loading"
          class="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon :icon="saving === 'link' ? 'lucide:loader-2' : 'lucide:link'" :class="['w-4 h-4', saving === 'link' && 'animate-spin']" />
          {{ t('quickCreate.invoice.saveAndCopyLink') }}
        </button>
        <button
          type="button" @click="save('draft')" :disabled="!!saving || loading"
          class="w-full flex items-center justify-center gap-2 bg-gray-400 hover:bg-gray-500 text-gray-1000 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon :icon="saving === 'draft' ? 'lucide:loader-2' : 'lucide:save'" :class="['w-4 h-4', saving === 'draft' && 'animate-spin']" />
          {{ t('quickCreate.saveDraft') }}
        </button>
        <button
          type="button" @click="openFull"
          class="w-full flex items-center justify-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 py-1.5"
        >
          {{ t('quickCreate.openFull') }} <Icon icon="lucide:arrow-right" class="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  </div>
</template>
