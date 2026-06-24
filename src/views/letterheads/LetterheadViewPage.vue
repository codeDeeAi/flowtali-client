<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'
import { useAuthStore } from '@/stores/auth'
import { LetterheadService, type ILetterhead } from '@/services/letterhead.service'
import { SharedLinksService, type ISharedLink } from '@/services/shared-links.service'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()
const { notify } = useNotification()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

const stampColor: Record<string, string> = {
  DRAFT: '#9ca3af', CONFIDENTIAL: '#f87171', APPROVED: '#4ade80', FINAL: '#60a5fa',
}

// ── State ─────────────────────────────────────────────────────────────────────
const lh       = ref<ILetterhead | null>(null)
const loading  = ref(true)
const notFound = ref(false)
const showDeleteConfirm = ref(false)
const showShareModal    = ref(false)
const isDeleting        = ref(false)

const links = ref<ISharedLink[]>([])

onMounted(async () => {
  if (!orgId.value) { notFound.value = true; loading.value = false; return }
  try {
    const id  = String(route.params.id)
    const [lhRes, linksRes] = await Promise.all([
      LetterheadService.get(orgId.value, id),
      SharedLinksService.list(orgId.value, id),
    ])
    lh.value    = lhRes.data.data
    links.value = linksRes.data.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

// ── Links analytics ───────────────────────────────────────────────────────────
const sortedLinks  = computed(() => [...links.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
const totalViews   = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks  = computed(() => links.value.filter(l => l.is_active && !isExpired(l)).length)
const privateLinks = computed(() => links.value.filter(l => l.visibility === 'private').length)

// ── Helpers ───────────────────────────────────────────────────────────────────
const templateLabel: Record<string, string> = {
  classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
  bold: 'Bold', legal: 'Legal', executive: 'Executive',
}
const templateBadgeClass: Record<string, string> = {
  classic:   'bg-green-700/10 text-green-700 border-green-700/20',
  modern:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bold:      'bg-red-500/10 text-red-400 border-red-500/20',
  minimal:   'bg-green-500/10 text-green-400 border-green-500/20',
  legal:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  executive: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const formatDate = (d: string | null) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
const fmtFooter = (s: string | null) => (s ?? '').replace('{page}', '1').replace('{total}', '1')

function handlePrint() { window.print() }

async function handleDelete() {
  if (!lh.value || !orgId.value) return
  isDeleting.value = true
  try {
    await LetterheadService.delete(orgId.value, lh.value.id)
    notify(`${lh.value.name} deleted`, 'success')
    router.push({ name: 'letterheads' })
  } catch {
    notify('Failed to delete letterhead', 'error')
    isDeleting.value = false
  }
}

function linkUrl(token: string): string {
  return `${window.location.origin}/share/l/${token}`
}
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify('Link copied to clipboard', 'success')
}
function isExpired(link: ISharedLink): boolean {
  if (!link.expires_at) return false
  return new Date(link.expires_at) < new Date()
}
function statusLabel(link: ISharedLink) {
  if (!link.is_active)  return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (isExpired(link))  return { text: 'Expired', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { text: 'Active', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function expiryLabel(link: ISharedLink) {
  if (!link.expires_at) return 'Never expires'
  if (isExpired(link))  return `Expired ${fmtDate(link.expires_at)}`
  return `Expires ${fmtDate(link.expires_at)}`
}

function lastUsedLabel(): string {
  if (!lh.value?.last_used_at) return 'Never used'
  const d = new Date(lh.value.last_used_at)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7)  return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-gray-700">Letterhead not found</p>
      <button @click="router.push({ name: 'letterheads' })" class="mt-4 text-green-700 text-sm hover:underline">Back to letterheads</button>
    </div>

    <template v-else-if="lh">

      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'letterheads' })" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">{{ lh.name }}</h1>
              <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', templateBadgeClass[lh.theme] ?? 'bg-gray-400 text-gray-700 border-gray-500']">
                {{ templateLabel[lh.theme] ?? lh.theme }}
              </span>
              <span v-if="lh.stamp" class="text-[9px] px-1.5 py-0.5 rounded border font-medium" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] + '60', backgroundColor: stampColor[lh.stamp] + '15' }">
                {{ lh.stamp }}
              </span>
            </div>
            <p class="page-subtitle">{{ lh.company }} · {{ lh.uses }} uses · Last used {{ lastUsedLabel() }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 rounded-lg transition-colors"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /> Share
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-green-700/20 text-green-700 text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            @click="router.push({ name: 'letterheads.edit', params: { id: lh.id } })"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-700 hover:bg-green-700/90 text-bg-100 font-semibold rounded-lg transition-colors"
          >
            <Icon icon="lucide:pencil" class="w-3.5 h-3.5" /> Edit
          </button>
          <button @click="showDeleteConfirm = true" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors">
            <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- ── Two-column: document + analytics ───────────────────────────────── -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <!-- Document preview -->
        <div class="bg-gray-400/30 rounded-xl p-6 flex justify-center">

          <!-- ══ CLASSIC ══ -->
          <div
            v-if="lh.theme === 'classic'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.font_family ?? undefined, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: lh.accent_color }"></div>
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-12" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-14 w-auto object-contain mb-2" />
                  <div class="text-lg font-bold" :style="{ color: lh.accent_color }">{{ lh.company }}</div>
                  <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
                </div>
                <div class="text-right text-xs text-gray-500 space-y-0.5">
                  <div v-if="lh.email">{{ lh.email }}</div>
                  <div v-if="lh.phone">{{ lh.phone }}</div>
                  <div v-if="lh.website">{{ lh.website }}</div>
                </div>
              </div>
              <div v-if="lh.show_divider" class="h-px mb-8" :style="{ backgroundColor: lh.accent_color + '40' }"></div>
              <div v-if="lh.show_date || lh.show_ref" class="flex gap-8 mb-6 text-xs">
                <div v-if="lh.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.ref_number }}</div></div>
              </div>
              <div v-if="lh.subject" class="mb-6"><span class="font-semibold text-gray-800">Re: </span><span class="text-gray-700">{{ lh.subject }}</span></div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-8 whitespace-pre-line" style="line-height:1.8">{{ lh.body }}</div>
              <div class="mb-10">
                <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
                <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ lh.signer_name }}</div>
                <div class="text-xs text-gray-500">{{ lh.signer_title }}</div>
                <div class="text-xs text-gray-400">{{ lh.company }}</div>
              </div>
              <div v-if="lh.reg_number || lh.vat_number" class="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-x-6">
                <span v-if="lh.reg_number">Reg. No: {{ lh.reg_number }}</span>
                <span v-if="lh.vat_number">VAT: {{ lh.vat_number }}</span>
              </div>
              <div v-if="lh.show_footer" class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footer_left) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_center) || lh.company }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_right) }}</span>
              </div>
              <div v-if="lh.show_bottom_bar" class="absolute bottom-0 left-0 right-0 h-1.5" :style="{ backgroundColor: lh.accent_color }"></div>
            </div>
          </div>

          <!-- ══ MODERN ══ -->
          <div
            v-else-if="lh.theme === 'modern'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden flex"
            :style="{ fontFamily: lh.font_family ?? undefined, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <!-- Left colour panel -->
            <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: lh.accent_color, width: '220px', position: 'relative', zIndex: 3 }">
              <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
              <div v-else class="mb-6"></div>
              <div class="text-white font-bold text-lg leading-tight mb-1">{{ lh.company }}</div>
              <div v-if="lh.tagline" class="text-white/70 text-xs mb-6">{{ lh.tagline }}</div>
              <div class="space-y-4 mt-auto">
                <div>
                  <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Contact</div>
                  <div v-if="lh.email"   class="text-white/80 text-xs">{{ lh.email }}</div>
                  <div v-if="lh.phone"   class="text-white/80 text-xs">{{ lh.phone }}</div>
                  <div v-if="lh.website" class="text-white/80 text-xs">{{ lh.website }}</div>
                </div>
                <div v-if="lh.address">
                  <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Address</div>
                  <div class="text-white/80 text-xs whitespace-pre-line leading-relaxed">{{ lh.address }}</div>
                </div>
                <div v-if="lh.reg_number || lh.vat_number">
                  <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Registration</div>
                  <div v-if="lh.reg_number" class="text-white/70 text-xs font-mono">{{ lh.reg_number }}</div>
                  <div v-if="lh.vat_number" class="text-white/70 text-xs font-mono">{{ lh.vat_number }}</div>
                </div>
              </div>
            </div>
            <!-- Right content -->
            <div class="flex-1 p-10 flex flex-col" style="position:relative;z-index:3">
              <div class="flex justify-end gap-6 mb-8 text-xs">
                <div v-if="lh.show_date" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.show_ref" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.ref_number }}</div></div>
              </div>
              <div v-if="lh.subject" class="text-base font-bold mb-6" :style="{ color: lh.accent_color }">Re: {{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line flex-1" style="line-height:1.8">{{ lh.body }}</div>
              <div class="mb-6">
                <p class="text-gray-700 mb-10">{{ lh.closing }}</p>
                <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ lh.signer_name }}</div>
                <div class="text-xs text-gray-500">{{ lh.signer_title }}</div>
              </div>
              <div v-if="lh.show_footer" class="border-t border-gray-100 pt-4 flex justify-between" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footer_left) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_center) }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_right) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ MINIMAL ══ -->
          <div
            v-else-if="lh.theme === 'minimal'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.font_family ?? undefined, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-14" style="position:relative;z-index:3;max-width:600px;margin:0 auto">
              <div class="mb-10">
                <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-10 w-auto object-contain mb-3" />
                <div class="font-bold text-xl text-gray-900">{{ lh.company }}</div>
                <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
              </div>
              <div v-if="lh.show_divider" class="w-8 mb-8" style="height:2px" :style="{ backgroundColor: lh.accent_color }"></div>
              <div class="flex gap-8 mb-8 text-xs text-gray-500">
                <div v-if="lh.show_date">{{ formatDate(lh.date) }}</div>
                <div v-if="lh.show_ref" class="font-mono">{{ lh.ref_number }}</div>
              </div>
              <div v-if="lh.subject" class="font-semibold text-gray-800 mb-6">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-5">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-loose mb-12 whitespace-pre-line" style="line-height:2">{{ lh.body }}</div>
              <p class="text-gray-700 mb-14">{{ lh.closing }}</p>
              <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
              <div class="font-semibold text-gray-800">{{ lh.signer_name }}</div>
              <div class="text-xs text-gray-500">{{ lh.signer_title }}</div>
              <div v-if="lh.show_footer" class="absolute bottom-10 left-14 right-14 flex justify-between border-t border-gray-100 pt-4" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footer_left) || lh.company }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_right) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ BOLD ══ -->
          <div
            v-else-if="lh.theme === 'bold'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.font_family ?? undefined, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="px-12 py-10 relative" :style="{ backgroundColor: lh.accent_color, zIndex: 3 }">
              <div class="flex justify-between items-end">
                <div>
                  <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-3 brightness-0 invert" />
                  <div class="text-white font-black text-2xl tracking-tight">{{ lh.company }}</div>
                  <div v-if="lh.tagline" class="text-white/70 text-sm">{{ lh.tagline }}</div>
                </div>
                <div class="text-right text-white/80 text-xs space-y-0.5">
                  <div v-if="lh.email">{{ lh.email }}</div>
                  <div v-if="lh.phone">{{ lh.phone }}</div>
                  <div v-if="lh.website">{{ lh.website }}</div>
                </div>
              </div>
            </div>
            <div class="p-12" style="position:relative;z-index:3">
              <div class="flex gap-8 mb-8 text-xs">
                <div v-if="lh.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-bold text-gray-800">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-bold text-gray-800 font-mono">{{ lh.ref_number }}</div></div>
              </div>
              <div v-if="lh.subject" class="text-lg font-black text-gray-900 mb-6 pb-3" :style="{ borderBottom: `3px solid ${lh.accent_color}` }">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ lh.body }}</div>
              <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
              <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
              <div class="font-bold text-gray-800">{{ lh.signer_name }}</div>
              <div class="text-xs text-gray-500">{{ lh.signer_title }}</div>
              <div v-if="lh.address" class="mt-6 p-4 rounded text-xs text-gray-500 leading-relaxed" :style="{ backgroundColor: lh.accent_color + '10', borderLeft: `3px solid ${lh.accent_color}` }">
                <span class="font-semibold text-gray-700">Address: </span>{{ lh.address.replace(/\n/g, ', ') }}
                <span v-if="lh.reg_number"> · Reg: {{ lh.reg_number }}</span>
                <span v-if="lh.vat_number"> · VAT: {{ lh.vat_number }}</span>
              </div>
              <div v-if="lh.show_footer" class="absolute bottom-8 left-12 right-12 flex justify-between" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footer_left) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_center) }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footer_right) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ LEGAL ══ -->
          <div
            v-else-if="lh.theme === 'legal'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            style="font-family:'Times New Roman',Times,serif;color:#111827;font-size:13px;min-height:1080px"
          >
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-12 pb-24" style="position:relative;z-index:3">
              <div class="text-center mb-8">
                <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-12 w-auto object-contain mx-auto mb-3" />
                <div class="text-base font-bold uppercase tracking-widest text-gray-900">{{ lh.company }}</div>
                <div v-if="lh.tagline" class="text-xs text-gray-500 mt-0.5">{{ lh.tagline }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ [lh.email, lh.phone, lh.website].filter(Boolean).join(' · ') }}</div>
                <div v-if="lh.address" class="text-xs text-gray-500 mt-0.5">{{ lh.address.replace(/\n/g, ', ') }}</div>
              </div>
              <div class="h-px bg-gray-400 mb-0.5"></div>
              <div class="h-px bg-gray-200 mb-8"></div>
              <div class="flex justify-between text-xs text-gray-500 mb-8">
                <span v-if="lh.show_date">{{ formatDate(lh.date) }}</span>
                <span v-if="lh.show_ref" class="font-mono">Ref: {{ lh.ref_number }}</span>
              </div>
              <div v-if="lh.subject" class="text-center font-bold uppercase text-gray-800 mb-8 tracking-wider">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="mb-6 text-gray-800">{{ lh.salutation }}</p>
              <div class="text-gray-700 leading-relaxed mb-12 whitespace-pre-line text-justify" style="line-height:2">{{ lh.body }}</div>
              <p class="text-gray-800 mb-14">{{ lh.closing }}</p>
              <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
              <div class="font-bold text-gray-800">{{ lh.signer_name }}</div>
              <div class="text-sm text-gray-600">{{ lh.signer_title }}</div>
              <div class="text-sm text-gray-600">{{ lh.company }}</div>
              <div v-if="lh.reg_number || lh.vat_number" class="mt-4 text-xs text-gray-400">
                <span v-if="lh.reg_number">Reg. No: {{ lh.reg_number }}</span>
                <span v-if="lh.reg_number && lh.vat_number"> · </span>
                <span v-if="lh.vat_number">VAT: {{ lh.vat_number }}</span>
              </div>
            </div>
            <div v-if="lh.show_footer" class="absolute bottom-0 left-0 right-0 px-12 pb-6">
              <div class="h-px bg-gray-400 mb-0.5"></div>
              <div class="h-px bg-gray-200 mb-3"></div>
              <div class="flex justify-between text-xs text-gray-400">
                <span>{{ fmtFooter(lh.footer_left) || lh.company }}</span>
                <span>{{ fmtFooter(lh.footer_center) }}</span>
                <span>{{ fmtFooter(lh.footer_right) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ EXECUTIVE ══ -->
          <div
            v-else-if="lh.theme === 'executive'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.font_family ?? undefined, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.show_top_bar" class="h-2 w-full" :style="{ backgroundColor: lh.accent_color }"></div>
            <div v-if="lh.show_watermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermark_color }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="px-12 py-10" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <img v-if="lh.logo_url" :src="lh.logo_url" alt="Logo" class="h-14 w-auto object-contain mb-3" />
                  <div class="text-2xl font-bold" :style="{ color: lh.accent_color }">{{ lh.company }}</div>
                  <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
                </div>
                <div class="text-right text-xs text-gray-500 space-y-0.5 mt-1">
                  <div v-if="lh.email">{{ lh.email }}</div>
                  <div v-if="lh.phone">{{ lh.phone }}</div>
                  <div v-if="lh.website">{{ lh.website }}</div>
                  <div v-if="lh.address" class="whitespace-pre-line mt-1">{{ lh.address }}</div>
                </div>
              </div>
              <div class="flex mb-8" style="height:3px;border-radius:2px" :style="{ backgroundColor: lh.accent_color }"></div>
              <div class="grid grid-cols-3 gap-4 border border-gray-100 rounded p-4 mb-8 text-xs" :style="{ backgroundColor: lh.accent_color + '08' }">
                <div v-if="lh.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.ref_number }}</div></div>
                <div v-if="lh.subject"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Subject</div><div class="font-semibold text-gray-700">{{ lh.subject }}</div></div>
              </div>
              <p v-if="lh.salutation" class="text-gray-700 mb-5">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ lh.body }}</div>
              <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
              <img v-if="lh.signature_url" :src="lh.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
              <div class="font-semibold text-gray-800">{{ lh.signer_name }}</div>
              <div class="text-xs text-gray-500">{{ lh.signer_title }}</div>
              <div class="text-xs text-gray-400">{{ lh.company }}</div>
              <div v-if="lh.reg_number || lh.vat_number" class="mt-2 text-xs text-gray-400">
                <span v-if="lh.reg_number">Reg: {{ lh.reg_number }}</span>
                <span v-if="lh.vat_number"> · VAT: {{ lh.vat_number }}</span>
              </div>
              <div v-if="lh.show_footer" class="absolute bottom-8 left-12 right-12 border-t-2 pt-4 flex justify-between" :style="{ borderColor: lh.accent_color + '40' }">
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footer_left) || lh.website }}</span>
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footer_center) || lh.company }}</span>
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footer_right) }}</span>
              </div>
              <div v-if="lh.show_bottom_bar" class="absolute bottom-0 left-0 right-0 h-2" :style="{ backgroundColor: lh.accent_color }"></div>
            </div>
          </div>

        </div><!-- /document preview -->

        <!-- ── Analytics / Links sidebar ──────────────────────────────────── -->
        <div class="space-y-4">

          <!-- Info card -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 space-y-3">
            <p class="text-[10px] uppercase tracking-wider text-gray-700 font-semibold">Letterhead Details</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ lh.uses }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">Total Uses</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ sortedLinks.length }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">Shared Links</div>
              </div>
            </div>
            <div class="space-y-1.5 text-xs text-gray-700 pt-0.5">
              <div class="flex items-center justify-between">
                <span>Last used</span><span class="text-gray-900">{{ lastUsedLabel() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Template</span>
                <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', templateBadgeClass[lh.theme] ?? '']">{{ templateLabel[lh.theme] }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Watermark</span>
                <span class="text-gray-900 font-mono text-[10px]">{{ lh.watermark || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Link stats -->
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-wider text-gray-700 font-semibold">Shared Links</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 hover:text-green-700/80 bg-green-700/10 hover:bg-green-700/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> New Link
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ sortedLinks.length }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">Total</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div class="bg-gray-100/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-gray-1000">{{ totalViews }}</div>
                <div class="text-[9px] text-gray-700 uppercase tracking-wide mt-0.5">Views</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-700">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" /> {{ privateLinks }} private</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" /> {{ sortedLinks.length - privateLinks }} public</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="sortedLinks.length > 0" class="space-y-2">
            <div
              v-for="link in sortedLinks" :key="link.id"
              class="bg-gray-200 border border-gray-400 rounded-xl p-3.5 space-y-2.5"
            >
              <!-- Top -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-gray-1000 truncate">{{ link.label || 'Shared Link' }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', statusLabel(link).cls]">{{ statusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-gray-700 mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-gray-700 border-gray-500 bg-gray-400 shrink-0">
                  {{ link.visibility === 'private' ? 'Private' : 'Public' }}
                </span>
              </div>
              <!-- URL -->
              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-gray-100/60 border border-gray-400 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-gray-700 truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.is_active || isExpired(link)"
                  class="p-1 rounded bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-700 hover:text-gray-1000 transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>
              <!-- Access code -->
              <div v-if="link.visibility === 'private' && link.access_code" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-green-700 shrink-0" />
                <span class="text-[10px] font-mono text-green-700 tracking-widest">{{ link.access_code }}</span>
              </div>
              <!-- Stats -->
              <div class="flex items-center gap-3 text-[10px] text-gray-700 border-t border-gray-400/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }} views</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.last_viewed_at) }}</span>
              </div>
              <!-- View log -->
              <div v-if="link.view_log.length > 0" class="space-y-1 border-t border-gray-400/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-gray-700">Recent Views</p>
                <div v-for="(entry, i) in link.view_log.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-gray-700">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="sortedLinks.length === 0" class="bg-gray-200 border border-dashed border-gray-500 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-gray-700" />
            <p class="text-xs font-medium text-gray-900">No shared links yet</p>
            <p class="text-[11px] text-gray-700">Generate a link to share this letterhead with clients</p>
            <button
              @click="showShareModal = true"
              class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-700/10 hover:bg-green-700/15 border border-green-700/20 text-green-700 rounded-lg transition-colors"
            >
              <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Link
            </button>
          </div>

        </div><!-- /sidebar -->

      </div><!-- /two-column grid -->

    </template>

    <!-- ── Delete confirm ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm && lh" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">Delete "{{ lh.name }}"?</h3>
                <p class="text-xs text-gray-700 mt-1 leading-relaxed">This letterhead will be permanently deleted. This action cannot be undone.</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors">Cancel</button>
              <button @click="handleDelete" :disabled="isDeleting" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60">
                <Icon v-if="isDeleting" icon="lucide:loader-2" class="w-3 h-3 animate-spin inline mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Share modal -->
    <ShareLinkModal
      v-if="showShareModal && lh"
      resource-type="letterhead"
      :resource-id="lh.id"
      :resource-name="lh.name"
      :org-id="orgId"
      @close="showShareModal = false"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>

<style>
@media print {
  body * { visibility: hidden; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    box-shadow: none !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
