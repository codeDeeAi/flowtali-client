<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import type { IAiPendingAction } from '@/types/ai.types'

const props = defineProps<{
  action: IAiPendingAction | null
  busy: boolean
  queueIndex: number
  queueTotal: number
}>()

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()

const { t, te } = useI18n()

const ICONS: Record<string, string> = {
  add_client: 'lucide:user-plus',
  create_invoice_draft: 'lucide:file-plus-2',
  create_receipt_from_invoice: 'lucide:receipt',
  create_receipt: 'lucide:receipt',
  cancel_invitation: 'lucide:user-round-x',
  create_invoice_share_link: 'lucide:link',
  update_invoice_status: 'lucide:refresh-cw',
  update_invoice: 'lucide:file-pen',
  update_client: 'lucide:user-cog',
  create_project: 'lucide:folder-plus',
  update_project: 'lucide:folder-cog',
  create_letterhead: 'lucide:file-text',
  invite_team_member: 'lucide:user-round-plus',
  create_receipt_share_link: 'lucide:link',
  create_letterhead_share_link: 'lucide:link',
  revoke_invoice_share_link: 'lucide:link-2-off',
  link_invoice_to_project: 'lucide:folder-symlink',
  send_payment_reminder: 'lucide:mail',
  delete_invoice: 'lucide:trash-2',
  delete_receipt: 'lucide:trash-2',
  delete_client: 'lucide:trash-2',
  delete_project: 'lucide:trash-2',
  delete_letterhead: 'lucide:trash-2',
}

const name = computed(() => props.action?.name ?? '')
const isDestructive = computed(() => name.value.startsWith('delete_'))

const icon = computed(() => (props.action ? ICONS[name.value] ?? 'lucide:sparkles' : 'lucide:sparkles'))

const title = computed(() => {
  const key = `ai.confirm.actions.${name.value}`
  return props.action ? (te(key) ? t(key) : name.value) : ''
})

// A caution line keyed to the action's consequence (null = none).
const warning = computed(() => {
  if (!props.action) return null
  if (isDestructive.value) return t('ai.confirm.warnings.delete')
  if (name.value === 'send_payment_reminder') return t('ai.confirm.warnings.send')
  if (name.value === 'update_invoice_status' && props.action.args?.status === 'paid') {
    return t('ai.confirm.revenueWarning')
  }
  return null
})

// Flatten args into readable rows. Arrays (e.g. invoice items) get their own list.
const rows = computed(() => {
  if (!props.action) return []
  return Object.entries(props.action.args)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: humanize(k), value: v, isList: Array.isArray(v) }))
})

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function itemLine(item: unknown): string {
  const i = item as { description?: string; qty?: number; rate?: number }
  const qty = i.qty ?? 1
  const rate = i.rate ?? 0
  return `${qty} × ${rate} — ${i.description ?? ''}`.trim()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="action"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="!busy && emit('cancel')"
      >
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <!-- Header -->
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-lg bg-green-700/10 border border-green-700/20 flex items-center justify-center flex-shrink-0">
              <Icon :icon="icon" class="w-4 h-4 text-green-700" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('ai.confirm.title') }}</h3>
              <p class="text-[12px] text-gray-700 mt-0.5">{{ title }}</p>
            </div>
            <span v-if="queueTotal > 1" class="ml-auto text-[10px] text-gray-700 font-mono">
              {{ queueIndex + 1 }}/{{ queueTotal }}
            </span>
          </div>

          <!-- Details -->
          <div class="rounded-xl border border-gray-400 bg-gray-100 divide-y divide-gray-400/60 mb-4">
            <template v-for="row in rows" :key="row.key">
              <div v-if="!row.isList" class="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <span class="text-[11px] text-gray-700">{{ row.key }}</span>
                <span class="text-[12px] text-gray-1000 text-right break-words">{{ row.value }}</span>
              </div>
              <div v-else class="px-3.5 py-2.5">
                <div class="text-[11px] text-gray-700 mb-1.5">{{ row.key }}</div>
                <ul class="space-y-1">
                  <li v-for="(item, idx) in (row.value as unknown[])" :key="idx" class="text-[12px] text-gray-1000 font-mono">
                    {{ itemLine(item) }}
                  </li>
                </ul>
              </div>
            </template>
          </div>

          <!-- Consequence note -->
          <div v-if="warning" class="flex items-start gap-2 rounded-lg p-2.5 mb-4"
               :class="isDestructive ? 'bg-red-500/5 border border-red-500/25' : 'bg-amber-500/5 border border-amber-500/25'">
            <Icon icon="lucide:alert-triangle" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" :class="isDestructive ? 'text-red-400' : 'text-amber-500'" />
            <p class="text-[11px] text-gray-900">{{ warning }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 justify-end">
            <button type="button" class="btn-ghost text-[13px] px-4 py-2" :disabled="busy" @click="emit('cancel')">
              {{ t('ai.confirm.cancel') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 text-[13px] px-4 py-2"
              :class="isDestructive ? 'btn-error' : 'btn-primary'"
              :disabled="busy"
              @click="emit('confirm')"
            >
              <Icon v-if="busy" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              <Icon v-else :icon="isDestructive ? 'lucide:trash-2' : 'lucide:check'" class="w-3.5 h-3.5" />
              {{ busy ? t('ai.confirm.running') : (isDestructive ? t('ai.confirm.delete') : t('ai.confirm.confirm')) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
