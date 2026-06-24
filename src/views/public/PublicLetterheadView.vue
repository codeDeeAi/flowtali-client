<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { SharedLinksService } from '@/services/shared-links.service'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
import type { ILetterhead } from '@/services/letterhead.service'

const route = useRoute()
const token = route.params.token as string

const loading      = ref(true)
const locked       = ref(false)
const invalid      = ref(false)
const codeInput    = ref('')
const codeError    = ref('')
const codeLoading  = ref(false)
const unlocked     = ref(false)
const letterhead   = ref<ILetterhead | null>(null)

const stampColorFor = (lh: ILetterhead | null) =>
  lh?.stamp_color ?? '#9ca3af'

onMounted(async () => {
  try {
    const res = await SharedLinksService.getByToken(token)
    letterhead.value = res.data.data.letterhead
    SharedLinksService.recordView(token).catch(() => {})
  } catch (err: any) {
    if (err?.response?.status === 403) {
      locked.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
})

async function submitCode() {
  codeError.value  = ''
  codeLoading.value = true
  try {
    const res = await SharedLinksService.getByToken(token, codeInput.value.trim())
    letterhead.value = res.data.data.letterhead
    locked.value     = false
    unlocked.value   = true
    SharedLinksService.recordView(token).catch(() => {})
  } catch (err: any) {
    if (err?.response?.status === 403) {
      codeError.value = 'Incorrect access code. Please try again.'
    } else {
      invalid.value = true
    }
  } finally {
    codeLoading.value = false
  }
}

const printPage  = () => window.print()
const fmtFooter  = (s: string | null) => (s ?? '').replace('{page}', '1').replace('{total}', '1')
const formatDate = (d: string | null) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">

    <!-- Top bar -->
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 print:hidden">
      <FlowtaliLogo variant="full" :size="16" theme="light" />
      <button v-if="letterhead" @click="printPage()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg transition-colors">
        <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
      </button>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-400 animate-spin" />
    </div>

    <!-- Invalid / expired / revoked -->
    <div v-else-if="invalid" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center max-w-sm">
        <div class="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:link-2-off" class="w-7 h-7 text-gray-400" />
        </div>
        <h2 class="text-lg font-semibold text-gray-800 mb-2">Link unavailable</h2>
        <p class="text-sm text-gray-500 leading-relaxed">This link has expired, been revoked, or doesn't exist. Contact the sender for a new link.</p>
      </div>
    </div>

    <!-- Access code gate -->
    <div v-else-if="locked" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 w-full max-w-sm space-y-5">
        <div class="text-center">
          <div class="w-12 h-12 rounded-xl bg-green-700-50 border border-green-700-200 flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:lock" class="w-6 h-6 text-green-700-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-800">Access Required</h2>
          <p class="text-sm text-gray-500 mt-1">Enter the access code to view this letterhead</p>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Access Code</label>
          <input
            v-model="codeInput"
            @keydown.enter="submitCode"
            type="text"
            placeholder="e.g. ABC123"
            :disabled="codeLoading"
            class="w-full px-3 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-green-700-400 focus:ring-2 focus:ring-amber-400/20 text-gray-800 tracking-widest uppercase disabled:opacity-60"
          />
          <p v-if="codeError" class="text-xs text-red-500">{{ codeError }}</p>
        </div>
        <button
          @click="submitCode"
          :disabled="codeLoading || !codeInput.trim()"
          class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-green-700-400 hover:bg-green-700-500 disabled:opacity-60 text-white rounded-lg transition-colors"
        >
          <Icon v-if="codeLoading" icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ codeLoading ? 'Verifying…' : 'View Letterhead' }}
        </button>
      </div>
    </div>

    <!-- Letterhead document -->
    <div v-else-if="letterhead" class="flex-1 py-8 px-4 flex flex-col items-center gap-6">

      <div v-if="unlocked" class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 print:hidden">
        <Icon icon="lucide:unlock" class="w-3.5 h-3.5" /> Access granted
      </div>

      <!-- ══ CLASSIC ══ -->
      <div
        v-if="letterhead.theme === 'classic' || !letterhead.theme"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'Geist Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '1100px' }"
      >
        <div v-if="letterhead.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: letterhead.accent_color }"></div>
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="p-12" style="position:relative;z-index:3">
          <div class="flex justify-between items-start mb-8">
            <div>
              <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-14 w-auto object-contain mb-2" />
              <div class="text-lg font-bold" :style="{ color: letterhead.accent_color }">{{ letterhead.company }}</div>
              <div v-if="letterhead.tagline" class="text-xs text-gray-400 mt-0.5">{{ letterhead.tagline }}</div>
            </div>
            <div class="text-right text-xs text-gray-500 space-y-0.5">
              <div v-if="letterhead.email">{{ letterhead.email }}</div>
              <div v-if="letterhead.phone">{{ letterhead.phone }}</div>
              <div v-if="letterhead.website">{{ letterhead.website }}</div>
            </div>
          </div>
          <div v-if="letterhead.show_divider" class="h-px mb-8" :style="{ backgroundColor: letterhead.accent_color + '40' }"></div>
          <div v-if="letterhead.show_date || letterhead.show_ref" class="flex gap-8 mb-6 text-xs">
            <div v-if="letterhead.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(letterhead.date) }}</div></div>
            <div v-if="letterhead.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ letterhead.ref_number }}</div></div>
          </div>
          <div v-if="letterhead.subject" class="mb-6"><span class="font-semibold text-gray-800">Re: </span><span class="text-gray-700">{{ letterhead.subject }}</span></div>
          <p v-if="letterhead.salutation" class="text-gray-700 mb-4">{{ letterhead.salutation }}</p>
          <div class="text-gray-600 leading-relaxed mb-8 whitespace-pre-line" style="line-height:1.8">{{ letterhead.body }}</div>
          <div class="mb-10">
            <p class="text-gray-700 mb-12">{{ letterhead.closing }}</p>
            <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
            <div class="font-semibold text-gray-800">{{ letterhead.signer_name }}</div>
            <div class="text-xs text-gray-500">{{ letterhead.signer_title }}</div>
            <div class="text-xs text-gray-400">{{ letterhead.company }}</div>
          </div>
          <div v-if="letterhead.reg_number || letterhead.vat_number" class="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-x-6">
            <span v-if="letterhead.reg_number">Reg. No: {{ letterhead.reg_number }}</span>
            <span v-if="letterhead.vat_number">VAT: {{ letterhead.vat_number }}</span>
          </div>
          <div v-if="letterhead.show_footer" class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size:10px">
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_left) || letterhead.website }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_center) || letterhead.company }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
          <div v-if="letterhead.show_bottom_bar" class="absolute bottom-0 left-0 right-0 h-1.5" :style="{ backgroundColor: letterhead.accent_color }"></div>
        </div>
      </div>

      <!-- ══ MODERN ══ -->
      <div
        v-else-if="letterhead.theme === 'modern'"
        class="print-document w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden relative flex"
        :style="{ fontFamily: letterhead.font_family || 'Geist Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '1100px' }"
      >
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="shrink-0 flex flex-col p-8" :style="{ backgroundColor: letterhead.accent_color, width: '220px', position: 'relative', zIndex: 3 }">
          <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-6 brightness-0 invert" />
          <div v-else class="mb-6"></div>
          <div class="text-white font-bold text-lg leading-tight mb-1">{{ letterhead.company }}</div>
          <div v-if="letterhead.tagline" class="text-white/70 text-xs mb-6">{{ letterhead.tagline }}</div>
          <div class="space-y-4 mt-auto">
            <div>
              <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Contact</div>
              <div v-if="letterhead.email"   class="text-white/80 text-xs">{{ letterhead.email }}</div>
              <div v-if="letterhead.phone"   class="text-white/80 text-xs">{{ letterhead.phone }}</div>
              <div v-if="letterhead.website" class="text-white/80 text-xs">{{ letterhead.website }}</div>
            </div>
            <div v-if="letterhead.address">
              <div class="text-white/50 uppercase tracking-widest mb-1" style="font-size:9px">Address</div>
              <div class="text-white/80 text-xs whitespace-pre-line leading-relaxed">{{ letterhead.address }}</div>
            </div>
          </div>
        </div>
        <div class="flex-1 p-10 flex flex-col" style="position:relative;z-index:3">
          <div class="flex justify-end gap-6 mb-8 text-xs">
            <div v-if="letterhead.show_date" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(letterhead.date) }}</div></div>
            <div v-if="letterhead.show_ref" class="text-right"><div class="text-gray-400 uppercase tracking-widest mb-0.5" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ letterhead.ref_number }}</div></div>
          </div>
          <div v-if="letterhead.subject" class="text-base font-bold mb-6" :style="{ color: letterhead.accent_color }">Re: {{ letterhead.subject }}</div>
          <p v-if="letterhead.salutation" class="text-gray-700 mb-4">{{ letterhead.salutation }}</p>
          <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line flex-1" style="line-height:1.8">{{ letterhead.body }}</div>
          <div class="mb-6">
            <p class="text-gray-700 mb-10">{{ letterhead.closing }}</p>
            <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
            <div class="font-semibold text-gray-800">{{ letterhead.signer_name }}</div>
            <div class="text-xs text-gray-500">{{ letterhead.signer_title }}</div>
          </div>
          <div v-if="letterhead.show_footer" class="border-t border-gray-100 pt-4 flex justify-between" style="font-size:10px">
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_left) || letterhead.website }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_center) }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ MINIMAL ══ -->
      <div
        v-else-if="letterhead.theme === 'minimal'"
        class="print-document w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'Geist Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '1100px' }"
      >
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="p-14" style="position:relative;z-index:3;max-width:600px;margin:0 auto">
          <div class="mb-10">
            <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-10 w-auto object-contain mb-3" />
            <div class="font-bold text-xl text-gray-900">{{ letterhead.company }}</div>
            <div v-if="letterhead.tagline" class="text-xs text-gray-400 mt-0.5">{{ letterhead.tagline }}</div>
          </div>
          <div v-if="letterhead.show_divider" class="w-8 mb-8" style="height:2px" :style="{ backgroundColor: letterhead.accent_color }"></div>
          <div class="flex gap-8 mb-8 text-xs text-gray-500">
            <div v-if="letterhead.show_date">{{ formatDate(letterhead.date) }}</div>
            <div v-if="letterhead.show_ref" class="font-mono">{{ letterhead.ref_number }}</div>
          </div>
          <div v-if="letterhead.subject" class="font-semibold text-gray-800 mb-6">{{ letterhead.subject }}</div>
          <p v-if="letterhead.salutation" class="text-gray-700 mb-5">{{ letterhead.salutation }}</p>
          <div class="text-gray-600 leading-loose mb-12 whitespace-pre-line" style="line-height:2">{{ letterhead.body }}</div>
          <p class="text-gray-700 mb-14">{{ letterhead.closing }}</p>
          <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
          <div class="font-semibold text-gray-800">{{ letterhead.signer_name }}</div>
          <div class="text-xs text-gray-500">{{ letterhead.signer_title }}</div>
          <div v-if="letterhead.show_footer" class="absolute bottom-10 left-14 right-14 flex justify-between border-t border-gray-100 pt-4" style="font-size:10px">
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_left) || letterhead.company }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ BOLD ══ -->
      <div
        v-else-if="letterhead.theme === 'bold'"
        class="print-document w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'Geist Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '1100px' }"
      >
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="px-12 py-10 relative" :style="{ backgroundColor: letterhead.accent_color, zIndex: 3 }">
          <div class="flex justify-between items-end">
            <div>
              <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-12 w-auto object-contain mb-3 brightness-0 invert" />
              <div class="text-white font-black text-2xl tracking-tight">{{ letterhead.company }}</div>
              <div v-if="letterhead.tagline" class="text-white/70 text-sm">{{ letterhead.tagline }}</div>
            </div>
            <div class="text-right text-white/80 text-xs space-y-0.5">
              <div v-if="letterhead.email">{{ letterhead.email }}</div>
              <div v-if="letterhead.phone">{{ letterhead.phone }}</div>
              <div v-if="letterhead.website">{{ letterhead.website }}</div>
            </div>
          </div>
        </div>
        <div class="p-12" style="position:relative;z-index:3">
          <div class="flex gap-8 mb-8 text-xs">
            <div v-if="letterhead.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-bold text-gray-800">{{ formatDate(letterhead.date) }}</div></div>
            <div v-if="letterhead.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-bold text-gray-800 font-mono">{{ letterhead.ref_number }}</div></div>
          </div>
          <div v-if="letterhead.subject" class="text-lg font-black text-gray-900 mb-6 pb-3" :style="{ borderBottom: `3px solid ${letterhead.accent_color}` }">{{ letterhead.subject }}</div>
          <p v-if="letterhead.salutation" class="text-gray-700 mb-4">{{ letterhead.salutation }}</p>
          <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ letterhead.body }}</div>
          <p class="text-gray-700 mb-12">{{ letterhead.closing }}</p>
          <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-10 w-auto object-contain mb-1" />
          <div class="font-bold text-gray-800">{{ letterhead.signer_name }}</div>
          <div class="text-xs text-gray-500">{{ letterhead.signer_title }}</div>
          <div v-if="letterhead.address" class="mt-6 p-4 rounded text-xs text-gray-500 leading-relaxed" :style="{ backgroundColor: letterhead.accent_color + '10', borderLeft: `3px solid ${letterhead.accent_color}` }">
            <span class="font-semibold text-gray-700">Address: </span>{{ letterhead.address.replace(/\n/g, ', ') }}
          </div>
          <div v-if="letterhead.show_footer" class="absolute bottom-8 left-12 right-12 flex justify-between" style="font-size:10px">
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_left) || letterhead.website }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_center) }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ LEGAL ══ -->
      <div
        v-else-if="letterhead.theme === 'legal'"
        class="print-document w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden relative"
        style="font-family:'Times New Roman',Times,serif;color:#111827;font-size:13px;min-height:1100px"
      >
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="p-12 pb-24" style="position:relative;z-index:3">
          <div class="text-center mb-8">
            <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-12 w-auto object-contain mx-auto mb-3" />
            <div class="text-base font-bold uppercase tracking-widest text-gray-900">{{ letterhead.company }}</div>
            <div v-if="letterhead.tagline" class="text-xs text-gray-500 mt-0.5">{{ letterhead.tagline }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ [letterhead.email, letterhead.phone, letterhead.website].filter(Boolean).join(' · ') }}</div>
            <div v-if="letterhead.address" class="text-xs text-gray-500 mt-0.5">{{ letterhead.address.replace(/\n/g, ', ') }}</div>
          </div>
          <div class="h-px bg-gray-400 mb-0.5"></div>
          <div class="h-px bg-gray-200 mb-8"></div>
          <div class="flex justify-between text-xs text-gray-500 mb-8">
            <span v-if="letterhead.show_date">{{ formatDate(letterhead.date) }}</span>
            <span v-if="letterhead.show_ref" class="font-mono">Ref: {{ letterhead.ref_number }}</span>
          </div>
          <div v-if="letterhead.subject" class="text-center font-bold uppercase text-gray-800 mb-8 tracking-wider">{{ letterhead.subject }}</div>
          <p v-if="letterhead.salutation" class="mb-6 text-gray-800">{{ letterhead.salutation }}</p>
          <div class="text-gray-700 leading-relaxed mb-12 whitespace-pre-line text-justify" style="line-height:2">{{ letterhead.body }}</div>
          <p class="text-gray-800 mb-14">{{ letterhead.closing }}</p>
          <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
          <div class="font-bold text-gray-800">{{ letterhead.signer_name }}</div>
          <div class="text-sm text-gray-600">{{ letterhead.signer_title }}</div>
          <div class="text-sm text-gray-600">{{ letterhead.company }}</div>
        </div>
        <div v-if="letterhead.show_footer" class="absolute bottom-0 left-0 right-0 px-12 pb-6">
          <div class="h-px bg-gray-400 mb-0.5"></div>
          <div class="h-px bg-gray-200 mb-3"></div>
          <div class="flex justify-between text-xs text-gray-400">
            <span>{{ fmtFooter(letterhead.footer_left) || letterhead.company }}</span>
            <span>{{ fmtFooter(letterhead.footer_center) }}</span>
            <span>{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ EXECUTIVE ══ -->
      <div
        v-else
        class="print-document w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'Geist Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '1100px' }"
      >
        <div v-if="letterhead.show_top_bar" class="h-2 w-full" :style="{ backgroundColor: letterhead.accent_color }"></div>
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColorFor(letterhead), borderColor: stampColorFor(letterhead) }">{{ letterhead.stamp }}</div>
        </div>
        <div class="px-12 py-10" style="position:relative;z-index:3">
          <div class="flex justify-between items-start mb-8">
            <div>
              <img v-if="letterhead.logo_url && letterhead.show_logo" :src="letterhead.logo_url" alt="Logo" class="h-14 w-auto object-contain mb-3" />
              <div class="text-2xl font-bold" :style="{ color: letterhead.accent_color }">{{ letterhead.company }}</div>
              <div v-if="letterhead.tagline" class="text-xs text-gray-400 mt-0.5">{{ letterhead.tagline }}</div>
            </div>
            <div class="text-right text-xs text-gray-500 space-y-0.5 mt-1">
              <div v-if="letterhead.email">{{ letterhead.email }}</div>
              <div v-if="letterhead.phone">{{ letterhead.phone }}</div>
              <div v-if="letterhead.website">{{ letterhead.website }}</div>
              <div v-if="letterhead.address" class="whitespace-pre-line mt-1">{{ letterhead.address }}</div>
            </div>
          </div>
          <div class="flex mb-8" style="height:3px;border-radius:2px" :style="{ backgroundColor: letterhead.accent_color }"></div>
          <div class="grid grid-cols-3 gap-4 border border-gray-100 rounded p-4 mb-8 text-xs" :style="{ backgroundColor: letterhead.accent_color + '08' }">
            <div v-if="letterhead.show_date"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Date</div><div class="font-semibold text-gray-700">{{ formatDate(letterhead.date) }}</div></div>
            <div v-if="letterhead.show_ref"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Reference</div><div class="font-semibold text-gray-700 font-mono">{{ letterhead.ref_number }}</div></div>
            <div v-if="letterhead.subject"><div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:9px">Subject</div><div class="font-semibold text-gray-700">{{ letterhead.subject }}</div></div>
          </div>
          <p v-if="letterhead.salutation" class="text-gray-700 mb-5">{{ letterhead.salutation }}</p>
          <div class="text-gray-600 leading-relaxed mb-10 whitespace-pre-line" style="line-height:1.9">{{ letterhead.body }}</div>
          <p class="text-gray-700 mb-12">{{ letterhead.closing }}</p>
          <img v-if="letterhead.signature_url" :src="letterhead.signature_url" alt="Signature" class="h-12 w-auto object-contain mb-1" />
          <div class="font-semibold text-gray-800">{{ letterhead.signer_name }}</div>
          <div class="text-xs text-gray-500">{{ letterhead.signer_title }}</div>
          <div class="text-xs text-gray-400">{{ letterhead.company }}</div>
          <div v-if="letterhead.show_footer" class="absolute bottom-8 left-12 right-12 border-t-2 pt-4 flex justify-between" :style="{ borderColor: letterhead.accent_color + '40' }">
            <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(letterhead.footer_left) || letterhead.website }}</span>
            <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(letterhead.footer_center) || letterhead.company }}</span>
            <span class="text-gray-400" style="font-size:10px">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
          <div v-if="letterhead.show_bottom_bar" class="absolute bottom-0 left-0 right-0 h-2" :style="{ backgroundColor: letterhead.accent_color }"></div>
        </div>
      </div>

      <p class="text-xs text-gray-400 print:hidden">Shared via <strong>Flowtali</strong></p>
    </div>

  </div>
</template>

<style>
@media print {
  .print\:hidden { display: none !important; }
  body * { visibility: hidden; }
  .print-document, .print-document * {
    visibility: visible;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-document {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    box-shadow: none !important; border: none !important; border-radius: 0 !important;
  }
  @page { margin: 0; size: A4; }
}
</style>
