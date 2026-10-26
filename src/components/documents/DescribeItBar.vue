<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification.ts'
import { AiService, type IAiParsedDocument } from '@/services/ai.service'

const props = defineProps<{ kind: 'invoice' | 'receipt' }>()
const emit  = defineEmits<{ parsed: [doc: IAiParsedDocument] }>()

const { t, locale } = useI18n()
const { notify } = useNotification()
const authStore = useAuthStore()
const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '')

// Only offered when the org has connected an AI provider.
const available = ref(false)
const text      = ref('')
const busy      = ref(false)

onMounted(async () => {
  if (!orgId.value) return
  try {
    const { data } = await AiService.status(orgId.value)
    available.value = data.data.configured
  } catch {
    available.value = false
  }
})

async function fill() {
  if (!text.value.trim() || busy.value) return
  busy.value = true
  try {
    const { data } = await AiService.parseDocument(orgId.value, { text: text.value.trim(), kind: props.kind, language: locale.value })
    const doc = data.data.document
    if (!doc.items.length && !doc.client.name) {
      notify(t('quickCreate.describe.nothing'), 'warning')
      return
    }
    emit('parsed', doc)
    notify(t('quickCreate.describe.filled'), 'success')
    text.value = ''
  } catch (e) {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    if (err.response?.status === 409) available.value = false
    notify(err.response?.data?.message ?? t('quickCreate.describe.failed'), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="available" class="flex items-start gap-2 p-3 rounded-xl border border-green-700/30 bg-green-700/5">
    <Icon icon="lucide:sparkles" class="w-4 h-4 text-green-700 mt-2 shrink-0" />
    <textarea
      v-model="text"
      rows="1"
      maxlength="2000"
      class="flex-1 min-w-0 bg-transparent text-sm text-gray-1000 placeholder-gray-700 resize-none focus:outline-none py-1.5 field-sizing-content max-h-32"
      :placeholder="t(`quickCreate.describe.${kind}Ph`)"
      :aria-label="t('quickCreate.describe.label')"
      @keydown.enter.exact.prevent="fill"
    />
    <button
      type="button" @click="fill" :disabled="busy || !text.trim()"
      class="flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-bg-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
    >
      <Icon :icon="busy ? 'lucide:loader-2' : 'lucide:wand-2'" :class="['w-3.5 h-3.5', busy && 'animate-spin']" />
      {{ t('quickCreate.describe.fill') }}
    </button>
  </div>
</template>
