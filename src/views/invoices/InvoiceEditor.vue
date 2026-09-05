<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useLoaders } from '@/composables/loaders.ts'
import { useNotification } from '@/composables/notification.ts'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import InvoiceDocument from '@/components/invoice/InvoiceDocument.vue'
import { useAuthStore } from '@/stores/auth'
import { InvoiceService, type IInvoice, type IInvoiceDraftData } from '@/services/invoice.service'
import { MediaService } from '@/services/media.service'
import { AiService } from '@/services/ai.service'

// ─── Props & Emits ────────────────────────────────────────────────────────────
interface Props {
  mode: 'create' | 'edit'
  invoiceId?: string
  initialData?: Partial<typeof form.value>
  projectId?: string
}
const props = withDefaults(defineProps<Props>(), { mode: 'create' })

const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

// ─── Composables ──────────────────────────────────────────────────────────────
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
      notify(t('invoiceEditor.ai.notConfigured'), 'error')
      router.push({ name: 'settings', query: { tab: 'ai' } })
    } else if (b?.data?.invalid_model && b.message) {
      notify(b.message, 'error')
    } else {
      notify(t('invoiceEditor.ai.error'), 'error')
    }
  } finally {
    aiDescBusyId.value = null
  }
}

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
  accentColor: '#00c853',
  fontFamily: "var(--font-sans)",
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
        if (org.default_currency) form.value.currency = org.default_currency
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
  sym.value + n.toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Live preview document ────────────────────────────────────────────────────
// The preview, the view page, the shared link and the PDF all render through
// InvoiceDocument, so the editor maps its camelCase form onto the API shape.
const previewDoc = computed(() => ({
  id: props.invoiceId ?? '',
  status: 'draft',
  number:                   form.value.number,
  issue_date:               form.value.issueDate || null,
  due_date:                 form.value.dueDate || null,
  payment_terms:            form.value.paymentTerms || null,
  currency:                 form.value.currency,
  po_number:                form.value.poNumber || null,
  from_name:                form.value.fromName || null,
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
  stamp_color:              form.value.stamp ? stampColorFor(form.value.stamp) : null,
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
  uses: 0,
  last_used_at: null,
  totals: {
    subtotal:     subtotal.value,
    discount_amt: discountAmt.value,
    taxes_total:  taxesTotal.value,
    total:        total.value,
  },
  created_at: '',
  updated_at: '',
}) satisfies IInvoice)

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
type Tab = 'From' | 'To' | 'Items' | 'Design' | 'Settings' | 'Preview'
const tab = ref<Tab>('From')
const tabs: Tab[] = ['From', 'To', 'Items', 'Design', 'Settings', 'Preview']
const tabLabelKeys: Record<Tab, string> = {
  From: 'from', To: 'to', Items: 'items', Design: 'design', Settings: 'settings', Preview: 'preview',
}
const tabLabel = (tb: Tab) => t(`invoiceEditor.tabs.${tabLabelKeys[tb]}`)

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
    notify(t('invoiceEditor.toasts.logoUploadFailed'), 'error')
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
    notify(t('invoiceEditor.toasts.signatureUploadFailed'), 'error')
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
const themes = computed(() => [
  { id: 'classic', label: t('invoiceEditor.themes.classic') },
  { id: 'modern', label: t('invoiceEditor.themes.modern') },
  { id: 'minimal', label: t('invoiceEditor.themes.minimal') },
  { id: 'bold', label: t('invoiceEditor.themes.bold') },
  { id: 'executive', label: t('invoiceEditor.themes.executive') },
] as const)

const accentSwatches = ['#00c853', '#4f86c6', '#5ab88a', '#e05a5a', '#9b71c8', '#e8854a', '#3bbfc7', '#d4548a', '#1a1a1a', '#637074']

const fontOptions = [
  { value: "var(--font-sans)", label: 'Geist Sans (Modern)' },
  { value: "var(--font-sans)", label: 'Geist Sans (Elegant)' },
  { value: "var(--font-sans)", label: 'Geist Sans (Literary)' },
  { value: "'Lato', sans-serif", label: 'Lato (Clean)' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat (Contemporary)' },
  { value: "var(--font-mono)", label: 'Geist Mono (Technical)' },
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

const toggleFields = computed(() => [
  { key: 'showTopBar', label: t('invoiceEditor.toggles.showTopBar') },
  { key: 'showLogo', label: t('invoiceEditor.toggles.showLogo') },
  { key: 'showFooterLine', label: t('invoiceEditor.toggles.showFooterLine') },
  { key: 'showNotes', label: t('invoiceEditor.toggles.showNotes') },
  { key: 'showBankDetails', label: t('invoiceEditor.toggles.showBankDetails') },
  { key: 'showFlowtaliTag', label: t('invoiceEditor.toggles.showFlowtaliTag') },
] as const)

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
    return { ok: false, message: t('invoiceEditor.validation.numberRequired'), goTab: 'Settings' }
  }
  if (!form.value.items.length) {
    return { ok: false, message: t('invoiceEditor.validation.itemRequired'), goTab: 'Items' }
  }
  const emptyItem = form.value.items.find(i => !i.description.trim())
  if (emptyItem) {
    return { ok: false, message: t('invoiceEditor.validation.descriptionRequired'), goTab: 'Items' }
  }
  const emptyLink = form.value.paymentLinks.find(l => !l.value.trim())
  if (emptyLink) {
    return { ok: false, message: t('invoiceEditor.validation.linkValueRequired'), goTab: 'From' }
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
      const res = await InvoiceService.create(orgId.value, { ...payload, ...(props.projectId ? { project_id: props.projectId } : {}) })
      savedInvoiceId.value = res.data.data.id
      notify(t('invoiceEditor.toasts.created'), 'success')
    } else {
      await InvoiceService.update(orgId.value, props.invoiceId!, payload)
      notify(t('invoiceEditor.toasts.saved'), 'success')
    }
    emit('save', form.value)
    if (props.projectId && props.mode === 'create') {
      router.push({ name: 'projects.view', params: { id: props.projectId } })
    } else {
      router.push({ name: 'invoices' })
    }
  } catch (err: any) {
    const apiMessage = err?.response?.data?.message ?? err?.response?.data?.errors?.[0]
    notify(apiMessage ?? t('invoiceEditor.toasts.saveFailed'), 'error')
  } finally {
    setLoader('isSaving', false)
  }
}

const handleSaveDraft = () => handleSave('draft')

</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">

    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-4 md:px-5 h-13 border-b border-gray-400 bg-gray-100/90 backdrop-blur-md shrink-0 z-20">
      <div class="flex items-center gap-3">
        <button
          @click="router.push({ name: 'invoices' })"
          class="flex items-center gap-2 text-gray-900 hover:text-gray-1000 text-sm transition-colors"
        >
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.invoices') }}</span>
        </button>
        <span class="text-gray-500">/</span>
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-green-700/10 border border-green-700/25 flex items-center justify-center">
            <Icon icon="lucide:file-text" class="w-3 h-3 text-green-700" />
          </div>
          <span class="font-semibold text-gray-1000 text-sm">
            {{ mode === 'create' ? t('invoiceEditor.toolbar.newInvoice') : t('invoiceEditor.toolbar.editInvoice') }}
          </span>
          <span class="font-mono text-xs text-gray-700">{{ form.number }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handlePrint"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors"
          :title="t('invoiceEditor.toolbar.print')"
        >
          <Icon icon="lucide:printer" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.print') }}</span>
        </button>
        <button
          @click="showShareModal = true"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors"
          :title="t('invoiceEditor.toolbar.share')"
        >
          <Icon icon="lucide:share-2" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.share') }}</span>
        </button>
        <button
          @click="handleSaveDraft"
          :disabled="getLoader('isSaving')"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors disabled:opacity-50"
          :title="t('invoiceEditor.toolbar.saveDraft')"
        >
          <Icon icon="lucide:save" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ t('invoiceEditor.toolbar.saveDraft') }}</span>
        </button>
        <button
          @click="() => handleSave()"
          :disabled="getLoader('isSaving')"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-green-700 hover:bg-green-700/90 text-bg-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon v-if="getLoader('isSaving')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else icon="lucide:send" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ getLoader('isSaving') ? t('invoiceEditor.toolbar.saving') : (mode === 'create' ? t('invoiceEditor.toolbar.createInvoice') : t('invoiceEditor.toolbar.saveChanges')) }}</span>
        </button>
      </div>
    </div>

    <!-- ── Split layout ──────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ── Left sidebar ──────────────────────────────────────────────────── -->
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

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- FROM TAB                                                         -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'From'">

            <!-- Quick-fill profiles -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.quickFillProfiles') }}</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> {{ t('invoiceEditor.common.loading') }}
              </div>
              <div v-else-if="orgProfiles.length" class="space-y-1.5">
                <button
                  v-for="p in orgProfiles" :key="p.id"
                  type="button"
                  @click="fillFrom(p)"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group"
                >
                  <p class="text-xs font-medium text-gray-1000 group-hover:text-green-700 transition-colors">{{ p.name }}</p>
                  <p v-if="p.tagline" class="text-[10px] text-gray-700 mt-0.5 truncate">{{ p.tagline }}</p>
                  <p v-else-if="p.email" class="text-[10px] text-gray-700 mt-0.5 truncate">{{ p.email }}</p>
                </button>
              </div>
              <div v-else-if="draftData?.organization" class="space-y-1.5">
                <button
                  type="button"
                  @click="fillFrom({ name: draftData!.organization!.name })"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group"
                >
                  <p class="text-xs font-medium text-gray-1000 group-hover:text-green-700 transition-colors">{{ draftData.organization.name }}</p>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ t('invoiceEditor.from.orgNameLabel') }}</p>
                </button>
                <p class="text-[10px] text-gray-700/60">{{ t('invoiceEditor.from.addProfilesHint') }}</p>
              </div>
              <p v-else-if="!isDraftLoading" class="text-[10px] text-gray-700/60">{{ t('invoiceEditor.from.noProfiles') }}</p>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Fields -->
            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.companyName') }}</label>
                <input v-model="form.fromName" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.companyNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.tagline') }}</label>
                <input v-model="form.fromTagline" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.taglinePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.email') }}</label>
                <input v-model="form.fromEmail" type="email" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.emailPlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.phone') }}</label>
                <input v-model="form.fromPhone" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.phonePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.website') }}</label>
                <input v-model="form.fromWebsite" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.websitePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.address') }}</label>
                <textarea v-model="form.fromAddress" class="app-inp text-sm resize-none" rows="3" :placeholder="t('invoiceEditor.from.addressPlaceholder')" />
              </div>
            </div>

            <!-- Logo upload -->
            <div class="h-px bg-gray-400"></div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.logo') }}</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-12 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" /> {{ t('invoiceEditor.common.remove') }}
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ form.logoUrl ? t('invoiceEditor.from.replaceLogo') : t('invoiceEditor.from.uploadLogo') }}
                <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
              </label>
            </div>

            <!-- Bank / Payment Details -->
            <div class="h-px bg-gray-400"></div>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.bankDetails') }}</p>
              </div>
              <!-- Saved bank account quick-fill -->
              <div v-if="orgBankAccounts.length" class="space-y-1">
                <p class="text-[10px] text-gray-700/70 mb-1">{{ t('invoiceEditor.from.quickFillBank') }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="b in orgBankAccounts" :key="b.id"
                    type="button"
                    @click="fillBank(b)"
                    class="text-xs px-2.5 py-1 rounded border border-gray-500 text-gray-700 hover:border-green-700/50 hover:text-gray-1000 transition-colors"
                  >{{ b.label }}</button>
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

            <div class="h-px bg-gray-400"></div>

            <!-- Payment links -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.from.paymentLinks') }}</p>
              <!-- Saved payment link quick-add -->
              <div v-if="orgPaymentLinks.length" class="mb-2 space-y-1">
                <p class="text-[10px] text-gray-700/70">{{ t('invoiceEditor.from.addFromSaved') }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="pl in orgPaymentLinks" :key="pl.id"
                    type="button"
                    @click="addSavedPaymentLink(pl)"
                    class="text-xs px-2.5 py-1 rounded border border-gray-500 text-gray-700 hover:border-green-700/50 hover:text-gray-1000 transition-colors"
                  >{{ pl.label }}</button>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="link in form.paymentLinks" :key="link.id" class="bg-gray-400/40 border border-gray-500 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <select v-model="link.type" class="app-select text-xs flex-1 mr-2">
                      <option v-for="t in paymentLinkTypes" :key="t">{{ t }}</option>
                    </select>
                    <button @click="removePaymentLink(link.id)" class="text-gray-700 hover:text-red-400 transition-colors shrink-0">
                      <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    v-model="link.value"
                    class="app-inp text-sm"
                    :placeholder="link.type === 'PayPal' ? 'paypal.me/yourusername' : link.type === 'Venmo' ? '@yourusername' : link.type === 'Cash App' ? '$yourcashtag' : t('invoiceEditor.from.linkGenericPlaceholder')"
                  />
                </div>
              </div>
              <button
                @click="addPaymentLink"
                class="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-500 hover:border-green-700/50 rounded-lg text-xs text-gray-700 hover:text-gray-1000 transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoiceEditor.from.addPaymentLink') }}
              </button>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- TO TAB                                                           -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'To'">

            <!-- Client quick-picker -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.to.selectClient') }}</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> {{ t('invoiceEditor.common.loadingClients') }}
              </div>
              <div v-else-if="clientPresets.length" class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                <button
                  v-for="c in clientPresets" :key="c.id"
                  @click="fillTo(c)"
                  class="w-full text-left p-2.5 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group flex items-center gap-3"
                  :class="form.toEmail === c.email ? 'border-green-700/60 bg-green-700/5' : ''"
                >
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
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.billToName') }}</label>
                <input v-model="form.toName" class="app-inp text-sm" :placeholder="t('invoiceEditor.to.billToNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.company') }}</label>
                <input v-model="form.toCompany" class="app-inp text-sm" :placeholder="t('invoiceEditor.to.companyPlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.email') }}</label>
                <input v-model="form.toEmail" type="email" class="app-inp text-sm" :placeholder="t('invoiceEditor.to.emailPlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.phone') }}</label>
                <input v-model="form.toPhone" class="app-inp text-sm" :placeholder="t('invoiceEditor.from.phonePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.to.billingAddress') }}</label>
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
                class="bg-gray-400/40 border border-gray-500 rounded-lg p-3 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.items.item', { n: i + 1 }) }}</span>
                  <button v-if="form.items.length > 1" @click="removeItem(item.id)" class="text-gray-700 hover:text-red-400 transition-colors">
                    <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="flex items-center gap-1.5">
                  <input v-model="item.description" class="app-inp text-sm flex-1" :placeholder="t('invoiceEditor.items.descriptionPlaceholder')" />
                  <button
                    v-if="item.description.trim()"
                    type="button"
                    class="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-gray-500 text-gray-700 hover:text-green-700 hover:border-green-700/40 transition disabled:opacity-50"
                    :disabled="!!aiDescBusyId"
                    :title="t('invoiceEditor.ai.cleanUp')"
                    @click="cleanUpDescription(item)"
                  >
                    <Icon :icon="aiDescBusyId === item.id ? 'lucide:loader-2' : 'lucide:sparkles'" class="w-3.5 h-3.5" :class="aiDescBusyId === item.id && 'animate-spin'" />
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.items.qty') }}</label>
                    <input v-model.number="item.qty" type="number" min="0" class="app-inp text-sm" />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.items.unit') }}</label>
                    <select v-model="item.unit" class="app-select text-sm">
                      <option v-for="u in unitOptions" :key="u">{{ u }}</option>
                    </select>
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-gray-700">{{ t('invoiceEditor.items.rateWithSym', { sym }) }}</label>
                    <input v-model.number="item.rate" type="number" min="0" class="app-inp text-sm" />
                  </div>
                </div>
                <div class="text-right text-xs font-mono text-green-700">{{ fmtMoney(item.qty * item.rate) }}</div>
              </div>
            </div>

            <!-- Add item -->
            <button
              @click="addItem"
              class="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-500 hover:border-green-700/50 rounded-lg text-xs text-gray-700 hover:text-gray-1000 transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('invoiceEditor.items.addLineItem') }}
            </button>

            <div class="h-px bg-gray-400"></div>

            <!-- Discount -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.items.discount') }}</p>
              <div class="flex gap-2 mb-2">
                <button
                  @click="form.discountType = 'percent'"
                  :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'percent' ? 'bg-green-700/10 border-green-700 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']"
                >%</button>
                <button
                  @click="form.discountType = 'flat'"
                  :class="['flex-1 py-1.5 rounded text-xs border transition-colors', form.discountType === 'flat' ? 'bg-green-700/10 border-green-700 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']"
                >{{ t('invoiceEditor.items.flat', { sym }) }}</button>
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
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.items.taxLines') }}</p>
              <div class="space-y-2">
                <div v-for="(tax, ti) in form.taxes" :key="tax.id" class="space-y-1.5">
                  <!-- Row 1: label + toggle + remove -->
                  <div class="flex gap-1.5 items-center">
                    <input v-model="tax.label" class="app-inp text-sm min-w-0 flex-1" :placeholder="t('invoiceEditor.items.taxLabelPlaceholder')" />
                    <div class="flex rounded border border-gray-500 overflow-hidden shrink-0 text-xs">
                      <button
                        type="button"
                        @click="tax.type = 'percent'"
                        :class="['px-2 py-1 transition-colors', tax.type === 'percent' ? 'bg-green-700 text-bg-100 font-semibold' : 'text-gray-700 hover:bg-gray-400']"
                      >%</button>
                      <button
                        type="button"
                        @click="tax.type = 'flat'"
                        :class="['px-2 py-1 transition-colors', tax.type === 'flat' ? 'bg-green-700 text-bg-100 font-semibold' : 'text-gray-700 hover:bg-gray-400']"
                      >$</button>
                    </div>
                    <button type="button" v-if="form.taxes.length > 1" @click="removeTax(tax.id)" class="text-gray-700 hover:text-red-400 transition-colors shrink-0">
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
                    <span v-if="tax.rate > 0" class="text-xs font-mono text-gray-700 whitespace-nowrap shrink-0">
                      = {{ fmtMoney(tax.type === 'flat' ? tax.rate : (subtotal - discountAmt) * tax.rate / 100) }}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                @click="addTax"
                class="mt-2 flex items-center gap-1.5 text-xs text-gray-700 hover:text-green-700 transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('invoiceEditor.items.addTaxLine') }}
              </button>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Running totals -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between text-gray-700">
                <span>{{ t('document.subtotal') }}</span>
                <span class="font-mono">{{ fmtMoney(subtotal) }}</span>
              </div>
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
                <span>{{ t('document.total') }}</span>
                <span class="font-mono text-green-700">{{ fmtMoney(total) }}</span>
              </div>
            </div>
          </template>

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- DESIGN TAB                                                        -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'Design'">

            <!-- Theme -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.theme') }}</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="th in themes" :key="th.id"
                  @click="form.theme = th.id"
                  :class="[
                    'p-3 rounded-lg border text-xs font-medium text-left transition-colors',
                    form.theme === th.id ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500 hover:text-gray-1000'
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
                  <button
                    v-for="c in orgBrandColors" :key="c"
                    @click="form.accentColor = c"
                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    :class="form.accentColor === c ? 'border-gray-1000/80' : 'border-transparent'"
                    :style="{ background: c }"
                  />
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in accentSwatches" :key="c"
                  @click="form.accentColor = c"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.accentColor === c ? 'border-gray-1000/80' : 'border-transparent'"
                  :style="{ background: c }"
                />
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Font Family -->
            <div class="space-y-1">
              <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.design.fontFamily') }}</p>
              <select v-model="form.fontFamily" class="app-select text-sm">
                <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Logo upload (Design tab) -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.logo') }}</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-10 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> {{ t('invoiceEditor.common.remove') }}
                </button>
              </div>
              <div v-if="savedLogos.length" class="flex flex-wrap gap-2 mb-2">
                <button
                  v-for="logo in savedLogos" :key="logo.id"
                  @click="form.logoUrl = logo.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.logoUrl === logo.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50'"
                >
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
                <button
                  v-for="sig in savedSignatures" :key="sig.id"
                  @click="form.signatureUrl = sig.url"
                  class="rounded border p-0.5 transition-colors"
                  :class="form.signatureUrl === sig.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50'"
                >
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
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.stampWatermark') }}</p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  @click="form.stamp = ''"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === '' ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500'
                  ]"
                >{{ t('invoiceEditor.design.none') }}</button>
                <button
                  v-for="s in orgStamps" :key="s.text"
                  type="button"
                  @click="form.stamp = s.text"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === s.text ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500'
                  ]"
                  :style="form.stamp !== s.text ? { color: s.color + 'cc', borderColor: s.color + '40' } : {}"
                >{{ s.text }}</button>
              </div>
            </div>

            <!-- Watermark text -->
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
              <input v-model="form.watermarkText" class="app-inp text-sm" placeholder="CONFIDENTIAL" />
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Show/hide toggles -->
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

          <!-- ════════════════════════════════════════════════════════════════ -->
          <!-- SETTINGS TAB                                                      -->
          <!-- ════════════════════════════════════════════════════════════════ -->
          <template v-if="tab === 'Settings'">

            <div class="space-y-3">
              <!-- Invoice Number -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.settings.invoiceNumber') }}</label>
                <input v-model="form.number" class="app-inp text-sm font-mono" placeholder="INV-0001" />
              </div>

              <!-- Payment Terms -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.settings.paymentTerms') }}</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="term in paymentTermsOptions" :key="term"
                    @click="form.paymentTerms = term"
                    :class="[
                      'py-1.5 px-2 rounded border text-xs transition-colors text-left',
                      form.paymentTerms === term ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500 hover:text-gray-1000'
                    ]"
                  >{{ term }}</button>
                </div>
              </div>

              <!-- Issue Date -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.issueDate') }}</label>
                <input v-model="form.issueDate" type="date" class="app-inp text-sm" />
              </div>

              <!-- Due Date -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">
                  {{ t('document.dueDate') }}
                  <span v-if="form.paymentTerms !== 'Custom'" class="text-gray-700/50 normal-case">{{ t('invoiceEditor.settings.auto') }}</span>
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
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.currency') }}</label>
                <select v-model="form.currency" class="app-select text-sm">
                  <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.label }}</option>
                </select>
              </div>

              <!-- PO Number -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('document.poNumber') }} <span class="text-gray-700/50 normal-case">{{ t('invoiceEditor.common.optional') }}</span></label>
                <input v-model="form.poNumber" class="app-inp text-sm" placeholder="PO-2024-001" />
              </div>

              <div class="h-px bg-gray-400"></div>

              <!-- Notes -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.settings.notes') }}</label>
                <textarea v-model="form.notes" class="app-inp text-sm resize-none" rows="4" :placeholder="t('invoiceEditor.settings.notesPlaceholder')" />
              </div>

              <!-- Footer text -->
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.settings.footerText') }}</label>
                <input v-model="form.footerText" class="app-inp text-sm" :placeholder="t('invoiceEditor.settings.footerPlaceholder')" />
              </div>
            </div>
          </template>

        </div><!-- /scrollable sidebar content -->
      </aside>

      <!-- ── Preview panel ──────────────────────────────────────────────────── -->
      <main :class="['flex-col flex-1 bg-gray-100/50 overflow-y-auto items-center', tab === 'Preview' ? 'flex' : 'hidden md:flex']">

        <!-- Zoom controls -->
        <div class="sticky top-0 z-10 w-full flex items-center justify-end gap-2 px-6 py-2 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300">
          <span class="text-xs text-gray-700 mr-2">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomOut" class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors">
            <Icon icon="lucide:minus" class="w-3.5 h-3.5" />
          </button>
          <button @click="zoomIn" class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors">
            <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
          </button>
          <button @click="zoomFit" class="px-2.5 py-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 text-xs transition-colors">
            {{ t('invoiceEditor.zoom.fit') }}
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

            <InvoiceDocument :doc="previewDoc" :zoom="1" />

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
