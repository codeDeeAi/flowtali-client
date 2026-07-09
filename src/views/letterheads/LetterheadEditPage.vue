<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import LetterheadEditor from './LetterheadEditor.vue'
import { useAuthStore } from '@/stores/auth'
import { LetterheadService } from '@/services/letterhead.service'

const route      = useRoute()
const { t }      = useI18n()
const authStore  = useAuthStore()
const orgId      = computed(() => authStore.getCurrentOrganization?.id ?? '')
const isLoading  = ref(true)
const notFound   = ref(false)
const initialData = ref<Record<string, any> | undefined>(undefined)

onMounted(async () => {
  if (!orgId.value) { notFound.value = true; isLoading.value = false; return }
  try {
    const id  = String(route.params.id)
    const res = await LetterheadService.get(orgId.value, id)
    const lh  = res.data.data
    // Map snake_case API fields to camelCase form fields
    initialData.value = {
      name:             lh.name,
      company:          lh.company ?? '',
      tagline:          lh.tagline ?? '',
      email:            lh.email ?? '',
      phone:            lh.phone ?? '',
      website:          lh.website ?? '',
      address:          lh.address ?? '',
      regNumber:        lh.reg_number ?? '',
      vatNumber:        lh.vat_number ?? '',
      logoUrl:          lh.logo_url ?? '',
      signatureUrl:     lh.signature_url ?? '',
      subject:          lh.subject ?? '',
      salutation:       lh.salutation ?? '',
      body:             lh.body ?? '',
      closing:          lh.closing ?? '',
      signerName:       lh.signer_name ?? '',
      signerTitle:      lh.signer_title ?? '',
      footerLeft:       lh.footer_left ?? '',
      footerCenter:     lh.footer_center ?? '',
      footerRight:      lh.footer_right ?? '',
      date:             lh.date ?? '',
      refNumber:        lh.ref_number ?? '',
      showDate:         lh.show_date,
      showRef:          lh.show_ref,
      theme:            lh.theme,
      accentColor:      lh.accent_color,
      fontFamily:       lh.font_family ?? "var(--font-sans)",
      headerLayout:     lh.header_layout,
      watermark:        lh.watermark ?? '',
      showWatermark:    lh.show_watermark,
      watermarkColor:   lh.watermark_color,
      stamp:            lh.stamp ?? '',
      showTopBar:       lh.show_top_bar,
      showBottomBar:    lh.show_bottom_bar,
      showLogo:         lh.show_logo,
      showDivider:      lh.show_divider,
      showFooter:       lh.show_footer,
      showLineNumbers:  lh.show_line_numbers,
      paperSize:        lh.paper_size,
      orientation:      lh.orientation,
    }
  } catch {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen bg-gray-100">
    <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
  </div>

  <div v-else-if="notFound" class="flex flex-col items-center justify-center h-screen bg-gray-100">
    <p class="text-gray-700">{{ t('letterheads.notFound') }}</p>
    <button @click="$router.push({ name: 'letterheads' })" class="mt-4 text-green-700 text-sm hover:underline">
      {{ t('letterheads.back') }}
    </button>
  </div>

  <LetterheadEditor v-else mode="edit" :initial-data="initialData" />
</template>
