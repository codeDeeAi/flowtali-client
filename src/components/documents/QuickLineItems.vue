<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import type { QuickLineItem } from './quickDocument'

defineProps<{ symbol: string }>()
const items = defineModel<QuickLineItem[]>({ required: true })

const { t, locale } = useI18n()
let nextId = 1000

const add = () => items.value.push({ id: nextId++, description: '', qty: 1, rate: 0 })
const remove = (id: number) => {
  if (items.value.length > 1) items.value = items.value.filter(i => i.id !== id)
}
const lineTotal = (i: QuickLineItem) =>
  ((Number(i.qty) || 0) * (Number(i.rate) || 0)).toLocaleString(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>

<template>
  <div class="space-y-2">
    <div class="hidden sm:grid grid-cols-[1fr_4.5rem_6.5rem_5.5rem_1.5rem] gap-2 text-[10px] uppercase tracking-wider text-gray-700 px-0.5">
      <span>{{ t('quickCreate.items.description') }}</span>
      <span>{{ t('quickCreate.items.qty') }}</span>
      <span>{{ t('quickCreate.items.rate') }}</span>
      <span class="text-right">{{ t('quickCreate.items.amount') }}</span>
      <span></span>
    </div>

    <div
      v-for="(item, i) in items" :key="item.id"
      class="grid grid-cols-[1fr_1.5rem] sm:grid-cols-[1fr_4.5rem_6.5rem_5.5rem_1.5rem] gap-2 items-center p-2 sm:p-0 border sm:border-0 border-gray-400 rounded-lg"
    >
      <input
        v-model="item.description"
        type="text"
        class="app-inp text-sm"
        :placeholder="t('quickCreate.items.descriptionPh', { n: i + 1 })"
      />
      <button
        type="button" @click="remove(item.id)" :disabled="items.length === 1"
        class="sm:hidden text-gray-700 hover:text-red-400 disabled:opacity-30 justify-self-center"
      >
        <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
      </button>
      <div class="col-span-2 sm:contents grid grid-cols-3 gap-2">
        <input v-model.number="item.qty" type="number" min="0" step="any" class="app-inp text-sm" :aria-label="t('quickCreate.items.qty')" />
        <input v-model.number="item.rate" type="number" min="0" step="any" class="app-inp text-sm" :aria-label="t('quickCreate.items.rate')" />
        <span class="text-sm text-gray-1000 text-right font-mono self-center truncate">{{ symbol }}{{ lineTotal(item) }}</span>
      </div>
      <button
        type="button" @click="remove(item.id)" :disabled="items.length === 1"
        class="hidden sm:block text-gray-700 hover:text-red-400 disabled:opacity-30 justify-self-center"
      >
        <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
      </button>
    </div>

    <button
      type="button" @click="add"
      class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 px-2 py-1.5 rounded-md hover:bg-gray-300 transition-colors"
    >
      <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('quickCreate.items.add') }}
    </button>
  </div>
</template>
