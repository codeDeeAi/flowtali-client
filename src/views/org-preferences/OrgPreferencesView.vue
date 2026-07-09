<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { OrgPreferencesService } from '@/services/org-preferences.service'
import { MediaService } from '@/services/media.service'
import { ApiKeyService, type IOrgApiKey } from '@/services/api-key.service'
import type { IOrgStamp, IOrgBrandColor, IOrgSignature, IOrgLogo, IOrgInvoiceProfile, IOrgBankAccount, IOrgPaymentLink } from '@/types/org-preferences.types'

const authStore = useAuthStore()
const { t, locale } = useI18n()
const { isBusinessOrg } = usePermissions()
const orgId = computed(() => authStore.currentOrganization?.id ?? '')
const orgName = computed(() => authStore.currentOrganization?.name ?? 'your organization')

// ── State ─────────────────────────────────────────────────────────────────────
const loading         = ref(true)
const stamps          = ref<IOrgStamp[]>([])
const brandColors     = ref<IOrgBrandColor[]>([])
const signatures      = ref<IOrgSignature[]>([])
const orgLogos        = ref<IOrgLogo[]>([])
const invoiceProfiles = ref<IOrgInvoiceProfile[]>([])
const bankAccounts    = ref<IOrgBankAccount[]>([])
const paymentLinks    = ref<IOrgPaymentLink[]>([])

// ── Stamp form ─────────────────────────────────────────────────────────────────
const showStampForm  = ref(false)
const stampSaving    = ref(false)
const editStampIndex = ref<number | null>(null)
const stampForm      = ref({ text: '', color: '#4ade80', text_color: '#ffffff' })

// ── Color form ─────────────────────────────────────────────────────────────────
const showColorForm  = ref(false)
const colorSaving    = ref(false)
const editColorIndex = ref<number | null>(null)
const colorForm      = ref({ name: '', hex: '#ffffff' })

// ── Signature form ─────────────────────────────────────────────────────────────
const showSigForm     = ref(false)
const sigSubmitting   = ref(false)
const sigForm         = ref({ name: '', role: '' })
const sigFileRef      = ref<HTMLInputElement | null>(null)
// Instant-upload state
const sigUploading    = ref(false)
const sigUploadError  = ref<string | null>(null)
const sigMediaId      = ref<string | null>(null)
const sigPreview      = ref<string | null>(null)

// ── Logo form ──────────────────────────────────────────────────────────────────
const showLogoForm    = ref(false)
const logoSubmitting  = ref(false)
const logoForm        = ref({ label: '' })
const logoFileRef     = ref<HTMLInputElement | null>(null)
// Instant-upload state
const logoUploading   = ref(false)
const logoUploadError = ref<string | null>(null)
const logoMediaId     = ref<string | null>(null)
const logoPreview     = ref<string | null>(null)

// ── Deleting ──────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadPreferences() {
  if (!orgId.value) return
  loading.value = true
  try {
    const { data } = await OrgPreferencesService.get(orgId.value)
    stamps.value          = data.data.stamps           ?? []
    brandColors.value     = data.data.brand_colors     ?? []
    invoiceProfiles.value = data.data.invoice_profiles ?? []
    bankAccounts.value    = data.data.bank_accounts    ?? []
    paymentLinks.value    = data.data.payment_links    ?? []
    signatures.value      = data.data.signatures       ?? []
    orgLogos.value        = data.data.logos            ?? []
  } finally {
    loading.value = false
  }
}

onMounted(loadPreferences)

// ── Stamps ────────────────────────────────────────────────────────────────────
function openAddStamp() {
  editStampIndex.value = null
  stampForm.value = { text: '', color: '#4ade80', text_color: '#ffffff' }
  showStampForm.value = true
}

function openEditStamp(index: number) {
  editStampIndex.value = index
  const s = stamps.value[index]
  stampForm.value = { text: s?.text ?? '', color: s?.color ?? '#4ade80', text_color: s?.text_color ?? '#ffffff' }
  showStampForm.value = true
}

async function saveStamp() {
  if (!stampForm.value.text.trim()) return
  const list = [...stamps.value]
  const entry: IOrgStamp = {
    text:       stampForm.value.text.trim().toUpperCase(),
    color:      stampForm.value.color,
    text_color: stampForm.value.text_color,
  }
  if (editStampIndex.value !== null) list[editStampIndex.value] = entry
  else list.push(entry)

  stampSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateStamps(orgId.value, list)
    stamps.value = data.data.stamps
    showStampForm.value = false
  } finally {
    stampSaving.value = false
  }
}

async function deleteStamp(index: number) {
  const list = stamps.value.filter((_, i) => i !== index)
  stampSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateStamps(orgId.value, list)
    stamps.value = data.data.stamps
  } finally {
    stampSaving.value = false
  }
}

// ── Brand colors ──────────────────────────────────────────────────────────────
function openAddColor() {
  editColorIndex.value = null
  colorForm.value = { name: '', hex: '#ffffff' }
  showColorForm.value = true
}

function openEditColor(index: number) {
  editColorIndex.value = index
  const c = brandColors.value[index]
  colorForm.value = { name: c?.name ?? '', hex: c?.hex ?? '#ffffff' }
  showColorForm.value = true
}

async function saveColor() {
  if (!colorForm.value.name.trim() || !colorForm.value.hex.trim()) return
  const list = [...brandColors.value]
  const entry: IOrgBrandColor = { name: colorForm.value.name.trim(), hex: colorForm.value.hex.toUpperCase() }
  if (editColorIndex.value !== null) list[editColorIndex.value] = entry
  else list.push(entry)

  colorSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateBrandColors(orgId.value, list)
    brandColors.value = data.data.brand_colors
    showColorForm.value = false
  } finally {
    colorSaving.value = false
  }
}

async function deleteColor(index: number) {
  const list = brandColors.value.filter((_, i) => i !== index)
  colorSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateBrandColors(orgId.value, list)
    brandColors.value = data.data.brand_colors
  } finally {
    colorSaving.value = false
  }
}

// ── Signature — instant upload ────────────────────────────────────────────────
const sigDeleting = ref(false)
const logoDeleting = ref(false)

function openSigForm() {
  showSigForm.value = true
}

function closeSigForm() {
  showSigForm.value = false
  sigForm.value = { name: '', role: '' }
  sigMediaId.value = null
  sigPreview.value = null
  sigUploadError.value = null
  if (sigFileRef.value) sigFileRef.value.value = ''
}

async function onSigFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  sigPreview.value     = URL.createObjectURL(file)
  sigMediaId.value     = null
  sigUploadError.value = null
  sigUploading.value   = true

  try {
    const fd = new FormData()
    fd.append('files[0][type]', 'org_signature')
    fd.append('files[0][file]', file)
    const { data } = await MediaService.upload(fd)
    sigMediaId.value = data.data[0]?.id ?? null
    if (data.data[0]?.url) sigPreview.value = data.data[0].url
  } catch {
    sigUploadError.value = t('orgPref.signatures.uploadError')
    sigPreview.value = null
    sigMediaId.value = null
    if (sigFileRef.value) sigFileRef.value.value = ''
  } finally {
    sigUploading.value = false
  }
}

async function clearSigMedia() {
  if (!sigMediaId.value) return
  sigDeleting.value = true
  try {
    await MediaService.delete([sigMediaId.value])
  } finally {
    sigMediaId.value = null
    sigPreview.value = null
    sigUploadError.value = null
    sigDeleting.value = false
    if (sigFileRef.value) sigFileRef.value.value = ''
  }
}

async function submitSignature() {
  if (!sigForm.value.name.trim() || !sigForm.value.role.trim() || !sigMediaId.value) return
  sigSubmitting.value = true
  try {
    const { data } = await OrgPreferencesService.attachSignature(orgId.value, {
      name:     sigForm.value.name.trim(),
      role:     sigForm.value.role.trim(),
      media_id: sigMediaId.value,
    })
    signatures.value.push(data.data as IOrgSignature)
    closeSigForm()
  } finally {
    sigSubmitting.value = false
  }
}

async function deleteSignature(mediaId: string) {
  deletingId.value = mediaId
  try {
    await OrgPreferencesService.deleteSignature(orgId.value, mediaId)
    signatures.value = signatures.value.filter(s => s.id !== mediaId)
  } finally {
    deletingId.value = null
  }
}

// ── Logo — instant upload ──────────────────────────────────────────────────────
function openLogoForm() {
  showLogoForm.value = true
}

function closeLogoForm() {
  showLogoForm.value = false
  logoForm.value = { label: '' }
  logoMediaId.value = null
  logoPreview.value = null
  logoUploadError.value = null
  if (logoFileRef.value) logoFileRef.value.value = ''
}

async function onLogoFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  logoPreview.value     = URL.createObjectURL(file)
  logoMediaId.value     = null
  logoUploadError.value = null
  logoUploading.value   = true

  try {
    const fd = new FormData()
    fd.append('files[0][type]', 'org_logo')
    fd.append('files[0][file]', file)
    const { data } = await MediaService.upload(fd)
    logoMediaId.value = data.data[0]?.id ?? null
    if (data.data[0]?.url) logoPreview.value = data.data[0].url
  } catch {
    logoUploadError.value = t('orgPref.signatures.uploadError')
    logoPreview.value = null
    logoMediaId.value = null
    if (logoFileRef.value) logoFileRef.value.value = ''
  } finally {
    logoUploading.value = false
  }
}

async function clearLogoMedia() {
  if (!logoMediaId.value) return
  logoDeleting.value = true
  try {
    await MediaService.delete([logoMediaId.value])
  } finally {
    logoMediaId.value = null
    logoPreview.value = null
    logoUploadError.value = null
    logoDeleting.value = false
    if (logoFileRef.value) logoFileRef.value.value = ''
  }
}

async function submitLogo() {
  if (!logoForm.value.label.trim() || !logoMediaId.value) return
  logoSubmitting.value = true
  try {
    const { data } = await OrgPreferencesService.attachLogo(orgId.value, {
      label:    logoForm.value.label.trim(),
      media_id: logoMediaId.value,
    })
    orgLogos.value.push(data.data as IOrgLogo)
    closeLogoForm()
  } finally {
    logoSubmitting.value = false
  }
}

async function deleteLogo(mediaId: string) {
  deletingId.value = mediaId
  try {
    await OrgPreferencesService.deleteLogo(orgId.value, mediaId)
    orgLogos.value = orgLogos.value.filter(l => l.id !== mediaId)
  } finally {
    deletingId.value = null
  }
}

// ── Invoice Profiles ──────────────────────────────────────────────────────────
const showProfileForm  = ref(false)
const profileSaving    = ref(false)
const editProfileIndex = ref<number | null>(null)
const profileForm      = ref<Omit<IOrgInvoiceProfile, 'id'>>({
  name: '', tagline: '', email: '', phone: '', website: '', address: '', logo_url: ''
})

function openAddProfile() {
  editProfileIndex.value = null
  profileForm.value = { name: '', tagline: '', email: '', phone: '', website: '', address: '', logo_url: '' }
  showProfileForm.value = true
}

function openEditProfile(index: number) {
  editProfileIndex.value = index
  const p = invoiceProfiles.value[index]
  if (!p) return
  profileForm.value = {
    name: p.name, tagline: p.tagline ?? '', email: p.email ?? '',
    phone: p.phone ?? '', website: p.website ?? '', address: p.address ?? '', logo_url: p.logo_url ?? ''
  }
  showProfileForm.value = true
}

async function saveProfile() {
  if (!profileForm.value.name.trim()) return
  const list = [...invoiceProfiles.value]
  const entry: IOrgInvoiceProfile = {
    id: editProfileIndex.value !== null ? (list[editProfileIndex.value]?.id ?? crypto.randomUUID()) : crypto.randomUUID(),
    name:     profileForm.value.name.trim(),
    tagline:  profileForm.value.tagline?.trim() || null,
    email:    profileForm.value.email?.trim() || null,
    phone:    profileForm.value.phone?.trim() || null,
    website:  profileForm.value.website?.trim() || null,
    address:  profileForm.value.address?.trim() || null,
    logo_url: profileForm.value.logo_url?.trim() || null,
  }
  if (editProfileIndex.value !== null) list[editProfileIndex.value] = entry
  else list.push(entry)

  profileSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateInvoiceProfiles(orgId.value, list)
    invoiceProfiles.value = data.data.invoice_profiles
    showProfileForm.value = false
  } finally {
    profileSaving.value = false
  }
}

async function deleteProfile(index: number) {
  const list = invoiceProfiles.value.filter((_, i) => i !== index)
  profileSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateInvoiceProfiles(orgId.value, list)
    invoiceProfiles.value = data.data.invoice_profiles
  } finally {
    profileSaving.value = false
  }
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────
const showBankForm  = ref(false)
const bankSaving    = ref(false)
const editBankIndex = ref<number | null>(null)
const bankForm      = ref<Omit<IOrgBankAccount, 'id'>>({
  label: '', bank_name: '', account_name: '', account_number: '', sort_code: '', iban: '', swift: '', currency: '', notes: ''
})

function openAddBank() {
  editBankIndex.value = null
  bankForm.value = { label: '', bank_name: '', account_name: '', account_number: '', sort_code: '', iban: '', swift: '', currency: '', notes: '' }
  showBankForm.value = true
}

function openEditBank(index: number) {
  editBankIndex.value = index
  const b = bankAccounts.value[index]
  if (!b) return
  bankForm.value = {
    label: b.label, bank_name: b.bank_name ?? '', account_name: b.account_name ?? '',
    account_number: b.account_number ?? '', sort_code: b.sort_code ?? '',
    iban: b.iban ?? '', swift: b.swift ?? '', currency: b.currency ?? '', notes: b.notes ?? ''
  }
  showBankForm.value = true
}

async function saveBank() {
  if (!bankForm.value.label.trim()) return
  const list = [...bankAccounts.value]
  const entry: IOrgBankAccount = {
    id: editBankIndex.value !== null ? (list[editBankIndex.value]?.id ?? crypto.randomUUID()) : crypto.randomUUID(),
    label:          bankForm.value.label.trim(),
    bank_name:      bankForm.value.bank_name?.trim() || null,
    account_name:   bankForm.value.account_name?.trim() || null,
    account_number: bankForm.value.account_number?.trim() || null,
    sort_code:      bankForm.value.sort_code?.trim() || null,
    iban:           bankForm.value.iban?.trim() || null,
    swift:          bankForm.value.swift?.trim() || null,
    currency:       bankForm.value.currency?.trim() || null,
    notes:          bankForm.value.notes?.trim() || null,
  }
  if (editBankIndex.value !== null) list[editBankIndex.value] = entry
  else list.push(entry)

  bankSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateBankAccounts(orgId.value, list)
    bankAccounts.value = data.data.bank_accounts
    showBankForm.value = false
  } finally {
    bankSaving.value = false
  }
}

async function deleteBank(index: number) {
  const list = bankAccounts.value.filter((_, i) => i !== index)
  bankSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updateBankAccounts(orgId.value, list)
    bankAccounts.value = data.data.bank_accounts
  } finally {
    bankSaving.value = false
  }
}

// ── Payment Links ─────────────────────────────────────────────────────────────
const showPaymentLinkForm  = ref(false)
const paymentLinkSaving    = ref(false)
const editPaymentLinkIndex = ref<number | null>(null)
const paymentLinkTypes     = ['PayPal', 'Venmo', 'Cash App', 'Stripe', 'Wise', 'Revolut', 'Zelle', 'Custom']
const paymentLinkForm      = ref<Omit<IOrgPaymentLink, 'id'>>({ label: '', type: 'PayPal', value: '' })

function openAddPaymentLink() {
  editPaymentLinkIndex.value = null
  paymentLinkForm.value = { label: '', type: 'PayPal', value: '' }
  showPaymentLinkForm.value = true
}

function openEditPaymentLink(index: number) {
  editPaymentLinkIndex.value = index
  const p = paymentLinks.value[index]
  if (!p) return
  paymentLinkForm.value = { label: p.label, type: p.type, value: p.value }
  showPaymentLinkForm.value = true
}

async function savePaymentLink() {
  if (!paymentLinkForm.value.label.trim() || !paymentLinkForm.value.value.trim()) return
  const list = [...paymentLinks.value]
  const entry: IOrgPaymentLink = {
    id: editPaymentLinkIndex.value !== null ? (list[editPaymentLinkIndex.value]?.id ?? crypto.randomUUID()) : crypto.randomUUID(),
    label: paymentLinkForm.value.label.trim(),
    type:  paymentLinkForm.value.type,
    value: paymentLinkForm.value.value.trim(),
  }
  if (editPaymentLinkIndex.value !== null) list[editPaymentLinkIndex.value] = entry
  else list.push(entry)

  paymentLinkSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updatePaymentLinks(orgId.value, list)
    paymentLinks.value = data.data.payment_links
    showPaymentLinkForm.value = false
  } finally {
    paymentLinkSaving.value = false
  }
}

async function deletePaymentLink(index: number) {
  const list = paymentLinks.value.filter((_, i) => i !== index)
  paymentLinkSaving.value = true
  try {
    const { data } = await OrgPreferencesService.updatePaymentLinks(orgId.value, list)
    paymentLinks.value = data.data.payment_links
  } finally {
    paymentLinkSaving.value = false
  }
}

// ── API Keys ──────────────────────────────────────────────────────────────────
const apiKeys            = ref<IOrgApiKey[]>([])
const apiKeysLoading     = ref(false)
const showApiKeyForm     = ref(false)
const apiKeyFormName     = ref('')
const apiKeyFormDomains  = ref('')
const apiKeySaving       = ref(false)
const apiKeyActionId     = ref<string | null>(null)
const newSecretModal     = ref<{ key: IOrgApiKey; secret: string } | null>(null)
const secretCopied       = ref(false)

async function loadApiKeys() {
  if (!orgId.value) return
  apiKeysLoading.value = true
  try {
    const { data } = await ApiKeyService.list(orgId.value)
    apiKeys.value = data.data?.data ?? []
  } finally {
    apiKeysLoading.value = false
  }
}

function openApiKeyForm() {
  apiKeyFormName.value = ''
  apiKeyFormDomains.value = ''
  showApiKeyForm.value = true
}

async function createApiKey() {
  if (!apiKeyFormName.value.trim()) return
  apiKeySaving.value = true
  try {
    const domains = apiKeyFormDomains.value
      .split(',')
      .map(d => d.trim())
      .filter(Boolean)
    const { data } = await ApiKeyService.create(orgId.value, {
      name: apiKeyFormName.value.trim(),
      allowed_domains: domains,
    })
    apiKeys.value.unshift(data.data.key)
    newSecretModal.value = data.data
    showApiKeyForm.value = false
  } finally {
    apiKeySaving.value = false
  }
}

async function revokeApiKey(keyId: string) {
  apiKeyActionId.value = keyId
  try {
    await ApiKeyService.revoke(orgId.value, keyId)
    const key = apiKeys.value.find(k => k.id === keyId)
    if (key) key.is_active = false
  } finally {
    apiKeyActionId.value = null
  }
}

async function deleteApiKey(keyId: string) {
  if (!confirm(t('orgPref.apiKeys.deleteConfirm'))) return
  apiKeyActionId.value = keyId
  try {
    await ApiKeyService.destroy(orgId.value, keyId)
    apiKeys.value = apiKeys.value.filter(k => k.id !== keyId)
  } finally {
    apiKeyActionId.value = null
  }
}

function copySecret(secret: string) {
  navigator.clipboard.writeText(secret)
  secretCopied.value = true
  setTimeout(() => (secretCopied.value = false), 2000)
}

function maskKey(key: string) {
  return key.slice(0, 14) + '••••••••••••' + key.slice(-4)
}

onMounted(loadApiKeys)
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">{{ t('orgPref.title') }}</h1>
      <p class="page-subtitle">{{ t('orgPref.subtitle', { org: orgName }) }}</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="bg-gray-200 border border-gray-400 rounded-xl p-5 animate-pulse">
        <div class="h-4 bg-gray-400 rounded w-32 mb-4"></div>
        <div class="space-y-2">
          <div class="h-10 bg-gray-400 rounded"></div>
          <div class="h-10 bg-gray-400 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- ── Saved Stamps ────────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.stamps.title') }}</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openAddStamp"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.stamps.add') }}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="(stamp, i) in stamps" :key="i"
            class="group relative flex flex-col items-center gap-2 p-3 border border-gray-400 hover:border-gray-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditStamp(i)"
          >
            <div
              class="w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono font-bold text-center leading-tight"
              style="transform: rotate(-15deg); font-size: 8px; letter-spacing: 0.05em;"
              :style="{ borderColor: stamp.color, color: stamp.color }"
            >
              {{ stamp.text }}
            </div>
            <span class="text-[10px] text-gray-700">{{ stamp.text }}</span>
            <button
              class="absolute top-1 right-1 w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              @click.stop="deleteStamp(i)"
            >
              <Icon icon="lucide:x" class="w-3 h-3" />
            </button>
          </div>
          <div v-if="!stamps.length" class="col-span-3 text-center py-6 text-xs text-gray-700">
            {{ t('orgPref.stamps.empty') }}
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showStampForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ editStampIndex !== null ? t('orgPref.stamps.formEdit') : t('orgPref.stamps.formNew') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="showStampForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.stamps.label') }}</label>
                <input v-model="stampForm.text" type="text" maxlength="20" :placeholder="t('orgPref.stamps.labelPh')" class="app-inp w-full text-sm uppercase" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.stamps.borderColor') }}</label>
                <div class="flex items-center gap-2">
                  <input v-model="stampForm.color" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-500" />
                  <input v-model="stampForm.color" type="text" maxlength="7" placeholder="#4ade80" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.stamps.fillColor') }}</label>
                <div class="flex items-center gap-2">
                  <input v-model="stampForm.text_color" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-500" />
                  <input v-model="stampForm.text_color" type="text" maxlength="7" placeholder="#ffffff" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showStampForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="stampSaving || !stampForm.text.trim()"
                @click="saveStamp"
              >{{ stampSaving ? t('orgPref.common.saving') : t('orgPref.common.save') }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Saved Signatures ──────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.signatures.title') }}</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openSigForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> {{ t('orgPref.signatures.upload') }}
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="sig in signatures" :key="sig.id" class="flex items-center gap-3 p-3 border border-gray-400 rounded-lg">
            <div class="w-20 h-9 bg-gray-100 border border-gray-500 rounded flex items-center justify-center shrink-0 overflow-hidden">
              <img :src="sig.url" :alt="sig.extras.name" class="max-w-full max-h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-1000 truncate">{{ sig.extras.name }}</div>
              <div class="text-xs text-gray-700 truncate">{{ sig.extras.role }}</div>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              :disabled="deletingId === sig.id"
              @click="deleteSignature(sig.id)"
            >
              <Icon :icon="deletingId === sig.id ? 'lucide:loader-circle' : 'lucide:trash-2'" class="w-3.5 h-3.5" :class="{ 'animate-spin': deletingId === sig.id }" />
            </button>
          </div>
          <div v-if="!signatures.length && !showSigForm" class="text-center py-4 text-xs text-gray-700">{{ t('orgPref.signatures.empty') }}</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showSigForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ t('orgPref.signatures.formTitle') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="closeSigForm">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- File drop zone — upload happens immediately on selection -->
            <div>
              <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.signatures.image') }}</label>
              <div
                class="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                :class="sigUploadError ? 'border-red-500/50 hover:border-red-500/70' : 'border-gray-500 hover:border-gray-500'"
                @click="sigFileRef?.click()"
              >
                <!-- Uploading spinner -->
                <div v-if="sigUploading" class="flex flex-col items-center gap-2">
                  <Icon icon="lucide:loader-circle" class="w-6 h-6 text-green-700 animate-spin" />
                  <span class="text-xs text-gray-700">{{ t('orgPref.signatures.uploading') }}</span>
                </div>
                <!-- Preview after upload -->
                <div v-else-if="sigPreview && sigMediaId" class="flex flex-col items-center gap-1.5">
                  <div class="relative inline-flex">
                    <img :src="sigPreview" class="max-h-14 object-contain rounded" />
                    <!-- Floating delete button -->
                    <button
                      class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow transition-colors disabled:opacity-60"
                      :disabled="sigDeleting"
                      @click.stop="clearSigMedia"
                      :title="t('orgPref.signatures.removeUploaded')"
                    >
                      <Icon v-if="sigDeleting" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                      <Icon v-else icon="lucide:x" class="w-3 h-3" />
                    </button>
                  </div>
                  <span class="text-[10px] text-green-400 flex items-center gap-1">
                    <Icon icon="lucide:check-circle" class="w-3 h-3" /> {{ t('orgPref.signatures.uploaded') }}
                  </span>
                </div>
                <!-- Error state -->
                <div v-else-if="sigUploadError" class="flex flex-col items-center gap-1">
                  <Icon icon="lucide:alert-circle" class="w-5 h-5 text-red-400" />
                  <span class="text-xs text-red-400">{{ sigUploadError }}</span>
                  <span class="text-[10px] text-gray-700">{{ t('orgPref.signatures.tryAgain') }}</span>
                </div>
                <!-- Empty state -->
                <div v-else class="text-xs text-gray-700">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-gray-900" />
                  {{ t('orgPref.signatures.selectHint') }}
                </div>
                <input ref="sigFileRef" type="file" accept="image/*" class="hidden" @change="onSigFileChange" />
              </div>
            </div>

            <!-- Name + role — fill while image uploads -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.signatures.fullName') }}</label>
                <input v-model="sigForm.name" type="text" placeholder="Ada Lovelace" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.signatures.role') }}</label>
                <input v-model="sigForm.role" type="text" placeholder="Creative Director" class="app-inp w-full text-sm" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="closeSigForm">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="sigSubmitting || sigUploading || !sigMediaId || !sigForm.name.trim() || !sigForm.role.trim()"
                @click="submitSignature"
              >
                <Icon v-if="sigUploading" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                {{ sigSubmitting ? t('orgPref.common.saving') : sigUploading ? t('orgPref.signatures.uploading') : t('orgPref.signatures.save') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Brand Colors ──────────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.colors.title') }}</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openAddColor"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.colors.add') }}
          </button>
        </div>

        <div class="flex flex-wrap gap-3">
          <div
            v-for="(color, i) in brandColors" :key="i"
            class="group relative flex items-center gap-2.5 px-3 py-2 border border-gray-400 rounded-lg hover:border-gray-500 transition-colors cursor-pointer"
            @click="openEditColor(i)"
          >
            <div class="w-5 h-5 rounded shrink-0" :style="{ backgroundColor: color.hex, border: '1px solid rgba(255,255,255,0.1)' }"></div>
            <div>
              <div class="text-xs font-medium text-gray-1000">{{ color.name }}</div>
              <div class="text-[10px] font-mono text-gray-700">{{ color.hex }}</div>
            </div>
            <button
              class="absolute -top-1.5 -right-1.5 w-4 h-4 hidden group-hover:flex items-center justify-center rounded-full bg-gray-400 text-gray-700 hover:text-red-400 transition-colors"
              @click.stop="deleteColor(i)"
            >
              <Icon icon="lucide:x" class="w-2.5 h-2.5" />
            </button>
          </div>
          <div v-if="!brandColors.length" class="w-full text-center py-4 text-xs text-gray-700">{{ t('orgPref.colors.empty') }}</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showColorForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ editColorIndex !== null ? t('orgPref.colors.formEdit') : t('orgPref.colors.formNew') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="showColorForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.colors.name') }}</label>
                <input v-model="colorForm.name" type="text" :placeholder="t('orgPref.colors.namePh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.colors.hex') }}</label>
                <div class="flex items-center gap-2">
                  <input v-model="colorForm.hex" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-500 shrink-0" />
                  <input v-model="colorForm.hex" type="text" maxlength="7" placeholder="#00c853" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showColorForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="colorSaving || !colorForm.name.trim() || !colorForm.hex.trim()"
                @click="saveColor"
              >{{ colorSaving ? t('orgPref.common.saving') : t('orgPref.common.save') }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Organization Logos ────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.logos.title') }}</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openLogoForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> {{ t('orgPref.logos.upload') }}
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="logo in orgLogos" :key="logo.id" class="flex items-center gap-3 p-3 border border-gray-400 rounded-lg">
            <div class="w-14 h-9 bg-white rounded flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img :src="logo.url" :alt="logo.extras.label" class="max-w-full max-h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-1000 truncate">{{ logo.extras.label }}</div>
              <div class="text-xs text-gray-700">
                {{ logo.extras.mime_type?.replace('image/', '').toUpperCase() ?? t('orgPref.logos.imageFallback') }}
                <template v-if="logo.extras.size"> · {{ Math.round((logo.extras.size as number) / 1024) }} KB</template>
              </div>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              :disabled="deletingId === logo.id"
              @click="deleteLogo(logo.id)"
            >
              <Icon :icon="deletingId === logo.id ? 'lucide:loader-circle' : 'lucide:trash-2'" class="w-3.5 h-3.5" :class="{ 'animate-spin': deletingId === logo.id }" />
            </button>
          </div>
          <div v-if="!orgLogos.length && !showLogoForm" class="text-center py-4 text-xs text-gray-700">{{ t('orgPref.logos.empty') }}</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showLogoForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ t('orgPref.logos.formTitle') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="closeLogoForm">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- File drop zone — upload happens immediately on selection -->
            <div>
              <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.logos.file') }}</label>
              <div
                class="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                :class="logoUploadError ? 'border-red-500/50 hover:border-red-500/70' : 'border-gray-500 hover:border-gray-500'"
                @click="logoFileRef?.click()"
              >
                <div v-if="logoUploading" class="flex flex-col items-center gap-2">
                  <Icon icon="lucide:loader-circle" class="w-6 h-6 text-green-700 animate-spin" />
                  <span class="text-xs text-gray-700">{{ t('orgPref.signatures.uploading') }}</span>
                </div>
                <div v-else-if="logoPreview && logoMediaId" class="flex flex-col items-center gap-1.5">
                  <div class="relative inline-flex">
                    <img :src="logoPreview" class="max-h-14 object-contain rounded" />
                    <!-- Floating delete button -->
                    <button
                      class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow transition-colors disabled:opacity-60"
                      :disabled="logoDeleting"
                      @click.stop="clearLogoMedia"
                      :title="t('orgPref.signatures.removeUploaded')"
                    >
                      <Icon v-if="logoDeleting" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                      <Icon v-else icon="lucide:x" class="w-3 h-3" />
                    </button>
                  </div>
                  <span class="text-[10px] text-green-400 flex items-center gap-1">
                    <Icon icon="lucide:check-circle" class="w-3 h-3" /> {{ t('orgPref.signatures.uploaded') }}
                  </span>
                </div>
                <div v-else-if="logoUploadError" class="flex flex-col items-center gap-1">
                  <Icon icon="lucide:alert-circle" class="w-5 h-5 text-red-400" />
                  <span class="text-xs text-red-400">{{ logoUploadError }}</span>
                  <span class="text-[10px] text-gray-700">{{ t('orgPref.signatures.tryAgain') }}</span>
                </div>
                <div v-else class="text-xs text-gray-700">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-gray-900" />
                  {{ t('orgPref.logos.selectHint') }}
                </div>
                <input ref="logoFileRef" type="file" accept="image/*" class="hidden" @change="onLogoFileChange" />
              </div>
            </div>

            <!-- Label — fill while image uploads -->
            <div>
              <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.logos.label') }}</label>
              <input v-model="logoForm.label" type="text" :placeholder="t('orgPref.logos.labelPh')" class="app-inp w-full text-sm" />
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="closeLogoForm">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="logoSubmitting || logoUploading || !logoMediaId || !logoForm.label.trim()"
                @click="submitLogo"
              >
                <Icon v-if="logoUploading" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                {{ logoSubmitting ? t('orgPref.common.saving') : logoUploading ? t('orgPref.signatures.uploading') : t('orgPref.logos.save') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Invoice Quick-Fill Profiles ─────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.profiles.title') }}</h3>
            <p class="text-[11px] text-gray-700 mt-0.5">{{ t('orgPref.profiles.subtitle') }}</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
            @click="openAddProfile"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.profiles.add') }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="(profile, i) in invoiceProfiles" :key="profile.id"
            class="group relative flex flex-col gap-1.5 p-3.5 border border-gray-400 hover:border-gray-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditProfile(i)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-1000 truncate">{{ profile.name }}</div>
                <div v-if="profile.tagline" class="text-[11px] text-gray-700 truncate">{{ profile.tagline }}</div>
              </div>
              <button
                class="w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                @click.stop="deleteProfile(i)"
              >
                <Icon icon="lucide:x" class="w-3 h-3" />
              </button>
            </div>
            <div class="grid grid-cols-1 gap-0.5 text-[11px] text-gray-700">
              <span v-if="profile.email" class="flex items-center gap-1 truncate"><Icon icon="lucide:mail" class="w-3 h-3 shrink-0" />{{ profile.email }}</span>
              <span v-if="profile.phone" class="flex items-center gap-1 truncate"><Icon icon="lucide:phone" class="w-3 h-3 shrink-0" />{{ profile.phone }}</span>
              <span v-if="profile.website" class="flex items-center gap-1 truncate"><Icon icon="lucide:globe" class="w-3 h-3 shrink-0" />{{ profile.website }}</span>
            </div>
          </div>
          <div v-if="!invoiceProfiles.length" class="col-span-full text-center py-6 text-xs text-gray-700">
            {{ t('orgPref.profiles.empty') }}
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showProfileForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ editProfileIndex !== null ? t('orgPref.profiles.formEdit') : t('orgPref.profiles.formNew') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="showProfileForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.name') }} <span class="text-red-400">*</span></label>
                <input v-model="profileForm.name" type="text" :placeholder="t('orgPref.profiles.namePh')" class="app-inp w-full text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.tagline') }}</label>
                <input v-model="profileForm.tagline" type="text" :placeholder="t('orgPref.profiles.taglinePh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.email') }}</label>
                <input v-model="profileForm.email" type="email" :placeholder="t('orgPref.profiles.emailPh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.phone') }}</label>
                <input v-model="profileForm.phone" type="text" :placeholder="t('orgPref.profiles.phonePh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.website') }}</label>
                <input v-model="profileForm.website" type="text" :placeholder="t('orgPref.profiles.websitePh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.logoUrl') }}</label>
                <input v-model="profileForm.logo_url" type="text" placeholder="https://…" class="app-inp w-full text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.profiles.address') }}</label>
                <textarea v-model="profileForm.address" rows="2" :placeholder="t('orgPref.profiles.addressPh')" class="app-inp w-full text-sm resize-none"></textarea>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showProfileForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="profileSaving || !profileForm.name.trim()"
                @click="saveProfile"
              >{{ profileSaving ? t('orgPref.common.saving') : t('orgPref.profiles.save') }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Bank Accounts ────────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.banks.title') }}</h3>
            <p class="text-[11px] text-gray-700 mt-0.5">{{ t('orgPref.banks.subtitle') }}</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
            @click="openAddBank"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.banks.add') }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="(bank, i) in bankAccounts" :key="bank.id"
            class="group relative flex flex-col gap-1.5 p-3.5 border border-gray-400 hover:border-gray-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditBank(i)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-1000 truncate">{{ bank.label }}</div>
                <div v-if="bank.bank_name" class="text-[11px] text-gray-700 truncate">{{ bank.bank_name }}</div>
              </div>
              <button
                class="w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                @click.stop="deleteBank(i)"
              >
                <Icon icon="lucide:x" class="w-3 h-3" />
              </button>
            </div>
            <div class="grid grid-cols-1 gap-0.5 text-[11px] font-mono text-gray-700">
              <span v-if="bank.account_name">{{ bank.account_name }}</span>
              <span v-if="bank.account_number">{{ t('orgPref.banks.acct', { n: bank.account_number }) }}</span>
              <span v-if="bank.iban">IBAN: {{ bank.iban }}</span>
              <span v-if="bank.sort_code">{{ t('orgPref.banks.sort', { n: bank.sort_code }) }}</span>
            </div>
          </div>
          <div v-if="!bankAccounts.length" class="col-span-full text-center py-6 text-xs text-gray-700">
            {{ t('orgPref.banks.empty') }}
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showBankForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ editBankIndex !== null ? t('orgPref.banks.formEdit') : t('orgPref.banks.formNew') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="showBankForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.label') }} <span class="text-red-400">*</span></label>
                <input v-model="bankForm.label" type="text" :placeholder="t('orgPref.banks.labelPh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.currency') }}</label>
                <input v-model="bankForm.currency" type="text" :placeholder="t('orgPref.banks.currencyPh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.bankName') }}</label>
                <input v-model="bankForm.bank_name" type="text" placeholder="Barclays" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.accountName') }}</label>
                <input v-model="bankForm.account_name" type="text" :placeholder="t('orgPref.banks.accountNamePh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.accountNumber') }}</label>
                <input v-model="bankForm.account_number" type="text" placeholder="12345678" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.sortCode') }}</label>
                <input v-model="bankForm.sort_code" type="text" placeholder="20-00-00" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.iban') }}</label>
                <input v-model="bankForm.iban" type="text" placeholder="GB00 BARC 2000 0055 5555 55" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.swift') }}</label>
                <input v-model="bankForm.swift" type="text" placeholder="BARCGB22" class="app-inp w-full text-sm font-mono" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.banks.notes') }}</label>
                <input v-model="bankForm.notes" type="text" :placeholder="t('orgPref.banks.notesPh')" class="app-inp w-full text-sm" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showBankForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="bankSaving || !bankForm.label.trim()"
                @click="saveBank"
              >{{ bankSaving ? t('orgPref.common.saving') : t('orgPref.banks.save') }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Payment Links ──────────────────────────────────────────────────── -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.links.title') }}</h3>
            <p class="text-[11px] text-gray-700 mt-0.5">{{ t('orgPref.links.subtitle') }}</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
            @click="openAddPaymentLink"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.links.add') }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="(link, i) in paymentLinks" :key="link.id"
            class="group relative flex items-center gap-3 p-3.5 border border-gray-400 hover:border-gray-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditPaymentLink(i)"
          >
            <div class="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center shrink-0">
              <Icon icon="lucide:link" class="w-4 h-4 text-green-700" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-gray-1000 truncate">{{ link.label }}</div>
              <div class="text-[11px] text-gray-700 truncate">
                <span class="text-green-700/80 font-medium">{{ link.type }}</span>
                <span class="mx-1">·</span>
                <span class="font-mono">{{ link.value }}</span>
              </div>
            </div>
            <button
              class="w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              @click.stop="deletePaymentLink(i)"
            >
              <Icon icon="lucide:x" class="w-3 h-3" />
            </button>
          </div>
          <div v-if="!paymentLinks.length" class="col-span-full text-center py-6 text-xs text-gray-700">
            {{ t('orgPref.links.empty') }}
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showPaymentLinkForm" class="mt-4 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-1000">{{ editPaymentLinkIndex !== null ? t('orgPref.links.formEdit') : t('orgPref.links.formNew') }}</span>
              <button class="text-gray-700 hover:text-gray-1000" @click="showPaymentLinkForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.links.label') }} <span class="text-red-400">*</span></label>
                <input v-model="paymentLinkForm.label" type="text" :placeholder="t('orgPref.links.labelPh')" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.links.type') }} <span class="text-red-400">*</span></label>
                <select v-model="paymentLinkForm.type" class="app-select w-full text-sm">
                  <option v-for="t in paymentLinkTypes" :key="t">{{ t }}</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.links.value') }} <span class="text-red-400">*</span></label>
                <input
                  v-model="paymentLinkForm.value"
                  type="text"
                  :placeholder="paymentLinkForm.type === 'PayPal' ? 'paypal.me/yourusername' : paymentLinkForm.type === 'Venmo' ? '@yourusername' : paymentLinkForm.type === 'Cash App' ? '$yourcashtag' : paymentLinkForm.type === 'Stripe' ? 'https://buy.stripe.com/…' : t('orgPref.links.valuePh')"
                  class="app-inp w-full text-sm"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showPaymentLinkForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="paymentLinkSaving || !paymentLinkForm.label.trim() || !paymentLinkForm.value.trim()"
                @click="savePaymentLink"
              >{{ paymentLinkSaving ? t('orgPref.common.saving') : t('orgPref.links.save') }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── API Keys ──────────────────────────────────────────────────────── -->
      <div v-if="isBusinessOrg" class="bg-gray-200 border border-gray-400 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-1000">{{ t('orgPref.apiKeys.title') }}</h3>
            <p class="text-xs text-gray-700 mt-0.5">{{ t('orgPref.apiKeys.subtitle') }}</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openApiKeyForm"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> {{ t('orgPref.apiKeys.new') }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="apiKeysLoading" class="space-y-2">
          <div v-for="i in 2" :key="i" class="h-12 bg-gray-400 rounded-lg animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="!apiKeys.length && !showApiKeyForm" class="text-center py-8 text-xs text-gray-700">
          {{ t('orgPref.apiKeys.empty') }}
        </div>

        <!-- Key list -->
        <div v-else-if="apiKeys.length" class="flex flex-col gap-2 mb-3">
          <div
            v-for="key in apiKeys" :key="key.id"
            class="flex items-center gap-3 p-3 border rounded-lg transition-colors"
            :class="key.is_active ? 'border-gray-400 bg-gray-100/40' : 'border-gray-400/40 bg-gray-100/20 opacity-60'"
          >
            <!-- Status dot -->
            <div class="w-2 h-2 rounded-full flex-shrink-0" :class="key.is_active ? 'bg-green-400' : 'bg-gray-1000-faint'" />

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-medium text-gray-1000 truncate">{{ key.name }}</span>
                <span v-if="!key.is_active" class="text-[10px] bg-gray-400 text-gray-700 px-1.5 py-0.5 rounded">{{ t('orgPref.apiKeys.revoked') }}</span>
              </div>
              <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                <code class="text-[11px] text-gray-700 font-mono">{{ maskKey(key.publishable_key) }}</code>
                <span v-if="key.last_used_at" class="text-[10px] text-gray-700">{{ t('orgPref.apiKeys.lastUsed', { date: new Date(key.last_used_at).toLocaleDateString(locale) }) }}</span>
                <span v-else class="text-[10px] text-gray-700">{{ t('orgPref.apiKeys.neverUsed') }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                v-if="key.is_active"
                class="text-[11px] text-gray-900 hover:text-green-700 px-2 py-1 rounded hover:bg-gray-400 transition-colors disabled:opacity-40"
                :disabled="apiKeyActionId === key.id"
                @click="revokeApiKey(key.id)"
                title="Revoke key"
              >
                <Icon v-if="apiKeyActionId === key.id" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                <span v-else>{{ t('orgPref.apiKeys.revoke') }}</span>
              </button>
              <button
                class="text-[11px] text-red-400/70 hover:text-red-400 px-2 py-1 rounded hover:bg-gray-400 transition-colors disabled:opacity-40"
                :disabled="apiKeyActionId === key.id"
                @click="deleteApiKey(key.id)"
                title="Delete key"
              >
                <Icon v-if="apiKeyActionId === key.id" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                <Icon v-else icon="lucide:trash-2" class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- Create form -->
        <Transition name="slide-down">
          <div v-if="showApiKeyForm" class="mt-3 p-4 bg-gray-100 border border-gray-500 rounded-lg space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.apiKeys.keyName') }} <span class="text-red-400">*</span></label>
                <input
                  v-model="apiKeyFormName"
                  type="text"
                  :placeholder="t('orgPref.apiKeys.keyNamePh')"
                  class="app-inp w-full text-sm"
                  @keyup.enter="createApiKey"
                />
              </div>
              <div>
                <label class="text-xs text-gray-700 mb-1 block">{{ t('orgPref.apiKeys.allowedDomains') }} <span class="text-gray-700/50">{{ t('orgPref.apiKeys.allowedDomainsHint') }}</span></label>
                <input
                  v-model="apiKeyFormDomains"
                  type="text"
                  :placeholder="t('orgPref.apiKeys.allowedDomainsPh')"
                  class="app-inp w-full text-sm"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-gray-900 hover:text-gray-1000 px-3 py-1.5 rounded-md hover:bg-gray-400 transition-colors" @click="showApiKeyForm = false">{{ t('orgPref.common.cancel') }}</button>
              <button
                class="text-xs bg-green-700 hover:bg-green-800 text-bg-100 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="apiKeySaving || !apiKeyFormName.trim()"
                @click="createApiKey"
              >
                <Icon v-if="apiKeySaving" icon="lucide:loader-circle" class="w-3 h-3 animate-spin inline mr-1" />
                {{ apiKeySaving ? t('orgPref.apiKeys.creating') : t('orgPref.apiKeys.create') }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Docs link -->
        <div class="mt-3 flex items-center gap-1.5 text-[11px] text-gray-700">
          <Icon icon="lucide:book-open" class="w-3 h-3" />
          <span>{{ t('orgPref.apiKeys.docsQuestion') }}</span>
          <router-link to="/docs/embed" class="text-green-700 hover:underline">{{ t('orgPref.apiKeys.readDocs') }}</router-link>
        </div>
      </div>

    </div>

    <!-- ── Secret Key Modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="newSecretModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <!-- Header -->
            <div class="flex items-start gap-3 mb-5">
              <div class="w-9 h-9 rounded-lg bg-green-700/10 border border-green-700/20 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:key" class="w-4 h-4 text-green-700" />
              </div>
              <div>
                <h3 class="text-gray-1000 font-semibold text-sm">{{ t('orgPref.secretModal.title') }}</h3>
                <p class="text-gray-700 text-xs mt-0.5">{{ t('orgPref.secretModal.subtitle') }}</p>
              </div>
            </div>

            <!-- Keys display -->
            <div class="space-y-3 mb-5">
              <div>
                <div class="text-[10px] text-gray-700 uppercase tracking-wider mb-1">{{ t('orgPref.secretModal.publishable') }}</div>
                <div class="flex items-center gap-2 bg-gray-100 border border-gray-500 rounded-lg px-3 py-2">
                  <code class="text-xs text-gray-1000 font-mono flex-1 break-all">{{ newSecretModal.key.publishable_key }}</code>
                </div>
              </div>
              <div>
                <div class="text-[10px] text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-triangle" class="w-3 h-3" /> {{ t('orgPref.secretModal.secret') }}
                </div>
                <div class="flex items-center gap-2 bg-gray-100 border border-green-700/30 rounded-lg px-3 py-2">
                  <code class="text-xs text-gray-1000 font-mono flex-1 break-all">{{ newSecretModal.secret }}</code>
                  <button
                    class="flex-shrink-0 text-xs text-gray-900 hover:text-green-700 transition-colors"
                    @click="copySecret(newSecretModal!.secret)"
                    :title="secretCopied ? t('orgPref.secretModal.copied') : t('orgPref.secretModal.copy')"
                  >
                    <Icon :icon="secretCopied ? 'lucide:check' : 'lucide:copy'" class="w-3.5 h-3.5" :class="secretCopied ? 'text-green-400' : ''" />
                  </button>
                </div>
              </div>
            </div>

            <button
              class="w-full bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm py-2.5 rounded-lg transition-colors"
              @click="newSecretModal = null; secretCopied = false"
            >
              {{ t('orgPref.secretModal.saved') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
