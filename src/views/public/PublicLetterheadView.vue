<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSharedLinksStore } from '@/stores/sharedLinks'

const route = useRoute()
const store = useSharedLinksStore()

const token   = route.params.token as string
const link    = ref(store.byToken(token))
const loading = ref(true)
const locked  = ref(false)
const invalid = ref(false)
const codeInput = ref('')
const codeError = ref('')
const unlocked  = ref(false)

interface Letterhead {
  id: number; name: string; template: string; color: string
  company: string; tagline: string; lastUsed: string; watermark: string; uses: number
}
const mockLetterheads: Letterhead[] = [
  { id: 1, name: 'Agency Proposal',          template: 'Classic', color: '#e8a83e', company: 'ACME STUDIO', tagline: 'Creative Agency',       lastUsed: '2 days ago',   watermark: '',             uses: 14 },
  { id: 2, name: 'Client Engagement Letter', template: 'Modern',  color: '#60a5fa', company: 'ACME STUDIO', tagline: '',                       lastUsed: '1 week ago',   watermark: 'CONFIDENTIAL', uses: 7  },
  { id: 3, name: 'Partnership Agreement',    template: 'Bold',    color: '#f87171', company: 'ACME STUDIO', tagline: '',                       lastUsed: '2 weeks ago',  watermark: 'DRAFT',        uses: 3  },
  { id: 4, name: 'Service Quote',            template: 'Minimal', color: '#4ade80', company: 'ACME STUDIO', tagline: 'Professional Services',  lastUsed: '3 weeks ago',  watermark: '',             uses: 22 },
  { id: 5, name: 'NDA Template',             template: 'Legal',   color: '#a78bfa', company: 'ACME STUDIO', tagline: '',                       lastUsed: '1 month ago',  watermark: 'CONFIDENTIAL', uses: 5  },
  { id: 6, name: 'Project Proposal',         template: 'Executive',color: '#fb923c',company: 'ACME STUDIO', tagline: 'Creative Agency',        lastUsed: '3 days ago',   watermark: '',             uses: 9  },
  { id: 7, name: 'Invoice Cover Letter',     template: 'Classic', color: '#34d399', company: 'ACME STUDIO', tagline: '',                       lastUsed: '5 days ago',   watermark: '',             uses: 11 },
]

const letterhead = ref<Letterhead | null>(null)
const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

onMounted(async () => {
  await new Promise(r => setTimeout(r, 400))
  loading.value = false

  const l = link.value
  if (!l) { invalid.value = true; return }
  if (!l.isActive || store.isExpired(l)) { invalid.value = true; return }

  if (l.visibility === 'private') { locked.value = true; return }

  letterhead.value = mockLetterheads.find(lh => lh.id === l.resourceId) ?? null
  if (!letterhead.value) { invalid.value = true; return }
  store.recordView(token)
})

const printPage = () => window.print()

function submitCode() {
  codeError.value = ''
  const l = link.value
  if (!l) return
  if (codeInput.value.trim().toUpperCase() !== l.accessCode.toUpperCase()) {
    codeError.value = 'Incorrect access code. Please try again.'
    return
  }
  locked.value   = false
  unlocked.value = true
  letterhead.value = mockLetterheads.find(lh => lh.id === l.resourceId) ?? null
  if (!letterhead.value) { invalid.value = true; return }
  store.recordView(token)
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

      <!-- Document -->
      <div
        class="print-document w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden relative"
        style="font-family: 'DM Sans', sans-serif; color: #1f2937; font-size: 13px; min-height: 900px;"
      >
        <!-- Top bar -->
        <div class="h-1.5 w-full" :style="{ backgroundColor: letterhead.color }"></div>

        <!-- Watermark -->
        <div v-if="letterhead.watermark" class="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style="transform: rotate(-35deg); z-index: 1">
          <span class="text-8xl font-black tracking-widest opacity-[0.04] whitespace-nowrap text-gray-800">{{ letterhead.watermark }}</span>
        </div>

        <div class="p-12" style="position: relative; z-index: 3">
          <!-- Header (split layout) -->
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="text-lg font-bold" :style="{ color: letterhead.color }">{{ letterhead.company }}</div>
              <div v-if="letterhead.tagline" class="text-xs text-gray-400 mt-0.5">{{ letterhead.tagline }}</div>
            </div>
            <div class="text-right text-xs text-gray-500 space-y-0.5">
              <div>hello@acme.studio</div>
              <div>+1 415 555 0199</div>
              <div>www.acme.studio</div>
            </div>
          </div>

          <div class="h-px mb-8" :style="{ backgroundColor: letterhead.color + '40' }"></div>

          <!-- Date / Ref -->
          <div class="flex gap-8 mb-6 text-xs">
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Date</div>
              <div class="font-semibold text-gray-700">{{ today }}</div>
            </div>
            <div>
              <div class="text-gray-400 uppercase tracking-widest mb-1" style="font-size:10px">Reference</div>
              <div class="font-semibold text-gray-700 font-mono">REF-001</div>
            </div>
          </div>

          <!-- Salutation / Body -->
          <p class="text-gray-700 mb-4">Dear [Client Name],</p>
          <div class="text-gray-600 leading-relaxed mb-8 whitespace-pre-line" style="line-height: 1.8">We are pleased to present our proposal for your upcoming project.

Please find attached the relevant details for your review. Should you have any questions or require further clarification, please do not hesitate to reach out.

We look forward to working with you.</div>

          <!-- Closing -->
          <div class="mb-10">
            <p class="text-gray-700 mb-12">Yours sincerely,</p>
            <div class="font-semibold text-gray-800">James Holloway</div>
            <div class="text-xs text-gray-500">Creative Director</div>
            <div class="text-xs text-gray-400">{{ letterhead.company }}</div>
          </div>

          <!-- Footer -->
          <div class="absolute bottom-8 left-12 right-12 flex justify-between items-center" style="font-size: 10px">
            <span class="text-gray-400">www.acme.studio</span>
            <span class="text-gray-400">{{ letterhead.company }}</span>
            <span class="text-gray-400">Page 1 of 1</span>
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
