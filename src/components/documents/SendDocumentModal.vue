<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/notification.ts'
import { InvoiceService, type ISendDocumentResult } from '@/services/invoice.service'
import { ReceiptService } from '@/services/receipt.service'

export type SendKind = 'invoice' | 'reminder' | 'receipt'

const props = defineProps<{
  kind: SendKind
  doc: {
    id: string
    number: string
    to_email: string | null
    to_name: string | null
    from_name: string | null
    currency: string
    due_date?: string | null
  }
  /** Formatted amount shown in the default message (due for invoices, paid for receipts). */
  amount: string
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ sent: [result: ISendDocumentResult] }>()

const { t, locale } = useI18n()
const { notify } = useNotification()
const authStore = useAuthStore()
const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '')

const to      = ref('')
const subject = ref('')
const message = ref('')
const sending = ref(false)

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }) : ''

// Pre-fill in the sender's language each time the modal opens; everything stays editable.
watch(open, (isOpen) => {
  if (!isOpen) return
  const d = props.doc
  const vars = {
    number: d.number,
    org: d.from_name || authStore.getCurrentOrganization?.name || '',
    amount: props.amount,
    name: d.to_name || t('delivery.thereFallback'),
    due: fmtDate(d.due_date),
  }
  to.value      = d.to_email ?? ''
  subject.value = t(`delivery.${props.kind}.subject`, vars)
  message.value = t(d.due_date && props.kind !== 'receipt' ? `delivery.${props.kind}.bodyWithDue` : `delivery.${props.kind}.body`, vars)
    .replace(/[ \t]+,/, ',') // greeting without a name: "Hallo ," → "Hallo,"
}, { immediate: true })

async function send() {
  if (!to.value.trim()) return notify(t('delivery.validation.to'), 'error')
  sending.value = true
  try {
    const payload = { to: to.value.trim(), subject: subject.value.trim() || null, message: message.value.trim() || null }
    const res = props.kind === 'receipt'
      ? await ReceiptService.send(orgId.value, props.doc.id, payload)
      : props.kind === 'reminder'
        ? await InvoiceService.remind(orgId.value, props.doc.id, payload)
        : await InvoiceService.send(orgId.value, props.doc.id, payload)
    notify(t(`delivery.${props.kind}.sent`, { email: res.data.data.recipient }), 'success')
    emit('sent', res.data.data)
    open.value = false
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    notify(e.response?.data?.message ?? t('delivery.failed'), 'error')
  } finally {
    sending.value = false
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
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-green-700/10 flex items-center justify-center shrink-0">
                <Icon :icon="kind === 'reminder' ? 'lucide:bell-ring' : 'lucide:send'" class="w-4 h-4 text-green-700" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-1000">{{ t(`delivery.${kind}.title`) }}</h3>
                <p class="text-[11px] text-gray-700 font-mono">{{ doc.number }} · {{ amount }}</p>
              </div>
            </div>
            <button @click="open = false" class="p-1 rounded hover:bg-gray-400 text-gray-700 transition-colors" :aria-label="t('delivery.cancel')">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-3">
            <label class="block space-y-1.5">
              <span class="block text-[10px] uppercase tracking-wider text-gray-700">{{ t('delivery.to') }}</span>
              <input v-model="to" type="email" class="app-inp w-full text-sm" :placeholder="t('delivery.toPh')" />
              <span v-if="!doc.to_email" class="block text-[11px] text-amber-400">{{ t('delivery.noClientEmail') }}</span>
            </label>
            <label class="block space-y-1.5">
              <span class="block text-[10px] uppercase tracking-wider text-gray-700">{{ t('delivery.subject') }}</span>
              <input v-model="subject" type="text" maxlength="200" class="app-inp w-full text-sm" />
            </label>
            <label class="block space-y-1.5">
              <span class="block text-[10px] uppercase tracking-wider text-gray-700">{{ t('delivery.message') }}</span>
              <textarea v-model="message" rows="7" maxlength="5000" class="app-inp w-full text-sm resize-none leading-relaxed" />
            </label>
            <p class="flex items-start gap-1.5 text-[11px] text-gray-700">
              <Icon icon="lucide:link" class="w-3 h-3 mt-0.5 shrink-0" />
              {{ t(kind === 'receipt' ? 'delivery.linkNoteReceipt' : 'delivery.linkNoteInvoice') }}
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <button
              @click="open = false" :disabled="sending"
              class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors disabled:opacity-50"
            >{{ t('delivery.cancel') }}</button>
            <button
              @click="send" :disabled="sending"
              class="px-4 py-2 text-xs font-semibold bg-green-700 hover:bg-green-800 text-bg-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Icon :icon="sending ? 'lucide:loader-2' : 'lucide:send'" :class="['w-3 h-3', sending && 'animate-spin']" />
              {{ t(`delivery.${kind}.action`) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
