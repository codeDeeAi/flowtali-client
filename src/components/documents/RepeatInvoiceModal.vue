<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification.ts'
import { InvoiceService, type IInvoice, type RecurrenceFrequency } from '@/services/invoice.service'
import { addDaysIso, todayIso } from './quickDocument'

const props = defineProps<{ invoice: IInvoice }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ updated: [invoice: IInvoice] }>()

const { t } = useI18n()
const { notify } = useNotification()
const authStore = useAuthStore()
const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '')

const FREQUENCIES: RecurrenceFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly']

const frequency = ref<RecurrenceFrequency>('monthly')
const nextDate  = ref('')
const endsAt    = ref('')
const autoSend  = ref(false)
const saving    = ref<'save' | 'stop' | null>(null)

/** One cycle after `iso` (month maths clamps to the month's last day). */
function addCycle(iso: string, f: RecurrenceFrequency): string {
  if (f === 'weekly') return addDaysIso(iso, 7)
  const d = new Date(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + (f === 'monthly' ? 1 : f === 'quarterly' ? 3 : 12))
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return d.toISOString().slice(0, 10)
}

const suggestedNext = (f: RecurrenceFrequency) => {
  let next = addCycle(props.invoice.issue_date || todayIso(), f)
  while (next < todayIso()) next = addCycle(next, f)
  return next
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const r = props.invoice.recurrence
  frequency.value = r?.frequency ?? 'monthly'
  nextDate.value  = r?.next_issue_at ?? suggestedNext(frequency.value)
  endsAt.value    = r?.ends_at ?? ''
  autoSend.value  = r?.auto_send ?? !!props.invoice.to_email
}, { immediate: true })

// Picking another frequency re-suggests the date until the user sets one themselves.
watch(frequency, (f) => {
  if (!props.invoice.recurrence) nextDate.value = suggestedNext(f)
})

async function save(stop = false) {
  saving.value = stop ? 'stop' : 'save'
  try {
    const { data } = await InvoiceService.setRecurrence(orgId.value, props.invoice.id, stop
      ? { frequency: null }
      : { frequency: frequency.value, next_issue_at: nextDate.value || null, ends_at: endsAt.value || null, auto_send: autoSend.value })
    emit('updated', data.data)
    notify(stop ? t('recurring.stopped') : t('recurring.saved', { date: nextDate.value }), 'success')
    open.value = false
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    notify(e.response?.data?.message ?? t('recurring.failed'), 'error')
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="open = false"
      >
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-green-700/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:repeat" class="w-4 h-4 text-green-700" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">{{ t('recurring.title') }}</h3>
                <p class="text-[11px] text-gray-700">{{ t('recurring.subtitle', { number: invoice.number }) }}</p>
              </div>
            </div>
            <button @click="open = false" class="p-1 rounded hover:bg-gray-400 text-gray-700 transition-colors" :aria-label="t('delivery.cancel')">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="f in FREQUENCIES" :key="f" type="button" @click="frequency = f"
                :class="['text-xs px-2 py-2 rounded-lg border transition-colors',
                  frequency === f ? 'border-green-700 bg-green-700/10 text-gray-1000' : 'border-gray-500 text-gray-900 hover:border-gray-600']"
              >{{ t(`recurring.freq.${f}`) }}</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="space-y-1">
                <span class="block text-[10px] uppercase tracking-wider text-gray-700">{{ t('recurring.next') }}</span>
                <input v-model="nextDate" type="date" :min="todayIso()" class="app-inp w-full text-sm" />
              </label>
              <label class="space-y-1">
                <span class="block text-[10px] uppercase tracking-wider text-gray-700">{{ t('recurring.endsAt') }}</span>
                <input v-model="endsAt" type="date" :min="nextDate" class="app-inp w-full text-sm" />
              </label>
            </div>

            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input v-model="autoSend" type="checkbox" class="accent-green-700 mt-0.5" :disabled="!invoice.to_email" />
              <span>
                <span class="block text-sm text-gray-1000">{{ t('recurring.autoSend') }}</span>
                <span class="block text-[11px] text-gray-700">
                  {{ invoice.to_email ? t('recurring.autoSendHint', { email: invoice.to_email }) : t('recurring.autoSendNoEmail') }}
                </span>
              </span>
            </label>
          </div>

          <div class="flex items-center justify-between gap-2">
            <button
              v-if="invoice.recurrence" type="button" @click="save(true)" :disabled="!!saving"
              class="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            >{{ t('recurring.stop') }}</button>
            <span v-else />
            <button
              @click="save()" :disabled="!!saving || !nextDate"
              class="px-4 py-2 text-xs font-semibold bg-green-700 hover:bg-green-800 text-bg-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Icon :icon="saving === 'save' ? 'lucide:loader-2' : 'lucide:repeat'" :class="['w-3 h-3', saving === 'save' && 'animate-spin']" />
              {{ invoice.recurrence ? t('recurring.update') : t('recurring.start') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
