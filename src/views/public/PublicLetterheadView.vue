<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { SharedLinksService } from '@/services/shared-links.service'
import type { ILetterhead } from '@/services/letterhead.service'

const route = useRoute()
const token = route.params.token as string

const loading    = ref(true)
const locked     = ref(false)
const invalid    = ref(false)
const codeInput  = ref('')
const codeError  = ref('')
const unlocked   = ref(false)
const letterhead = ref<ILetterhead | null>(null)
const stampColor: Record<string, string> = {
  DRAFT: '#9ca3af', CONFIDENTIAL: '#f87171', APPROVED: '#4ade80', FINAL: '#60a5fa',
}

onMounted(async () => {
  try {
    const res = await SharedLinksService.getByToken(token)
    letterhead.value = res.data.data.letterhead
    await SharedLinksService.recordView(token)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 403) {
      locked.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
})

const printPage = () => window.print()

async function submitCode() {
  codeError.value = ''
  try {
    const res = await SharedLinksService.getByToken(token, codeInput.value.trim())
    letterhead.value = res.data.data.letterhead
    locked.value   = false
    unlocked.value = true
    await SharedLinksService.recordView(token)
  } catch (err: any) {
    if (err?.response?.status === 403) {
      codeError.value = 'Incorrect access code. Please try again.'
    } else {
      invalid.value = true
    }
  }
}

const fmtFooter = (s: string | null) => (s ?? '').replace('{page}', '1').replace('{total}', '1')
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
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center">
          <Icon icon="lucide:zap" class="w-3.5 h-3.5 text-white" />
        </div>
        <span class="text-sm font-bold text-gray-800" style="font-family: 'DM Sans', sans-serif">Flowtali</span>
      </div>
      <button v-if="letterhead" @click="printPage()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg transition-colors">
        <Icon icon="lucide:printer" class="w-3.5 h-3.5" /> Print / PDF
      </button>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-400 animate-spin" />
    </div>

    <!-- Invalid -->
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
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <Icon icon="lucide:lock" class="w-6 h-6 text-amber-500" />
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
            class="w-full px-3 py-2.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-gray-800 tracking-widest uppercase"
          />
          <p v-if="codeError" class="text-xs text-red-500">{{ codeError }}</p>
        </div>
        <button @click="submitCode" class="w-full py-2.5 text-sm font-semibold bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors">
          View Letterhead
        </button>
      </div>
    </div>

    <!-- Letterhead content -->
    <div v-else-if="letterhead" class="flex-1 py-8 px-4 flex flex-col items-center gap-6">

      <!-- Unlocked notice -->
      <div v-if="unlocked" class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
        <Icon icon="lucide:unlock" class="w-3.5 h-3.5" /> Access granted
      </div>

      <!-- Document (classic) -->
      <div
        v-if="letterhead.theme === 'classic' || !letterhead.theme"
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'DM Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '900px' }"
      >
        <div v-if="letterhead.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: letterhead.accent_color }"></div>
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[letterhead.stamp], borderColor: stampColor[letterhead.stamp] }">{{ letterhead.stamp }}</div>
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

      <!-- Document (other themes — delegate to same render as view page) -->
      <div
        v-else
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden relative"
        :style="{ fontFamily: letterhead.font_family || 'DM Sans, sans-serif', color: '#1f2937', fontSize: '13px', minHeight: '900px' }"
      >
        <div v-if="letterhead.show_top_bar" class="h-1.5 w-full" :style="{ backgroundColor: letterhead.accent_color }"></div>
        <div v-if="letterhead.show_watermark && letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-35deg);z-index:1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap" :style="{ color: letterhead.watermark_color }">{{ letterhead.watermark }}</span>
        </div>
        <div v-if="letterhead.stamp" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform:rotate(-25deg);z-index:2">
          <div class="text-6xl font-extrabold tracking-widest border-4 px-8 py-4 rounded opacity-[0.15]" :style="{ color: stampColor[letterhead.stamp], borderColor: stampColor[letterhead.stamp] }">{{ letterhead.stamp }}</div>
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
          <div v-if="letterhead.show_footer" class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size:10px">
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_left) || letterhead.website }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_center) || letterhead.company }}</span>
            <span class="text-gray-400">{{ fmtFooter(letterhead.footer_right) }}</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400">Shared via Flowtali · flowtali.io</p>
    </div>

  </div>
</template>

<style>
@media print {
  header { display: none !important; }
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
