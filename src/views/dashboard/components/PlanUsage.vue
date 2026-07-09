<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubscriptionStore } from '@/stores/subscription'

const router   = useRouter()
const { t }    = useI18n()
const subStore = useSubscriptionStore()

const planLabel = computed(() => (subStore.planSlug ?? 'starter').toUpperCase())

const items = computed(() => {
  const f = subStore.subscription?.plan?.features ?? {}

  function limitLabel(val: number | boolean | null | undefined): string {
    if (val === null || val === undefined) return '∞'
    if (val === false) return '0'
    return String(val)
  }

  return [
    {
      label: t('dashboard.planUsage.invoicesPerMo'),
      limit: typeof f.invoices_per_month === 'number' ? f.invoices_per_month : null,
      limitLabel: limitLabel(f.invoices_per_month),
    },
    {
      label: t('dashboard.planUsage.receiptsPerMo'),
      limit: typeof f.receipts_per_month === 'number' ? f.receipts_per_month : null,
      limitLabel: limitLabel(f.receipts_per_month),
    },
    {
      label: t('dashboard.planUsage.letterheadsPerMo'),
      limit: typeof f.letterheads_per_month === 'number' ? f.letterheads_per_month : null,
      limitLabel: limitLabel(f.letterheads_per_month),
    },
    {
      label: t('dashboard.planUsage.projects'),
      limit: typeof f.projects_limit === 'number' ? f.projects_limit : null,
      limitLabel: limitLabel(f.projects_limit),
    },
    {
      label: t('dashboard.planUsage.teamMembers'),
      limit: typeof f.team_members === 'number' ? f.team_members : null,
      limitLabel: limitLabel(f.team_members),
    },
  ]
})

const showUpgrade = computed(() => subStore.isStarter)
</script>

<template>
  <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-1000">{{ t('dashboard.planUsage.title') }}</h3>
      <span class="text-[10px] font-bold bg-green-700/10 text-green-700 border border-green-700/20 px-2 py-0.5 rounded-full">
        {{ planLabel }}
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div v-for="item in items" :key="item.label" class="flex items-center justify-between">
        <span class="text-xs text-gray-900">{{ item.label }}</span>
        <span class="text-xs font-medium" :class="item.limit !== null ? 'text-green-700' : 'text-gray-700'">
          {{ item.limitLabel }}
        </span>
      </div>
    </div>

    <button v-if="showUpgrade"
      @click="router.push({ name: 'billing' })"
      class="mt-5 w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-bg-100 text-sm font-semibold transition-colors">
      {{ t('dashboard.planUsage.upgrade') }}
    </button>
    <button v-else
      @click="router.push({ name: 'billing' })"
      class="mt-5 w-full py-2.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 text-sm font-medium transition-colors">
      {{ t('dashboard.planUsage.manage') }}
    </button>
  </div>
</template>
