<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { OrgPreferencesService } from '@/services/org-preferences.service'
import type { IOrgStamp, IOrgBrandColor, IOrgSignature, IOrgLogo } from '@/types/org-preferences.types'

const authStore = useAuthStore()
const orgId = computed(() => authStore.currentOrganization?.id ?? '')
const orgName = computed(() => authStore.currentOrganization?.name ?? 'your organization')

// ── State ─────────────────────────────────────────────────────────────────────
const loading     = ref(true)
const stamps      = ref<IOrgStamp[]>([])
const brandColors = ref<IOrgBrandColor[]>([])
const signatures  = ref<IOrgSignature[]>([])
const orgLogos    = ref<IOrgLogo[]>([])

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

// ── Signature upload ───────────────────────────────────────────────────────────
const showSigForm    = ref(false)
const sigUploading   = ref(false)
const sigForm        = ref({ name: '', role: '' })
const sigFileRef     = ref<HTMLInputElement | null>(null)
const sigPreview     = ref<string | null>(null)
const sigFile        = ref<File | null>(null)

// ── Logo upload ────────────────────────────────────────────────────────────────
const showLogoForm   = ref(false)
const logoUploading  = ref(false)
const logoForm       = ref({ label: '' })
const logoFileRef    = ref<HTMLInputElement | null>(null)
const logoPreview    = ref<string | null>(null)
const logoFile       = ref<File | null>(null)

// ── Deleting ──────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadPreferences() {
  if (!orgId.value) return
  loading.value = true
  try {
    const { data } = await OrgPreferencesService.get(orgId.value)
    stamps.value      = data.data.stamps      ?? []
    brandColors.value = data.data.brand_colors ?? []
    signatures.value  = data.data.signatures   ?? []
    orgLogos.value    = data.data.logos        ?? []
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
  stampForm.value = { text: s.text, color: s.color, text_color: s.text_color ?? '#ffffff' }
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
  if (editStampIndex.value !== null) {
    list[editStampIndex.value] = entry
  } else {
    list.push(entry)
  }
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
  colorForm.value = { name: c.name, hex: c.hex }
  showColorForm.value = true
}

async function saveColor() {
  if (!colorForm.value.name.trim() || !colorForm.value.hex.trim()) return
  const list = [...brandColors.value]
  const entry: IOrgBrandColor = { name: colorForm.value.name.trim(), hex: colorForm.value.hex.toUpperCase() }
  if (editColorIndex.value !== null) {
    list[editColorIndex.value] = entry
  } else {
    list.push(entry)
  }
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

// ── Signatures ────────────────────────────────────────────────────────────────
function onSigFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  sigFile.value = f
  sigPreview.value = URL.createObjectURL(f)
}

async function uploadSignature() {
  if (!sigForm.value.name.trim() || !sigForm.value.role.trim() || !sigFile.value) return
  const fd = new FormData()
  fd.append('name', sigForm.value.name.trim())
  fd.append('role', sigForm.value.role.trim())
  fd.append('file', sigFile.value)
  sigUploading.value = true
  try {
    const { data } = await OrgPreferencesService.uploadSignature(orgId.value, fd)
    signatures.value.push(data.data as IOrgSignature)
    showSigForm.value = false
    sigForm.value = { name: '', role: '' }
    sigFile.value = null
    sigPreview.value = null
  } finally {
    sigUploading.value = false
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

// ── Logos ─────────────────────────────────────────────────────────────────────
function onLogoFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  logoFile.value = f
  logoPreview.value = URL.createObjectURL(f)
}

async function uploadLogo() {
  if (!logoForm.value.label.trim() || !logoFile.value) return
  const fd = new FormData()
  fd.append('label', logoForm.value.label.trim())
  fd.append('file', logoFile.value)
  logoUploading.value = true
  try {
    const { data } = await OrgPreferencesService.uploadLogo(orgId.value, fd)
    orgLogos.value.push(data.data as IOrgLogo)
    showLogoForm.value = false
    logoForm.value = { label: '' }
    logoFile.value = null
    logoPreview.value = null
  } finally {
    logoUploading.value = false
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

      <!-- ── Saved Stamps ──────────────────────────────────────────────────── -->
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

        <!-- Stamp grid -->
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
            No stamps yet. Add your first stamp.
          </div>
        </div>

        <!-- Add/Edit stamp form -->
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
                <input
                  v-model="stampForm.text"
                  type="text"
                  maxlength="20"
                  placeholder="e.g. PAID"
                  class="app-inp w-full text-sm uppercase"
                />
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
              >
                {{ stampSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Saved Signatures ────────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Saved Signatures</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="showSigForm = !showSigForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="sig in signatures" :key="sig.id"
            class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg"
          >
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

          <div v-if="!signatures.length && !showSigForm" class="text-center py-4 text-xs text-cream-faint">
            No signatures yet.
          </div>
        </div>

        <!-- Upload form -->
        <Transition name="slide-down">
          <div v-if="showSigForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">Upload Signature</span>
              <button class="text-cream-faint hover:text-cream" @click="showSigForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
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
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Signature Image</label>
              <div
                class="border-2 border-dashed border-charcoal-600 hover:border-charcoal-500 rounded-lg p-4 text-center cursor-pointer transition-colors"
                @click="sigFileRef?.click()"
              >
                <img v-if="sigPreview" :src="sigPreview" class="max-h-16 mx-auto object-contain mb-2" />
                <div v-else class="text-xs text-cream-faint">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-cream-muted" />
                  Click to select image (PNG, JPG, WebP — max 5 MB)
                </div>
                <input ref="sigFileRef" type="file" accept="image/*" class="hidden" @change="onSigFileChange" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showSigForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="sigUploading || !sigForm.name.trim() || !sigForm.role.trim() || !sigFile"
                @click="uploadSignature"
              >
                {{ sigUploading ? 'Uploading…' : 'Upload' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Brand Colors ────────────────────────────────────────────────────── -->
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

          <div v-if="!brandColors.length" class="w-full text-center py-4 text-xs text-cream-faint">
            No brand colors yet.
          </div>
        </div>

        <!-- Add/Edit color form -->
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
              >
                {{ colorSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Organization Logos ──────────────────────────────────────────────── -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-cream">Organization Logos</h3>
          <button
            class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1.5 rounded-md transition-colors"
            @click="showLogoForm = !showLogoForm"
          >
            <Icon icon="lucide:upload" class="w-3 h-3" /> Upload
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="logo in orgLogos" :key="logo.id"
            class="flex items-center gap-3 p-3 border border-charcoal-700 rounded-lg"
          >
            <div class="w-14 h-9 bg-white rounded flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img :src="logo.url" :alt="logo.extras.label" class="max-w-full max-h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cream truncate">{{ logo.extras.label }}</div>
              <div class="text-xs text-cream-faint">
                {{ logo.extras.mime_type?.replace('image/', '').toUpperCase() ?? 'Image' }}
                <template v-if="logo.extras.size"> · {{ (logo.extras.size / 1024).toFixed(0) }} KB</template>
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

          <div v-if="!orgLogos.length && !showLogoForm" class="text-center py-4 text-xs text-cream-faint">
            No logos uploaded yet.
          </div>
        </div>

        <!-- Upload form -->
        <Transition name="slide-down">
          <div v-if="showLogoForm" class="mt-4 p-4 bg-charcoal-900 border border-charcoal-600 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-cream">Upload Logo</span>
              <button class="text-cream-faint hover:text-cream" @click="showLogoForm = false">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Label</label>
              <input v-model="logoForm.label" type="text" placeholder="e.g. Primary Logo (Light)" class="app-inp w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-cream-faint mb-1 block">Logo File</label>
              <div
                class="border-2 border-dashed border-charcoal-600 hover:border-charcoal-500 rounded-lg p-4 text-center cursor-pointer transition-colors"
                @click="logoFileRef?.click()"
              >
                <img v-if="logoPreview" :src="logoPreview" class="max-h-16 mx-auto object-contain mb-2" />
                <div v-else class="text-xs text-cream-faint">
                  <Icon icon="lucide:image-up" class="w-5 h-5 mx-auto mb-1 text-cream-muted" />
                  Click to select image (PNG, JPG, WebP — max 10 MB)
                </div>
                <input ref="logoFileRef" type="file" accept="image/*" class="hidden" @change="onLogoFileChange" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button class="text-xs text-cream-muted hover:text-cream px-3 py-1.5 rounded-md hover:bg-charcoal-700 transition-colors" @click="showLogoForm = false">Cancel</button>
              <button
                class="text-xs bg-amber hover:bg-amber-light text-charcoal-900 font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                :disabled="logoUploading || !logoForm.label.trim() || !logoFile"
                @click="uploadLogo"
              >
                {{ logoUploading ? 'Uploading…' : 'Upload' }}
              </button>
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
