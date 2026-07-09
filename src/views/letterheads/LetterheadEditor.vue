<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useLoaders } from '@/composables/loaders.ts'
import { useNotification } from '@/composables/notification.ts'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import { useAuthStore } from '@/stores/auth'
import { LetterheadService, type ILetterheadDraftData } from '@/services/letterhead.service'
import { MediaService } from '@/services/media.service'

interface Props {
  mode: 'create' | 'edit'
  initialData?: Record<string, any>
  projectId?: string
}
const props = withDefaults(defineProps<Props>(), { mode: 'create' })

const route     = useRoute()
const authStore = useAuthStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const router = useRouter()
const { t, locale } = useI18n()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
initLoaders({ isSaving: false })

// ─── Form ──────────────────────────────────────────────────────────────────────
const form = ref({
  name: 'Agency Proposal',

  // From / Company
  company:    'ACME STUDIO',
  tagline:    'Creative Agency & Digital Studio',
  email:      'hello@acme.studio',
  phone:      '+1 415 555 0199',
  website:    'www.acme.studio',
  address:    '123 Design Street\nSan Francisco, CA 94105',
  regNumber:  '',
  vatNumber:  '',
  logoUrl:    '',
  signatureUrl: '',

  // Content
  subject:    '',
  salutation: 'Dear [Client Name],',
  body:       'We are pleased to present our proposal for your upcoming project.\n\nPlease find attached the relevant details for your review. Should you have any questions or require further clarification, please do not hesitate to reach out.\n\nWe look forward to working with you.',
  closing:    'Yours sincerely,',
  signerName: 'James Holloway',
  signerTitle:'Creative Director',
  footerLeft: '',
  footerCenter: '',
  footerRight: 'Page {page} of {total}',

  // Design
  theme:        'classic' as 'classic' | 'modern' | 'minimal' | 'bold' | 'legal' | 'executive',
  accentColor:  '#00c853',
  fontFamily:   "var(--font-sans)",
  headerLayout: 'left' as 'left' | 'center' | 'right' | 'split',
  watermark:    '',
  showWatermark:false,
  watermarkColor: '#000000',
  stamp:        '' as string,
  showTopBar:   true,
  showBottomBar:false,
  showLogo:     true,
  showDivider:  true,
  showFooter:   true,
  showLineNumbers: false,
  paperSize:    'A4' as 'A4' | 'Letter' | 'Legal',
  orientation:  'portrait' as 'portrait' | 'landscape',

  // Date & Reference
  date:         new Date().toISOString().slice(0, 10),
  refNumber:    'REF-001',
  showDate:     true,
  showRef:      true,
})

// ─── Draft data (clients, logos, signatures) ───────────────────────────────────
const draftData = ref<ILetterheadDraftData | null>(null)
const isDraftLoading = ref(false)

const clientPresets = computed(() =>
  draftData.value?.clients ?? []
)
const savedLogos = computed(() => draftData.value?.logos ?? [])
const savedSignatures = computed(() => draftData.value?.signatures ?? [])

onMounted(async () => {
  if (props.initialData) Object.assign(form.value, props.initialData)
  if (orgId.value) {
    isDraftLoading.value = true
    try {
      const res = await LetterheadService.draftData(orgId.value)
      draftData.value = res.data.data
      // Pre-fill company from org if creating and no initial data
      if (props.mode === 'create' && !props.initialData && draftData.value?.organization) {
        const org = draftData.value.organization
        if (org.name && !form.value.company) form.value.company = org.name
      }
    } catch {
      // non-critical
    } finally {
      isDraftLoading.value = false
    }
  }
})

// ─── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'Company' | 'Content' | 'Design' | 'Settings' | 'Preview'
const tab  = ref<Tab>('Company')
const tabs: Tab[] = ['Company', 'Content', 'Design', 'Settings', 'Preview']
const tabLabelKeys: Record<Tab, string> = {
  Company: 'company', Content: 'content', Design: 'design', Settings: 'settings', Preview: 'preview',
}
const tabLabel = (tb: Tab) => t(`letterheadEditor.tabs.${tabLabelKeys[tb]}`)

// ─── Zoom ──────────────────────────────────────────────────────────────────────
const zoom    = ref(0.75)
const zoomIn  = () => { zoom.value = Math.min(1.5, +(zoom.value + 0.1).toFixed(1)) }
const zoomOut = () => { zoom.value = Math.max(0.3, +(zoom.value - 0.1).toFixed(1)) }
const zoomFit = () => { zoom.value = 0.75 }

// ─── Logo / Signature upload ───────────────────────────────────────────────────
const isUploadingLogo = ref(false)
const isUploadingSig  = ref(false)

async function handleLogoUpload(e: Event) {
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

async function handleSignatureUpload(e: Event) {
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

// ─── Client presets (from draft-data) ─────────────────────────────────────────
const fillCompany = (p: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null }) => {
  form.value.company = p.company ?? p.name
  form.value.email   = p.email ?? ''
  form.value.phone   = p.phone ?? ''
  form.value.address = p.address ?? ''
}

// ─── Themes ────────────────────────────────────────────────────────────────────
const themes = computed(() => [
  { id: 'classic',   label: t('letterheads.themes.classic'),   desc: t('letterheadEditor.themeDesc.classic') },
  { id: 'modern',    label: t('letterheads.themes.modern'),    desc: t('letterheadEditor.themeDesc.modern') },
  { id: 'minimal',   label: t('letterheads.themes.minimal'),   desc: t('letterheadEditor.themeDesc.minimal') },
  { id: 'bold',      label: t('letterheads.themes.bold'),      desc: t('letterheadEditor.themeDesc.bold') },
  { id: 'legal',     label: t('letterheads.themes.legal'),     desc: t('letterheadEditor.themeDesc.legal') },
  { id: 'executive', label: t('letterheads.themes.executive'), desc: t('letterheadEditor.themeDesc.executive') },
])

const accentPresets = ['#00c853','#60a5fa','#4ade80','#f87171','#a78bfa','#fb923c','#38bdf8','#1a1a1a']

const fonts = [
  { value: "var(--font-sans)",       label: 'Geist Sans (Default)' },
  { value: "'Inter', sans-serif",          label: 'Inter (Modern)' },
  { value: "var(--font-sans)",  label: 'Geist Sans (Elegant)' },
  { value: "var(--font-sans)",    label: 'Geist Sans (Editorial)' },
  { value: "'Lato', sans-serif",           label: 'Lato (Clean)' },
  { value: "'Montserrat', sans-serif",     label: 'Montserrat (Contemporary)' },
  { value: "var(--font-mono)",         label: 'Geist Mono (Technical)' },
  { value: "Georgia, serif",               label: 'Georgia (Traditional)' },
]

const orgStamps = computed(() => draftData.value?.organization?.stamps ?? [])
const stampColorFor = (label: string) =>
  orgStamps.value.find(s => s.text === label)?.color ?? '#9ca3af'

const orgBrandColors = computed(() => draftData.value?.organization?.brand_colors ?? [])

const toggleFields = computed(() => [
  { key: 'showTopBar',       label: t('letterheadEditor.toggles.topBar') },
  { key: 'showBottomBar',    label: t('letterheadEditor.toggles.bottomBar') },
  { key: 'showLogo',         label: t('letterheadEditor.toggles.companyLogo') },
  { key: 'showDivider',      label: t('letterheadEditor.toggles.headerDivider') },
  { key: 'showFooter',       label: t('letterheadEditor.toggles.footer') },
  { key: 'showDate',         label: t('letterheadEditor.toggles.date') },
  { key: 'showRef',          label: t('letterheadEditor.toggles.refNumber') },
  { key: 'showLineNumbers',  label: t('letterheadEditor.toggles.lineNumbers') },
])

// ─── Date format ───────────────────────────────────────────────────────────────
const formatDate = (d: string) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Header-layout / orientation display labels ─────────────────────────────────
const layoutLabel = (l: string) => t(`letterheadEditor.design.layout${l.charAt(0).toUpperCase()}${l.slice(1)}`)
const orientationLabel = (o: string) => t(`letterheadEditor.settings.${o}`)

// ─── Body lines (for line-number display) ──────────────────────────────────────
const bodyLines = computed(() => form.value.body.split('\n'))

// ─── Footer page placeholder ───────────────────────────────────────────────────
const fmtFooter = (s: string) => s.replace('{page}', '1').replace('{total}', '1')

// ─── Print ─────────────────────────────────────────────────────────────────────
const handlePrint = () => window.print()

// ─── Share ─────────────────────────────────────────────────────────────────────
const showShareModal    = ref(false)
const savedLetterheadId = ref<string>('')

// ─── Save ──────────────────────────────────────────────────────────────────────
const handleSave = async () => {
  if (!orgId.value) return
  setLoader('isSaving', true)
  try {
    const payload = {
      name:             form.value.name,
      company:          form.value.company,
      tagline:          form.value.tagline,
      email:            form.value.email,
      phone:            form.value.phone,
      website:          form.value.website,
      address:          form.value.address,
      reg_number:       form.value.regNumber,
      vat_number:       form.value.vatNumber,
      logo_url:         form.value.logoUrl || null,
      signature_url:    form.value.signatureUrl || null,
      subject:          form.value.subject,
      salutation:       form.value.salutation,
      body:             form.value.body,
      closing:          form.value.closing,
      signer_name:      form.value.signerName,
      signer_title:     form.value.signerTitle,
      footer_left:      form.value.footerLeft,
      footer_center:    form.value.footerCenter,
      footer_right:     form.value.footerRight,
      date:             form.value.date,
      ref_number:       form.value.refNumber,
      show_date:        form.value.showDate,
      show_ref:         form.value.showRef,
      theme:            form.value.theme,
      accent_color:     form.value.accentColor,
      font_family:      form.value.fontFamily,
      header_layout:    form.value.headerLayout,
      watermark:        form.value.watermark || null,
      show_watermark:   form.value.showWatermark,
      watermark_color:  form.value.watermarkColor,
      stamp:            form.value.stamp || null,
      show_top_bar:     form.value.showTopBar,
      show_bottom_bar:  form.value.showBottomBar,
      show_logo:        form.value.showLogo,
      show_divider:     form.value.showDivider,
      show_footer:      form.value.showFooter,
      show_line_numbers:form.value.showLineNumbers,
      paper_size:       form.value.paperSize,
      orientation:      form.value.orientation,
    }

    if (props.mode === 'create') {
      const res = await LetterheadService.create(orgId.value, { ...payload, ...(props.projectId ? { project_id: props.projectId } : {}) } as any)
      savedLetterheadId.value = res.data.data.id
    } else {
      const id = String(route.params.id)
      await LetterheadService.update(orgId.value, id, payload as any)
      savedLetterheadId.value = id
    }

    notify(props.mode === 'create' ? t('letterheadEditor.toasts.created') : t('letterheadEditor.toasts.saved'), 'success')
    if (props.projectId && props.mode === 'create') {
      router.push({ name: 'projects.view', params: { id: props.projectId } })
    } else {
      router.push({ name: 'letterheads' })
    }
  } catch {
    notify(t('letterheadEditor.toasts.saveFailed'), 'error')
  } finally {
    setLoader('isSaving', false)
  }
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">

    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 md:px-5 h-13 border-b border-gray-400 bg-gray-100/90 backdrop-blur-md shrink-0 z-20">
      <div class="flex items-center gap-3">
        <button @click="router.push({ name: 'letterheads' })" class="flex items-center gap-2 text-gray-900 hover:text-gray-1000 text-sm transition-colors">
          <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          <span class="hidden sm:inline">{{ t('letterheadEditor.toolbar.letterheads') }}</span>
        </button>
        <span class="text-gray-500">/</span>
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-green-700/10 border border-green-700/25 flex items-center justify-center">
            <Icon icon="lucide:file-text" class="w-3 h-3 text-green-700" />
          </div>
          <span class="font-semibold text-gray-1000 text-sm">{{ mode === 'create' ? t('letterheadEditor.toolbar.new') : t('letterheadEditor.toolbar.edit') }}</span>
          <span class="text-xs text-gray-700 hidden sm:inline">{{ form.name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handlePrint" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors" :title="t('invoiceEditor.toolbar.print')">
          <Icon icon="lucide:printer" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceEditor.toolbar.print') }}</span>
        </button>
        <button @click="showShareModal = true" class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors" :title="t('invoiceEditor.toolbar.share')">
          <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /><span class="hidden sm:inline"> {{ t('invoiceEditor.toolbar.share') }}</span>
        </button>
        <button
          @click="handleSave"
          :disabled="getLoader('isSaving')"
          class="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-green-700 hover:bg-green-700/90 text-bg-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon v-if="getLoader('isSaving')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else icon="lucide:check" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ getLoader('isSaving') ? t('invoiceEditor.toolbar.saving') : (mode === 'create' ? t('letterheadEditor.toolbar.create') : t('invoiceEditor.toolbar.saveChanges')) }}</span>
        </button>
      </div>
    </div>

    <!-- Split layout -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ── Sidebar ──────────────────────────────────────────────────────────── -->
      <aside :class="['md:w-[360px] md:shrink-0 border-r border-gray-400 bg-gray-200/60 flex flex-col overflow-hidden', tab === 'Preview' ? 'hidden md:flex' : 'w-full']">
        <!-- Tabs -->
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

          <!-- ══════════════════════════ COMPANY TAB ══════════════════════════ -->
          <template v-if="tab === 'Company'">

            <!-- Client presets -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('letterheadEditor.company.quickFillClients') }}</p>
              <div v-if="isDraftLoading" class="flex items-center gap-2 text-xs text-gray-700 py-2">
                <Icon icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" /> Loading clients…
              </div>
              <div v-else-if="clientPresets.length === 0" class="text-xs text-gray-700 py-2">
                No clients yet. <a class="text-green-700 underline" href="/app/clients/create">{{ t('letterheadEditor.company.addOne') }}</a>
              </div>
              <div v-else class="space-y-2 max-h-48 overflow-y-auto">
                <button
                  v-for="client in clientPresets" :key="client.id"
                  @click="fillCompany(client)"
                  class="w-full text-left p-3 rounded-lg border border-gray-500 bg-gray-400/40 hover:border-green-700/50 hover:bg-gray-400 transition-colors group"
                >
                  <p class="text-xs font-medium text-gray-1000 group-hover:text-green-700 transition-colors">{{ client.company ?? client.name }}</p>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ client.email ?? '—' }}</p>
                </button>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Logo upload -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('letterheadEditor.company.companyLogo') }}</p>
              <div v-if="form.logoUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.logoUrl" alt="Logo" class="h-10 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.logoUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> Remove
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon v-if="isUploadingLogo" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:upload" class="w-3.5 h-3.5" />
                {{ form.logoUrl ? 'Replace logo' : 'Upload logo' }}
                <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" :disabled="isUploadingLogo" />
              </label>
              <!-- Previously uploaded logos -->
              <div v-if="savedLogos.length" class="mt-2 flex gap-2 flex-wrap">
                <button
                  v-for="logo in savedLogos" :key="logo.id"
                  @click="form.logoUrl = logo.url"
                  :class="['rounded border p-0.5 transition-colors', form.logoUrl === logo.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50']"
                  :title="t('letterheadEditor.company.useThisLogo')"
                >
                  <img :src="logo.url" class="h-8 w-auto max-w-[60px] object-contain" />
                </button>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Fields -->
            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.company.companyName') }}</label>
                <input v-model="form.company" class="app-inp text-sm" :placeholder="t('letterheadEditor.company.companyNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.company.tagline') }}</label>
                <input v-model="form.tagline" class="app-inp text-sm" :placeholder="t('letterheadEditor.company.taglinePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.email') }}</label>
                <input v-model="form.email" type="email" class="app-inp text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.phone') }}</label>
                <input v-model="form.phone" class="app-inp text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.website') }}</label>
                <input v-model="form.website" class="app-inp text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.from.address') }}</label>
                <textarea v-model="form.address" class="app-inp text-sm resize-none" rows="3" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.company.regNumber') }}</label>
                  <input v-model="form.regNumber" class="app-inp text-sm font-mono" placeholder="12345678" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.company.vatNumber') }}</label>
                  <input v-model="form.vatNumber" class="app-inp text-sm font-mono" placeholder="GB123456789" />
                </div>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Signature -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('letterheadEditor.company.signatureImage') }}</p>
              <div v-if="form.signatureUrl" class="mb-2 flex items-center gap-3">
                <img :src="form.signatureUrl" alt="Sig" class="h-10 w-auto rounded border border-gray-500 bg-gray-400 object-contain p-1" />
                <button @click="form.signatureUrl = ''" class="text-xs text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Icon icon="lucide:trash-2" class="w-3 h-3" /> Remove
                </button>
              </div>
              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-500 hover:border-green-700/50 text-xs text-gray-700 hover:text-gray-1000 transition-colors">
                <Icon v-if="isUploadingSig" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <Icon v-else icon="lucide:pen-line" class="w-3.5 h-3.5" />
                {{ form.signatureUrl ? 'Replace signature' : 'Upload signature' }}
                <input type="file" accept="image/*" class="hidden" @change="handleSignatureUpload" :disabled="isUploadingSig" />
              </label>
              <!-- Previously uploaded signatures -->
              <div v-if="savedSignatures.length" class="mt-2 flex gap-2 flex-wrap">
                <button
                  v-for="sig in savedSignatures" :key="sig.id"
                  @click="form.signatureUrl = sig.url"
                  :class="['rounded border p-0.5 transition-colors', form.signatureUrl === sig.url ? 'border-green-700' : 'border-gray-500 hover:border-green-700/50']"
                  :title="t('letterheadEditor.company.useThisSignature')"
                >
                  <img :src="sig.url" class="h-8 w-auto max-w-[80px] object-contain" />
                </button>
              </div>
            </div>
          </template>

          <!-- ══════════════════════════ CONTENT TAB ══════════════════════════ -->
          <template v-if="tab === 'Content'">
            <div class="space-y-1">
              <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.settings.templateName') }}</label>
              <input v-model="form.name" class="app-inp text-sm" :placeholder="t('letterheadEditor.content.templateNamePlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.subjectRe') }}</label>
              <input v-model="form.subject" class="app-inp text-sm" :placeholder="t('letterheadEditor.content.subjectPlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.salutation') }}</label>
              <input v-model="form.salutation" class="app-inp text-sm" :placeholder="t('letterheadEditor.content.salutationPlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.bodyText') }}</label>
              <textarea v-model="form.body" class="app-inp text-sm resize-none" rows="10" :placeholder="t('letterheadEditor.content.bodyPlaceholder')" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.closing') }}</label>
              <input v-model="form.closing" class="app-inp text-sm" :placeholder="t('letterheadEditor.content.closingPlaceholder')" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.signerName') }}</label>
                <input v-model="form.signerName" class="app-inp text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.signerTitle') }}</label>
                <input v-model="form.signerTitle" class="app-inp text-sm" />
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.content.footerColumns') }}</p>
            <p class="text-[10px] text-gray-700/60">{{ t('letterheadEditor.content.use') }} <code class="text-green-700">&#123;page&#125;</code> and <code class="text-green-700">&#123;total&#125;</code> for page numbers</p>
            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('letterheadEditor.content.left') }}</label>
                <input v-model="form.footerLeft" class="app-inp text-sm" :placeholder="form.website || 'www.yourstudio.com'" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('letterheadEditor.content.center') }}</label>
                <input v-model="form.footerCenter" class="app-inp text-sm" :placeholder="form.company || 'Company Name'" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] text-gray-700">{{ t('letterheadEditor.content.right') }}</label>
                <input v-model="form.footerRight" class="app-inp text-sm" placeholder="Page {page} of {total}" />
              </div>
            </div>
          </template>

          <!-- ══════════════════════════ DESIGN TAB ══════════════════════════ -->
          <template v-if="tab === 'Design'">

            <!-- Theme picker -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.theme') }}</p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="th in themes" :key="th.id"
                  @click="form.theme = th.id as any"
                  :class="[
                    'p-2 rounded-lg border text-left transition-all',
                    form.theme === th.id ? 'border-green-700 bg-green-700/10' : 'border-gray-500 bg-gray-400/30 hover:border-gray-500'
                  ]"
                >
                  <!-- Mini preview -->
                  <div class="bg-white rounded mb-1.5 overflow-hidden h-12 relative">
                    <div v-if="['classic','bold','executive'].includes(th.id)" class="h-1 w-full" :style="{ backgroundColor: form.accentColor }"></div>
                    <div v-if="th.id === 'modern'" class="absolute left-0 top-0 bottom-0 w-3" :style="{ backgroundColor: form.accentColor }"></div>
                    <div class="p-1.5" :class="th.id === 'modern' ? 'ml-3' : ''">
                      <div class="h-1 rounded mb-1" :style="{ backgroundColor: form.accentColor, width: '50%' }"></div>
                      <div class="h-px bg-gray-200 mb-1"></div>
                      <div class="h-px bg-gray-100 w-5/6 mb-0.5"></div>
                      <div class="h-px bg-gray-100 w-4/6"></div>
                    </div>
                    <div v-if="th.id === 'legal'" class="absolute bottom-0 left-0 right-0 h-1" :style="{ backgroundColor: form.accentColor }"></div>
                  </div>
                  <p :class="['text-[9px] font-semibold leading-tight', form.theme === th.id ? 'text-green-700' : 'text-gray-900']">{{ th.label }}</p>
                </button>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Accent color -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('invoiceEditor.design.accentColor') }}</p>
              <div class="flex items-center gap-2 mb-2">
                <input type="color" v-model="form.accentColor" class="w-9 h-9 rounded cursor-pointer border border-gray-500 bg-gray-200 p-0.5" />
                <input v-model="form.accentColor" class="app-inp text-sm flex-1 font-mono" />
              </div>
              <!-- Brand colors from org -->
              <template v-if="orgBrandColors.length">
                <p class="text-[9px] uppercase tracking-wider text-gray-700/60 mb-1.5">{{ t('invoiceEditor.design.brand') }}</p>
                <div class="flex gap-1.5 flex-wrap mb-2">
                  <button
                    v-for="c in orgBrandColors" :key="c"
                    @click="form.accentColor = c"
                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    :class="form.accentColor === c ? 'border-gray-1000' : 'border-transparent'"
                    :style="{ background: c }"
                  />
                </div>
                <p class="text-[9px] uppercase tracking-wider text-gray-700/60 mb-1.5">{{ t('letterheadEditor.design.palette') }}</p>
              </template>
              <div class="flex gap-1.5 flex-wrap">
                <button
                  v-for="c in accentPresets" :key="c"
                  @click="form.accentColor = c"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.accentColor === c ? 'border-gray-1000' : 'border-transparent'"
                  :style="{ background: c }"
                />
              </div>
            </div>

            <!-- Font -->
            <div class="space-y-1">
              <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('invoiceEditor.design.fontFamily') }}</p>
              <select v-model="form.fontFamily" class="app-select text-sm">
                <option v-for="f in fonts" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>

            <!-- Header layout -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('letterheadEditor.design.headerLayout') }}</p>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="layout in (['left','center','right','split'] as const)" :key="layout"
                  @click="form.headerLayout = layout"
                  :class="[
                    'py-2 rounded border text-[9px] font-medium capitalize transition-colors',
                    form.headerLayout === layout ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500'
                  ]"
                >{{ layoutLabel(layout) }}</button>
              </div>
            </div>

            <div class="h-px bg-gray-400"></div>

            <!-- Stamp -->
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-700 mb-2">{{ t('letterheadEditor.design.stamp') }}</p>
              <div class="grid grid-cols-3 gap-1.5">
                <!-- None option -->
                <button
                  type="button"
                  @click="form.stamp = ''"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === '' ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500'
                  ]"
                >{{ t('invoiceEditor.design.none') }}</button>
                <!-- Org stamps from draft-data -->
                <button
                  v-for="s in orgStamps" :key="s.text"
                  type="button"
                  @click="form.stamp = s.text"
                  :class="[
                    'py-1.5 rounded border text-xs font-semibold transition-colors',
                    form.stamp === s.text ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 hover:border-gray-500'
                  ]"
                  :style="form.stamp !== s.text ? { color: s.color + 'cc', borderColor: s.color + '40' } : {}"
                >{{ s.text }}</button>
              </div>
            </div>

            <!-- Watermark -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.design.watermark') }}</p>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <span class="text-[10px] text-gray-700">{{ form.showWatermark ? t('invoiceEditor.design.visible') : t('invoiceEditor.design.hidden') }}</span>
                  <div class="relative">
                    <input type="checkbox" v-model="form.showWatermark" class="sr-only" />
                    <div :class="['w-8 h-4 rounded-full transition-colors', form.showWatermark ? 'bg-green-700' : 'bg-gray-500']"></div>
                    <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', form.showWatermark ? 'left-4' : 'left-0.5']"></div>
                  </div>
                </label>
              </div>
              <input v-model="form.watermark" class="app-inp text-sm" placeholder="CONFIDENTIAL" />
              <div class="flex items-center gap-2">
                <input type="color" v-model="form.watermarkColor" class="w-8 h-8 rounded cursor-pointer border border-gray-500 bg-gray-200 p-0.5 shrink-0" />
                <span class="text-xs text-gray-700">{{ t('letterheadEditor.design.watermarkColor') }}</span>
              </div>
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

          <!-- ══════════════════════════ SETTINGS TAB ══════════════════════════ -->
          <template v-if="tab === 'Settings'">
            <div class="space-y-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.settings.templateName') }}</label>
                <input v-model="form.name" class="app-inp text-sm" :placeholder="t('letterheadEditor.content.templateNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadView.doc.date') }}</label>
                <input v-model="form.date" type="date" class="app-inp text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.settings.refNumber') }}</label>
                <input v-model="form.refNumber" class="app-inp text-sm font-mono" placeholder="REF-001" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.settings.paperSize') }}</label>
                <select v-model="form.paperSize" class="app-select text-sm">
                  <option>A4</option><option>Letter</option><option>Legal</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] uppercase tracking-wider text-gray-700">{{ t('letterheadEditor.settings.orientation') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="o in (['portrait','landscape'] as const)" :key="o"
                    @click="form.orientation = o"
                    :class="['py-1.5 rounded border text-xs capitalize transition-colors', form.orientation === o ? 'border-green-700 bg-green-700/10 text-green-700' : 'border-gray-500 text-gray-700 hover:border-gray-500']"
                  >{{ orientationLabel(o) }}</button>
                </div>
              </div>
            </div>
          </template>

        </div>
      </aside>

      <!-- ── Preview ──────────────────────────────────────────────────────────── -->
      <main :class="['flex-col flex-1 bg-gray-100/50 overflow-y-auto items-center', tab === 'Preview' ? 'flex' : 'hidden md:flex']">

        <!-- Zoom bar -->
        <div class="sticky top-0 z-10 w-full flex items-center justify-end gap-2 px-6 py-2 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300">
          <span class="text-xs text-gray-700 mr-2">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomOut" class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors"><Icon icon="lucide:minus" class="w-3.5 h-3.5" /></button>
          <button @click="zoomIn"  class="p-1.5 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 transition-colors"><Icon icon="lucide:plus" class="w-3.5 h-3.5" /></button>
          <button @click="zoomFit" class="px-2.5 py-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 text-xs transition-colors">{{ t('invoiceEditor.zoom.fit') }}</button>
        </div>

        <!-- Document -->
        <div class="py-8 px-6 w-full flex justify-center">
          <div
            class="origin-top print-zoom-wrapper"
            :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: '794px', marginBottom: `${(zoom - 1) * -100}%` }"
          >

            <!-- ════════════════════ CLASSIC ════════════════════ -->
            <div
              v-if="form.theme === 'classic'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <div v-if="form.showTopBar" class="h-1.5 w-full" :style="{ backgroundColor: form.accentColor }"></div>
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <!-- Stamp -->
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>

              <div class="p-12" style="position: relative; z-index: 3">
                <!-- Header -->
                <div :class="['mb-8', form.headerLayout === 'center' ? 'text-center' : form.headerLayout === 'right' ? 'text-right' : form.headerLayout === 'split' ? 'flex justify-between items-start' : 'flex items-start gap-4']">
                  <div :class="form.headerLayout === 'split' ? '' : ''">
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" :class="['h-14 w-auto object-contain mb-2', form.headerLayout === 'center' ? 'mx-auto' : form.headerLayout === 'right' ? 'ml-auto' : '']" />
                    <div class="text-lg font-bold" :style="{ color: form.accentColor }">{{ form.company }}</div>
                    <div v-if="form.tagline" class="text-xs text-gray-400 mt-0.5">{{ form.tagline }}</div>
                  </div>
                  <div v-if="form.headerLayout === 'split'" class="text-right text-xs text-gray-500 space-y-0.5">
                    <div v-if="form.email">{{ form.email }}</div>
                    <div v-if="form.phone">{{ form.phone }}</div>
                    <div v-if="form.website">{{ form.website }}</div>
                    <div v-if="form.address" class="whitespace-pre-line">{{ form.address }}</div>
                  </div>
                </div>
                <div v-if="form.headerLayout !== 'split'" class="text-xs text-gray-500 mb-6 space-y-0.5" :class="form.headerLayout === 'center' ? 'text-center' : form.headerLayout === 'right' ? 'text-right' : ''">
                  <div v-if="form.email">{{ form.email }}</div>
                  <div v-if="form.phone">{{ form.phone }}</div>
                  <div v-if="form.website">{{ form.website }}</div>
                  <div v-if="form.address" class="whitespace-pre-line">{{ form.address }}</div>
                </div>

                <div v-if="form.showDivider" class="h-px mb-8" :style="{ backgroundColor: form.accentColor + '40' }"></div>

                <!-- Date / Ref -->
                <div v-if="form.showDate || form.showRef" class="flex gap-8 mb-6 text-xs">
                  <div v-if="form.showDate">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('letterheadView.doc.date') }}</div>
                    <div class="font-semibold text-gray-700">{{ formatDate(form.date) }}</div>
                  </div>
                  <div v-if="form.showRef">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">{{ t('letterheadView.doc.reference') }}</div>
                    <div class="font-semibold text-gray-700 font-mono">{{ form.refNumber }}</div>
                  </div>
                </div>

                <!-- Subject -->
                <div v-if="form.subject" class="mb-6">
                  <span class="font-semibold text-gray-800">{{ t('letterheadView.doc.re') }} </span>
                  <span class="text-gray-700">{{ form.subject }}</span>
                </div>

                <!-- Salutation -->
                <p v-if="form.salutation" class="text-gray-700 mb-4">{{ form.salutation }}</p>

                <!-- Body -->
                <div class="text-gray-600 leading-relaxed mb-8 whitespace-pre-line" style="line-height: 1.8">
                  <template v-if="form.showLineNumbers">
                    <div v-for="(line, i) in bodyLines" :key="i" class="flex gap-4">
                      <span class="text-gray-300 select-none w-6 text-right shrink-0" style="font-size:11px">{{ i + 1 }}</span>
                      <span>{{ line }}</span>
                    </div>
                  </template>
                  <template v-else>{{ form.body }}</template>
                </div>

                <!-- Closing -->
                <div class="mb-10">
                  <p class="text-gray-700 mb-12">{{ form.closing }}</p>
                  <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
                  <div class="font-semibold text-gray-800">{{ form.signerName }}</div>
                  <div class="text-xs text-gray-500">{{ form.signerTitle }}</div>
                  <div v-if="form.company" class="text-xs text-gray-400">{{ form.company }}</div>
                </div>

                <!-- Company details strip -->
                <div v-if="form.regNumber || form.vatNumber" class="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-x-6">
                  <span v-if="form.regNumber">Reg. No: {{ form.regNumber }}</span>
                  <span v-if="form.vatNumber">VAT: {{ form.vatNumber }}</span>
                </div>

                <!-- Footer -->
                <div v-if="form.showFooter" class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size: 10px">
                  <span class="text-gray-400">{{ fmtFooter(form.footerLeft) || form.website }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerCenter) || form.company }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerRight) }}</span>
                </div>
                <div v-if="form.showBottomBar" class="absolute bottom-0 left-0 right-0 h-1.5" :style="{ backgroundColor: form.accentColor }"></div>
              </div>
            </div>

            <!-- ════════════════════ MODERN (sidebar) ════════════════════ -->
            <div
              v-else-if="form.theme === 'modern'"
              class="print-document bg-white shadow-2xl relative overflow-hidden flex"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <!-- Watermark -->
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>

              <!-- Left panel -->
              <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: form.accentColor, width: '220px', position: 'relative', zIndex: 3 }">
                <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
                <div v-else class="mb-6"></div>
                <div class="text-white font-bold text-lg leading-tight mb-1">{{ form.company }}</div>
                <div v-if="form.tagline" class="text-white/70 text-xs mb-6">{{ form.tagline }}</div>
                <div class="space-y-4 mt-auto">
                  <div>
                    <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.contact') }}</div>
                    <div v-if="form.email"   class="text-white/80 text-xs">{{ form.email }}</div>
                    <div v-if="form.phone"   class="text-white/80 text-xs">{{ form.phone }}</div>
                    <div v-if="form.website" class="text-white/80 text-xs">{{ form.website }}</div>
                  </div>
                  <div v-if="form.address">
                    <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('invoiceEditor.from.address') }}</div>
                    <div class="text-white/80 text-xs whitespace-pre-line leading-relaxed">{{ form.address }}</div>
                  </div>
                  <div v-if="form.regNumber || form.vatNumber">
                    <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.registration') }}</div>
                    <div v-if="form.regNumber" class="text-white/70 text-xs font-mono">{{ form.regNumber }}</div>
                    <div v-if="form.vatNumber" class="text-white/70 text-xs font-mono">{{ form.vatNumber }}</div>
                  </div>
                </div>
              </div>

              <!-- Right content -->
              <div class="flex-1 p-10 flex flex-col" style="position: relative; z-index: 3">
                <!-- Date / Ref -->
                <div class="flex justify-end gap-6 mb-8 text-xs">
                  <div v-if="form.showDate" class="text-right">
                    <div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">{{ t('letterheadView.doc.date') }}</div>
                    <div class="font-semibold text-gray-700">{{ formatDate(form.date) }}</div>
                  </div>
                  <div v-if="form.showRef" class="text-right">
                    <div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">{{ t('letterheadView.doc.reference') }}</div>
                    <div class="font-semibold text-gray-700 font-mono">{{ form.refNumber }}</div>
                  </div>
                </div>
                <div v-if="form.subject" class="text-base font-bold text-gray-800 mb-6" :style="{ color: form.accentColor }">Re: {{ form.subject }}</div>
                <p v-if="form.salutation" class="text-gray-700 mb-4">{{ form.salutation }}</p>
                <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line flex-1" style="line-height: 1.8">{{ form.body }}</div>
                <div class="mb-6">
                  <p class="text-gray-700 mb-10">{{ form.closing }}</p>
                  <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
                  <div class="font-semibold text-gray-800">{{ form.signerName }}</div>
                  <div class="text-xs text-gray-500">{{ form.signerTitle }}</div>
                </div>
                <div v-if="form.showFooter" class="border-t border-gray-100 pt-4 flex justify-between" style="font-size:10px">
                  <span class="text-gray-400">{{ fmtFooter(form.footerLeft) || form.website }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerCenter) }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerRight) }}</span>
                </div>
              </div>
            </div>

            <!-- ════════════════════ MINIMAL ════════════════════ -->
            <div
              v-else-if="form.theme === 'minimal'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>
              <div class="p-14" style="position: relative; z-index: 3; max-width: 600px; margin: 0 auto">
                <div class="mb-10">
                  <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-10 w-auto object-contain mb-3" />
                  <div class="font-bold text-xl text-gray-900">{{ form.company }}</div>
                  <div v-if="form.tagline" class="text-xs text-gray-400 mt-0.5">{{ form.tagline }}</div>
                </div>
                <div v-if="form.showDivider" class="w-8 mb-8" style="height: 2px" :style="{ backgroundColor: form.accentColor }"></div>
                <div class="flex gap-8 mb-8 text-xs text-gray-500">
                  <div v-if="form.showDate">{{ formatDate(form.date) }}</div>
                  <div v-if="form.showRef" class="font-mono">{{ form.refNumber }}</div>
                </div>
                <div v-if="form.subject" class="font-semibold text-gray-800 mb-6">{{ form.subject }}</div>
                <p v-if="form.salutation" class="text-gray-700 mb-5">{{ form.salutation }}</p>
                <div class="text-gray-600 leading-loose mb-12 whitespace-pre-line" style="line-height: 2">{{ form.body }}</div>
                <p class="text-gray-700 mb-14">{{ form.closing }}</p>
                <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ form.signerName }}</div>
                <div class="text-xs text-gray-500">{{ form.signerTitle }}</div>
                <div v-if="form.showFooter" class="absolute bottom-10 left-14 right-14 flex justify-between border-t border-gray-100 pt-4" style="font-size:10px">
                  <span class="text-gray-400">{{ fmtFooter(form.footerLeft) || form.company }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerRight) }}</span>
                </div>
              </div>
            </div>

            <!-- ════════════════════ BOLD ════════════════════ -->
            <div
              v-else-if="form.theme === 'bold'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>
              <!-- Bold header block -->
              <div class="px-12 py-10 relative" :style="{ backgroundColor: form.accentColor, zIndex: 3 }">
                <div class="flex justify-between items-end">
                  <div>
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-12 w-auto object-contain mb-3 brightness-0 invert" />
                    <div class="text-white font-black text-2xl tracking-tight">{{ form.company }}</div>
                    <div v-if="form.tagline" class="text-white/70 text-sm">{{ form.tagline }}</div>
                  </div>
                  <div class="text-right text-white/80 text-xs space-y-0.5">
                    <div v-if="form.email">{{ form.email }}</div>
                    <div v-if="form.phone">{{ form.phone }}</div>
                    <div v-if="form.website">{{ form.website }}</div>
                  </div>
                </div>
              </div>
              <div class="p-12" style="position: relative; z-index: 3">
                <div class="flex gap-8 mb-8 text-xs">
                  <div v-if="form.showDate"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.date') }}</div><div class="font-bold text-gray-800">{{ formatDate(form.date) }}</div></div>
                  <div v-if="form.showRef"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.reference') }}</div><div class="font-bold text-gray-800 font-mono">{{ form.refNumber }}</div></div>
                </div>
                <div v-if="form.subject" class="text-lg font-black text-gray-900 mb-6 pb-3" :style="{ borderBottom: `3px solid ${form.accentColor}` }">{{ form.subject }}</div>
                <p v-if="form.salutation" class="text-gray-700 mb-4">{{ form.salutation }}</p>
                <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height: 1.9">{{ form.body }}</div>
                <p class="text-gray-700 mb-12">{{ form.closing }}</p>
                <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
                <div class="font-bold text-gray-800">{{ form.signerName }}</div>
                <div class="text-xs text-gray-500">{{ form.signerTitle }}</div>
                <div v-if="form.address" class="mt-6 p-4 rounded text-xs text-gray-500 leading-relaxed" :style="{ backgroundColor: form.accentColor + '10', borderLeft: `3px solid ${form.accentColor}` }">
                  <span class="font-semibold text-gray-700">{{ t('letterheadView.doc.addressInline') }} </span>{{ form.address.replace(/\n/g, ', ') }}
                  <span v-if="form.regNumber"> · Reg: {{ form.regNumber }}</span>
                  <span v-if="form.vatNumber"> · VAT: {{ form.vatNumber }}</span>
                </div>
                <div v-if="form.showFooter" class="absolute bottom-8 left-12 right-12 flex justify-between" style="font-size:10px">
                  <span class="text-gray-400">{{ fmtFooter(form.footerLeft) || form.website }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerCenter) }}</span>
                  <span class="text-gray-400">{{ fmtFooter(form.footerRight) }}</span>
                </div>
              </div>
            </div>

            <!-- ════════════════════ LEGAL ════════════════════ -->
            <div
              v-else-if="form.theme === 'legal'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: `'Times New Roman', Times, serif`, color: '#111827', fontSize: '13px', minHeight: '1080px' }"
            >
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>
              <div class="p-12 pb-24" style="position: relative; z-index: 3">
                <!-- Legal header: centred -->
                <div class="text-center mb-8">
                  <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-12 w-auto object-contain mx-auto mb-3" />
                  <div class="text-base font-bold uppercase tracking-widest text-gray-900">{{ form.company }}</div>
                  <div v-if="form.tagline" class="text-xs text-gray-500 mt-0.5">{{ form.tagline }}</div>
                  <div class="text-xs text-gray-500 mt-1">{{ [form.email, form.phone, form.website].filter(Boolean).join(' · ') }}</div>
                  <div v-if="form.address" class="text-xs text-gray-500 mt-0.5">{{ form.address.replace(/\n/g, ', ') }}</div>
                </div>
                <div class="h-px bg-gray-400 mb-1"></div>
                <div class="h-px bg-gray-200 mb-8"></div>
                <div class="flex justify-between text-xs text-gray-500 mb-8">
                  <span v-if="form.showDate">{{ formatDate(form.date) }}</span>
                  <span v-if="form.showRef" class="font-mono">Ref: {{ form.refNumber }}</span>
                </div>
                <div v-if="form.subject" class="text-center font-bold uppercase text-gray-800 mb-8 tracking-wider">{{ form.subject }}</div>
                <p v-if="form.salutation" class="mb-6 text-gray-800">{{ form.salutation }}</p>
                <div class="text-gray-700 leading-relaxed mb-12 whitespace-pre-line text-justify" style="line-height: 2">
                  <template v-if="form.showLineNumbers">
                    <div v-for="(line, i) in bodyLines" :key="i" class="flex gap-6">
                      <span class="text-gray-400 select-none w-8 text-right shrink-0" style="font-size:11px">{{ i + 1 }}</span>
                      <span>{{ line }}</span>
                    </div>
                  </template>
                  <template v-else>{{ form.body }}</template>
                </div>
                <p class="text-gray-800 mb-14">{{ form.closing }}</p>
                <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
                <div class="font-bold text-gray-800">{{ form.signerName }}</div>
                <div class="text-sm text-gray-600">{{ form.signerTitle }}</div>
                <div v-if="form.company" class="text-sm text-gray-600">{{ form.company }}</div>
                <div v-if="form.regNumber || form.vatNumber" class="mt-4 text-xs text-gray-400">
                  <span v-if="form.regNumber">Reg. No: {{ form.regNumber }}</span>
                  <span v-if="form.regNumber && form.vatNumber"> · </span>
                  <span v-if="form.vatNumber">VAT: {{ form.vatNumber }}</span>
                </div>
              </div>
              <!-- Legal footer with double rule -->
              <div v-if="form.showFooter" class="absolute bottom-0 left-0 right-0 px-12 pb-6">
                <div class="h-px bg-gray-400 mb-0.5"></div>
                <div class="h-px bg-gray-200 mb-3"></div>
                <div class="flex justify-between text-xs text-gray-400">
                  <span>{{ fmtFooter(form.footerLeft) || form.company }}</span>
                  <span>{{ fmtFooter(form.footerCenter) }}</span>
                  <span>{{ fmtFooter(form.footerRight) }}</span>
                </div>
              </div>
            </div>

            <!-- ════════════════════ EXECUTIVE ════════════════════ -->
            <div
              v-else-if="form.theme === 'executive'"
              class="print-document bg-white shadow-2xl relative overflow-hidden"
              :style="{ fontFamily: form.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
            >
              <div v-if="form.showTopBar" class="h-2 w-full" :style="{ backgroundColor: form.accentColor }"></div>
              <div v-if="form.showWatermark && form.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
                <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: form.watermarkColor }">{{ form.watermark }}</span>
              </div>
              <div v-if="form.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-25deg); z-index: 2">
                <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(form.stamp), borderColor: stampColorFor(form.stamp) }">{{ form.stamp }}</div>
              </div>
              <div class="px-12 py-10" style="position: relative; z-index: 3">
                <!-- Executive header: two columns -->
                <div class="flex justify-between items-start mb-8">
                  <div>
                    <img v-if="form.logoUrl && form.showLogo" :src="form.logoUrl" alt="Logo" class="h-14 w-auto object-contain mb-3" />
                    <div class="text-2xl font-bold" :style="{ color: form.accentColor }">{{ form.company }}</div>
                    <div v-if="form.tagline" class="text-xs text-gray-400 mt-0.5">{{ form.tagline }}</div>
                  </div>
                  <div class="text-right text-xs text-gray-500 space-y-0.5 mt-1">
                    <div v-if="form.email">{{ form.email }}</div>
                    <div v-if="form.phone">{{ form.phone }}</div>
                    <div v-if="form.website">{{ form.website }}</div>
                    <div v-if="form.address" class="whitespace-pre-line mt-1 text-right">{{ form.address }}</div>
                  </div>
                </div>

                <!-- Accent rule -->
                <div class="flex mb-8" style="height: 3px; border-radius: 2px" :style="{ backgroundColor: form.accentColor }"></div>

                <!-- Meta strip -->
                <div class="grid grid-cols-3 gap-4 border border-gray-100 rounded p-4 mb-8 text-xs" :style="{ backgroundColor: form.accentColor + '08' }">
                  <div v-if="form.showDate">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.date') }}</div>
                    <div class="font-semibold text-gray-700">{{ formatDate(form.date) }}</div>
                  </div>
                  <div v-if="form.showRef">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.reference') }}</div>
                    <div class="font-semibold text-gray-700 font-mono">{{ form.refNumber }}</div>
                  </div>
                  <div v-if="form.subject">
                    <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">{{ t('letterheadView.doc.subject') }}</div>
                    <div class="font-semibold text-gray-700">{{ form.subject }}</div>
                  </div>
                </div>

                <p v-if="form.salutation" class="text-gray-700 mb-5">{{ form.salutation }}</p>
                <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height: 1.9">{{ form.body }}</div>
                <p class="text-gray-700 mb-12">{{ form.closing }}</p>
                <img v-if="form.signatureUrl" :src="form.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ form.signerName }}</div>
                <div class="text-xs text-gray-500">{{ form.signerTitle }}</div>
                <div v-if="form.company" class="text-xs text-gray-400">{{ form.company }}</div>
                <div v-if="form.regNumber || form.vatNumber" class="mt-2 text-xs text-gray-400">
                  <span v-if="form.regNumber">Reg: {{ form.regNumber }}</span>
                  <span v-if="form.vatNumber"> · VAT: {{ form.vatNumber }}</span>
                </div>

                <div v-if="form.showFooter" class="absolute bottom-8 left-12 right-12 border-t-2 pt-4 flex justify-between" :style="{ borderColor: form.accentColor + '40' }">
                  <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(form.footerLeft) || form.website }}</span>
                  <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(form.footerCenter) || form.company }}</span>
                  <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(form.footerRight) }}</span>
                </div>
                <div v-if="form.showBottomBar" class="absolute bottom-0 left-0 right-0 h-2" :style="{ backgroundColor: form.accentColor }"></div>
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
    resource-type="letterhead"
    :org-id="orgId"
    :resource-id="savedLetterheadId"
    :resource-name="form.name"
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
