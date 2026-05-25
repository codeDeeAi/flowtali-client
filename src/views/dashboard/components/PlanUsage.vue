<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscription'

const router   = useRouter()
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
      label: 'Invoices/mo',
      limit: typeof f.invoices_per_month === 'number' ? f.invoices_per_month : null,
      limitLabel: limitLabel(f.invoices_per_month),
    },
    {
      label: 'Receipts/mo',
      limit: typeof f.receipts_per_month === 'number' ? f.receipts_per_month : null,
      limitLabel: limitLabel(f.receipts_per_month),
    },
    {
      label: 'Letterheads/mo',
      limit: typeof f.letterheads_per_month === 'number' ? f.letterheads_per_month : null,
      limitLabel: limitLabel(f.letterheads_per_month),
    },
    {
      label: 'Projects',
      limit: typeof f.projects_limit === 'number' ? f.projects_limit : null,
      limitLabel: limitLabel(f.projects_limit),
    },
    {
      label: 'Team Members',
      limit: typeof f.team_members === 'number' ? f.team_members : null,
      limitLabel: limitLabel(f.team_members),
    },
  ]
})

const showUpgrade = computed(() => subStore.isStarter)
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-cream">Plan Usage</h3>
      <span class="text-[10px] font-bold bg-amber/10 text-amber border border-amber/20 px-2 py-0.5 rounded-full">
        {{ planLabel }}
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div v-for="item in items" :key="item.label" class="flex items-center justify-between">
        <span class="text-xs text-cream-muted">{{ item.label }}</span>
        <span class="text-xs font-medium" :class="item.limit !== null ? 'text-amber' : 'text-cream-faint'">
          {{ item.limitLabel }}
        </span>
      </div>
    </div>

    <button v-if="showUpgrade"
      @click="router.push({ name: 'billing' })"
      class="mt-5 w-full py-2.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 text-sm font-semibold transition-colors">
      Upgrade Plan
    </button>
    <button v-else
      @click="router.push({ name: 'billing' })"
      class="mt-5 w-full py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted text-sm font-medium transition-colors">
      Manage Plan
    </button>
  </div>
</template>
