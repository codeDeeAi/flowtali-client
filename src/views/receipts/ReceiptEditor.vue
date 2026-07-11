<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useLoaders } from '@/composables/loaders.ts'
import { useNotification } from '@/composables/notification.ts'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import { useAuthStore } from '@/stores/auth'
import { ReceiptService, type IReceiptDraftData } from '@/services/receipt.service'
import { MediaService } from '@/services/media.service'
import { AiService } from '@/services/ai.service'

interface Props {
  mode: 'create' | 'edit'
  receiptId?: string
  initialData?: Record<string, any>
  projectId?: string
}
const props = withDefaults(defineProps<Props>(), { mode: 'create' })

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const router = useRouter()
const { t, locale } = useI18n()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
initLoaders({ isSaving: false })

// ─── AI description assist ──────────────────────────────────────────────────────
// Turns rough line-item notes into a clean, professional description in the
// user's language. Output replaces the field; the user can still edit.
const aiDescBusyId = ref<number | null>(null)
async function cleanUpDescription(item: { id: number; description: string }) {
  if (!item.description.trim() || aiDescBusyId.value) return
  aiDescBusyId.value = item.id
  try {
    const { data } = await AiService.transformText(orgId.value, {
      action: 'describe',
      text: item.description,
      language: locale.value,
      context: 'line_item',
    })
    if (data.data.text) item.description = data.data.text
  } catch (e) {
    const err = e as { response?: { status?: number; data?: { data?: { not_configured?: boolean; invalid_model?: boolean }; message?: string } } }
    const b = err.response?.data
    if (err.response?.status === 409 && b?.data?.not_configured) {
      notify(t('receiptEditor.ai.notConfigured'), 'error')
      router.push({ name: 'settings', query: { tab: 'ai' } })
    } else if (b?.data?.invalid_model && b.message) {
      notify(b.message, 'error')
    } else {
      notify(t('receiptEditor.ai.error'), 'error')
    }
  } finally {
    aiDescBusyId.value = null
  }
}

const today = new Date().toISOString().slice(0, 10)

const form = ref({
  number:          'REC-0001',
  issueDate:       today,
  paidAt:          today,
  paymentMethod:   'Bank Transfer',
  referenceNumber: '',
  currency:        'USD',

  fromName:               '',
  fromTagline:            '',
  fromEmail:              '',
  fromPhone:              '',
  fromWebsite:            '',
  fromAddress:            '',
  fromBankName:           '',
  fromBankAccountName:    '',
  fromBankAccountNumber:  '',
  fromBankSortCode:       '',
  fromBankIban:           '',
  logoUrl:                '',

  toName:    '',
  toCompany: '',
  toEmail:   '',
  toPhone:   '',
  toAddress: '',

  items: [
    { id: 1, description: '', qty: 1, unit: 'project', rate: 0 },
  ] as { id: number; description: string; qty: number; unit: string; rate: number }[],

  taxes: [{ id: 1, label: 'Tax', rate: 0, type: 'percent' as 'percent' | 'flat' }] as
    { id: number; label: string; rate: number; type: 'percent' | 'flat' }[],

  discountType: 'percent' as 'percent' | 'flat',
  discount:     0,

  theme:           'classic' as 'classic' | 'modern' | 'minimal' | 'bold' | 'executive',
  accentColor:     '#00c853',
  fontFamily:      "var(--font-sans)",
  signatureUrl:    '',
  stampUrl:        '',
  stamp:           'PAID' as string,
  balanceDue:      0,
  showWatermark:   false,
  watermarkText:   'PAID',
  showTopBar:      true,
  showLogo:        true,
  showFooterLine:  true,
  showNotes:       true,
  showBankDetails: false,
  showFlowtaliTag: true,

  notes:      '',
  footerText: '',
})

const draftData       = ref<IReceiptDraftData | null>(null)
const isDraftLoading  = ref(false)
const isUploadingLogo = ref(false)
const isUploadingSig  = ref(false)

const clientPresets   = computed(() => draftData.value?.clients ?? [])
const savedLogos      = computed(() => draftData.value?.logos ?? [])
const savedSignatures = computed(() => draftData.value?.signatures ?? [])
const orgStamps       = computed(() => draftData.value?.organization?.stamps ?? [])
const orgBrandColors  = computed(() => draftData.value?.organization?.brand_colors ?? [])
const orgProfiles     = computed(() => draftData.value?.organization?.invoice_profiles ?? [])
const orgBankAccounts = computed(() => draftData.value?.organization?.bank_accounts ?? [])

// ── Share ──────────────────────────────────────────────────────────────────────
const showShareModal = ref(false)
const savedReceiptId = ref('')

onMounted(async () => {
  if (props.initialData) Object.assign(form.value, props.initialData)

  if (orgId.value) {
    isDraftLoading.value = true
    try {
      const res = await ReceiptService.draftData(orgId.value)
      draftData.value = res.data.data
      if (props.mode === 'create' && !props.initialData && draftData.value?.organization) {
        const org = draftData.value.organization
        if (org.name && !form.value.fromName) form.value.fromName = org.name
        if (org.default_currency) form.value.currency = org.default_currency
      }
    } catch {}
    finally { isDraftLoading.value = false }
  }

})

// ── Helpers ────────────────────────────────────────────────────────────────────
const currencies = [
  { code: 'USD', sym: '$', label: 'USD ($)' },
  { code: 'EUR', sym: '€', label: 'EUR (€)' },
  { code: 'GBP', sym: '£', label: 'GBP (£)' },
  { code: 'NGN', sym: '₦', label: 'NGN (₦)' },
  { code: 'CAD', sym: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', sym: 'A$', label: 'AUD (A$)' },
  { code: 'JPY', sym: '¥', label: 'JPY (¥)' },
  { code: 'INR', sym: '₹', label: 'INR (₹)' },
  { code: 'ZAR', sym: 'R', label: 'ZAR (R)' },
  { code: 'CHF', sym: 'Fr', label: 'CHF (Fr)' },
  { code: 'AED', sym: 'د.إ', label: 'AED (د.إ)' },
]
const sym = computed(() => currencies.find(c => c.code === form.value.currency)?.sym ?? '$')

const paymentMethods = ['Bank Transfer', 'Cash', 'Card / Stripe', 'PayPal', 'Wise', 'Crypto', 'Cheque', 'Other']

const subtotal = computed(() => form.value.items.reduce((s, i) => s + i.qty * i.rate, 0))
const discountAmt = computed(() =>
  form.value.discountType === 'percent'
    ? subtotal.value * form.value.discount / 100
    : form.value.discount
)
const taxesTotal = computed(() =>
  form.value.taxes.reduce((s, t) => {
    if (t.type === 'flat') return s + t.rate
    return s + (subtotal.value - discountAmt.value) * t.rate / 100
  }, 0)
)
const total = computed(() => subtotal.value - discountAmt.value + taxesTotal.value)

const fmtMoney = (n: number) =>
  sym.value + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
type Tab = 'From' | 'To' | 'Items' | 'Design' | 'Settings' | 'Preview'
const tab  = ref<Tab>('From')
const tabs: Tab[] = ['From', 'To', 'Items', 'Design', 'Settings', 'Preview']
const tabLabelKeys: Record<Tab, string> = {
  From: 'from', To: 'to', Items: 'items', Design: 'design', Settings: 'settings', Preview: 'preview',
}
const tabLabel = (tb: Tab) => t(`invoiceEditor.tabs.${tabLabelKeys[tb]}`)

// ── Zoom ───────────────────────────────────────────────────────────────────────
const zoom    = ref(0.75)
const zoomIn  = () => { zoom.value = Math.min(1.0, parseFloat((zoom.value + 0.1).toFixed(2))) }
const zoomOut = () => { zoom.value = Math.max(0.4, parseFloat((zoom.value - 0.1).toFixed(2))) }
const zoomFit = () => { zoom.value = 0.75 }

// ── Quick-fill ─────────────────────────────────────────────────────────────────
const fillFrom = (p: { name: string; tagline?: string | null; email?: string | null; phone?: string | null; website?: string | null; address?: string | null; logo_url?: string | null }) => {
  form.value.fromName    = p.name
  if (p.tagline  !== undefined) form.value.fromTagline = p.tagline  ?? ''
  if (p.email    !== undefined) form.value.fromEmail   = p.email    ?? ''
  if (p.phone    !== undefined) form.value.fromPhone   = p.phone    ?? ''
  if (p.website  !== undefined) form.value.fromWebsite = p.website  ?? ''
  if (p.address  !== undefined) form.value.fromAddress = p.address  ?? ''
  if (p.logo_url) form.value.logoUrl = p.logo_url
}

const fillBank = (b: { bank_name?: string | null; account_name?: string | null; account_number?: string | null; sort_code?: string | null; iban?: string | null }) => {
  form.value.fromBankName          = b.bank_name      ?? ''
  form.value.fromBankAccountName   = b.account_name   ?? ''
  form.value.fromBankAccountNumber = b.account_number ?? ''
  form.value.fromBankSortCode      = b.sort_code      ?? ''
  form.value.fromBankIban          = b.iban            ?? ''
}

const fillTo = (c: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null }) => {
  form.value.toName    = c.name
  form.value.toCompany = c.company ?? ''
  form.value.toEmail   = c.email ?? ''
  form.value.toPhone   = c.phone ?? ''
  form.value.toAddress = c.address ?? ''
}

function clientInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Uploads ────────────────────────────────────────────────────────────────────
const handleLogoUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingLogo.value = true
  try {
    const fd = new FormData()
    fd.append('files[0][type]', 'org_logo')
    fd.append('files[0][file]', file)
    const res = await MediaService.upload(fd)
    const uploaded = res.data.data[0]
    if (uploaded) {
      form.value.logoUrl = uploaded.url
      if (draftData.value) draftData.value.logos.unshift({ id: uploaded.id, url: uploaded.url })
    }
  } catch { notify(t('invoiceEditor.toasts.logoUploadFailed'), 'error') }
  finally { isUploadingLogo.value = false }
}

const handleSignatureUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingSig.value = true
  try {
    const fd = new FormData()
    fd.append('files[0][type]', 'org_signature')
    fd.append('files[0][file]', file)
    const res = await MediaService.upload(fd)
    const uploaded = res.data.data[0]
    if (uploaded) {
      form.value.signatureUrl = uploaded.url
      if (draftData.value) draftData.value.signatures.unshift({ id: uploaded.id, url: uploaded.url })
    }
  } catch { notify(t('invoiceEditor.toasts.signatureUploadFailed'), 'error') }
  finally { isUploadingSig.value = false }
}

// ── Items / Taxes ──────────────────────────────────────────────────────────────
const unitOptions = ['hrs', 'days', 'items', 'month', 'project', 'flat rate']
let nextItemId = 100
const addItem    = () => form.value.items.push({ id: nextItemId++, description: '', qty: 1, unit: 'hrs', rate: 0 })
const removeItem = (id: number) => { if (form.value.items.length > 1) form.value.items = form.value.items.filter(i => i.id !== id) }
let nextTaxId = 100
const addTax    = () => form.value.taxes.push({ id: nextTaxId++, label: 'VAT', rate: 0, type: 'percent' })
const removeTax = (id: number) => { if (form.value.taxes.length > 1) form.value.taxes = form.value.taxes.filter(t => t.id !== id) }

// ── Design options ─────────────────────────────────────────────────────────────
const themes = computed(() => [
  { id: 'classic',   label: t('invoiceEditor.themes.classic') },
  { id: 'modern',    label: t('invoiceEditor.themes.modern') },
  { id: 'minimal',   label: t('invoiceEditor.themes.minimal') },
  { id: 'bold',      label: t('invoiceEditor.themes.bold') },
  { id: 'executive', label: t('invoiceEditor.themes.executive') },
] as const)

const accentSwatches = ['#00c853', '#4f86c6', '#5ab88a', '#e05a5a', '#9b71c8', '#e8854a', '#3bbfc7', '#d4548a', '#1a1a1a', '#637074']

const fontOptions = [
  { value: "var(--font-sans)",               label: 'Geist Sans (Modern)' },
  { value: "var(--font-sans)",            label: 'Geist Sans (Elegant)' },
  { value: "var(--font-sans)",          label: 'Geist Sans (Literary)' },
  { value: "'Lato', sans-serif",                   label: 'Lato (Clean)' },
  { value: "'Montserrat', sans-serif",             label: 'Montserrat (Contemporary)' },
  { value: "var(--font-mono)",                 label: 'Geist Mono (Technical)' },
]

const toggleFields = computed(() => [
  { key: 'showTopBar',      label: t('invoiceEditor.toggles.showTopBar') },
  { key: 'showLogo',        label: t('invoiceEditor.toggles.showLogo') },
  { key: 'showFooterLine',  label: t('invoiceEditor.toggles.showFooterLine') },
  { key: 'showNotes',       label: t('invoiceEditor.toggles.showNotes') },
  { key: 'showBankDetails', label: t('invoiceEditor.toggles.showBankDetails') },
  { key: 'showFlowtaliTag', label: t('invoiceEditor.toggles.showFlowtaliTag') },
] as const)

// ── Built-in stamps ────────────────────────────────────────────────────────────
const builtInStamps = [
  { text: 'PAID',            color: '#22c55e' },
  { text: 'PARTIALLY PAID',  color: '#f97316' },
  { text: 'UNPAID',          color: '#ef4444' },
]
const showsBalanceDue = computed(() => form.value.stamp === 'UNPAID' || form.value.stamp === 'PARTIALLY PAID')
const isUnpaid        = computed(() => form.value.stamp === 'UNPAID')
const balanceDueAmt   = computed(() =>
  showsBalanceDue.value && form.value.balanceDue > 0 ? form.value.balanceDue : 0
)
const stampColorFor = (label: string) =>
  builtInStamps.find(s => s.text === label)?.color ?? '#9ca3af'

// ── Print / Save ───────────────────────────────────────────────────────────────
const handlePrint = () => window.print()

const buildPayload = (overrides?: Record<string, any>) => ({
  number:                   form.value.number,
  issue_date:               form.value.issueDate || null,
  paid_at:                  form.value.paidAt || null,
  payment_method:           form.value.paymentMethod || null,
  reference_number:         form.value.referenceNumber || null,
  currency:                 form.value.currency,
  from_name:                form.value.fromName,
  from_tagline:             form.value.fromTagline || null,
  from_email:               form.value.fromEmail || null,
  from_phone:               form.value.fromPhone || null,
  from_website:             form.value.fromWebsite || null,
  from_address:             form.value.fromAddress || null,
  from_bank_name:           form.value.fromBankName || null,
  from_bank_account_name:   form.value.fromBankAccountName || null,
  from_bank_account_number: form.value.fromBankAccountNumber || null,
  from_bank_sort_code:      form.value.fromBankSortCode || null,
  from_bank_iban:           form.value.fromBankIban || null,
  logo_url:                 form.value.logoUrl || null,
  payment_links:            [],
  to_name:                  form.value.toName || null,
  to_company:               form.value.toCompany || null,
  to_email:                 form.value.toEmail || null,
  to_phone:                 form.value.toPhone || null,
  to_address:               form.value.toAddress || null,
  items:                    form.value.items,
  taxes:                    form.value.taxes,
  discount_type:            form.value.discountType,
  discount:                 form.value.discount,
  theme:                    form.value.theme,
  accent_color:             form.value.accentColor,
  font_family:              form.value.fontFamily || null,
  signature_url:            form.value.signatureUrl || null,
  stamp_url:                form.value.stampUrl || null,
  stamp:                    form.value.stamp || null,
  stamp_custom_text:        showsBalanceDue.value && form.value.balanceDue > 0
                              ? String(form.value.balanceDue)
                              : null,
  show_watermark:           form.value.showWatermark,
  watermark_text:           form.value.watermarkText || null,
  show_top_bar:             form.value.showTopBar,
  show_logo:                form.value.showLogo,
  show_footer_line:         form.value.showFooterLine,
  show_notes:               form.value.showNotes,
  show_bank_details:        form.value.showBankDetails,
  show_flowtali_tag:        form.value.showFlowtaliTag,
  notes:                    form.value.notes || null,
  footer_text:              form.value.footerText || null,
  ...overrides,
})

const handleSave = async (statusOverride?: string) => {
  if (!orgId.value) return
  if (!form.value.number.trim()) {
    notify(t('receiptEditor.validation.numberRequired'), 'error')
    tab.value = 'Settings'
    return
  }
  if (!form.value.items.length || form.value.items.some(i => !i.description.trim())) {
    notify(t('receiptEditor.validation.descriptionRequired'), 'error')
    tab.value = 'Items'
    return
  }
  setLoader('isSaving', true)
  try {
    const payload = buildPayload(statusOverride ? { status: statusOverride } : undefined)
    if (props.mode === 'create') {
      const res = await ReceiptService.create(orgId.value, { ...payload, ...(props.projectId ? { project_id: props.projectId } : {}) })
      savedReceiptId.value = res.data.data.id
      notify(t('receiptEditor.toasts.created'), 'success')
    } else {
      await ReceiptService.update(orgId.value, props.receiptId!, payload)
      notify(t('receiptEditor.toasts.saved'), 'success')
    }
    if (props.projectId && props.mode === 'create') {
      router.push({ name: 'projects.view', params: { id: props.projectId } })
    } else {
      router.push({ name: 'receipts' })
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.errors?.[0]
    notify(msg ?? t('receiptEditor.toasts.saveFailed'), 'error')
  } finally {
    setLoader('isSaving', false)
  }
}

const handleSaveDraft    = () => handleSave('draft')
const handleFinalize     = () => handleSave('finalized')
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">

    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 md:px-5 h-13 border-b border-gray-400 bg-gray-100/90 backdrop-blur-md shrink-0 z-20">
      <div class="flex items-center gap-3">
        <button @click="router.push({ name: 'receipts' })" class="flex items-center gap-2 text-gray-900 hover:text-gray-1000 text-sm transition-colors">
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          <span class="hidden sm:inline">{{ t('receiptEditor.toolbar.receipts') }}</span>
        </button>
        <span class="text-gray-500">/</span>
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-green-700/10 border border-green-700/25 flex items-center justify-center">
            <Icon icon="lucide:receipt" class="w-3 h-3 text-green-700" />
          </div>
          <span class="font-semibold text-gray-1000 text-sm">
            {{ mode === 'create' ? t('receiptEditor.toolbar.new') : t('receiptEditor.toolbar.edit') }}
          </span>
          <span class="font-mono text-xs text-gray-700">{{ form.number }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handlePrint" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors" :title="t('invoiceEditor.toolbar.print')">
          <Icon icon="lucide:printer" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.print') }}</span>
        </button>
        <button
          v-if="mode === 'edit' || savedReceiptId"
          @click="showShareModal = true"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors"
          :title="t('invoiceEditor.toolbar.share')"
        >
          <Icon icon="lucide:share-2" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.share') }}</span>
        </button>
        <button @click="handleSaveDraft" :disabled="getLoader('isSaving')" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors disabled:opacity-50" :title="t('invoiceEditor.toolbar.saveDraft')">
          <Icon icon="lucide:save" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.saveDraft') }}</span>
        </button>
        <button @click="handleFinalize" :disabled="getLoader('isSaving')" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-green-700 hover:bg-green-700/90 text-bg-100 disabled:opacity-60 disabled:cursor-not-allowed">
          <Icon v-if="getLoader('isSaving')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else icon="lucide:check-circle" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ getLoader('isSaving') ? t('invoiceEditor.toolbar.saving') : (mode === 'create' ? t('receiptEditor.toolbar.create') : t('invoiceEditor.toolbar.saveChanges')) }}</span>
        </button>
      </div>
    </div>

    <!-- Split layout -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Left sidebar -->
      <aside :class="['md:w-[380px] md:shrink-0 border-r border-gray-400 bg-gray-200/60 flex flex-col overflow-hidden', tab === 'Preview' ? 'hidden md:flex' : 'w-full']">

        <!-- Tab bar -->
        <div class="flex border-b border-gray-400 shrink-0">
          <button
            v-for="t in tabs" :key="t"
            @click="tab = t"
            :class="[
              'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
              t === 'Preview' ? 'md:hidden' : '',
              tab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-700 hover:text-gray-1000'
            ]"
          >
            <template v-if="t === 'Preview'">
              <Icon icon="lucide:eye" class="w-3.5 h-3.5 mx-auto" />
            </template>
            <template v-else>{{ tabLabel(t) }}</template>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">

          <!-- ═══ FROM TAB ═══ -->
          <template v-if="tab === 'From'">

            <!-- Quick-fill profiles -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.quickFillProfiles') }}</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> {{ t('invoiceEditor.common.loading') }}
              </div>
              <div v-else-if="orgProfiles.length" class="space-y-1.5">
                <button v-for="p in orgProfiles" :key="p.id" type="button" @click="fillFrom(p)"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group">
                  <p class="text-xs font-medium text-gray-1000 group-hover:text-green-700 transition-colors">{{ p.name }}</p>
                  <p v-if="p.tagline" class="text-[10px] text-gray-700 mt-0.5 truncate">{{ p.tagline }}</p>
                  <p v-else-if="p.email" class="text-[10px] text-gray-700 mt-0.5 truncate">{{ p.email }}</p>
                </button>
              </div>
              <div v-else-if="draftData?.organization" class="space-y-1.5">
                <button type="button" @click="fillFrom({ name: draftData!.organization!.name })"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group">
                  <p class="text-xs font-medium text-gray-1000 group-hover:text-green-700 transition-colors">{{ draftData.organization.name }}</p>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ t('invoiceEditor.from.orgNameLabel') }}</p>
                </button>
              </div>
              <p v-else-if="!isDraftLoading" class="text-[10px] text-gray-700/60">{{ t('invoiceEditor.from.noProfiles') }}</p>
            </div>

            <div class="h-px bg-gray-400"></div>

            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.from.companyIssuedBy') }}</label>
                <input v-model="form.fromName" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.companyNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.tagline') }}</label>
                <input v-model="form.fromTagline" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.taglinePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.email') }}</label>
                <input v-model="form.fromEmail" type="email" class="app-inp text-sm" placeholder="hello@studio.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.phone') }}</label>
                <input v-model="form.fromPhone" class="app-inp text-sm" placeholder="+1 555 000 0000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.website') }}</label>
                <input v-model="form.fromWebsite" class="app-inp text-sm" placeholder="www.yourstudio.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.address') }}</label>
                <textarea v-model="form.fromAddress" class="app-inp text-sm resize-none" rows="3" placeholder="123 Street&#10;City, Country" />
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Logo upload -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.logo') }}</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-12 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /> {{ t('invoiceEditor.common.remove') }}
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ isUploadingLogo ? t('invoiceEditor.common.uploading') : form.logoUrl ? t('invoiceEditor.from.replaceLogo') : t('invoiceEditor.from.uploadLogo') }}
                <input type="file" accept="image/*" class="hidden" :disabled="isUploadingLogo" @change="handleLogoUpload" />
              </label>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Bank details (received to) -->
            <div class="space-y-3">
              <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.from.bankReceivedTo') }}</p>
              <div v-if="orgBankAccounts.length" class="space-y-1">
                <p class="text-[10px] text-gray-700/70 mb-1">{{ t('invoiceEditor.from.quickFillBank') }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="b in orgBankAccounts" :key="b.id" type="button" @click="fillBank(b)"
                    class="text-xs px-2.5 py-1 rounded border border-gray-500 text-gray-700 hover:border-green-700/50 hover:text-gray-1000 transition-colors">{{ b.label }}</button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.from.bankName') }}</label>
                <input v-model="form.fromBankName" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.bankNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.from.accountName') }}</label>
                <input v-model="form.fromBankAccountName" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.accountNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.from.accountNumber') }}</label>
                <input v-model="form.fromBankAccountNumber" class="app-inp text-sm font-mono" placeholder="0000000000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.from.sortCode') }}</label>
                <input v-model="form.fromBankSortCode" class="app-inp text-sm font-mono" placeholder="12-34-56" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.from.iban') }} <span class="text-gray-700/50">{{ t('invoiceEditor.common.optional') }}</span></label>
                <input v-model="form.fromBankIban" class="app-inp text-sm font-mono" placeholder="GB29 NWBK 6016 1331 9268 19" />
              </div>
            </div>
          </template>

          <!-- ═══ TO TAB ═══ -->
          <template v-if="tab === 'To'">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('receiptEditor.to.selectClient') }}</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> {{ t('invoiceEditor.common.loadingClients') }}
              </div>
              <div v-else-if="clientPresets.length" class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                <button v-for="c in clientPresets" :key="c.id" @click="fillTo(c)"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group flex items-center gap-3"
                  :class="form.toEmail === c.email ? 'border-green-700/60 bg-green-700/5' : ''">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100 bg-green-700/80 shrink-0">
                    {{ clientInitials(c.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-gray-1000 truncate">{{ c.name }}</p>
                    <p class="text-[10px] text-gray-700 truncate">{{ c.company ?? c.email }}</p>
                  </div>
                </button>
              </div>
              <p v-else-if="!isDraftLoading" class="text-[10px] text-gray-700/60">{{ t('invoiceEditor.to.noClients') }}</p>
            </div>

            <div class="h-px bg-gray-400"></div>

            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.to.receivedFromName') }}</label>
                <input v-model="form.toName" class="app-inp text-sm" :placeholder="t('invoiceEditor.to.billToNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.company') }}</label>
                <input v-model="form.toCompany" class="app-inp text-sm" :placeholder="t('invoiceEditor.to.companyPlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.email') }}</label>
                <input v-model="form.toEmail" type="email" class="app-inp text-sm" placeholder="client@example.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.phone') }}</label>
                <input v-model="form.toPhone" class="app-inp text-sm" placeholder="+1 555 000 0000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.address') }}</label>
                <textarea v-model="form.toAddress" class="app-inp text-sm resize-none" rows="3" placeholder="123 Client St&#10;City, Country" />
              </div>
            </div>
          </template>

          <!-- ═══ ITEMS TAB ═══ -->
          <template v-if="tab === 'Items'">
            <div class="space-y-2">
              <div v-for="(item, i) in form.items" :key="item.id"
                class="bg-gray-400/40 border border-gray-500 rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase tracking-wider text-gray-700">Item {{ i + 1 }}</span>
                  <button v-if="form.items.length > 1" @click="removeItem(item.id)" class="text-gray-700 hover:text-red-400 transition-colors">
                    <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="flex items-center gap-1.5">
                  <input v-model="item.description" class="app-inp text-sm flex-1" :placeholder="t('receiptEditor.items.descriptionPlaceholder')" />
                  <button
                    v-if="item.description.trim()"
                    type="button"
                    class="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-gray-500 text-gray-700 hover:text-green-700 hover:border-green-700/40 transition disabled:opacity-50"
                    :disabled="!!aiDescBusyId"
                    :title="t('receiptEditor.ai.cleanUp')"
                    @click="cleanUpDescription(item)"
                  >
                    <Icon :icon="aiDescBusyId === item.id ? 'lucide:loader-2' : 'lucide:sparkles'" class="w-3.5 h-3.5" :class="aiDescBusyId === item.id && 'animate-spin'" />
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">{{ t('document.table.qty') }}</label>
                    <input v-model.number="item.qty" type="number" min="0" class="app-inp text-sm" />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">{{ t('document.table.unit') }}</label>
                    <select v-model="item.unit" class="app-select text-sm">
                      <option v-for="u in unitOptions" :key="u">{{ u }}</option>
                    </select>
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">Rate ({{ sym }})</label>
                    <input v-model.number="item.rate" type="number" min="0" class="app-inp text-sm" />
                  </div>
                </div>
                <div class="text-right text-xs font-mono text-green-700">{{ fmtMoney(item.qty * item.rate) }}</div>
              </div>
            </div>

            <button @click="addItem" class="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-500 hover:border-green-700/50 rounded-lg text-xs text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoiceEditor.items.addLineItem') }}
            </button>

            <div class="h-px bg-gray-400"></div>

            <!-- Discount -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('document.discount') }}</p>
              <div class="flex gap-2 mb-2">
                <button @click="form.discountType = 'percent'" :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'percent' ? 'bg-green-700/10 border-green-700 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']">%</button>
                <button @click="form.discountType = 'flat'" :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'flat' ? 'bg-green-700/10 border-green-700 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']">{{ sym }} Flat</button>
              </div>
              <input v-model.number="form.discount" type="number" min="0" :max="form.discountType === 'percent' ? 100 : undefined" class="app-inp text-sm" :placeholder="form.discountType === 'percent' ? '0 – 100' : '0.00'" />
            </div>

            <!-- Tax lines -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.items.taxLines') }}</p>
              <div class="space-y-2">
                <div v-for="(tax) in form.taxes" :key="tax.id" class="space-y-1.5">
                  <div class="flex gap-1.5 items-center">
                    <input v-model="tax.label" class="app-inp text-sm min-w-0 flex-1" :placeholder="t('invoiceEditor.items.taxLabelPlaceholder')" />
                    <div class="flex rounded border border-gray-500 overflow-hidden shrink-0 text-xs">
                      <button type="button" @click="tax.type = 'percent'" :class="['px-2 py-1 transition-colors', tax.type === 'percent' ? 'bg-green-700 text-bg-100 font-semibold' : 'text-gray-700 hover:bg-gray-400']">%</button>
                      <button type="button" @click="tax.type = 'flat'"    :class="['px-2 py-1 transition-colors', tax.type === 'flat'    ? 'bg-green-700 text-bg-100 font-semibold' : 'text-gray-700 hover:bg-gray-400']">$</button>
                    </div>
                    <button type="button" v-if="form.taxes.length > 1" @click="removeTax(tax.id)" class="text-gray-700 hover:text-red-400 transition-colors shrink-0">
                      <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <input v-model.number="tax.rate" type="number" min="0" class="app-inp text-sm flex-1" :placeholder="tax.type === 'flat' ? '0.00' : '0'" />
                    <span v-if="tax.rate > 0" class="text-xs font-mono text-gray-700 whitespace-nowrap shrink-0">
                      = {{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" @click="addTax" class="mt-2 flex items-center gap-1.5 text-xs text-gray-700 hover:text-green-700 transition-colors">
                <Icon icon="lucide:plus" class="w-3 h-3" /> Add tax line
              </button>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Running totals -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between text-gray-700"><span>{{ t('document.subtotal') }}</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
              <div v-if="form.discount > 0" class="flex justify-between text-gray-700">
                <span>Discount {{ form.discountType === 'percent' ? `(${form.discount}%)` : '' }}</span>
                <span class="font-mono text-red-400">-{{ fmtMoney(discountAmt) }}</span>
              </div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-gray-700">
                  <span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span>
                  <span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span>
                </div>
              </template>
              <div class="h-px bg-gray-500"></div>
              <div class="flex justify-between font-semibold text-gray-1000">
                <span>{{ showsBalanceDue ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span>
                <span class="font-mono text-green-700">{{ fmtMoney(total) }}</span>
              </div>
              <template v-if="showsBalanceDue && form.balanceDue > 0">
                <div class="flex justify-between text-sm font-semibold" style="color: #f97316">
                  <span>{{ t('receiptEditor.items.balanceDue') }}</span>
                  <span class="font-mono">{{ fmtMoney(form.balanceDue) }}</span>
                </div>
              </template>
            </div>
          </template>

          <!-- ═══ DESIGN TAB ═══ -->
          <template v-if="tab === 'Design'">

            <!-- Theme -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.theme') }}</p>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="th in themes" :key="th.id" @click="form.theme = th.id"
                  :class="['p-3 rounded-lg border text-xs font-medium text-left transition-colors', form.theme === th.id ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500 hover:text-gray-1000']">
                  <div class="mb-2 rounded overflow-hidden" style="height: 36px">
                    <template v-if="th.id === 'classic'">
                      <div class="h-1" :style="{ backgroundColor: form.accentColor }"></div>
                      <div class="flex justify-between p-1 bg-white">
                        <div class="w-8 h-2 rounded" :style="{ backgroundColor: form.accentColor + '88' }"></div>
                        <div class="w-10 h-2 rounded bg-gray-300"></div>
                      </div>
                      <div class="bg-white px-1 space-y-0.5">
                        <div class="h-1 bg-gray-200 rounded w-full"></div>
                        <div class="h-1 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </template>
                    <template v-if="th.id === 'modern'">
                      <div class="flex h-full">
                        <div class="w-8 h-full" :style="{ backgroundColor: form.accentColor }"></div>
                        <div class="flex-1 bg-white p-1 space-y-0.5">
                          <div class="h-1.5 bg-gray-200 rounded w-3/4"></div>
                          <div class="h-1 bg-gray-100 rounded"></div>
                          <div class="h-1 bg-gray-100 rounded w-2/3"></div>
                        </div>
                      </div>
                    </template>
                    <template v-if="th.id === 'minimal'">
                      <div class="bg-white h-full p-1 space-y-0.5">
                        <div class="flex justify-between">
                          <div class="h-1.5 w-8 bg-gray-800 rounded"></div>
                          <div class="h-1.5 w-6 bg-gray-300 rounded"></div>
                        </div>
                        <div class="h-px bg-gray-200 my-0.5"></div>
                        <div class="h-1 bg-gray-100 rounded w-full"></div>
                        <div class="h-1 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </template>
                    <template v-if="th.id === 'bold'">
                      <div class="h-full" :style="{ backgroundColor: form.accentColor }">
                        <div class="flex justify-between p-1">
                          <div class="h-2 w-6 bg-white/40 rounded"></div>
                          <div class="h-2 w-12 bg-white/60 rounded"></div>
                        </div>
                      </div>
                    </template>
                    <template v-if="th.id === 'executive'">
                      <div class="bg-white h-full p-1">
                        <div class="flex gap-1 mb-1">
                          <div class="flex-1 border rounded" :style="{ borderColor: form.accentColor + '66' }" style="height:14px"></div>
                          <div class="flex-1 border rounded" :style="{ borderColor: form.accentColor + '66' }" style="height:14px"></div>
                        </div>
                        <div class="h-1 bg-gray-100 rounded w-full"></div>
                        <div class="h-1 bg-gray-100 rounded w-3/4 mt-0.5"></div>
                      </div>
                    </template>
                  </div>
                  {{ th.label }}
                </button>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Accent Color -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.accentColor') }}</p>
              <div class="flex items-center gap-2 mb-2">
                <input type="color" v-model="form.accentColor" class="w-9 h-9 rounded cursor-pointer border border-gray-500 bg-gray-200 p-0.5 shrink-0" />
                <input v-model="form.accentColor" class="app-inp text-sm flex-1 font-mono" placeholder="#00c853" />
              </div>
              <div v-if="orgBrandColors.length" class="mb-2">
                <p class="text-[10px] text-gray-700/60 mb-1.5">{{ t('invoiceEditor.design.brand') }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="c in orgBrandColors" :key="c" @click="form.accentColor = c"
                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    :class="form.accentColor === c ? 'border-gray-1000/80' : 'border-transparent'"
                    :style="{ background: c }" />
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="c in accentSwatches" :key="c" @click="form.accentColor = c"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.accentColor === c ? 'border-gray-1000/80' : 'border-transparent'"
                  :style="{ background: c }" />
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Font -->
            <div class="space-y-1">
              <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.design.fontFamily') }}</p>
              <select v-model="form.fontFamily" class="app-select text-sm">
                <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Logo -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.logo') }}</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-10 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> {{ t('invoiceEditor.common.remove') }}
                </button>
              </div>
              <div v-if="savedLogos.length" class="flex flex-wrap gap-2 mb-2">
                <button v-for="logo in savedLogos" :key="logo.id" @click="form.logoUrl = logo.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.logoUrl === logo.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50'">
                  <img :src="logo.url" alt="Logo" class="h-8 w-auto object-contain" style="max-width: 60px" />
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ isUploadingLogo ? t('invoiceEditor.common.uploading') : form.logoUrl ? t('invoiceEditor.from.replaceLogo') : t('invoiceEditor.from.uploadLogo') }}
                <input type="file" accept="image/*" class="hidden" :disabled="isUploadingLogo" @change="handleLogoUpload" />
              </label>
            </div>

            <!-- Signature -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.signature') }}</p>
              <div v-if="form.signatureUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.signatureUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> {{ t('invoiceEditor.common.remove') }}
                </button>
              </div>
              <div v-if="savedSignatures.length" class="flex flex-wrap gap-2 mb-2">
                <button v-for="sig in savedSignatures" :key="sig.id" @click="form.signatureUrl = sig.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.signatureUrl === sig.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50'">
                  <img :src="sig.url" alt="Signature" class="h-8 w-auto object-contain" style="max-width: 80px" />
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon v-if="isUploadingSig" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:pen-line" class="w-3.5 h-3.5" />
                {{ isUploadingSig ? t('invoiceEditor.common.uploading') : form.signatureUrl ? t('invoiceEditor.design.replaceSignature') : t('invoiceEditor.design.uploadSignature') }}
                <input type="file" accept="image/*" class="hidden" :disabled="isUploadingSig" @change="handleSignatureUpload" />
              </label>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Stamp -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('receiptEditor.design.paymentStamp') }}</p>
              <div class="grid grid-cols-2 gap-1.5">
                <button type="button" @click="form.stamp = ''"
                  :class="['py-2 rounded border text-xs font-semibold transition-colors', form.stamp === '' ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']">
                  None
                </button>
                <button v-for="s in builtInStamps" :key="s.text" type="button" @click="form.stamp = s.text"
                  :class="['py-2 rounded border text-xs font-bold transition-colors', form.stamp === s.text ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 hover:border-gray-500']"
                  :style="form.stamp !== s.text ? { color: s.color + 'cc', borderColor: s.color + '40' } : {}">
                  {{ s.text }}
                </button>
              </div>
            </div>

            <!-- Balance due (partially paid / unpaid) -->
            <Transition name="fade">
              <div v-if="showsBalanceDue" class="space-y-1 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                <label class="text-[10px] uppercase tracking-wider text-orange-300">{{ t('receiptEditor.design.balanceDueLabel') }}</label>
                <div class="flex items-center gap-2">
                  <span class="text-gray-700 text-sm">{{ sym }}</span>
                  <input v-model.number="form.balanceDue" type="number" min="0" class="app-inp text-sm flex-1" placeholder="0.00" />
                </div>
                <p class="text-[10px] text-orange-300/70">{{ t('receiptEditor.design.balanceDueHint') }}</p>
              </div>
            </Transition>

            <!-- Watermark -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.design.watermarkText') }}</p>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <span class="text-[10px] text-gray-700">{{ form.showWatermark ? t('invoiceEditor.design.visible') : t('invoiceEditor.design.hidden') }}</span>
                  <div class="relative">
                    <input type="checkbox" v-model="form.showWatermark" class="sr-only" />
                    <div :class="['w-8 h-4 rounded-full transition-colors', form.showWatermark ? 'bg-green-700' : 'bg-gray-500']"></div>
                    <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', form.showWatermark ? 'left-4' : 'left-0.5']"></div>
                  </div>
                </label>
              </div>
              <input v-model="form.watermarkText" class="app-inp text-sm" placeholder="PAID" />
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Show / hide toggles -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-3">{{ t('invoiceEditor.design.showHide') }}</p>
              <div class="space-y-2.5">
                <div v-for="field in toggleFields" :key="field.key" class="flex items-center justify-between">
                  <span class="text-xs text-gray-900">{{ field.label }}</span>
                  <label class="flex items-center cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" v-model="(form as any)[field.key]" class="sr-only" />
                      <div :class="['w-8 h-4 rounded-full transition-colors', (form as any)[field.key] ? 'bg-green-700' : 'bg-gray-500']"></div>
                      <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', (form as any)[field.key] ? 'left-4' : 'left-0.5']"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══ SETTINGS TAB ═══ -->
          <template v-if="tab === 'Settings'">
            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.settings.receiptNumber') }}</label>
                <input v-model="form.number" class="app-inp text-sm font-mono" placeholder="REC-0001" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.issueDate') }}</label>
                <input v-model="form.issueDate" type="date" class="app-inp text-sm" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.paymentDate') }}</label>
                <input v-model="form.paidAt" type="date" class="app-inp text-sm" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.paymentMethod') }}</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <button v-for="m in paymentMethods" :key="m" @click="form.paymentMethod = m"
                    :class="['py-1.5 px-2 rounded border text-xs transition-colors text-left', form.paymentMethod === m ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500 hover:text-gray-1000']">{{ m }}</button>
                </div>
                <input v-if="form.paymentMethod === 'Other'" v-model="form.paymentMethod" class="app-inp text-sm mt-1" :placeholder="t('receiptEditor.settings.paymentMethodPlaceholder')" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.settings.referenceNumber') }} <span class="text-gray-700/50 normal-case">{{ t('invoiceEditor.common.optional') }}</span></label>
                <input v-model="form.referenceNumber" class="app-inp text-sm font-mono" placeholder="TXN-123456" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.currency') }}</label>
                <select v-model="form.currency" class="app-select text-sm">
                  <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.label }}</option>
                </select>
              </div>

              <div class="h-px bg-gray-400"></div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('receiptEditor.settings.notes') }}</label>
                <textarea v-model="form.notes" class="app-inp text-sm resize-none" rows="4" :placeholder="t('receiptEditor.settings.notesPlaceholder')" />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.settings.footerText') }}</label>
                <input v-model="form.footerText" class="app-inp text-sm" :placeholder="t('invoiceEditor.settings.footerPlaceholder')" />
              </div>
            </div>
          </template>

        </div>
      </aside>

      <!-- Preview panel -->
      <main :class="['flex-col flex-1 bg-gray-100/50 overflow-y-auto items-center', tab === 'Preview' ? 'flex' : 'hidden md:flex']">

        <!-- Zoom controls -->
        <div class="sticky top-0 z-10 w-full flex items-center justify-end gap-2 px-6 py-2 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300">
          <span class="text-xs text-gray-700 mr-2">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomOut" class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors"><Icon icon="lucide:minus" class="w-3.5 h-3.5" /></button>
          <button @click="zoomIn"  class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors"><Icon icon="lucide:plus" class="w-3.5 h-3.5" /></button>
          <button @click="zoomFit" class="px-2.5 py-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 text-xs transition-colors">{{ t('invoiceEditor.zoom.fit') }}</button>
        </div>

        <!-- Document wrapper -->
        <div class="py-8 px-6 w-full flex justify-center">
          <div class="origin-top" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: '794px', marginBottom: `${(zoom - 1) * -100}%` }">

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
                      <span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span>
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
                    <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span></div>
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
                    <div class="flex justify-between font-bold text-base"><span>{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span></div>
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
                      <span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span>
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
                      <div class="flex justify-between font-bold text-base"><span class="text-gray-800">{{ balanceDueAmt > 0 ? t('receiptEditor.items.amountPaid') : t('receiptEditor.items.totalReceived') }}</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span></div>
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
      </main>
    </div>
  </div>

  <!-- Share modal -->
  <ShareLinkModal
    v-if="showShareModal"
    :resource-id="props.receiptId || savedReceiptId"
    resource-type="receipt"
    :resource-name="form.number"
    :org-id="orgId"
    @close="showShareModal = false"
  />
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
