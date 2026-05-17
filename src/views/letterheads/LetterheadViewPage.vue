<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification'
import { useSharedLinksStore } from '@/stores/sharedLinks'
import ShareLinkModal from '@/components/modals/ShareLinkModal.vue'

const router = useRouter()
const route  = useRoute()
const { notify } = useNotification()
const linksStore = useSharedLinksStore()

// ── Data model ────────────────────────────────────────────────────────────────
interface LetterheadDoc {
  id: number
  name: string
  template: string
  uses: number
  lastUsed: string
  // design
  accentColor: string
  fontFamily: string
  watermark: string
  showWatermark: boolean
  watermarkColor: string
  stamp: string
  showTopBar: boolean
  showBottomBar: boolean
  showDivider: boolean
  showFooter: boolean
  logoUrl: string
  signatureUrl: string
  // company
  company: string
  tagline: string
  email: string
  phone: string
  website: string
  address: string
  regNumber: string
  vatNumber: string
  // letter content
  date: string
  refNumber: string
  showDate: boolean
  showRef: boolean
  subject: string
  salutation: string
  body: string
  closing: string
  signerName: string
  signerTitle: string
  footerLeft: string
  footerCenter: string
  footerRight: string
}

const stampColor: Record<string, string> = {
  DRAFT: '#9ca3af', CONFIDENTIAL: '#f87171', APPROVED: '#4ade80', FINAL: '#60a5fa',
}

const today = new Date().toISOString().slice(0, 10)

const defaults = {
  email: 'hello@acme.studio', phone: '+1 415 555 0199',
  website: 'www.acme.studio', address: '123 Design Street\nSan Francisco, CA 94105',
  regNumber: '', vatNumber: '', logoUrl: '', signatureUrl: '',
  date: today, refNumber: 'REF-001', showDate: true, showRef: true,
  subject: '', salutation: 'Dear [Client Name],',
  body: 'We are pleased to present our proposal for your upcoming project.\n\nPlease find attached the relevant details for your review. Should you have any questions or require further clarification, please do not hesitate to reach out.\n\nWe look forward to working with you.',
  closing: 'Yours sincerely,', signerName: 'James Holloway', signerTitle: 'Creative Director',
  footerLeft: '', footerCenter: '', footerRight: 'Page 1 of 1',
  showTopBar: true, showBottomBar: false, showDivider: true, showFooter: true,
  watermarkColor: '#000000',
}

const mockLetterheads: LetterheadDoc[] = [
  { id: 1, name: 'Agency Proposal',          template: 'classic',   uses: 14, lastUsed: '2 days ago',  accentColor: '#e8a83e', fontFamily: "'DM Sans', sans-serif",       company: 'ACME STUDIO', tagline: 'Creative Agency',       watermark: '',             showWatermark: false, stamp: '', ...defaults },
  { id: 2, name: 'Client Engagement Letter', template: 'modern',    uses: 7,  lastUsed: '1 week ago',  accentColor: '#60a5fa', fontFamily: "'Inter', sans-serif",          company: 'ACME STUDIO', tagline: '',                      watermark: 'CONFIDENTIAL', showWatermark: true,  stamp: '', ...defaults },
  { id: 3, name: 'Partnership Agreement',    template: 'bold',      uses: 3,  lastUsed: '2 weeks ago', accentColor: '#f87171', fontFamily: "'Montserrat', sans-serif",     company: 'ACME STUDIO', tagline: '',                      watermark: 'DRAFT',        showWatermark: true,  stamp: 'DRAFT', ...defaults },
  { id: 4, name: 'Service Quote',            template: 'minimal',   uses: 22, lastUsed: '3 weeks ago', accentColor: '#4ade80', fontFamily: "'Lato', sans-serif",            company: 'ACME STUDIO', tagline: 'Professional Services', watermark: '',             showWatermark: false, stamp: '', ...defaults },
  { id: 5, name: 'NDA Template',             template: 'legal',     uses: 5,  lastUsed: '1 month ago', accentColor: '#a78bfa', fontFamily: "'Georgia, serif'",             company: 'ACME STUDIO', tagline: '',                      watermark: 'CONFIDENTIAL', showWatermark: true,  stamp: 'CONFIDENTIAL', ...defaults },
  { id: 6, name: 'Project Proposal',         template: 'executive', uses: 9,  lastUsed: '3 days ago',  accentColor: '#fb923c', fontFamily: "'Playfair Display', serif",   company: 'ACME STUDIO', tagline: 'Creative Agency',       watermark: '',             showWatermark: false, stamp: '', ...defaults },
  { id: 7, name: 'Invoice Cover Letter',     template: 'classic',   uses: 11, lastUsed: '5 days ago',  accentColor: '#34d399', fontFamily: "'DM Sans', sans-serif",       company: 'ACME STUDIO', tagline: '',                      watermark: '',             showWatermark: false, stamp: '', ...defaults },
]

// ── State ─────────────────────────────────────────────────────────────────────
const lh       = ref<LetterheadDoc | null>(null)
const loading  = ref(true)
const notFound = ref(false)
const showDeleteConfirm = ref(false)
const showShareModal    = ref(false)

onMounted(async () => {
  await new Promise(r => setTimeout(r, 300))
  const id   = Number(route.params.id)
  const data = mockLetterheads.find(l => l.id === id)
  if (!data) { notFound.value = true; loading.value = false; return }
  lh.value      = data
  loading.value = false
})

// ── Links analytics ───────────────────────────────────────────────────────────
const links = computed(() =>
  lh.value
    ? linksStore.forResource('letterhead', lh.value.id)
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []
)
const totalViews   = computed(() => links.value.reduce((s, l) => s + l.views, 0))
const activeLinks  = computed(() => links.value.filter(l => l.isActive && !linksStore.isExpired(l)).length)
const privateLinks = computed(() => links.value.filter(l => l.visibility === 'private').length)

// ── Helpers ───────────────────────────────────────────────────────────────────
const templateLabel: Record<string, string> = {
  classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
  bold: 'Bold', legal: 'Legal', executive: 'Executive',
}
const templateBadgeClass: Record<string, string> = {
  classic:   'bg-amber/10 text-amber border-amber/20',
  modern:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bold:      'bg-red-500/10 text-red-400 border-red-500/20',
  minimal:   'bg-green-500/10 text-green-400 border-green-500/20',
  legal:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  executive: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const formatDate = (d: string) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
const fmtFooter = (s: string) => s.replace('{page}', '1').replace('{total}', '1')

function handlePrint() { window.print() }

function handleDelete() {
  notify(`${lh.value?.name} deleted`, 'success')
  router.push({ name: 'letterheads' })
}

function linkUrl(token: string): string {
  return `${window.location.origin}/share/l/${token}`
}
function copyLink(token: string) {
  navigator.clipboard.writeText(linkUrl(token)).catch(() => {})
  notify('Link copied to clipboard', 'success')
}
function statusLabel(link: ReturnType<typeof linksStore.forResource>[0]) {
  if (!link.isActive)             return { text: 'Revoked', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (linksStore.isExpired(link)) return { text: 'Expired', cls: 'text-gray-400 bg-charcoal-700 border-charcoal-600' }
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
function expiryLabel(link: ReturnType<typeof linksStore.forResource>[0]) {
  if (!link.expiresAt)            return 'Never expires'
  if (linksStore.isExpired(link)) return `Expired ${fmtDate(link.expiresAt)}`
  return `Expires ${fmtDate(link.expiresAt)}`
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-cream-faint">Letterhead not found</p>
      <button @click="router.push({ name: 'letterheads' })" class="mt-4 text-amber text-sm hover:underline">Back to letterheads</button>
    </div>

    <template v-else-if="lh">

      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'letterheads' })" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">{{ lh.name }}</h1>
              <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', templateBadgeClass[lh.template] ?? 'bg-charcoal-700 text-cream-faint border-charcoal-600']">
                {{ templateLabel[lh.template] ?? lh.template }}
              </span>
              <span v-if="lh.stamp" class="text-[9px] px-1.5 py-0.5 rounded border font-medium" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] + '60', backgroundColor: stampColor[lh.stamp] + '15' }">
                {{ lh.stamp }}
              </span>
            </div>
            <p class="page-subtitle">{{ lh.company }} · {{ lh.uses }} uses · Last used {{ lh.lastUsed }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button @click="handlePrint" class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors">
            <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            @click="showShareModal = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream rounded-lg transition-colors"
          >
            <Icon icon="lucide:share-2" class="w-3.5 h-3.5" /> Share
            <span v-if="activeLinks > 0" class="ml-0.5 px-1.5 py-0.5 bg-amber/20 text-amber text-[9px] font-bold rounded-full">{{ activeLinks }}</span>
          </button>
          <button
            @click="router.push({ name: 'letterheads.edit', params: { id: lh.id } })"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber hover:bg-amber/90 text-charcoal-900 font-semibold rounded-lg transition-colors"
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
        <div class="bg-charcoal-700/30 rounded-xl p-6 flex justify-center">

          <!-- ══ CLASSIC ══ -->
          <div
            v-if="lh.template === 'classic'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.showTopBar" class="h-1.5 w-full" :style="{ backgroundColor: lh.accentColor }"></div>
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-12" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-14 w-auto object-contain mb-2" />
                  <div class="text-lg font-bold" :style="{ color: lh.accentColor }">{{ lh.company }}</div>
                  <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
                </div>
                <div class="text-right text-xs text-gray-500 space-y-0.5">
                  <div v-if="lh.email">{{ lh.email }}</div>
                  <div v-if="lh.phone">{{ lh.phone }}</div>
                  <div v-if="lh.website">{{ lh.website }}</div>
                </div>
              </div>
              <div v-if="lh.showDivider" class="h-px mb-8" :style="{ backgroundColor: lh.accentColor + '40' }"></div>
              <div v-if="lh.showDate || lh.showRef" class="flex gap-8 mb-6 text-xs">
                <div v-if="lh.showDate"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.showRef"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.refNumber }}</div></div>
              </div>
              <div v-if="lh.subject" class="mb-6"><span class="font-semibold text-gray-800">Re: </span><span class="text-gray-700">{{ lh.subject }}</span></div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-8 whitespace-pre-line" style="line-height:1.8">{{ lh.body }}</div>
              <div class="mb-10">
                <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
                <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ lh.signerName }}</div>
                <div class="text-xs text-gray-500">{{ lh.signerTitle }}</div>
                <div class="text-xs text-gray-400">{{ lh.company }}</div>
              </div>
              <div v-if="lh.regNumber || lh.vatNumber" class="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-x-6">
                <span v-if="lh.regNumber">Reg. No: {{ lh.regNumber }}</span>
                <span v-if="lh.vatNumber">VAT: {{ lh.vatNumber }}</span>
              </div>
              <div v-if="lh.showFooter" class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footerLeft) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerCenter) || lh.company }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerRight) }}</span>
              </div>
              <div v-if="lh.showBottomBar" class="absolute bottom-0 left-0 right-0 h-1.5" :style="{ backgroundColor: lh.accentColor }"></div>
            </div>
          </div>

          <!-- ══ MODERN ══ -->
          <div
            v-else-if="lh.template === 'modern'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden flex"
            :style="{ fontFamily: lh.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <!-- Left colour panel -->
            <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: lh.accentColor, width: '220px', position: 'relative', zIndex: 3 }">
              <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
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
                <div v-if="lh.regNumber || lh.vatNumber">
                  <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Registration</div>
                  <div v-if="lh.regNumber" class="text-white/70 text-xs font-mono">{{ lh.regNumber }}</div>
                  <div v-if="lh.vatNumber" class="text-white/70 text-xs font-mono">{{ lh.vatNumber }}</div>
                </div>
              </div>
            </div>
            <!-- Right content -->
            <div class="flex-1 p-10 flex flex-col" style="position:relative;z-index:3">
              <div class="flex justify-end gap-6 mb-8 text-xs">
                <div v-if="lh.showDate" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.showRef" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.refNumber }}</div></div>
              </div>
              <div v-if="lh.subject" class="text-base font-bold mb-6" :style="{ color: lh.accentColor }">Re: {{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line flex-1" style="line-height:1.8">{{ lh.body }}</div>
              <div class="mb-6">
                <p class="text-gray-700 mb-10">{{ lh.closing }}</p>
                <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
                <div class="font-semibold text-gray-800">{{ lh.signerName }}</div>
                <div class="text-xs text-gray-500">{{ lh.signerTitle }}</div>
              </div>
              <div v-if="lh.showFooter" class="border-t border-gray-100 pt-4 flex justify-between" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footerLeft) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerCenter) }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerRight) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ MINIMAL ══ -->
          <div
            v-else-if="lh.template === 'minimal'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-14" style="position:relative;z-index:3;max-width:600px;margin:0 auto">
              <div class="mb-10">
                <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-10 w-auto object-contain mb-3" />
                <div class="font-bold text-xl text-gray-900">{{ lh.company }}</div>
                <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
              </div>
              <div v-if="lh.showDivider" class="w-8 mb-8" style="height:2px" :style="{ backgroundColor: lh.accentColor }"></div>
              <div class="flex gap-8 mb-8 text-xs text-gray-500">
                <div v-if="lh.showDate">{{ formatDate(lh.date) }}</div>
                <div v-if="lh.showRef" class="font-mono">{{ lh.refNumber }}</div>
              </div>
              <div v-if="lh.subject" class="font-semibold text-gray-800 mb-6">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-5">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-loose mb-12 whitespace-pre-line" style="line-height:2">{{ lh.body }}</div>
              <p class="text-gray-700 mb-14">{{ lh.closing }}</p>
              <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
              <div class="font-semibold text-gray-800">{{ lh.signerName }}</div>
              <div class="text-xs text-gray-500">{{ lh.signerTitle }}</div>
              <div v-if="lh.showFooter" class="absolute bottom-10 left-14 right-14 flex justify-between border-t border-gray-100 pt-4" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footerLeft) || lh.company }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerRight) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ BOLD ══ -->
          <div
            v-else-if="lh.template === 'bold'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="px-12 py-10 relative" :style="{ backgroundColor: lh.accentColor, zIndex: 3 }">
              <div class="flex justify-between items-end">
                <div>
                  <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-12 w-auto object-contain mb-3 brightness-0 invert" />
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
                <div v-if="lh.showDate"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-bold text-gray-800">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.showRef"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-bold text-gray-800 font-mono">{{ lh.refNumber }}</div></div>
              </div>
              <div v-if="lh.subject" class="text-lg font-black text-gray-900 mb-6 pb-3" :style="{ borderBottom: `3px solid ${lh.accentColor}` }">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="text-gray-700 mb-4">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ lh.body }}</div>
              <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
              <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-10 w-auto object-contain mb-1" />
              <div class="font-bold text-gray-800">{{ lh.signerName }}</div>
              <div class="text-xs text-gray-500">{{ lh.signerTitle }}</div>
              <div v-if="lh.address" class="mt-6 p-4 rounded text-xs text-gray-500 leading-relaxed" :style="{ backgroundColor: lh.accentColor + '10', borderLeft: `3px solid ${lh.accentColor}` }">
                <span class="font-semibold text-gray-700">Address: </span>{{ lh.address.replace(/\n/g, ', ') }}
                <span v-if="lh.regNumber"> · Reg: {{ lh.regNumber }}</span>
                <span v-if="lh.vatNumber"> · VAT: {{ lh.vatNumber }}</span>
              </div>
              <div v-if="lh.showFooter" class="absolute bottom-8 left-12 right-12 flex justify-between" style="font-size:10px">
                <span class="text-gray-400">{{ fmtFooter(lh.footerLeft) || lh.website }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerCenter) }}</span>
                <span class="text-gray-400">{{ fmtFooter(lh.footerRight) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ LEGAL ══ -->
          <div
            v-else-if="lh.template === 'legal'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            style="font-family:'Times New Roman',Times,serif;color:#111827;font-size:13px;min-height:1080px"
          >
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="p-12 pb-24" style="position:relative;z-index:3">
              <div class="text-center mb-8">
                <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-12 w-auto object-contain mx-auto mb-3" />
                <div class="text-base font-bold uppercase tracking-widest text-gray-900">{{ lh.company }}</div>
                <div v-if="lh.tagline" class="text-xs text-gray-500 mt-0.5">{{ lh.tagline }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ [lh.email, lh.phone, lh.website].filter(Boolean).join(' · ') }}</div>
                <div v-if="lh.address" class="text-xs text-gray-500 mt-0.5">{{ lh.address.replace(/\n/g, ', ') }}</div>
              </div>
              <div class="h-px bg-gray-400 mb-0.5"></div>
              <div class="h-px bg-gray-200 mb-8"></div>
              <div class="flex justify-between text-xs text-gray-500 mb-8">
                <span v-if="lh.showDate">{{ formatDate(lh.date) }}</span>
                <span v-if="lh.showRef" class="font-mono">Ref: {{ lh.refNumber }}</span>
              </div>
              <div v-if="lh.subject" class="text-center font-bold uppercase text-gray-800 mb-8 tracking-wider">{{ lh.subject }}</div>
              <p v-if="lh.salutation" class="mb-6 text-gray-800">{{ lh.salutation }}</p>
              <div class="text-gray-700 leading-relaxed mb-12 whitespace-pre-line text-justify" style="line-height:2">{{ lh.body }}</div>
              <p class="text-gray-800 mb-14">{{ lh.closing }}</p>
              <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
              <div class="font-bold text-gray-800">{{ lh.signerName }}</div>
              <div class="text-sm text-gray-600">{{ lh.signerTitle }}</div>
              <div class="text-sm text-gray-600">{{ lh.company }}</div>
              <div v-if="lh.regNumber || lh.vatNumber" class="mt-4 text-xs text-gray-400">
                <span v-if="lh.regNumber">Reg. No: {{ lh.regNumber }}</span>
                <span v-if="lh.regNumber && lh.vatNumber"> · </span>
                <span v-if="lh.vatNumber">VAT: {{ lh.vatNumber }}</span>
              </div>
            </div>
            <div v-if="lh.showFooter" class="absolute bottom-0 left-0 right-0 px-12 pb-6">
              <div class="h-px bg-gray-400 mb-0.5"></div>
              <div class="h-px bg-gray-200 mb-3"></div>
              <div class="flex justify-between text-xs text-gray-400">
                <span>{{ fmtFooter(lh.footerLeft) || lh.company }}</span>
                <span>{{ fmtFooter(lh.footerCenter) }}</span>
                <span>{{ fmtFooter(lh.footerRight) }}</span>
              </div>
            </div>
          </div>

          <!-- ══ EXECUTIVE ══ -->
          <div
            v-else-if="lh.template === 'executive'"
            class="print-document w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden"
            :style="{ fontFamily: lh.fontFamily, color: '#1f2937', fontSize: '13px', minHeight: '1080px' }"
          >
            <div v-if="lh.showTopBar" class="h-2 w-full" :style="{ backgroundColor: lh.accentColor }"></div>
            <div v-if="lh.showWatermark && lh.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
              <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: lh.watermarkColor }">{{ lh.watermark }}</span>
            </div>
            <div v-if="lh.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
              <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[lh.stamp], borderColor: stampColor[lh.stamp] }">{{ lh.stamp }}</div>
            </div>
            <div class="px-12 py-10" style="position:relative;z-index:3">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <img v-if="lh.logoUrl" :src="lh.logoUrl" alt="Logo" class="h-14 w-auto object-contain mb-3" />
                  <div class="text-2xl font-bold" :style="{ color: lh.accentColor }">{{ lh.company }}</div>
                  <div v-if="lh.tagline" class="text-xs text-gray-400 mt-0.5">{{ lh.tagline }}</div>
                </div>
                <div class="text-right text-xs text-gray-500 space-y-0.5 mt-1">
                  <div v-if="lh.email">{{ lh.email }}</div>
                  <div v-if="lh.phone">{{ lh.phone }}</div>
                  <div v-if="lh.website">{{ lh.website }}</div>
                  <div v-if="lh.address" class="whitespace-pre-line mt-1">{{ lh.address }}</div>
                </div>
              </div>
              <div class="flex mb-8" style="height:3px;border-radius:2px" :style="{ backgroundColor: lh.accentColor }"></div>
              <div class="grid grid-cols-3 gap-4 border border-gray-100 rounded p-4 mb-8 text-xs" :style="{ backgroundColor: lh.accentColor + '08' }">
                <div v-if="lh.showDate"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(lh.date) }}</div></div>
                <div v-if="lh.showRef"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ lh.refNumber }}</div></div>
                <div v-if="lh.subject"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Subject</div><div class="font-semibold text-gray-700">{{ lh.subject }}</div></div>
              </div>
              <p v-if="lh.salutation" class="text-gray-700 mb-5">{{ lh.salutation }}</p>
              <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ lh.body }}</div>
              <p class="text-gray-700 mb-12">{{ lh.closing }}</p>
              <img v-if="lh.signatureUrl" :src="lh.signatureUrl" alt="Signature" class="h-12 w-auto object-contain mb-1" />
              <div class="font-semibold text-gray-800">{{ lh.signerName }}</div>
              <div class="text-xs text-gray-500">{{ lh.signerTitle }}</div>
              <div class="text-xs text-gray-400">{{ lh.company }}</div>
              <div v-if="lh.regNumber || lh.vatNumber" class="mt-2 text-xs text-gray-400">
                <span v-if="lh.regNumber">Reg: {{ lh.regNumber }}</span>
                <span v-if="lh.vatNumber"> · VAT: {{ lh.vatNumber }}</span>
              </div>
              <div v-if="lh.showFooter" class="absolute bottom-8 left-12 right-12 border-t-2 pt-4 flex justify-between" :style="{ borderColor: lh.accentColor + '40' }">
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footerLeft) || lh.website }}</span>
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footerCenter) || lh.company }}</span>
                <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(lh.footerRight) }}</span>
              </div>
              <div v-if="lh.showBottomBar" class="absolute bottom-0 left-0 right-0 h-2" :style="{ backgroundColor: lh.accentColor }"></div>
            </div>
          </div>

        </div><!-- /document preview -->

        <!-- ── Analytics / Links sidebar ──────────────────────────────────── -->
        <div class="space-y-4">

          <!-- Info card -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
            <p class="text-[10px] uppercase tracking-wider text-cream-faint font-semibold">Letterhead Details</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ lh.uses }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Total Uses</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ links.length }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Shared Links</div>
              </div>
            </div>
            <div class="space-y-1.5 text-xs text-cream-faint pt-0.5">
              <div class="flex items-center justify-between">
                <span>Last used</span><span class="text-cream-muted">{{ lh.lastUsed }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Template</span>
                <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', templateBadgeClass[lh.template] ?? '']">{{ templateLabel[lh.template] }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Watermark</span>
                <span class="text-cream-muted font-mono text-[10px]">{{ lh.watermark || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Link stats -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-wider text-cream-faint font-semibold">Shared Links</p>
              <button
                @click="showShareModal = true"
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber hover:text-amber/80 bg-amber/10 hover:bg-amber/15 rounded-md transition-colors"
              >
                <Icon icon="lucide:plus" class="w-3 h-3" /> New Link
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ links.length }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Total</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-green-400">{{ activeLinks }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div class="bg-charcoal-900/50 rounded-lg p-2.5 text-center">
                <div class="text-lg font-bold text-cream">{{ totalViews }}</div>
                <div class="text-[9px] text-cream-faint uppercase tracking-wide mt-0.5">Views</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs text-cream-faint">
              <span class="flex items-center gap-1"><Icon icon="lucide:lock" class="w-3 h-3" /> {{ privateLinks }} private</span>
              <span class="flex items-center gap-1"><Icon icon="lucide:globe" class="w-3 h-3" /> {{ links.length - privateLinks }} public</span>
            </div>
          </div>

          <!-- Link list -->
          <div v-if="links.length > 0" class="space-y-2">
            <div
              v-for="link in links" :key="link.id"
              class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-3.5 space-y-2.5"
            >
              <!-- Top -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-cream truncate">{{ link.label || 'Shared Link' }}</span>
                    <span :class="['text-[9px] px-1.5 py-0.5 rounded border font-medium', statusLabel(link).cls]">{{ statusLabel(link).text }}</span>
                  </div>
                  <p class="text-[10px] text-cream-faint mt-0.5">{{ expiryLabel(link) }}</p>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded border font-medium text-cream-faint border-charcoal-600 bg-charcoal-700 shrink-0">
                  {{ link.visibility === 'private' ? 'Private' : 'Public' }}
                </span>
              </div>
              <!-- URL -->
              <div class="flex items-center gap-1.5">
                <div class="flex-1 min-w-0 bg-charcoal-900/60 border border-charcoal-700 rounded px-2 py-1">
                  <p class="text-[10px] font-mono text-cream-faint truncate">{{ linkUrl(link.token) }}</p>
                </div>
                <button
                  @click="copyLink(link.token)"
                  :disabled="!link.isActive || linksStore.isExpired(link)"
                  class="p-1 rounded bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-cream-faint hover:text-cream transition-colors disabled:opacity-40"
                ><Icon icon="lucide:copy" class="w-3 h-3" /></button>
              </div>
              <!-- Access code -->
              <div v-if="link.visibility === 'private'" class="flex items-center gap-1.5">
                <Icon icon="lucide:key-round" class="w-3 h-3 text-amber shrink-0" />
                <span class="text-[10px] font-mono text-amber tracking-widest">{{ link.accessCode }}</span>
              </div>
              <!-- Stats -->
              <div class="flex items-center gap-3 text-[10px] text-cream-faint border-t border-charcoal-700/50 pt-2">
                <span class="flex items-center gap-1"><Icon icon="lucide:eye" class="w-3 h-3" /> {{ link.views }} views</span>
                <span class="flex items-center gap-1 ml-auto"><Icon icon="lucide:clock" class="w-3 h-3" /> {{ fmtDateTime(link.lastViewedAt) }}</span>
              </div>
              <!-- View log -->
              <div v-if="link.viewLog.length > 0" class="space-y-1 border-t border-charcoal-700/50 pt-2">
                <p class="text-[9px] uppercase tracking-wider text-cream-faint">Recent Views</p>
                <div v-for="(entry, i) in link.viewLog.slice(0, 5)" :key="i" class="flex items-center justify-between text-[10px] text-cream-faint">
                  <span>{{ entry.browser }}</span>
                  <span>{{ fmtDateTime(entry.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="bg-charcoal-800 border border-dashed border-charcoal-600 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <Icon icon="lucide:share-2" class="w-8 h-8 text-cream-faint" />
            <p class="text-xs font-medium text-cream-muted">No shared links yet</p>
            <p class="text-[11px] text-cream-faint">Generate a link to share this letterhead with clients</p>
            <button
              @click="showShareModal = true"
              class="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber/10 hover:bg-amber/15 border border-amber/20 text-amber rounded-lg transition-colors"
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
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-cream">Delete "{{ lh.name }}"?</h3>
                <p class="text-xs text-cream-faint mt-1 leading-relaxed">This letterhead will be permanently deleted. This action cannot be undone.</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
              <button @click="handleDelete" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
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
