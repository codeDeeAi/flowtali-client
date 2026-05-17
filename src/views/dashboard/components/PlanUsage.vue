<script setup lang="ts">
interface UsageItem {
  label: string;
  used: number;
  total: number;
}

const items: UsageItem[] = [
  { label: 'Invoices',      used: 47,  total: 999 },
  { label: 'Letterheads',   used: 8,   total: 999 },
  { label: 'Team Members',  used: 3,   total: 10 },
  { label: 'Storage',       used: 2.1, total: 10 },
];

function percent(item: UsageItem) {
  return Math.min((item.used / item.total) * 100, 100);
}

function formatUsed(val: number) {
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-cream">Plan Usage</h3>
      <span class="text-[10px] font-bold bg-amber/10 text-amber border border-amber/20 px-2 py-0.5 rounded-full">
        PRO
      </span>
    </div>

    <!-- Usage items -->
    <div class="flex flex-col gap-3.5">
      <div v-for="item in items" :key="item.label">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-cream-muted">{{ item.label }}</span>
          <span class="text-xs text-cream-faint">
            {{ formatUsed(item.used) }}/{{ item.total }}
          </span>
        </div>
        <div class="h-1 bg-charcoal-600 rounded-full overflow-hidden">
          <div
            class="h-full bg-amber rounded-full transition-all duration-700"
            :style="{ width: `${percent(item)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Upgrade button -->
    <button class="mt-5 w-full py-2.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 text-sm font-semibold transition-colors">
      Upgrade Plan
    </button>
  </div>
</template>
