<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import LetterheadEditor from './LetterheadEditor.vue'

const route      = useRoute()
const isLoading  = ref(true)
const notFound   = ref(false)
const initialData = ref<Record<string, any> | undefined>(undefined)

const mockLetterheads = [
  { id: 1, name: 'Agency Proposal',          theme: 'classic',   accentColor: '#e8a83e', company: 'ACME STUDIO', tagline: 'Creative Agency',      watermark: '',             showWatermark: false, stamp: '' },
  { id: 2, name: 'Client Engagement Letter', theme: 'modern',    accentColor: '#60a5fa', company: 'ACME STUDIO', tagline: '',                      watermark: 'CONFIDENTIAL', showWatermark: true,  stamp: '' },
  { id: 3, name: 'Partnership Agreement',    theme: 'bold',      accentColor: '#f87171', company: 'ACME STUDIO', tagline: '',                      watermark: 'DRAFT',        showWatermark: true,  stamp: 'DRAFT' },
  { id: 4, name: 'Service Quote',            theme: 'minimal',   accentColor: '#4ade80', company: 'ACME STUDIO', tagline: 'Professional Services', watermark: '',             showWatermark: false, stamp: '' },
  { id: 5, name: 'NDA Template',             theme: 'legal',     accentColor: '#a78bfa', company: 'ACME STUDIO', tagline: '',                      watermark: 'CONFIDENTIAL', showWatermark: true,  stamp: 'CONFIDENTIAL' },
  { id: 6, name: 'Project Proposal',         theme: 'executive', accentColor: '#fb923c', company: 'ACME STUDIO', tagline: 'Creative Agency',       watermark: '',             showWatermark: false, stamp: '' },
  { id: 7, name: 'Invoice Cover Letter',     theme: 'classic',   accentColor: '#34d399', company: 'ACME STUDIO', tagline: '',                      watermark: '',             showWatermark: false, stamp: '' },
]

onMounted(async () => {
  await new Promise(r => setTimeout(r, 350))
  const id   = Number(route.params.id)
  const data = mockLetterheads.find(l => l.id === id)
  if (!data) { notFound.value = true; isLoading.value = false; return }
  initialData.value = { ...data }
  isLoading.value = false
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen bg-charcoal-900">
    <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
  </div>

  <div v-else-if="notFound" class="flex flex-col items-center justify-center h-screen bg-charcoal-900">
    <p class="text-cream-faint">Letterhead not found</p>
    <button @click="$router.push({ name: 'letterheads' })" class="mt-4 text-amber text-sm hover:underline">
      Back to letterheads
    </button>
  </div>

  <LetterheadEditor v-else mode="edit" :initial-data="initialData" />
</template>
