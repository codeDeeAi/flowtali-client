<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { usePermissions } from '@/composables/usePermissions';
import { AnalyticsService, type IAnalyticsData } from '@/services/analytics.service';
import StatCard from './components/StatCard.vue';
import RevenueChart from './components/RevenueChart.vue';
import RecentInvoices from './components/RecentInvoices.vue';
import RecentReceipts from './components/RecentReceipts.vue';
import InvoiceStatusChart from './components/InvoiceStatusChart.vue';
import QuickActions from './components/QuickActions.vue';
import PlanUsage from './components/PlanUsage.vue';

const router    = useRouter()
const { t }     = useI18n()
const authStore = useAuthStore()
const { can }   = usePermissions()

const hour = new Date().getHours();
const greeting = computed(() =>
  hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')
);

const userName  = computed(() => authStore.getUser?.first_name ?? t('dashboard.defaultName'))
const orgName   = computed(() => authStore.getCurrentOrganization?.name ?? t('dashboard.defaultOrg'))

const analytics  = ref<IAnalyticsData | null>(null)
const isLoading  = ref(true)

function fmt(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}K`
  return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const stats = computed(() => {
  const k = analytics.value?.kpis

  const all = [
    {
      title: t('dashboard.stats.totalRevenue'),
      value: k ? fmt(k.total_revenue.value) : '—',
      change: k?.total_revenue.change_pct ?? 0,
      icon: 'lucide:dollar-sign',
      color: 'amber' as const,
      progress: k ? Math.min(Math.round((k.total_revenue.value / Math.max(k.total_revenue.value + k.outstanding.value, 1)) * 100), 100) : 0,
      permission: 'dashboard.revenue.read',
    },
    {
      title: t('dashboard.stats.outstanding'),
      value: k ? fmt(k.outstanding.value) : '—',
      change: k?.outstanding.change_pct ?? 0,
      icon: 'lucide:clock',
      color: 'red' as const,
      progress: k ? Math.min(Math.round((k.outstanding.value / Math.max(k.total_revenue.value + k.outstanding.value, 1)) * 100), 100) : 0,
      permission: 'dashboard.revenue.read',
    },
    {
      title: t('dashboard.stats.invoicesSent'),
      value: k ? String(k.total_invoices.value) : '—',
      change: k?.total_invoices.change_pct ?? 0,
      icon: 'lucide:send',
      color: 'blue' as const,
      progress: k ? Math.min(k.total_invoices.value, 100) : 0,
      permission: 'dashboard.invoices.read',
    },
    {
      title: t('dashboard.stats.collectionRate'),
      value: k ? `${k.collection_rate.value}%` : '—',
      change: k?.collection_rate.change_pct ?? 0,
      icon: 'lucide:trending-up',
      color: 'green' as const,
      progress: k ? Math.min(Math.round(k.collection_rate.value), 100) : 0,
      permission: 'dashboard.revenue.read',
    },
    {
      title: t('dashboard.stats.receiptsIssued'),
      value: analytics.value ? String(analytics.value.receipt_stats?.total ?? 0) : '—',
      change: 0,
      icon: 'lucide:receipt',
      color: 'blue' as const,
      progress: analytics.value ? Math.min(analytics.value.receipt_stats?.total ?? 0, 100) : 0,
      permission: 'dashboard.invoices.read',
    },
  ]

  return all.filter(s => can(s.permission))
})

// Count visible stats before data loads so the skeleton shows the right number of cards.
const visibleStatCount = computed(() => {
  let n = 0
  if (can('dashboard.revenue.read'))  n += 3  // Total Revenue, Outstanding, Collection Rate
  if (can('dashboard.invoices.read')) n += 2  // Invoices Sent, Receipts Issued
  return n
})

onMounted(async () => {
  const orgId = authStore.getCurrentOrganization?.id
  if (!orgId) { isLoading.value = false; return }
  try {
    const res = await AnalyticsService.get(orgId, '30d')
    analytics.value = res.data.data
  } catch {
    // analytics fails gracefully — cards show '—'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-1000">
          {{ greeting }}, {{ userName }} 👋
        </h1>
        <p class="text-sm text-gray-900 mt-1">
          {{ t('dashboard.subtitle', { org: orgName }) }}
        </p>
      </div>
      <div v-if="can('invoices.read')" class="flex items-center gap-2 shrink-0">
        <button
          class="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          @click="router.push({ name: 'invoices.create' })"
        >
          <Icon icon="lucide:plus" class="w-4 h-4" />
          <span>{{ t('dashboard.newInvoice') }}</span>
        </button>
      </div>
    </div>

    <!-- Stats grid -->
    <div v-if="visibleStatCount > 0" class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <template v-if="isLoading">
        <StatCard
          v-for="n in visibleStatCount"
          :key="n"
          title="" value="" :change="0" icon="lucide:loader" color="amber" :progress="0"
          :loading="true"
        />
      </template>
      <template v-else>
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          v-bind="stat"
          :loading="false"
        />
      </template>
    </div>

    <!-- Main content grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

      <!-- Left column (2/3) -->
      <div class="xl:col-span-2 flex flex-col gap-4">
        <RevenueChart
          v-if="can('dashboard.revenue.read')"
          :trend-data="analytics?.revenue_trend"
          :loading="isLoading"
        />
        <RecentInvoices v-if="can('dashboard.invoices.read')" />
        <RecentReceipts v-if="can('dashboard.invoices.read')" />
      </div>

      <!-- Right column (1/3) -->
      <div class="flex flex-col gap-4">
        <InvoiceStatusChart
          v-if="can('dashboard.invoices.read')"
          :breakdown="analytics?.status_breakdown"
          :loading="isLoading"
        />
        <QuickActions />
        <PlanUsage />
      </div>

    </div>
  </div>
</template>
