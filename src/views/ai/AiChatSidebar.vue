<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import type { IAiChatListItem } from '@/types/ai.types'

defineProps<{
  chats: IAiChatListItem[]
  currentId: string | null
  retentionDays: number
  hasMore?: boolean
  loadingMore?: boolean
  showClose?: boolean
}>()

const emit = defineEmits<{
  (e: 'new'): void
  (e: 'open', id: string): void
  (e: 'remove', id: string): void
  (e: 'loadMore'): void
  (e: 'close'): void
}>()

const { t } = useI18n()

// Compact relative time, e.g. "just now", "3h", "2d".
function ago(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return t('ai.history.now')
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-100 min-w-0">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-3 border-b border-gray-300">
      <span class="text-[12px] font-semibold text-gray-1000">{{ t('ai.history.title') }}</span>
      <button v-if="showClose" type="button" class="text-gray-700 hover:text-gray-1000" @click="emit('close')">
        <Icon icon="lucide:x" class="w-4 h-4" />
      </button>
    </div>

    <!-- New chat -->
    <div class="p-2">
      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-gray-1000 bg-gray-300 hover:bg-gray-400 rounded-lg py-2 transition"
        @click="emit('new')"
      >
        <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
        {{ t('ai.history.new') }}
      </button>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
      <p v-if="!chats.length" class="text-[11.5px] text-gray-700 text-center px-2 py-6">{{ t('ai.history.empty') }}</p>

      <div
        v-for="c in chats"
        :key="c.id"
        class="group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition"
        :class="c.id === currentId ? 'bg-green-700/10' : 'hover:bg-gray-300'"
        @click="emit('open', c.id)"
      >
        <Icon icon="lucide:message-square" class="w-3.5 h-3.5 flex-shrink-0" :class="c.id === currentId ? 'text-green-700' : 'text-gray-700'" />
        <span class="flex-1 min-w-0 truncate text-[12px]" :class="c.id === currentId ? 'text-gray-1000' : 'text-gray-900'">{{ c.title }}</span>
        <span class="text-[10px] text-gray-700 tabular-nums flex-shrink-0 group-hover:hidden">{{ ago(c.last_message_at) }}</span>
        <button
          type="button"
          class="hidden group-hover:flex text-gray-700 hover:text-red-400 flex-shrink-0"
          :title="t('ai.history.delete')"
          @click.stop="emit('remove', c.id)"
        >
          <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Load older chats -->
      <button
        v-if="hasMore"
        type="button"
        class="w-full inline-flex items-center justify-center gap-1.5 text-[11.5px] text-gray-700 hover:text-gray-1000 py-2 mt-1 transition"
        :disabled="loadingMore"
        @click="emit('loadMore')"
      >
        <Icon :icon="loadingMore ? 'lucide:loader-2' : 'lucide:chevron-down'" class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingMore }" />
        {{ t('ai.history.loadMore') }}
      </button>
    </div>

    <!-- Retention note -->
    <div class="px-3 py-2.5 border-t border-gray-300">
      <p class="text-[10px] text-gray-700 leading-snug">{{ t('ai.history.retention', { days: retentionDays }) }}</p>
    </div>
  </div>
</template>
