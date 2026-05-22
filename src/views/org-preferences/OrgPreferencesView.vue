<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { OrgPreferencesService } from '@/services/org-preferences.service'
import { MediaService } from '@/services/media.service'
import type { IOrgStamp, IOrgBrandColor, IOrgSignature, IOrgLogo, IOrgInvoiceProfile, IOrgBankAccount } from '@/types/org-preferences.types'

const authStore = useAuthStore()
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
    sigUploadError.value = 'Upload failed. Please try again.'
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
    logoUploadError.value = 'Upload failed. Please try again.'
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
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div>
      <h1 class="page-title">Organization Preferences</h1>
      <p class="page-subtitle">Saved assets and defaults for {{ orgName }}</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 animate-pulse">
        <div class="h-4 bg-charcoal-700 rounded w-32 mb-4"></div>
        <div class="space-y-2">
          <div class="h-10 bg-charcoal-700 rounded"></div>
          <div class="h-10 bg-charcoal-700 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- ── Saved Stamps ────────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Saved Stamps</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openAddStamp"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Stamp
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="(stamp, i) in stamps" :key="i"
            class="group relative flex flex-col items-center gap-2 p-3 border border-charcoal-700 hover:border-charcoal-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditStamp(i)"
          >
            <div
              class="w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono font-bold text-center leading-tight"
              style="transform: rotate(-15deg); font-size: 8px; letter-spacing: 0.05em;"
              :style="{ borderColor: stamp.color, color: stamp.color }"
            >
              {{ stamp.text }}
            </div>
            <span class="text-[10px] text-cream-faint">{{ stamp.text }}</span>
            <button
              class="absolute top-1 right-1 w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors"
              @click.stop="deleteStamp(i)"
            >
              <Icon icon="lucide:x" class="w-3 h-3" />
            </button>
          </div>
          <div v-if="!stamps.length" class="col-span-3 text-center py-6 text-xs text-cream-faint">
            No stamps yet.
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showStampForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">{{ editStampIndex !== null ? 'Edit' : 'New' }} Stamp</span>
              <button class="text-cream-faint hover:text-cream" @click="showStampForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="text-xs text-cream-faint mb-1 block">Label</label>
                <input v-model="stampForm.text" type="text" maxlength="20" placeholder="e.g. PAID" class="app-inp w-full text-sm uppercase" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Border & Text Color</label>
                <div class="flex items-center gap-2">
                  <input v-model="stampForm.color" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-charcoal-600" />
                  <input v-model="stampForm.color" type="text" maxlength="7" placeholder="#4ade80" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Fill Color</label>
                <div class="flex items-center gap-2">
                  <input v-model="stampForm.text_color" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-charcoal-600" />
                  <input v-model="stampForm.text_color" type="text" maxlength="7" placeholder="#ffffff" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showStampForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="stampSaving || !stampForm.text.trim()"
                @click="saveStamp"
              >{{ stampSaving ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Saved Signatures ──────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Saved Signatures</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openSigForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="sig in signatures" :key="sig.id" class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg">
            <div class="w-20 h-9 bg-charcoal-900 border border-charcoal-600 rounded flex items-center justify-center shrink-0 overflow-hidden">
              <img :src="sig.url" :alt="sig.extras.name" class="max-w-full max-h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cream truncate">{{ sig.extras.name }}</div>
              <div class="text-xs text-cream-faint truncate">{{ sig.extras.role }}</div>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              :disabled="deletingId === sig.id"
              @click="deleteSignature(sig.id)"
            >
              <Icon :icon="deletingId === sig.id ? 'lucide:loader-circle' : 'lucide:trash-2'" class="w-3.5 h-3.5" :class="{ 'animate-spin': deletingId === sig.id }" />
            </button>
          </div>
          <div v-if="!signatures.length && !showSigForm" class="text-center py-4 text-xs text-cream-faint">No signatures yet.</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showSigForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">Upload Signature</span>
              <button class="text-cream-faint hover:text-cream" @click="closeSigForm">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- File drop zone — upload happens immediately on selection -->
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Signature Image</label>
              <div
                class="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                :class="sigUploadError ? 'border-red-500/50 hover:border-red-500/70' : 'border-charcoal-600 hover:border-charcoal-500'"
                @click="sigFileRef?.click()"
              >
                <!-- Uploading spinner -->
                <div v-if="sigUploading" class="flex flex-col items-center gap-2">
                  <Icon icon="lucide:loader-circle" class="w-6 h-6 text-amber animate-spin" />
                  <span class="text-xs text-cream-faint">Uploading…</span>
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
                      title="Remove uploaded image"
                    >
                      <Icon v-if="sigDeleting" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                      <Icon v-else icon="lucide:x" class="w-3 h-3" />
                    </button>
                  </div>
                  <span class="text-[10px] text-green-400 flex items-center gap-1">
                    <Icon icon="lucide:check-circle" class="w-3 h-3" /> Uploaded — click image area to replace
                  </span>
                </div>
                <!-- Error state -->
                <div v-else-if="sigUploadError" class="flex flex-col items-center gap-1">
                  <Icon icon="lucide:alert-circle" class="w-5 h-5 text-red-400" />
                  <span class="text-xs text-red-400">{{ sigUploadError }}</span>
                  <span class="text-[10px] text-cream-faint">Click to try again</span>
                </div>
                <!-- Empty state -->
                <div v-else class="text-xs text-cream-faint">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-cream-muted" />
                  Click to select — uploads immediately (PNG, JPG, WebP · max 5 MB)
                </div>
                <input ref="sigFileRef" type="file" accept="image/*" class="hidden" @change="onSigFileChange" />
              </div>
            </div>

            <!-- Name + role — fill while image uploads -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Full Name</label>
                <input v-model="sigForm.name" type="text" placeholder="Ada Lovelace" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Role / Title</label>
                <input v-model="sigForm.role" type="text" placeholder="Creative Director" class="app-inp w-full text-sm" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="closeSigForm">Cancel</button>
              <button
                class="flex items-center gap-1.5 text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="sigSubmitting || sigUploading || !sigMediaId || !sigForm.name.trim() || !sigForm.role.trim()"
                @click="submitSignature"
              >
                <Icon v-if="sigUploading" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                {{ sigSubmitting ? 'Saving…' : sigUploading ? 'Uploading…' : 'Save Signature' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Brand Colors ──────────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Brand Colors</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openAddColor"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Color
          </button>
        </div>

        <div class="flex flex-wrap gap-3">
          <div
            v-for="(color, i) in brandColors" :key="i"
            class="group relative flex items-center gap-2.5 px-3 py-2 border border-charcoal-700 rounded-lg hover:border-charcoal-500 transition-colors cursor-pointer"
            @click="openEditColor(i)"
          >
            <div class="w-5 h-5 rounded shrink-0" :style="{ backgroundColor: color.hex, border: '1px solid rgba(255,255,255,0.1)' }"></div>
            <div>
              <div class="text-xs font-medium text-cream">{{ color.name }}</div>
              <div class="text-[10px] font-mono text-cream-faint">{{ color.hex }}</div>
            </div>
            <button
              class="absolute -top-1.5 -right-1.5 w-4 h-4 hidden group-hover:flex items-center justify-center rounded-full bg-charcoal-700 text-cream-faint hover:text-red-400 transition-colors"
              @click.stop="deleteColor(i)"
            >
              <Icon icon="lucide:x" class="w-2.5 h-2.5" />
            </button>
          </div>
          <div v-if="!brandColors.length" class="w-full text-center py-4 text-xs text-cream-faint">No brand colors yet.</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showColorForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">{{ editColorIndex !== null ? 'Edit' : 'New' }} Color</span>
              <button class="text-cream-faint hover:text-cream" @click="showColorForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Color Name</label>
                <input v-model="colorForm.name" type="text" placeholder="Brand Gold" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Hex Value</label>
                <div class="flex items-center gap-2">
                  <input v-model="colorForm.hex" type="color" class="w-8 h-8 rounded cursor-pointer bg-transparent border border-charcoal-600 shrink-0" />
                  <input v-model="colorForm.hex" type="text" maxlength="7" placeholder="#E8A83E" class="app-inp flex-1 text-xs font-mono" />
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showColorForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="colorSaving || !colorForm.name.trim() || !colorForm.hex.trim()"
                @click="saveColor"
              >{{ colorSaving ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Organization Logos ────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Organization Logos</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="openLogoForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="logo in orgLogos" :key="logo.id" class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg">
            <div class="w-14 h-9 bg-white rounded flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img :src="logo.url" :alt="logo.extras.label" class="max-w-full max-h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cream truncate">{{ logo.extras.label }}</div>
              <div class="text-xs text-cream-faint">
                {{ logo.extras.mime_type?.replace('image/', '').toUpperCase() ?? 'Image' }}
                <template v-if="logo.extras.size"> · {{ Math.round((logo.extras.size as number) / 1024) }} KB</template>
              </div>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              :disabled="deletingId === logo.id"
              @click="deleteLogo(logo.id)"
            >
              <Icon :icon="deletingId === logo.id ? 'lucide:loader-circle' : 'lucide:trash-2'" class="w-3.5 h-3.5" :class="{ 'animate-spin': deletingId === logo.id }" />
            </button>
          </div>
          <div v-if="!orgLogos.length && !showLogoForm" class="text-center py-4 text-xs text-cream-faint">No logos uploaded yet.</div>
        </div>

        <Transition name="slide-down">
          <div v-if="showLogoForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">Upload Logo</span>
              <button class="text-cream-faint hover:text-cream" @click="closeLogoForm">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- File drop zone — upload happens immediately on selection -->
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Logo File</label>
              <div
                class="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                :class="logoUploadError ? 'border-red-500/50 hover:border-red-500/70' : 'border-charcoal-600 hover:border-charcoal-500'"
                @click="logoFileRef?.click()"
              >
                <div v-if="logoUploading" class="flex flex-col items-center gap-2">
                  <Icon icon="lucide:loader-circle" class="w-6 h-6 text-amber animate-spin" />
                  <span class="text-xs text-cream-faint">Uploading…</span>
                </div>
                <div v-else-if="logoPreview && logoMediaId" class="flex flex-col items-center gap-1.5">
                  <div class="relative inline-flex">
                    <img :src="logoPreview" class="max-h-14 object-contain rounded" />
                    <!-- Floating delete button -->
                    <button
                      class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow transition-colors disabled:opacity-60"
                      :disabled="logoDeleting"
                      @click.stop="clearLogoMedia"
                      title="Remove uploaded image"
                    >
                      <Icon v-if="logoDeleting" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                      <Icon v-else icon="lucide:x" class="w-3 h-3" />
                    </button>
                  </div>
                  <span class="text-[10px] text-green-400 flex items-center gap-1">
                    <Icon icon="lucide:check-circle" class="w-3 h-3" /> Uploaded — click image area to replace
                  </span>
                </div>
                <div v-else-if="logoUploadError" class="flex flex-col items-center gap-1">
                  <Icon icon="lucide:alert-circle" class="w-5 h-5 text-red-400" />
                  <span class="text-xs text-red-400">{{ logoUploadError }}</span>
                  <span class="text-[10px] text-cream-faint">Click to try again</span>
                </div>
                <div v-else class="text-xs text-cream-faint">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-cream-muted" />
                  Click to select — uploads immediately (PNG, JPG, WebP · max 10 MB)
                </div>
                <input ref="logoFileRef" type="file" accept="image/*" class="hidden" @change="onLogoFileChange" />
              </div>
            </div>

            <!-- Label — fill while image uploads -->
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Label</label>
              <input v-model="logoForm.label" type="text" placeholder="e.g. Primary Logo (Light)" class="app-inp w-full text-sm" />
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="closeLogoForm">Cancel</button>
              <button
                class="flex items-center gap-1.5 text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="logoSubmitting || logoUploading || !logoMediaId || !logoForm.label.trim()"
                @click="submitLogo"
              >
                <Icon v-if="logoUploading" icon="lucide:loader-circle" class="w-3 h-3 animate-spin" />
                {{ logoSubmitting ? 'Saving…' : logoUploading ? 'Uploading…' : 'Save Logo' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Invoice Quick-Fill Profiles ─────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-cream">Invoice Quick-Fill Profiles</h3>
            <p class="text-[11px] text-cream-faint mt-0.5">Saved "From" presets — load any profile when creating an invoice to pre-fill your details.</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
            @click="openAddProfile"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Profile
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="(profile, i) in invoiceProfiles" :key="profile.id"
            class="group relative flex flex-col gap-1.5 p-3.5 border border-charcoal-700 hover:border-charcoal-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditProfile(i)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-cream truncate">{{ profile.name }}</div>
                <div v-if="profile.tagline" class="text-[11px] text-cream-faint truncate">{{ profile.tagline }}</div>
              </div>
              <button
                class="w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                @click.stop="deleteProfile(i)"
              >
                <Icon icon="lucide:x" class="w-3 h-3" />
              </button>
            </div>
            <div class="grid grid-cols-1 gap-0.5 text-[11px] text-cream-faint">
              <span v-if="profile.email" class="flex items-center gap-1 truncate"><Icon icon="lucide:mail" class="w-3 h-3 shrink-0" />{{ profile.email }}</span>
              <span v-if="profile.phone" class="flex items-center gap-1 truncate"><Icon icon="lucide:phone" class="w-3 h-3 shrink-0" />{{ profile.phone }}</span>
              <span v-if="profile.website" class="flex items-center gap-1 truncate"><Icon icon="lucide:globe" class="w-3 h-3 shrink-0" />{{ profile.website }}</span>
            </div>
          </div>
          <div v-if="!invoiceProfiles.length" class="col-span-full text-center py-6 text-xs text-cream-faint">
            No profiles yet. Add one to speed up invoice creation.
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showProfileForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">{{ editProfileIndex !== null ? 'Edit' : 'New' }} Profile</span>
              <button class="text-cream-faint hover:text-cream" @click="showProfileForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="text-xs text-cream-faint mb-1 block">Profile Name <span class="text-red-400">*</span></label>
                <input v-model="profileForm.name" type="text" placeholder="e.g. Acme Design Studio" class="app-inp w-full text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-cream-faint mb-1 block">Tagline / Role</label>
                <input v-model="profileForm.tagline" type="text" placeholder="e.g. Creative Agency & Digital Studio" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Email</label>
                <input v-model="profileForm.email" type="email" placeholder="hello@studio.com" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Phone</label>
                <input v-model="profileForm.phone" type="text" placeholder="+1 415 555 0199" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Website</label>
                <input v-model="profileForm.website" type="text" placeholder="www.studio.com" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Logo URL</label>
                <input v-model="profileForm.logo_url" type="text" placeholder="https://…" class="app-inp w-full text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-cream-faint mb-1 block">Address</label>
                <textarea v-model="profileForm.address" rows="2" placeholder="123 Design Street, San Francisco CA 94105" class="app-inp w-full text-sm resize-none"></textarea>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showProfileForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="profileSaving || !profileForm.name.trim()"
                @click="saveProfile"
              >{{ profileSaving ? 'Saving…' : 'Save Profile' }}</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Bank Accounts ────────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-cream">Bank Accounts</h3>
            <p class="text-[11px] text-cream-faint mt-0.5">Saved bank details — select one when creating an invoice to pre-fill payment info.</p>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
            @click="openAddBank"
          >
            <Icon icon="lucide:plus" class="w-3 h-3" /> Add Account
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div
            v-for="(bank, i) in bankAccounts" :key="bank.id"
            class="group relative flex flex-col gap-1.5 p-3.5 border border-charcoal-700 hover:border-charcoal-500 rounded-lg cursor-pointer transition-colors"
            @click="openEditBank(i)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-cream truncate">{{ bank.label }}</div>
                <div v-if="bank.bank_name" class="text-[11px] text-cream-faint truncate">{{ bank.bank_name }}</div>
              </div>
              <button
                class="w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-cream-faint hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                @click.stop="deleteBank(i)"
              >
                <Icon icon="lucide:x" class="w-3 h-3" />
              </button>
            </div>
            <div class="grid grid-cols-1 gap-0.5 text-[11px] font-mono text-cream-faint">
              <span v-if="bank.account_name">{{ bank.account_name }}</span>
              <span v-if="bank.account_number">Acct: {{ bank.account_number }}</span>
              <span v-if="bank.iban">IBAN: {{ bank.iban }}</span>
              <span v-if="bank.sort_code">Sort: {{ bank.sort_code }}</span>
            </div>
          </div>
          <div v-if="!bankAccounts.length" class="col-span-full text-center py-6 text-xs text-cream-faint">
            No bank accounts yet.
          </div>
        </div>

        <Transition name="slide-down">
          <div v-if="showBankForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">{{ editBankIndex !== null ? 'Edit' : 'New' }} Bank Account</span>
              <button class="text-cream-faint hover:text-cream" @click="showBankForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Label <span class="text-red-400">*</span></label>
                <input v-model="bankForm.label" type="text" placeholder="e.g. Main GBP Account" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Currency</label>
                <input v-model="bankForm.currency" type="text" placeholder="GBP / USD / EUR" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Bank Name</label>
                <input v-model="bankForm.bank_name" type="text" placeholder="Barclays" class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Account Name</label>
                <input v-model="bankForm.account_name" type="text" placeholder="Acme Ltd." class="app-inp w-full text-sm" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Account Number</label>
                <input v-model="bankForm.account_number" type="text" placeholder="12345678" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">Sort Code</label>
                <input v-model="bankForm.sort_code" type="text" placeholder="20-00-00" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">IBAN</label>
                <input v-model="bankForm.iban" type="text" placeholder="GB00 BARC 2000 0055 5555 55" class="app-inp w-full text-sm font-mono" />
              </div>
              <div>
                <label class="text-xs text-cream-faint mb-1 block">SWIFT / BIC</label>
                <input v-model="bankForm.swift" type="text" placeholder="BARCGB22" class="app-inp w-full text-sm font-mono" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-cream-faint mb-1 block">Notes</label>
                <input v-model="bankForm.notes" type="text" placeholder="e.g. USD transfers only" class="app-inp w-full text-sm" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showBankForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="bankSaving || !bankForm.label.trim()"
                @click="saveBank"
              >{{ bankSaving ? 'Saving…' : 'Save Account' }}</button>
            </div>
          </div>
        </Transition>
      </div>

    </div>
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
</style>
