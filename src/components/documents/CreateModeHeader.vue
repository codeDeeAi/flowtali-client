<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import type { CreateMode } from '@/composables/useCreateMode'

defineProps<{ title: string; subtitle: string; backRoute: string }>()
const mode = defineModel<CreateMode>({ required: true })

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div class="flex items-start gap-3">
      <button
        type="button" @click="router.push({ name: backRoute })"
        class="mt-1 p-1.5 rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-300 transition-colors"
        :aria-label="t('quickCreate.back')"
      >
        <Icon icon="lucide:arrow-left" class="w-4 h-4" />
      </button>
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div role="tablist" class="inline-flex p-1 bg-gray-200 border border-gray-400 rounded-lg self-start sm:self-auto">
      <button
        v-for="opt in (['quick', 'full'] as const)" :key="opt"
        role="tab" :aria-selected="mode === opt" type="button"
        @click="mode = opt"
        :class="['flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors',
          mode === opt ? 'bg-gray-100 text-gray-1000 shadow-sm' : 'text-gray-900 hover:text-gray-1000']"
      >
        <Icon :icon="opt === 'quick' ? 'lucide:zap' : 'lucide:palette'" class="w-3.5 h-3.5" />
        {{ t(`quickCreate.mode.${opt}`) }}
      </button>
    </div>
  </div>
</template>
