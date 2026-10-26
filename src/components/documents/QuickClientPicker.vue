<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import type { QuickClient } from './quickDocument'

interface SavedClient {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
}

const props = defineProps<{ clients: SavedClient[]; canSaveClient: boolean }>()
const client     = defineModel<QuickClient>({ required: true })
const saveClient = defineModel<boolean>('saveClient', { default: true })

const { t } = useI18n()
const open = ref(false)

const matches = computed(() => {
  const q = client.value.name.trim().toLowerCase()
  const list = q
    ? props.clients.filter(c => [c.name, c.company, c.email].some(v => v?.toLowerCase().includes(q)))
    : props.clients
  return list.slice(0, 6)
})

const isNew = computed(() => !client.value.clientId && client.value.name.trim().length > 0)

function pick(c: SavedClient) {
  client.value = {
    clientId: c.id,
    name:     c.name,
    company:  c.company ?? '',
    email:    c.email ?? '',
    phone:    c.phone ?? '',
    address:  c.address ?? '',
  }
  open.value = false
}

function onNameInput(value: string) {
  // Typing over a picked client starts a new one.
  client.value = { ...client.value, name: value, clientId: null }
  open.value = true
}

function clear() {
  client.value = { clientId: null, name: '', company: '', email: '', phone: '', address: '' }
}

// Delay so a click on a suggestion lands before the list closes.
const close = () => setTimeout(() => { open.value = false }, 150)
</script>

<template>
  <div class="space-y-2">
    <div class="relative">
      <Icon icon="lucide:search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" />
      <input
        :value="client.name"
        @input="onNameInput(($event.target as HTMLInputElement).value)"
        @focus="open = true"
        @blur="close"
        type="text"
        autocomplete="off"
        class="app-inp w-full text-sm pl-8 pr-8"
        :placeholder="t('quickCreate.client.searchPh')"
      />
      <button v-if="client.name" type="button" @click="clear" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-1000">
        <Icon icon="lucide:x" class="w-3.5 h-3.5" />
      </button>

      <div
        v-if="open && matches.length"
        class="absolute z-30 mt-1 w-full bg-gray-100 border border-gray-500 rounded-lg shadow-lg overflow-hidden"
      >
        <button
          v-for="c in matches" :key="c.id" type="button"
          @mousedown.prevent="pick(c)"
          class="w-full text-left px-3 py-2 hover:bg-gray-300 transition-colors flex items-center justify-between gap-2"
        >
          <span class="min-w-0">
            <span class="block text-sm text-gray-1000 truncate">{{ c.name }}</span>
            <span class="block text-[11px] text-gray-700 truncate">{{ [c.company, c.email].filter(Boolean).join(' · ') }}</span>
          </span>
          <Icon v-if="client.clientId === c.id" icon="lucide:check" class="w-3.5 h-3.5 text-green-700 shrink-0" />
        </button>
      </div>
    </div>

    <div v-if="client.clientId" class="flex items-center gap-1.5 text-[11px] text-gray-700">
      <Icon icon="lucide:user-check" class="w-3 h-3 text-green-700" />
      {{ [client.company, client.email].filter(Boolean).join(' · ') || t('quickCreate.client.saved') }}
    </div>

    <!-- New client: just the essentials -->
    <div v-else-if="isNew" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <input v-model="client.email" type="email" class="app-inp text-sm" :placeholder="t('quickCreate.client.emailPh')" />
      <input v-model="client.company" type="text" class="app-inp text-sm" :placeholder="t('quickCreate.client.companyPh')" />
      <label v-if="canSaveClient" class="sm:col-span-2 flex items-center gap-2 text-xs text-gray-900 cursor-pointer select-none">
        <input v-model="saveClient" type="checkbox" class="accent-green-700" />
        {{ t('quickCreate.client.saveNew') }}
      </label>
    </div>
  </div>
</template>
