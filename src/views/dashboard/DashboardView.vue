<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatCard from './components/StatCard.vue';
import RevenueChart from './components/RevenueChart.vue';
import RecentInvoices from './components/RecentInvoices.vue';
import InvoiceStatusChart from './components/InvoiceStatusChart.vue';
import QuickActions from './components/QuickActions.vue';
import PlanUsage from './components/PlanUsage.vue';

const hour = new Date().getHours();
const greeting = computed(() =>
  hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
);

const stats = [
  { title: 'Total Revenue',   value: '$48,200', change: 12,  icon: 'lucide:dollar-sign',  color: 'amber' as const, progress: 68 },
  { title: 'Outstanding',     value: '$12,350', change: -3,  icon: 'lucide:clock',         color: 'red'   as const, progress: 35 },
  { title: 'Invoices Sent',   value: '47',      change: 8,   icon: 'lucide:send',          color: 'blue'  as const, progress: 52 },
  { title: 'Active Clients',  value: '18',      change: 22,  icon: 'lucide:users',         color: 'green' as const, progress: 80 },
];
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-cream">
          {{ greeting }}, Ada 👋
        </h1>
        <p class="text-sm text-cream-muted mt-1">
          Here's what's happening with Acme Design Studio today
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 hover:border-charcoal-500 text-cream-muted hover:text-cream text-sm px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:calendar" class="w-4 h-4" />
          <span>This Month</span>
        </button>
        <button class="flex items-center gap-1.5 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:plus" class="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        v-for="stat in stats"
        :key="stat.title"
        v-bind="stat"
      />
    </div>

    <!-- Main content grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

      <!-- Left column (2/3) -->
      <div class="xl:col-span-2 flex flex-col gap-4">
        <RevenueChart />
        <RecentInvoices />
      </div>

      <!-- Right column (1/3) -->
      <div class="flex flex-col gap-4">
        <InvoiceStatusChart />
        <QuickActions />
        <PlanUsage />
      </div>

    </div>
  </div>
</template>
