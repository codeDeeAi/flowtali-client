<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useLoaders } from '@/composables/loaders.ts'
import { useNotification } from '@/composables/notification.ts'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, type IInvoiceDraftData } from '@/services/invoice.service'
import { MediaService } from '@/services/media.service'

// ─── Props & Emits ────────────────────────────────────────────────────────────
interface Props {
  mode: 'create' | 'edit'
  invoiceId?: string
  initialData?: Partial<typeof form.value>
}
const props = withDefaults(defineProps<Props>(), { mode: 'create' })

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

// ─── Composables ──────────────────────────────────────────────────────────────
const router = useRouter()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
initLoaders({ isSaving: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

// ─── Form state ───────────────────────────────────────────────────────────────
const form = ref({
  // Invoice meta
  number: 'INV-0043',
  issueDate: today,
  dueDate: plusDays(30),
  paymentTerms: 'Net 30',
  currency: 'USD',
  poNumber: '',

  // From
  fromName: 'Acme Design Studio',
  fromTagline: 'Creative Agency & Digital Studio',
  fromEmail: 'hello@acme.studio',
  fromPhone: '+1 415 555 0199',
  fromWebsite: 'www.acme.studio',
  fromAddress: '123 Design Street\nSan Francisco, CA 94105',
  fromBankName: '',
  fromBankAccountName: '',
  fromBankAccountNumber: '',
  fromBankSortCode: '',
  fromBankIban: '',
  paymentLinks: [] as { id: number; type: string; value: string }[],
  logoUrl: '',

  // To
  toName: '',
  toCompany: '',
  toEmail: '',
  toPhone: '',
  toAddress: '',

  // Items
  items: [
    { id: 1, description: 'Brand Design', qty: 1, unit: 'project', rate: 3500 },
    { id: 2, description: 'Web Development', qty: 40, unit: 'hrs', rate: 100 },
  ] as { id: number; description: string; qty: number; unit: string; rate: number }[],

  // Taxes
  taxes: [{ id: 1, label: 'Tax', rate: 0, type: 'percent' as 'percent' | 'flat' }] as { id: number; label: string; rate: number; type: 'percent' | 'flat' }[],

  // Totals
  discountType: 'percent' as 'percent' | 'flat',
  discount: 0,

  // Design
  theme: 'classic' as 'classic' | 'modern' | 'minimal' | 'bold' | 'executive',
  accentColor: '#E8A83E',
  fontFamily: "'DM Sans', sans-serif",
  signatureUrl: '',
  stampUrl: '',
  stamp: '' as string,
  stampCustomText: '',
  showWatermark: false,
  watermarkText: 'CONFIDENTIAL',
  showTopBar: true,
  showLogo: true,
  showFooterLine: true,
  showNotes: true,
  showBankDetails: false,
  showFlowtaliTag: true,

  // Content
  notes: 'Payment due within 30 days. Bank transfer or Stripe accepted.\nThank you for your business.',
  footerText: '',
})

// ─── Draft data (clients, logos, org info) ────────────────────────────────────
const draftData      = ref<IInvoiceDraftData | null>(null)
const isDraftLoading = ref(false)
const isUploadingLogo = ref(false)
const isUploadingSig  = ref(false)

const clientPresets  = computed(() => draftData.value?.clients ?? [])
const savedLogos     = computed(() => draftData.value?.logos ?? [])
const savedSignatures = computed(() => draftData.value?.signatures ?? [])
const orgStamps      = computed(() => draftData.value?.organization?.stamps ?? [])
const orgBrandColors = computed(() => draftData.value?.organization?.brand_colors ?? [])
const stampColorFor  = (label: string) => orgStamps.value.find(s => s.text === label)?.color ?? '#9ca3af'

// ─── Init from props ───────────────────────────────────────────────────────────
onMounted(async () => {
  if (props.initialData) Object.assign(form.value, props.initialData)

  if (orgId.value) {
    isDraftLoading.value = true
    try {
      const res = await InvoiceService.draftData(orgId.value)
      draftData.value = res.data.data
      if (props.mode === 'create' && !props.initialData && draftData.value?.organization) {
        const org = draftData.value.organization
        if (org.name && !form.value.fromName) form.value.fromName = org.name
      }
    } catch {
      // non-critical
    } finally {
      isDraftLoading.value = false
    }
  }
})

// ─── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits<{ save: [data: typeof form.value] }>()

// ─── Currency map ─────────────────────────────────────────────────────────────
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

// ─── Calculations ─────────────────────────────────────────────────────────────
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
  sym.value + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d: string) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Payment terms auto-date ───────────────────────────────────────────────────
const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'Custom']
const termsDaysMap: Record<string, number> = {
  'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, 'Due on Receipt': 0,
}

watch([() => form.value.paymentTerms, () => form.value.issueDate], ([terms, issue]) => {
  if (terms === 'Custom') return
  const days = termsDaysMap[terms]
  if (days !== undefined && issue) {
    const base = new Date(issue)
    base.setDate(base.getDate() + days)
    form.value.dueDate = base.toISOString().slice(0, 10)
  }
})

// ─── Items ────────────────────────────────────────────────────────────────────
const unitOptions = ['hrs', 'days', 'items', 'month', 'project', 'flat rate']
let nextItemId = 100
const addItem = () => form.value.items.push({ id: nextItemId++, description: '', qty: 1, unit: 'hrs', rate: 0 })
const removeItem = (id: number) => {
  if (form.value.items.length > 1) form.value.items = form.value.items.filter(i => i.id !== id)
}

// ─── Taxes ────────────────────────────────────────────────────────────────────
let nextTaxId = 100
const addTax = () => form.value.taxes.push({ id: nextTaxId++, label: 'VAT', rate: 0, type: 'percent' })
const removeTax = (id: number) => {
  if (form.value.taxes.length > 1) form.value.taxes = form.value.taxes.filter(t => t.id !== id)
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'From' | 'To' | 'Items' | 'Design' | 'Settings'
const tab = ref<Tab>('From')
const tabs: Tab[] = ['From', 'To', 'Items', 'Design', 'Settings']

// ─── Zoom ─────────────────────────────────────────────────────────────────────
const zoom = ref(0.75)
const zoomIn = () => { zoom.value = Math.min(1.0, parseFloat((zoom.value + 0.1).toFixed(2))) }
const zoomOut = () => { zoom.value = Math.max(0.4, parseFloat((zoom.value - 0.1).toFixed(2))) }
const zoomFit = () => { zoom.value = 0.75 }

// ─── Org quick-fill ───────────────────────────────────────────────────────────
const orgProfiles      = computed(() => draftData.value?.organization?.invoice_profiles ?? [])
const orgBankAccounts  = computed(() => draftData.value?.organization?.bank_accounts ?? [])
const orgPaymentLinks  = computed(() => draftData.value?.organization?.payment_links ?? [])

const fillFrom = (p: {
  name: string; tagline?: string | null; email?: string | null; phone?: string | null
  website?: string | null; address?: string | null; logo_url?: string | null
}) => {
  form.value.fromName    = p.name
  if (p.tagline  !== undefined) form.value.fromTagline = p.tagline  ?? ''
  if (p.email    !== undefined) form.value.fromEmail   = p.email    ?? ''
  if (p.phone    !== undefined) form.value.fromPhone   = p.phone    ?? ''
  if (p.website  !== undefined) form.value.fromWebsite = p.website  ?? ''
  if (p.address  !== undefined) form.value.fromAddress = p.address  ?? ''
  if (p.logo_url) form.value.logoUrl = p.logo_url
}

const fillBank = (b: {
  bank_name?: string | null; account_name?: string | null; account_number?: string | null
  sort_code?: string | null; iban?: string | null
}) => {
  form.value.fromBankName          = b.bank_name      ?? ''
  form.value.fromBankAccountName   = b.account_name   ?? ''
  form.value.fromBankAccountNumber = b.account_number ?? ''
  form.value.fromBankSortCode      = b.sort_code      ?? ''
  form.value.fromBankIban          = b.iban            ?? ''
}

const addSavedPaymentLink = (link: { id: string; label: string; type: string; value: string }) => {
  const already = form.value.paymentLinks.some(l => l.type === link.type && l.value === link.value)
  if (!already) {
    form.value.paymentLinks.push({ id: nextLinkId++, type: link.type, value: link.value })
  }
}

// ─── Client quick-fill ────────────────────────────────────────────────────────
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

// ─── Logo / Signature upload ──────────────────────────────────────────────────
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
  } catch {
    notify('Logo upload failed', 'error')
  } finally {
    isUploadingLogo.value = false
  }
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
  } catch {
    notify('Signature upload failed', 'error')
  } finally {
    isUploadingSig.value = false
  }
}

const handleStampUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { form.value.stampUrl = reader.result as string }
  reader.readAsDataURL(file)
}

// ─── Design options ───────────────────────────────────────────────────────────
const themes = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold Header' },
  { id: 'executive', label: 'Executive' },
] as const

const accentSwatches = ['#E8A83E', '#4f86c6', '#5ab88a', '#e05a5a', '#9b71c8', '#e8854a', '#3bbfc7', '#d4548a', '#1a1a1a', '#637074']

const fontOptions = [
  { value: "'DM Sans', sans-serif", label: 'DM Sans (Modern)' },
  { value: "'Playfair Display', serif", label: 'Playfair Display (Elegant)' },
  { value: "'Cormorant Garamond', serif", label: 'Cormorant Garamond (Literary)' },
  { value: "'Lato', sans-serif", label: 'Lato (Clean)' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat (Contemporary)' },
  { value: "'DM Mono', monospace", label: 'DM Mono (Technical)' },
]

const paymentLinkTypes = ['PayPal', 'Venmo', 'Cash App', 'Stripe', 'Wise', 'Revolut', 'Zelle', 'Custom']
const paymentLinkIcon: Record<string, string> = {
  PayPal: 'logos:paypal', Venmo: 'simple-icons:venmo', 'Cash App': 'simple-icons:cashapp',
  Stripe: 'logos:stripe', Wise: 'simple-icons:wise', Revolut: 'simple-icons:revolut',
  Zelle: 'simple-icons:zelle', Custom: 'lucide:link',
}
let nextLinkId = 1
const addPaymentLink  = () => form.value.paymentLinks.push({ id: nextLinkId++, type: 'PayPal', value: '' })
const removePaymentLink = (id: number) => { form.value.paymentLinks = form.value.paymentLinks.filter(l => l.id !== id) }

// stamp options come from org via draft data (orgStamps computed above)

const toggleFields = [
  { key: 'showTopBar', label: 'Top accent bar' },
  { key: 'showLogo', label: 'Company logo' },
  { key: 'showFooterLine', label: 'Footer line' },
  { key: 'showNotes', label: 'Notes section' },
  { key: 'showBankDetails', label: 'Bank details section' },
  { key: 'showFlowtaliTag', label: 'Flowtali branding' },
] as const

// ─── Print ────────────────────────────────────────────────────────────────────
const handlePrint = () => window.print()

// ─── Share ────────────────────────────────────────────────────────────────────
const showShareModal = ref(false)
const savedInvoiceId = ref('')

// ─── Save ─────────────────────────────────────────────────────────────────────
const buildPayload = (overrides?: Record<string, any>) => ({
  number:                   form.value.number,
  issue_date:               form.value.issueDate || null,
  due_date:                 form.value.dueDate || null,
  payment_terms:            form.value.paymentTerms || null,
  currency:                 form.value.currency,
  po_number:                form.value.poNumber || null,
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
  payment_links:            form.value.paymentLinks,
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
  stamp_custom_text:        form.value.stampCustomText || null,
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

const validateForm = (): { ok: boolean; message: string; goTab?: Tab } => {
  if (!form.value.number.trim()) {
    return { ok: false, message: 'Invoice number is required.', goTab: 'Settings' }
  }
  if (!form.value.items.length) {
    return { ok: false, message: 'At least one line item is required.', goTab: 'Items' }
  }
  const emptyItem = form.value.items.find(i => !i.description.trim())
  if (emptyItem) {
    return { ok: false, message: 'All line items must have a description.', goTab: 'Items' }
  }
  const emptyLink = form.value.paymentLinks.find(l => !l.value.trim())
  if (emptyLink) {
    return { ok: false, message: 'All payment links must have a value.', goTab: 'From' }
  }
  return { ok: true, message: '' }
}

const handleSave = async (statusOverride?: string) => {
  if (!orgId.value) return

  const validation = validateForm()
  if (!validation.ok) {
    notify(validation.message, 'error')
    if (validation.goTab) tab.value = validation.goTab
    return
  }

  setLoader('isSaving', true)
  try {
    const payload = buildPayload(statusOverride ? { status: statusOverride } : undefined)
    if (props.mode === 'create') {
      const res = await InvoiceService.create(orgId.value, payload)
      savedInvoiceId.value = res.data.data.id
      notify('Invoice created successfully!', 'success')
    } else {
      await InvoiceService.update(orgId.value, props.invoiceId!, payload)
      notify('Invoice saved successfully!', 'success')
    }
    emit('save', form.value)
    router.push({ name: 'invoices' })
  } catch (err: any) {
    const apiMessage = err?.response?.data?.message ?? err?.response?.data?.errors?.[0]
    notify(apiMessage ?? 'Failed to save invoice. Please try again.', 'error')
  } finally {
    setLoader('isSaving', false)
  }
}

const handleSaveDraft = () => handleSave('draft')

</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-charcoal-900">

    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-4 md:px-5 h-13 border-b border-charcoal-700 bg-charcoal-900/90 backdrop-blur-md shrink-0 z-20">
      <div class="flex items-center gap-3">
        <button
          @click="router.push({ name: 'invoices' })"
          class="flex items-center gap-2 text-cream-muted hover:text-cream text-sm transition-colors"
        >
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          <span class="hidden sm:inline">Invoices</span>
        </button>
        <span class="text-charcoal-600">/</span>
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-amber/10 border border-amber/25 flex items-center justify-center">
            <Icon icon="lucide:file-text" class="w-3 h-3 text-amber" />
          </div>
          <span class="font-semibold text-cream text-sm">
            {{ mode === 'create' ? 'New Invoice' : 'Edit Invoice' }}
          </span>
          <span class="font-mono text-xs text-cream-faint">{{ form.number }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handlePrint"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream rounded-lg transition-colors"
        >
          <Icon icon="lucide:printer" class="w-3.5 h-3.5" />
          Print / PDF
        </button>
        <button
          @click="showShareModal = true"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream rounded-lg transition-colors"
        >
          <Icon icon="lucide:share-2" class="w-3.5 h-3.5" />
          Share
        </button>
        <button
          @click="handleSaveDraft"
          :disabled="getLoader('isSaving')"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon icon="lucide:save" class="w-3.5 h-3.5" />
          Save Draft
        </button>
        <button
          @click="() => handleSave()"
          :disabled="getLoader('isSaving')"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-amber hover:bg-amber/90 text-charcoal-900 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon v-if="getLoader('isSaving')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else icon="lucide:send" class="w-3.5 h-3.5" />
          {{ getLoader('isSaving') ? 'Saving…' : (mode === 'create' ? 'Create Invoice' : 'Save Changes') }}
        </button>
      </div>
    </div>

    <!-- ── Split layout ──────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ── Left sidebar ──────────────────────────────────────────────────── -->
      <aside class="shrink-0 border-r border-charcoal-700 bg-charcoal-800/60 flex flex-col overflow-hidden" style="width: 380px">

        <!-- Tab bar -->
        <div class="flex border-b border-charcoal-700 shrink-0">
          <button
            v-for="t in tabs" :key="t"
            @click="tab = t"
            :class="[
              'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === t ? 'border-amber text-amber' : 'border-transparent text-cream-faint hover:text-cream'
            ]"
          >{{ t }}</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- FROM TAB                                                         -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'From'">

            <!-- Quick-fill profiles -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Quick-Fill Profiles</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-cream-faint py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
              <div v-else-if="orgProfiles.length" class="space-y-1.5">
                <button
                  v-for="p in orgProfiles" :key="p.id"
                  type="button"
                  @click="fillFrom(p)"
                  class="w-full text-left p-2.5 rounded-lg border border-charcoal-600 bg-charcoal-700/40 hover:border-amber/50 hover:bg-charcoal-700 transition-colors group"
                >
                  <p class="text-xs font-medium text-cream group-hover:text-amber transition-colors">{{ p.name }}</p>
                  <p v-if="p.tagline" class="text-[10px] text-cream-faint mt-0.5 truncate">{{ p.tagline }}</p>
                  <p v-else-if="p.email" class="text-[10px] text-cream-faint mt-0.5 truncate">{{ p.email }}</p>
                </button>
              </div>
              <div v-else-if="draftData?.organization" class="space-y-1.5">
                <button
                  type="button"
                  @click="fillFrom({ name: draftData!.organization!.name })"
                  class="w-full text-left p-2.5 rounded-lg border border-charcoal-600 bg-charcoal-700/40 hover:border-amber/50 hover:bg-charcoal-700 transition-colors group"
                >
                  <p class="text-xs font-medium text-cream group-hover:text-amber transition-colors">{{ draftData.organization.name }}</p>
                  <p class="text-[10px] text-cream-faint mt-0.5">Organization name</p>
                </button>
                <p class="text-[10px] text-cream-faint/60">Add profiles in Organization Preferences for more options.</p>
              </div>
              <p v-else-if="!isDraftLoading" class="text-[10px] text-cream-faint/60">No profiles set up yet</p>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Fields -->
            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Company Name</label>
                <input v-model="form.fromName" class="app-inp text-sm" placeholder="Your Studio Name" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Tagline / Role</label>
                <input v-model="form.fromTagline" class="app-inp text-sm" placeholder="Creative Agency & Digital Studio" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Email</label>
                <input v-model="form.fromEmail" type="email" class="app-inp text-sm" placeholder="hello@studio.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Phone</label>
                <input v-model="form.fromPhone" class="app-inp text-sm" placeholder="+1 555 000 0000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Website</label>
                <input v-model="form.fromWebsite" class="app-inp text-sm" placeholder="www.yourstudio.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Address</label>
                <textarea v-model="form.fromAddress" class="app-inp text-sm resize-none" rows="3" placeholder="123 Street\nCity, Country" />
              </div>
            </div>

            <!-- Logo upload -->
            <div class="h-px bg-charcoal-700"></div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Logo</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-12 w-auto rounded border border-charcoal-600 bg-charcoal-700 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-cream-faint hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-charcoal-600 hover:border-amber/50 text-xs text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ form.logoUrl ? 'Replace logo' : 'Upload logo' }}
                <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
              </label>
            </div>

            <!-- Bank / Payment Details -->
            <div class="h-px bg-charcoal-700"></div>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-wider text-cream-faint">Bank / Payment Details</p>
              </div>
              <!-- Saved bank account quick-fill -->
              <div v-if="orgBankAccounts.length" class="space-y-1">
                <p class="text-[10px] text-cream-faint/70 mb-1">Quick-fill from saved account:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="b in orgBankAccounts" :key="b.id"
                    type="button"
                    @click="fillBank(b)"
                    class="text-xs px-2.5 py-1 rounded border border-charcoal-600 text-cream-faint hover:border-amber/50 hover:text-cream transition-colors"
                  >{{ b.label }}</button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-cream-faint">Bank Name</label>
                <input v-model="form.fromBankName" class="app-inp text-sm" placeholder="Chase Bank" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-cream-faint">Account Name</label>
                <input v-model="form.fromBankAccountName" class="app-inp text-sm" placeholder="Acme Design Studio" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-cream-faint">Account Number</label>
                <input v-model="form.fromBankAccountNumber" class="app-inp text-sm font-mono" placeholder="0000000000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-cream-faint">Sort / Routing Code</label>
                <input v-model="form.fromBankSortCode" class="app-inp text-sm font-mono" placeholder="12-34-56" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-cream-faint">IBAN <span class="text-cream-faint/50">(optional)</span></label>
                <input v-model="form.fromBankIban" class="app-inp text-sm font-mono" placeholder="GB29 NWBK 6016 1331 9268 19" />
              </div>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Payment links -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Payment Links</p>
              <!-- Saved payment link quick-add -->
              <div v-if="orgPaymentLinks.length" class="mb-2 space-y-1">
                <p class="text-[10px] text-cream-faint/70">Add from saved:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="pl in orgPaymentLinks" :key="pl.id"
                    type="button"
                    @click="addSavedPaymentLink(pl)"
                    class="text-xs px-2.5 py-1 rounded border border-charcoal-600 text-cream-faint hover:border-amber/50 hover:text-cream transition-colors"
                  >{{ pl.label }}</button>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="link in form.paymentLinks" :key="link.id" class="bg-charcoal-700/40 border border-charcoal-600 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <select v-model="link.type" class="app-select text-xs flex-1 mr-2">
                      <option v-for="t in paymentLinkTypes" :key="t">{{ t }}</option>
                    </select>
                    <button @click="removePaymentLink(link.id)" class="text-cream-faint hover:text-red-400 transition-colors shrink-0">
                      <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    v-model="link.value"
                    class="app-inp text-sm"
                    :placeholder="link.type === 'PayPal' ? 'paypal.me/yourusername' : link.type === 'Venmo' ? '@yourusername' : link.type === 'Cash App' ? '$yourcashtag' : 'Link or username'"
                  />
                </div>
              </div>
              <button
                @click="addPaymentLink"
                class="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-charcoal-600 hover:border-amber/50 rounded-lg text-xs text-cream-faint hover:text-cream transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Add payment link
              </button>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- TO TAB                                                           -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'To'">

            <!-- Client quick-picker -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Select client</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-cream-faint py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> Loading clients…
              </div>
              <div v-else-if="clientPresets.length" class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                <button
                  v-for="c in clientPresets" :key="c.id"
                  @click="fillTo(c)"
                  class="w-full text-left p-2.5 rounded-lg border border-charcoal-600 bg-charcoal-700/40 hover:border-amber/50 hover:bg-charcoal-700 transition-colors group flex items-center gap-3"
                  :class="form.toEmail === c.email ? 'border-amber/60 bg-amber/5' : ''"
                >
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900 bg-amber/80 shrink-0">
                    {{ clientInitials(c.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-cream truncate">{{ c.name }}</p>
                    <p class="text-[10px] text-cream-faint truncate">{{ c.company ?? c.email }}</p>
                  </div>
                </button>
              </div>
              <p v-else-if="!isDraftLoading" class="text-[10px] text-cream-faint/60">No clients added yet</p>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Bill To Name</label>
                <input v-model="form.toName" class="app-inp text-sm" placeholder="Client Name" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Company</label>
                <input v-model="form.toCompany" class="app-inp text-sm" placeholder="Client Company" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Email</label>
                <input v-model="form.toEmail" type="email" class="app-inp text-sm" placeholder="client@example.com" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Phone</label>
                <input v-model="form.toPhone" class="app-inp text-sm" placeholder="+1 555 000 0000" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Billing Address</label>
                <textarea v-model="form.toAddress" class="app-inp text-sm resize-none" rows="3" placeholder="123 Client St&#10;City, Country" />
              </div>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- ITEMS TAB                                                         -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'Items'">

            <!-- Line items -->
            <div class="space-y-2">
              <div
                v-for="(item, i) in form.items" :key="item.id"
                class="bg-charcoal-700/40 border border-charcoal-600 rounded-lg p-3 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase tracking-wider text-cream-faint">Item {{ i + 1 }}</span>
                  <button v-if="form.items.length > 1" @click="removeItem(item.id)" class="text-cream-faint hover:text-red-400 transition-colors">
                    <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                  </button>
                </div>
                <input v-model="item.description" class="app-inp text-sm" placeholder="Description" />
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-cream-faint">Qty</label>
                    <input v-model.number="item.qty" type="number" min="0" class="app-inp text-sm" />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-cream-faint">Unit</label>
                    <select v-model="item.unit" class="app-select text-sm">
                      <option v-for="u in unitOptions" :key="u">{{ u }}</option>
                    </select>
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-cream-faint">Rate ({{ sym }})</label>
                    <input v-model.number="item.rate" type="number" min="0" class="app-inp text-sm" />
                  </div>
                </div>
                <div class="text-right text-xs font-mono text-amber">{{ fmtMoney(item.qty * item.rate) }}</div>
              </div>
            </div>

            <!-- Add item -->
            <button
              @click="addItem"
              class="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-charcoal-600 hover:border-amber/50 rounded-lg text-xs text-cream-faint hover:text-cream transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Add Line Item
            </button>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Discount -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Discount</p>
              <div class="flex gap-2 mb-2">
                <button
                  @click="form.discountType = 'percent'"
                  :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'percent' ? 'bg-amber/10 border-amber text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500']"
                >%</button>
                <button
                  @click="form.discountType = 'flat'"
                  :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'flat' ? 'bg-amber/10 border-amber text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500']"
                >{{ sym }} Flat</button>
              </div>
              <input
                v-model.number="form.discount"
                type="number" min="0"
                :max="form.discountType === 'percent' ? 100 : undefined"
                class="app-inp text-sm"
                :placeholder="form.discountType === 'percent' ? '0 – 100' : '0.00'"
              />
            </div>

            <!-- Tax lines -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Tax Lines</p>
              <div class="space-y-2">
                <div v-for="(tax, ti) in form.taxes" :key="tax.id" class="space-y-1.5">
                  <!-- Row 1: label + toggle + remove -->
                  <div class="flex gap-1.5 items-center">
                    <input v-model="tax.label" class="app-inp text-sm min-w-0 flex-1" placeholder="VAT" />
                    <div class="flex rounded border border-charcoal-600 overflow-hidden shrink-0 text-xs">
                      <button
                        type="button"
                        @click="tax.type = 'percent'"
                        :class="['px-2 py-1 transition-colors', tax.type === 'percent' ? 'bg-amber text-charcoal-900 font-semibold' : 'text-cream-faint hover:bg-charcoal-700']"
                      >%</button>
                      <button
                        type="button"
                        @click="tax.type = 'flat'"
                        :class="['px-2 py-1 transition-colors', tax.type === 'flat' ? 'bg-amber text-charcoal-900 font-semibold' : 'text-cream-faint hover:bg-charcoal-700']"
                      >$</button>
                    </div>
                    <button type="button" v-if="form.taxes.length > 1" @click="removeTax(tax.id)" class="text-cream-faint hover:text-red-400 transition-colors shrink-0">
                      <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <!-- Row 2: rate input full width + calculated amount -->
                  <div class="flex items-center gap-2">
                    <input
                      v-model.number="tax.rate"
                      type="number" min="0"
                      class="app-inp text-sm flex-1"
                      :placeholder="tax.type === 'flat' ? '0.00' : '0'"
                    />
                    <span v-if="tax.rate > 0" class="text-xs font-mono text-cream-faint whitespace-nowrap shrink-0">
                      = {{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                @click="addTax"
                class="mt-2 flex items-center gap-1.5 text-xs text-cream-faint hover:text-amber transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> Add tax line
              </button>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Running totals -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between text-cream-faint">
                <span>Subtotal</span>
                <span class="font-mono">{{ fmtMoney(subtotal) }}</span>
              </div>
              <div v-if="form.discount > 0" class="flex justify-between text-cream-faint">
                <span>Discount {{ form.discountType === 'percent' ? `(${form.discount}%)` : '' }}</span>
                <span class="font-mono text-red-400">-{{ fmtMoney(discountAmt) }}</span>
              </div>
              <template v-for="tax in form.taxes" :key="tax.id">
                <div v-if="tax.rate > 0" class="flex justify-between text-cream-faint">
                  <span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span>
                  <span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span>
                </div>
              </template>
              <div class="h-px bg-charcoal-600"></div>
              <div class="flex justify-between font-semibold text-cream">
                <span>Total</span>
                <span class="font-mono text-amber">{{ fmtMoney(total) }}</span>
              </div>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- DESIGN TAB                                                        -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'Design'">

            <!-- Theme -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Theme</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="th in themes" :key="th.id"
                  @click="form.theme = th.id"
                  :class="[
                    'p-3 rounded-lg border text-xs font-medium text-left transition-colors',
                    form.theme === th.id ? 'border-amber bg-amber/10 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500 hover:text-cream'
                  ]"
                >
                  <!-- Mini preview thumbnail -->
                  <div class="mb-2 rounded overflow-hidden" style="height: 36px">
                    <!-- Classic -->
                    <template v-if="th.id === 'classic'">
                      <div class="h-1" :style="{ backgroundColor: form.accentColor }"></div>
                      <div class="flex justify-between p-1 bg-white">
                        <div class="w-8 h-2 rounded" :style="{ backgroundColor: form.accentColor + '88' }"></div>
                        <div class="w-6 h-2 rounded bg-gray-300"></div>
                      </div>
                      <div class="bg-white px-1 space-y-0.5">
                        <div class="h-1 bg-gray-200 rounded w-full"></div>
                        <div class="h-1 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </template>
                    <!-- Modern -->
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
                    <!-- Minimal -->
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
                    <!-- Bold -->
                    <template v-if="th.id === 'bold'">
                      <div class="h-full" :style="{ backgroundColor: form.accentColor }">
                        <div class="flex justify-between p-1">
                          <div class="h-2 w-6 bg-white/40 rounded"></div>
                          <div class="h-2 w-10 bg-white/60 rounded"></div>
                        </div>
                      </div>
                    </template>
                    <!-- Executive -->
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

            <div class="h-px bg-charcoal-700"></div>

            <!-- Accent Color -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Accent Color</p>
              <div class="flex items-center gap-2 mb-2">
                <input type="color" v-model="form.accentColor" class="w-9 h-9 rounded cursor-pointer border border-charcoal-600 bg-charcoal-800 p-0.5 shrink-0" />
                <input v-model="form.accentColor" class="app-inp text-sm flex-1 font-mono" placeholder="#E8A83E" />
              </div>
              <div v-if="orgBrandColors.length" class="mb-2">
                <p class="text-[10px] text-cream-faint/60 mb-1.5">Brand</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="c in orgBrandColors" :key="c"
                    @click="form.accentColor = c"
                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    :class="form.accentColor === c ? 'border-cream/80' : 'border-transparent'"
                    :style="{ background: c }"
                  />
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in accentSwatches" :key="c"
                  @click="form.accentColor = c"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.accentColor === c ? 'border-cream/80' : 'border-transparent'"
                  :style="{ background: c }"
                />
              </div>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Font Family -->
            <div class="space-y-1">
              <p class="text-[10px] uppercase tracking-wider text-cream-faint">Font Family</p>
              <select v-model="form.fontFamily" class="app-select text-sm">
                <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Logo upload (Design tab) -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Logo</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-10 w-auto rounded border border-charcoal-600 bg-charcoal-700 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-cream-faint hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> Remove
                </button>
              </div>
              <div v-if="savedLogos.length" class="flex flex-wrap gap-2 mb-2">
                <button
                  v-for="logo in savedLogos" :key="logo.id"
                  @click="form.logoUrl = logo.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.logoUrl === logo.url ? 'border-amber' : 'border-charcoal-600 hover:border-amber/50'"
                >
                  <img :src="logo.url" alt="Logo" class="h-8 w-auto object-contain" style="max-width: 60px" />
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-charcoal-600 hover:border-amber/50 text-xs text-cream-faint hover:text-cream transition-colors">
                <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ isUploadingLogo ? 'Uploading…' : form.logoUrl ? 'Replace logo' : 'Upload logo' }}
                <input type="file" accept="image/*" class="hidden" :disabled="isUploadingLogo" @change="handleLogoUpload" />
              </label>
            </div>

            <!-- Signature -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Signature</p>
              <div v-if="form.signatureUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto rounded border border-charcoal-600 bg-charcoal-700 object-contain p-1" />
                <button @click="form.signatureUrl = ''" class="text-xs text-cream-faint hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> Remove
                </button>
              </div>
              <div v-if="savedSignatures.length" class="flex flex-wrap gap-2 mb-2">
                <button
                  v-for="sig in savedSignatures" :key="sig.id"
                  @click="form.signatureUrl = sig.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.signatureUrl === sig.url ? 'border-amber' : 'border-charcoal-600 hover:border-amber/50'"
                >
                  <img :src="sig.url" alt="Signature" class="h-8 w-auto object-contain" style="max-width: 80px" />
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-charcoal-600 hover:border-amber/50 text-xs text-cream-faint hover:text-cream transition-colors">
                <Icon v-if="isUploadingSig" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:pen-line" class="w-3.5 h-3.5" />
                {{ isUploadingSig ? 'Uploading…' : form.signatureUrl ? 'Replace signature' : 'Upload signature' }}
                <input type="file" accept="image/*" class="hidden" :disabled="isUploadingSig" @change="handleSignatureUpload" />
              </label>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Stamp -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-2">Stamp / Watermark</p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  @click="form.stamp = ''"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === '' ? 'border-amber bg-amber/10 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500'
                  ]"
                >None</button>
                <button
                  v-for="s in orgStamps" :key="s.text"
                  type="button"
                  @click="form.stamp = s.text"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === s.text ? 'border-amber bg-amber/10 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500'
                  ]"
                  :style="form.stamp !== s.text ? { color: s.color + 'cc', borderColor: s.color + '40' } : {}"
                >{{ s.text }}</button>
              </div>
            </div>

            <!-- Watermark text -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-wider text-cream-faint">Watermark Text</p>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <span class="text-[10px] text-cream-faint">{{ form.showWatermark ? 'Visible' : 'Hidden' }}</span>
                  <div class="relative">
                    <input type="checkbox" v-model="form.showWatermark" class="sr-only" />
                    <div :class="['w-8 h-4 rounded-full transition-colors', form.showWatermark ? 'bg-amber' : 'bg-charcoal-600']"></div>
                    <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', form.showWatermark ? 'left-4' : 'left-0.5']"></div>
                  </div>
                </label>
              </div>
              <input v-model="form.watermarkText" class="app-inp text-sm" placeholder="CONFIDENTIAL" />
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Show/hide toggles -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-cream-faint mb-3">Show / Hide</p>
              <div class="space-y-2.5">
                <div v-for="field in toggleFields" :key="field.key" class="flex items-center justify-between">
                  <span class="text-xs text-cream-muted">{{ field.label }}</span>
                  <label class="flex items-center cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" v-model="(form as any)[field.key]" class="sr-only" />
                      <div :class="['w-8 h-4 rounded-full transition-colors', (form as any)[field.key] ? 'bg-amber' : 'bg-charcoal-600']"></div>
                      <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', (form as any)[field.key] ? 'left-4' : 'left-0.5']"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- SETTINGS TAB                                                      -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'Settings'">

            <div class="space-y-3">
              <!-- Invoice Number -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Invoice Number</label>
                <input v-model="form.number" class="app-inp text-sm font-mono" placeholder="INV-0001" />
              </div>

              <!-- Payment Terms -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Payment Terms</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="term in paymentTermsOptions" :key="term"
                    @click="form.paymentTerms = term"
                    :class="[
                      'py-1.5 px-2 rounded border text-xs transition-colors text-left',
                      form.paymentTerms === term ? 'border-amber bg-amber/10 text-amber' : 'border-charcoal-600 text-cream-faint hover:border-charcoal-500 hover:text-cream'
                    ]"
                  >{{ term }}</button>
                </div>
              </div>

              <!-- Issue Date -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Issue Date</label>
                <input v-model="form.issueDate" type="date" class="app-inp text-sm" />
              </div>

              <!-- Due Date -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">
                  Due Date
                  <span v-if="form.paymentTerms !== 'Custom'" class="text-cream-faint/50 normal-case">(auto)</span>
                </label>
                <input
                  v-model="form.dueDate"
                  type="date"
                  class="app-inp text-sm"
                  :disabled="form.paymentTerms !== 'Custom'"
                  :class="form.paymentTerms !== 'Custom' ? 'opacity-60' : ''"
                />
              </div>

              <!-- Currency -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Currency</label>
                <select v-model="form.currency" class="app-select text-sm">
                  <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.label }}</option>
                </select>
              </div>

              <!-- PO Number -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">PO Number <span class="text-cream-faint/50 normal-case">(optional)</span></label>
                <input v-model="form.poNumber" class="app-inp text-sm" placeholder="PO-2024-001" />
              </div>

              <div class="h-px bg-charcoal-700"></div>

              <!-- Notes -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Notes / Payment Instructions</label>
                <textarea v-model="form.notes" class="app-inp text-sm resize-none" rows="4" placeholder="Payment due within 30 days…" />
              </div>

              <!-- Footer text -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-cream-faint">Custom Footer Text</label>
                <input v-model="form.footerText" class="app-inp text-sm" placeholder="Thank you for your business!" />
              </div>
            </div>
          </template>

        </div><!-- /scrollable sidebar content -->
      </aside>

      <!-- ── Preview panel ──────────────────────────────────────────────────── -->
      <main class="flex-1 bg-charcoal-900/50 overflow-y-auto flex flex-col items-center">

        <!-- Zoom controls -->
        <div class="sticky top-0 z-10 w-full flex items-center justify-end gap-2 px-6 py-2 bg-charcoal-900/80 backdrop-blur-sm border-b border-charcoal-800">
          <span class="text-xs text-cream-faint mr-2">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomOut" class="p-1.5 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream transition-colors">
            <Icon icon="lucide:minus" class="w-3.5 h-3.5" />
          </button>
          <button @click="zoomIn" class="p-1.5 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream transition-colors">
            <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
          </button>
          <button @click="zoomFit" class="px-2.5 py-1 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-muted hover:text-cream text-xs transition-colors">
            Fit
          </button>
        </div>

        <!-- Document wrapper -->
        <div class="py-8 px-6 w-full flex justify-center">
          <div
            class="origin-top print-zoom-wrapper"
            :style="{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: '794px',
              marginBottom: `${(zoom - 1) * -100}%`,
            }"
          >

            <!-- ══════════════════════════════════════════════════════════════ -->
            <!-- THEME: CLASSIC                                                  -->
            <!-- ══════════════════════════════════════════════════════════════ -->
            <div
              v-if="form.theme === 'classic'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Top accent bar -->
              <div v-if="form.showTopBar" class="h-1.5 w-full" :style="{ backgroundColor: form.accentColor }"></div>

              <!-- Watermark -->
              <div
                v-if="form.showWatermark && form.watermarkText"
                class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                style="transform: rotate(-35deg); z-index: 1"
              >
                <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
              </div>

              <!-- Stamp overlay -->
              <div
                v-if="form.stamp"
                class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                style="transform: rotate(-25deg); z-index: 2"
              >
                <div
                  class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]"
                  :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }"
                >{{ form.stamp }}</div>
              </div>

              <div class="p-10" style="position: relative; z-index: 3">
                <!-- Header -->
                <div class="flex justify-between items-start mb-8">
                  <div class="flex items-start gap-4">
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-14 w-auto object-contain" />
                    <div>
                      <div class="text-xl font-bold mb-0.5" :style="{ color: form.accentColor }">{{ form.fromName || 'Your Studio' }}</div>
                      <div v-if="form.fromTagline" class="text-xs text-gray-400 mb-1">{{ form.fromTagline }}</div>
                      <div class="text-xs text-gray-400 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
                      <div v-if="form.fromEmail" class="text-xs text-gray-400 mt-1">{{ form.fromEmail }}</div>
                      <div v-if="form.fromPhone" class="text-xs text-gray-400">{{ form.fromPhone }}</div>
                      <div v-if="form.fromWebsite" class="text-xs text-gray-400">{{ form.fromWebsite }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-4xl font-bold text-gray-200 tracking-widest" style="font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: 0.15em">INVOICE</div>
                    <div class="font-mono text-sm text-gray-400 mt-1">{{ form.number }}</div>
                  </div>
                </div>

                <!-- Divider -->
                <div class="h-px mb-6" :style="{ backgroundColor: form.accentColor + '30' }"></div>

                <!-- Dates row -->
                <div class="flex gap-10 mb-8 text-xs">
                  <div>
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Issue Date</div>
                    <div class="font-semibold text-gray-700">{{ formatDate(form.issueDate) }}</div>
                  </div>
                  <div>
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Due Date</div>
                    <div class="font-semibold text-gray-700">{{ formatDate(form.dueDate) }}</div>
                  </div>
                  <div v-if="form.currency !== 'USD'">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Currency</div>
                    <div class="font-semibold text-gray-700">{{ form.currency }}</div>
                  </div>
                  <div v-if="form.poNumber">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">PO Number</div>
                    <div class="font-semibold text-gray-700">{{ form.poNumber }}</div>
                  </div>
                </div>

                <!-- Bill To -->
                <div class="mb-8">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Bill To</div>
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
                      <th class="text-left py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
                      <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
                      <th class="text-center py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
                      <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
                      <th class="text-right py-2.5 px-3 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
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
                  <div style="width: 240px" class="space-y-1.5 text-sm">
                    <div class="flex justify-between text-gray-500">
                      <span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span>
                    </div>
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
                      <span class="text-gray-800">Total</span>
                      <span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Signature -->
                <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
                  <img :src="form.signatureUrl" alt="Signature" class="h-12 w-auto object-contain" />
                  <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
                  <div class="text-gray-400 mt-1" style="font-size: 10px">Authorized Signature</div>
                </div>

                <!-- Notes -->
                <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-bottom: 16px">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Notes</div>
                  <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ form.notes }}</p>
                </div>

                <!-- Bank details + Payment links -->
                <div v-if="form.showBankDetails" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
                  <div class="text-gray-400 uppercase tracking-widest mb-3" style="font-size:10px">Bank / Payment Details</div>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1" style="font-size: 12px">
                    <div v-if="form.fromBankName" class="flex gap-2"><span class="text-gray-400">Bank:</span><span class="text-gray-700">{{ form.fromBankName }}</span></div>
                    <div v-if="form.fromBankAccountName" class="flex gap-2"><span class="text-gray-400">Name:</span><span class="text-gray-700">{{ form.fromBankAccountName }}</span></div>
                    <div v-if="form.fromBankAccountNumber" class="flex gap-2"><span class="text-gray-400">Account:</span><span class="font-mono text-gray-700">{{ form.fromBankAccountNumber }}</span></div>
                    <div v-if="form.fromBankSortCode" class="flex gap-2"><span class="text-gray-400">Sort Code:</span><span class="font-mono text-gray-700">{{ form.fromBankSortCode }}</span></div>
                    <div v-if="form.fromBankIban" class="flex gap-2"><span class="text-gray-400">IBAN:</span><span class="font-mono text-gray-700">{{ form.fromBankIban }}</span></div>
                  </div>
                  <div v-if="form.paymentLinks.length" class="flex flex-wrap gap-3 mt-3">
                    <div v-for="link in form.paymentLinks" :key="link.id" class="flex items-center gap-1.5" style="font-size: 11px">
                      <span class="text-gray-400 font-medium">{{ link.type }}:</span>
                      <span class="text-blue-600 font-mono">{{ link.value || '—' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px" class="flex justify-between items-center">
                  <div class="text-gray-400" style="font-size: 11px">{{ form.footerText || form.fromWebsite }}</div>
                  <div v-if="form.showFlowtaliTag" class="text-gray-300" style="font-size: 10px">Generated with Flowtali · flowtali.com</div>
                </div>
                <div v-else-if="form.showFlowtaliTag" class="text-center mt-6 text-gray-300" style="font-size: 10px">Generated with Flowtali · flowtali.com</div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════════ -->
            <!-- THEME: MODERN                                                   -->
            <!-- ══════════════════════════════════════════════════════════════ -->
            <div
              v-else-if="form.theme === 'modern'"
              class="print-document bg-white shadow-2xl relative overflow-hidden flex"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
              </div>
              <!-- Stamp -->
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

                <!-- Bank details in sidebar -->
                <div v-if="form.showBankDetails" class="mt-8 pt-6" style="border-top: 1px solid rgba(255,255,255,0.2)">
                  <div class="text-white/50 uppercase tracking-widest mb-3" style="font-size:9px">Bank / Payment</div>
                  <div class="space-y-1 text-xs text-white/70">
                    <div v-if="form.fromBankName">{{ form.fromBankName }}</div>
                    <div v-if="form.fromBankAccountName">{{ form.fromBankAccountName }}</div>
                    <div v-if="form.fromBankAccountNumber" class="font-mono">{{ form.fromBankAccountNumber }}</div>
                    <div v-if="form.fromBankSortCode" class="font-mono">{{ form.fromBankSortCode }}</div>
                    <div v-if="form.fromBankIban" class="font-mono text-[10px]">{{ form.fromBankIban }}</div>
                    <div v-for="link in form.paymentLinks" :key="link.id" class="text-white/60" style="font-size:10px">
                      <span class="text-white/40">{{ link.type }}:</span> {{ link.value || '—' }}
                    </div>
                  </div>
                </div>

                <div class="flex-1"></div>
                <div v-if="form.showFlowtaliTag" class="text-white/30 text-center" style="font-size:9px">flowtali.com</div>
              </div>

              <!-- Right content -->
              <div class="flex-1 p-10" style="position: relative; z-index: 3">
                <!-- Header row -->
                <div class="flex justify-between items-start mb-8">
                  <div>
                    <div class="text-3xl font-bold text-gray-200 tracking-widest" style="letter-spacing: 0.12em">INVOICE</div>
                    <div class="font-mono text-sm text-gray-400 mt-1">{{ form.number }}</div>
                  </div>
                  <div class="text-right text-xs">
                    <div class="mb-2">
                      <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">Issue Date</div>
                      <div class="font-semibold text-gray-700">{{ formatDate(form.issueDate) }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">Due Date</div>
                      <div class="font-semibold text-gray-700">{{ formatDate(form.dueDate) }}</div>
                    </div>
                    <div v-if="form.poNumber" class="mt-2">
                      <div class="text-gray-400 uppercase tracking-widest" style="font-size:10px">PO Number</div>
                      <div class="font-semibold text-gray-700">{{ form.poNumber }}</div>
                    </div>
                  </div>
                </div>

                <!-- Bill To -->
                <div class="mb-8 p-4 rounded-lg" :style="{ backgroundColor: form.accentColor + '0d' }">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Bill To</div>
                  <div class="font-semibold text-gray-800">{{ form.toName || '—' }}</div>
                  <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
                  <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
                  <div v-if="form.toPhone" class="text-xs text-gray-500">{{ form.toPhone }}</div>
                  <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
                </div>

                <!-- Items table -->
                <table class="w-full mb-6" style="border-collapse: collapse;">
                  <thead>
                    <tr :style="{ borderBottom: `2px solid ${form.accentColor}` }">
                      <th class="text-left pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Description</th>
                      <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Qty</th>
                      <th class="text-center pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Unit</th>
                      <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Rate</th>
                      <th class="text-right pb-2 text-gray-500 uppercase tracking-wide font-semibold" style="font-size:10px">Amount</th>
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
                  <div style="width: 240px" class="space-y-1.5 text-sm">
                    <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                    <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
                    <template v-for="tax in form.taxes" :key="tax.id">
                      <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
                    </template>
                    <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
                    <div class="flex justify-between font-bold text-base"><span class="text-gray-800">Total</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span></div>
                  </div>
                </div>

                <!-- Signature -->
                <div v-if="form.signatureUrl" class="mb-4 flex flex-col items-end">
                  <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
                  <div style="width: 120px; height:1px; background: #d1d5db; margin-top: 4px"></div>
                  <div class="text-gray-400 mt-1" style="font-size:10px">Authorized Signature</div>
                </div>

                <!-- Notes -->
                <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 20px">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size:10px">Notes</div>
                  <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size:12px">{{ form.notes }}</p>
                </div>

                <div v-if="form.footerText" class="mt-4 text-gray-400 text-xs">{{ form.footerText }}</div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════════ -->
            <!-- THEME: MINIMAL                                                  -->
            <!-- ══════════════════════════════════════════════════════════════ -->
            <div
              v-else-if="form.theme === 'minimal'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#374151', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
              </div>
              <!-- Stamp -->
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>

              <div class="p-12" style="position: relative; z-index: 3">
                <!-- Header -->
                <div class="flex justify-between items-start mb-10">
                  <div>
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-8 w-auto object-contain mb-3" />
                    <div class="font-semibold text-gray-900 uppercase tracking-widest text-sm">{{ form.fromName }}</div>
                    <div v-if="form.fromTagline" class="text-gray-400 text-xs mt-0.5">{{ form.fromTagline }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-4xl font-light text-gray-200 tracking-widest uppercase">Invoice</div>
                    <div class="font-mono text-xs text-gray-400 mt-2">{{ form.number }}</div>
                  </div>
                </div>

                <div style="height: 1px; background: #e5e7eb; margin-bottom: 32px"></div>

                <!-- Info row -->
                <div class="flex gap-16 mb-8 text-xs">
                  <div>
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">From</div>
                    <div class="text-gray-500 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
                    <div v-if="form.fromEmail" class="text-gray-500">{{ form.fromEmail }}</div>
                    <div v-if="form.fromPhone" class="text-gray-500">{{ form.fromPhone }}</div>
                  </div>
                  <div>
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">Bill To</div>
                    <div class="font-medium text-gray-700">{{ form.toName || '—' }}</div>
                    <div v-if="form.toCompany" class="text-gray-500">{{ form.toCompany }}</div>
                    <div v-if="form.toEmail" class="text-gray-500">{{ form.toEmail }}</div>
                    <div v-if="form.toAddress" class="text-gray-500 whitespace-pre-line">{{ form.toAddress }}</div>
                  </div>
                  <div>
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">Dates</div>
                    <div class="text-gray-400" style="font-size: 10px">Issued</div>
                    <div class="font-medium text-gray-700 mb-2">{{ formatDate(form.issueDate) }}</div>
                    <div class="text-gray-400" style="font-size: 10px">Due</div>
                    <div class="font-medium text-gray-700">{{ formatDate(form.dueDate) }}</div>
                    <div v-if="form.poNumber" class="mt-2">
                      <div class="text-gray-400" style="font-size: 10px">PO</div>
                      <div class="font-medium text-gray-700">{{ form.poNumber }}</div>
                    </div>
                  </div>
                </div>

                <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px"></div>

                <!-- Items table -->
                <table class="w-full mb-6" style="border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 1px solid #e5e7eb">
                      <th class="text-left pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">Description</th>
                      <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">Qty</th>
                      <th class="text-center pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">Unit</th>
                      <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">Rate</th>
                      <th class="text-right pb-2 text-gray-400 uppercase tracking-wide font-medium" style="font-size: 9px">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in form.items" :key="item.id" style="border-bottom: 1px solid #f9fafb">
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
                    <div class="flex justify-between text-gray-400"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                    <div v-if="form.discount > 0" class="flex justify-between text-gray-400"><span>Discount</span><span class="font-mono">-{{ fmtMoney(discountAmt) }}</span></div>
                    <template v-for="tax in form.taxes" :key="tax.id">
                      <div v-if="tax.rate > 0" class="flex justify-between text-gray-400"><span>{{ tax.label }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
                    </template>
                    <div style="height: 1px; background: #111827; margin: 8px 0"></div>
                    <div class="flex justify-between font-bold text-base text-gray-900"><span>Total</span><span class="font-mono">{{ fmtMoney(total) }}</span></div>
                  </div>
                </div>

                <!-- Signature -->
                <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
                  <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
                  <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
                  <div class="text-gray-400 mt-1" style="font-size: 10px">Authorized Signature</div>
                </div>

                <!-- Notes -->
                <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-bottom: 16px">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size: 9px">Notes</div>
                  <p class="text-gray-400 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ form.notes }}</p>
                </div>

                <!-- Bank details + Payment links -->
                <div v-if="form.showBankDetails" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
                  <div class="text-gray-400 uppercase tracking-widest mb-2" style="font-size: 9px">Payment Details</div>
                  <div class="text-gray-500 space-y-0.5" style="font-size: 12px">
                    <div v-if="form.fromBankName">Bank: {{ form.fromBankName }}</div>
                    <div v-if="form.fromBankAccountName">Name: {{ form.fromBankAccountName }}</div>
                    <div v-if="form.fromBankAccountNumber" class="font-mono">Account: {{ form.fromBankAccountNumber }}</div>
                    <div v-if="form.fromBankSortCode" class="font-mono">Sort: {{ form.fromBankSortCode }}</div>
                    <div v-if="form.fromBankIban" class="font-mono text-xs">IBAN: {{ form.fromBankIban }}</div>
                    <div v-for="link in form.paymentLinks" :key="link.id">
                      <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono text-xs">{{ link.value || '—' }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px" class="flex justify-between">
                  <div class="text-gray-400" style="font-size: 11px">{{ form.footerText || form.fromWebsite }}</div>
                  <div v-if="form.showFlowtaliTag" class="text-gray-300" style="font-size: 10px">Generated with Flowtali</div>
                </div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════════ -->
            <!-- THEME: BOLD                                                     -->
            <!-- ══════════════════════════════════════════════════════════════ -->
            <div
              v-else-if="form.theme === 'bold'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
              </div>
              <!-- Stamp -->
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>

              <!-- Full-width header -->
              <div :style="{ backgroundColor: form.accentColor }" class="px-10 py-8 flex justify-between items-center" style="position: relative; z-index: 3">
                <div class="flex items-center gap-4">
                  <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-14 w-auto object-contain brightness-0 invert" />
                  <div>
                    <div class="text-white font-bold text-xl">{{ form.fromName }}</div>
                    <div v-if="form.fromTagline" class="text-white/70 text-sm">{{ form.fromTagline }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-white font-black text-5xl tracking-widest" style="letter-spacing: 0.15em">INVOICE</div>
                  <div class="font-mono text-white/70 text-sm mt-1">{{ form.number }}</div>
                </div>
              </div>

              <!-- Company info row -->
              <div class="grid grid-cols-3 gap-6 px-10 py-5 bg-gray-50 border-b border-gray-200" style="position: relative; z-index: 3">
                <div class="text-xs">
                  <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">Contact</div>
                  <div v-if="form.fromEmail" class="text-gray-600">{{ form.fromEmail }}</div>
                  <div v-if="form.fromPhone" class="text-gray-600">{{ form.fromPhone }}</div>
                  <div v-if="form.fromWebsite" class="text-gray-600">{{ form.fromWebsite }}</div>
                </div>
                <div class="text-xs">
                  <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">Address</div>
                  <div class="text-gray-600 whitespace-pre-line">{{ form.fromAddress }}</div>
                </div>
                <div class="text-xs text-right">
                  <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">Issue Date</div>
                  <div class="text-gray-700 font-medium">{{ formatDate(form.issueDate) }}</div>
                  <div class="text-gray-400 uppercase tracking-widest mt-2 mb-1" style="font-size: 9px">Due Date</div>
                  <div class="text-gray-700 font-medium">{{ formatDate(form.dueDate) }}</div>
                  <div v-if="form.poNumber" class="mt-2">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size: 9px">PO Number</div>
                    <div class="text-gray-700 font-medium">{{ form.poNumber }}</div>
                  </div>
                </div>
              </div>

              <!-- Content -->
              <div class="px-10 py-8" style="position: relative; z-index: 3">
                <!-- Bill To -->
                <div class="mb-8">
                  <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">Bill To</div>
                  <div class="font-semibold text-gray-800 text-sm">{{ form.toName || '—' }}</div>
                  <div v-if="form.toCompany" class="text-xs text-gray-500">{{ form.toCompany }}</div>
                  <div v-if="form.toEmail" class="text-xs text-gray-500">{{ form.toEmail }}</div>
                  <div v-if="form.toPhone" class="text-xs text-gray-500">{{ form.toPhone }}</div>
                  <div v-if="form.toAddress" class="text-xs text-gray-500 whitespace-pre-line mt-1">{{ form.toAddress }}</div>
                </div>

                <!-- Items table -->
                <table class="w-full mb-6" style="border-collapse: collapse;">
                  <thead>
                    <tr :style="{ backgroundColor: form.accentColor }">
                      <th class="text-left py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">Description</th>
                      <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">Qty</th>
                      <th class="text-center py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">Unit</th>
                      <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">Rate</th>
                      <th class="text-right py-3 px-4 text-white uppercase tracking-wide font-semibold" style="font-size: 10px">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in form.items" :key="item.id" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }">
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
                      <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                      <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
                      <template v-for="tax in form.taxes" :key="tax.id">
                        <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
                      </template>
                    </div>
                    <div :style="{ backgroundColor: form.accentColor }" class="flex justify-between font-bold text-base text-white px-4 py-3 rounded mt-3">
                      <span>Total Due</span>
                      <span class="font-mono">{{ fmtMoney(total) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Signature -->
                <div v-if="form.signatureUrl" class="mb-6 flex flex-col items-end">
                  <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
                  <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
                  <div class="text-gray-400 mt-1" style="font-size: 10px">Authorized Signature</div>
                </div>

                <!-- Notes -->
                <div v-if="form.showNotes && form.notes" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
                  <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">Notes</div>
                  <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ form.notes }}</p>
                </div>

                <!-- Bank + Payment links -->
                <div v-if="form.showBankDetails" style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 16px">
                  <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 10px">Payment Details</div>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                    <div v-if="form.fromBankName">Bank: {{ form.fromBankName }}</div>
                    <div v-if="form.fromBankAccountName">Name: {{ form.fromBankAccountName }}</div>
                    <div v-if="form.fromBankAccountNumber" class="font-mono">Account: {{ form.fromBankAccountNumber }}</div>
                    <div v-if="form.fromBankSortCode" class="font-mono">Sort: {{ form.fromBankSortCode }}</div>
                    <div v-if="form.fromBankIban" class="font-mono">IBAN: {{ form.fromBankIban }}</div>
                    <div v-for="link in form.paymentLinks" :key="link.id">
                      <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono">{{ link.value || '—' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div v-if="form.showFooterLine" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px" class="flex justify-between">
                  <div class="text-gray-400 text-xs">{{ form.footerText || form.fromWebsite }}</div>
                  <div v-if="form.showFlowtaliTag" class="text-gray-300" style="font-size: 10px">Generated with Flowtali · flowtali.com</div>
                </div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════════ -->
            <!-- THEME: EXECUTIVE                                                -->
            <!-- ══════════════════════════════════════════════════════════════ -->
            <div
              v-else-if="form.theme === 'executive'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermarkText" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-7xl font-black tracking-widest opacity-[0.04] text-gray-800 whitespace-nowrap">{{ form.watermarkText }}</span>
              </div>
              <!-- Stamp -->
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>

              <div class="p-10" style="position: relative; z-index: 3">
                <!-- Two-col top section -->
                <div class="grid grid-cols-2 gap-6 mb-8">
                  <!-- Company details box -->
                  <div class="p-5 rounded border" :style="{ borderColor: form.accentColor + '40' }">
                    <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">From</div>
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-10 w-auto object-contain mb-3" />
                    <div class="font-bold text-gray-800 text-sm">{{ form.fromName }}</div>
                    <div v-if="form.fromTagline" class="text-xs text-gray-400 mb-2">{{ form.fromTagline }}</div>
                    <div class="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{{ form.fromAddress }}</div>
                    <div v-if="form.fromEmail" class="text-xs text-gray-500 mt-1">{{ form.fromEmail }}</div>
                    <div v-if="form.fromPhone" class="text-xs text-gray-500">{{ form.fromPhone }}</div>
                    <div v-if="form.fromWebsite" class="text-xs text-gray-500">{{ form.fromWebsite }}</div>
                  </div>
                  <!-- Invoice details box -->
                  <div class="p-5 rounded border" :style="{ borderColor: form.accentColor + '40' }">
                    <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">Invoice Details</div>
                    <div class="text-3xl font-black tracking-widest text-gray-200 mb-3" style="letter-spacing: 0.1em">INVOICE</div>
                    <div class="space-y-2 text-xs">
                      <div class="flex justify-between">
                        <span class="text-gray-400">Number</span>
                        <span class="font-mono font-semibold text-gray-700">{{ form.number }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-400">Issue Date</span>
                        <span class="font-semibold text-gray-700">{{ formatDate(form.issueDate) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-400">Due Date</span>
                        <span class="font-semibold text-gray-700">{{ formatDate(form.dueDate) }}</span>
                      </div>
                      <div v-if="form.currency !== 'USD'" class="flex justify-between">
                        <span class="text-gray-400">Currency</span>
                        <span class="font-semibold text-gray-700">{{ form.currency }}</span>
                      </div>
                      <div v-if="form.poNumber" class="flex justify-between">
                        <span class="text-gray-400">PO Number</span>
                        <span class="font-semibold text-gray-700">{{ form.poNumber }}</span>
                      </div>
                      <div style="border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px">
                        <div class="text-gray-400 mb-1" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em">Bill To</div>
                        <div class="font-semibold text-gray-800">{{ form.toName || '—' }}</div>
                        <div v-if="form.toCompany" class="text-gray-500">{{ form.toCompany }}</div>
                        <div v-if="form.toEmail" class="text-gray-500">{{ form.toEmail }}</div>
                        <div v-if="form.toAddress" class="text-gray-500 whitespace-pre-line">{{ form.toAddress }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Items table -->
                <table class="w-full mb-6" style="border-collapse: collapse; border: 1px solid #e5e7eb">
                  <thead>
                    <tr :style="{ backgroundColor: form.accentColor + '14', borderBottom: `2px solid ${form.accentColor}` }">
                      <th class="text-left py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">Description</th>
                      <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">Qty</th>
                      <th class="text-center py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">Unit</th>
                      <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">Rate</th>
                      <th class="text-right py-3 px-4 text-gray-600 uppercase tracking-wide font-semibold" style="font-size: 10px">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in form.items" :key="item.id" :style="{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }">
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
                    <div v-if="form.showNotes && form.notes">
                      <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 9px">Notes</div>
                      <p class="text-gray-500 leading-relaxed whitespace-pre-line" style="font-size: 12px">{{ form.notes }}</p>
                    </div>
                    <div v-if="form.showBankDetails" :class="form.showNotes && form.notes ? 'mt-4' : ''">
                      <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-2" style="font-size: 9px">Payment Details</div>
                      <div class="text-xs text-gray-600 space-y-0.5">
                        <div v-if="form.fromBankName">Bank: {{ form.fromBankName }}</div>
                        <div v-if="form.fromBankAccountName">Name: {{ form.fromBankAccountName }}</div>
                        <div v-if="form.fromBankAccountNumber" class="font-mono">Account: {{ form.fromBankAccountNumber }}</div>
                        <div v-if="form.fromBankSortCode" class="font-mono">Sort: {{ form.fromBankSortCode }}</div>
                        <div v-if="form.fromBankIban" class="font-mono">IBAN: {{ form.fromBankIban }}</div>
                        <div v-for="link in form.paymentLinks" :key="link.id">
                          <span class="text-gray-400">{{ link.type }}:</span> <span class="text-blue-500 font-mono">{{ link.value || '—' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Totals -->
                  <div>
                    <div :style="{ color: form.accentColor }" class="uppercase tracking-widest font-bold mb-3" style="font-size: 9px">Summary</div>
                    <div class="space-y-1.5 text-sm border rounded p-4" :style="{ borderColor: form.accentColor + '30' }">
                      <div class="flex justify-between text-gray-500"><span>Subtotal</span><span class="font-mono">{{ fmtMoney(subtotal) }}</span></div>
                      <div v-if="form.discount > 0" class="flex justify-between text-gray-500"><span>Discount{{ form.discountType === 'percent' ? ` (${form.discount}%)` : '' }}</span><span class="font-mono text-red-500">-{{ fmtMoney(discountAmt) }}</span></div>
                      <template v-for="tax in form.taxes" :key="tax.id">
                        <div v-if="tax.rate > 0" class="flex justify-between text-gray-500"><span>{{ tax.label }}{{ tax.type !== 'flat' ? ` (${tax.rate}%)` : '' }}</span><span class="font-mono">{{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}</span></div>
                      </template>
                      <div style="height: 1px; background: #e5e7eb; margin: 8px 0"></div>
                      <div class="flex justify-between font-bold text-base"><span class="text-gray-800">Total</span><span class="font-mono" :style="{ color: form.accentColor }">{{ fmtMoney(total) }}</span></div>
                    </div>

                    <!-- Signature -->
                    <div v-if="form.signatureUrl" class="mt-6 flex flex-col items-end">
                      <img :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain" />
                      <div style="width: 120px; height: 1px; background: #d1d5db; margin-top: 4px"></div>
                      <div class="text-gray-400 mt-1" style="font-size: 10px">Authorized Signature</div>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div v-if="form.showFooterLine" style="border-top: 2px solid; margin-top: 24px; padding-top: 16px" :style="{ borderColor: form.accentColor + '40' }" class="flex justify-between">
                  <div class="text-gray-400 text-xs">{{ form.footerText || form.fromWebsite }}</div>
                  <div v-if="form.showFlowtaliTag" class="text-gray-300" style="font-size: 10px">Generated with Flowtali · flowtali.com</div>
                </div>
              </div>
            </div>

          </div><!-- /zoom wrapper -->
        </div><!-- /document wrapper py-8 -->
      </main>

    </div><!-- /split layout -->
  </div><!-- /root -->

  <!-- Share modal -->
  <ShareLinkModal
    v-if="showShareModal"
    resource-type="invoice"
    :org-id="orgId"
    :resource-id="savedInvoiceId"
    :resource-name="form.number"
    @close="showShareModal = false"
  />
</template>

<style>
@media print {
  body * { visibility: hidden; }
  .print-zoom-wrapper { transform: none !important; width: 100% !important; margin: 0 !important; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-shadow: none !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
