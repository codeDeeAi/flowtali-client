<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { AnalyticsService, type IAnalyticsData } from '@/services/analytics.service'

const router    = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const subStore  = useSubscriptionStore()
const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')
const canAccess = computed(() => subStore.isBusiness)

const periods = computed(() => [
  { label: t('analytics.periods.30d'), value: '30d'  },
  { label: t('analytics.periods.3m'),  value: '3m'   },
  { label: t('analytics.periods.12m'), value: '12m'  },
  { label: t('analytics.periods.all'), value: 'all'  },
])
const period    = ref('30d')
const isLoading = ref(false)
const data      = ref<IAnalyticsData | null>(null)

async function load() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await AnalyticsService.get(orgId.value, period.value)
    data.value = res.data.data
  } catch {
    // non-critical
  } finally {
    isLoading.value = false
  }
}

watch(period, () => load())
onMounted(() => load())

// ─── KPI formatting ───────────────────────────────────────────────────────────

function fmtCurrency(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmtChange(pct: number | null, isAll: boolean): string {
  if (isAll || pct === null) return ''
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct}%`
}

function changePositive(pct: number | null): boolean {
  return pct !== null && pct >= 0
}

const isAll = computed(() => period.value === 'all')

const kpiCards = computed(() => {
  const k = data.value?.kpis
  if (!k) return []
  return [
    {
      label: t('analytics.kpi.totalRevenue'),
      value: fmtCurrency(k.total_revenue.value),
      change: fmtChange(k.total_revenue.change_pct, isAll.value),
      positive: changePositive(k.total_revenue.change_pct),
      icon: 'lucide:dollar-sign',
    },
    {
      label: t('analytics.kpi.avgInvoiceValue'),
      value: fmtCurrency(k.avg_invoice_value.value),
      change: fmtChange(k.avg_invoice_value.change_pct, isAll.value),
      positive: changePositive(k.avg_invoice_value.change_pct),
      icon: 'lucide:trending-up',
    },
    {
      label: t('analytics.kpi.collectionRate'),
      value: `${k.collection_rate.value}%`,
      change: fmtChange(k.collection_rate.change_pct, isAll.value),
      positive: changePositive(k.collection_rate.change_pct),
      icon: 'lucide:percent',
    },
    {
      label: t('analytics.kpi.avgDaysToPay'),
      value: t('analytics.kpi.daysValue', { n: k.avg_days_to_pay.value }),
      change: fmtChange(k.avg_days_to_pay.change_pct, isAll.value),
      positive: !changePositive(k.avg_days_to_pay.change_pct), // fewer days = better
      icon: 'lucide:clock',
    },
  ]
})

// ─── Top clients ──────────────────────────────────────────────────────────────

const clientColors = ['#00c853', '#60a5fa', '#4ade80', '#a78bfa', '#f87171', '#38bdf8', '#fb923c', '#f472b6']

const topClients = computed(() => {
  const clients = data.value?.top_clients ?? []
  const maxRev  = clients[0]?.revenue ?? 0
  return clients.map((c, i) => ({
    name:    c.name,
    revenue: fmtCurrency(c.revenue),
    pct:     maxRev > 0 ? Math.round((c.revenue / maxRev) * 100) : 0,
    color:   clientColors[i % clientColors.length],
  }))
})

// ─── Revenue trend line chart ─────────────────────────────────────────────────

const chartW = 540
const chartH = 160

const trendMax = computed(() => {
  const vals = (data.value?.revenue_trend ?? []).flatMap(d => [d.billed, d.collected])
  return Math.max(...vals, 1)
})

function trendPolyline(key: 'billed' | 'collected'): string {
  const trend = data.value?.revenue_trend ?? []
  if (trend.length === 0) return `0,${chartH} ${chartW},${chartH}`
  const n     = trend.length
  const xStep = n > 1 ? chartW / (n - 1) : chartW / 2
  return trend.map((d, i) => {
    const x = Math.round(i * xStep)
    const y = Math.round(chartH - (d[key] / trendMax.value) * (chartH - 16) - 4)
    return `${x},${y}`
  }).join(' ')
}

const billedPolyline    = computed(() => trendPolyline('billed'))
const collectedPolyline = computed(() => trendPolyline('collected'))

// month labels for the trend chart — skip if too dense
const trendLabels = computed(() => {
  const trend = data.value?.revenue_trend ?? []
  const n     = trend.length
  if (n === 0) return []
  const step  = n > 1 ? chartW / (n - 1) : chartW / 2
  const skip  = Math.ceil(n / 12)
  return trend
    .map((d, i) => ({ label: d.month, x: Math.round(i * step), show: i % skip === 0 }))
    .filter(l => l.show)
})

const trendGridLines = [40, 80, 120, 160]

// ─── Monthly volume bar chart ─────────────────────────────────────────────────

const barChartW = 580
const barChartH = 130

const volumeMax = computed(() => {
  const counts = (data.value?.monthly_volume ?? []).map(d => d.count)
  return Math.max(...counts, 1)
})

const volumeBars = computed(() => {
  const vol = data.value?.monthly_volume ?? []
  const n   = vol.length
  if (n === 0) return []
  const spacing = barChartW / n
  const bw      = Math.min(38, spacing * 0.6)
  const skip    = Math.ceil(n / 12)
  return vol.map((d, i) => ({
    x:     Math.round(i * spacing + (spacing - bw) / 2),
    y:     Math.round(barChartH - (d.count / volumeMax.value) * (barChartH - 10)),
    w:     bw,
    h:     Math.round((d.count / volumeMax.value) * (barChartH - 10)),
    label: d.month,
    lx:    Math.round(i * spacing + spacing / 2),
    showLabel: i % skip === 0,
  }))
})

const barGridLines = [26, 52, 78, 104, 130]

// ─── Monthly receipt volume bar chart ────────────────────────────────────────

const receiptVolumeMax = computed(() => {
  const counts = (data.value?.monthly_receipt_volume ?? []).map(d => d.count)
  return Math.max(...counts, 0)
})

const receiptVolumeBars = computed(() => {
  const vol = data.value?.monthly_receipt_volume ?? []
  const n   = vol.length
  if (n === 0) return []
  const spacing = barChartW / n
  const bw      = Math.min(38, spacing * 0.6)
  const max     = Math.max(receiptVolumeMax.value, 1)
  const skip    = Math.ceil(n / 12)
  return vol.map((d, i) => ({
    x:         Math.round(i * spacing + (spacing - bw) / 2),
    y:         Math.round(barChartH - (d.count / max) * (barChartH - 10)),
    w:         bw,
    h:         Math.round((d.count / max) * (barChartH - 10)),
    label:     d.month,
    lx:        Math.round(i * spacing + spacing / 2),
    showLabel: i % skip === 0,
  }))
})
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">{{ t('analytics.title') }}</h1>
        <p class="page-subtitle">{{ t('analytics.subtitle') }}</p>
      </div>
      <select v-model="period" class="app-select text-xs py-2 w-44 self-start sm:self-auto" :disabled="!canAccess">
        <option v-for="p in periods" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
    </div>

    <!-- Upgrade wall -->
    <div v-if="!canAccess" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-14 h-14 rounded-2xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-5">
        <Icon icon="lucide:bar-chart-2" class="w-7 h-7 text-green-700" />
      </div>
      <h2 class="text-xl font-semibold text-gray-1000 mb-2">{{ t('analytics.upgrade.title') }}</h2>
      <p class="text-gray-900 text-sm max-w-sm mb-6">{{ t('analytics.upgrade.desc') }}</p>
      <button @click="router.push({ name: 'billing' })"
        class="px-6 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-bg-100 text-sm font-semibold transition-colors">
        {{ t('analytics.upgrade.cta') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="flex items-center justify-center py-20">
      <Icon icon="lucide:loader-2" class="w-7 h-7 text-green-700 animate-spin" />
    </div>

    <template v-else-if="data">

      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="bg-gray-200 border border-gray-400 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="w-8 h-8 rounded-lg bg-green-700/10 flex items-center justify-center">
              <Icon :icon="kpi.icon" class="w-4 h-4 text-green-700" />
            </div>
            <span v-if="kpi.change" :class="['text-xs font-semibold', kpi.positive ? 'text-green-400' : 'text-red-400']">
              {{ kpi.change }}
            </span>
          </div>
          <div class="font-sans text-2xl font-semibold text-gray-1000">{{ kpi.value }}</div>
          <div class="text-xs text-gray-700 mt-1">{{ kpi.label }}</div>
          <div v-if="!isAll" class="text-[10px] text-gray-700/60 mt-0.5">{{ t('analytics.kpi.vsLastPeriod') }}</div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

        <!-- Revenue trend (line chart) -->
        <div class="xl:col-span-2 bg-gray-200 border border-gray-400 rounded-xl p-5">
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-1000">{{ t('analytics.revenueTrend.title') }}</h3>
            <p class="text-xs text-gray-700 mt-0.5">{{ t('analytics.revenueTrend.subtitle') }}</p>
          </div>
          <svg :viewBox="`0 0 ${chartW} ${chartH + 20}`" class="w-full" style="height: 180px;">
            <defs>
              <linearGradient id="areaAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#00c853" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#00c853" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4ade80" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#4ade80" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <line v-for="y in trendGridLines" :key="y" x1="0" :y1="y" :x2="chartW" :y2="y" stroke="#292929" stroke-width="1"/>
            <polygon :points="`0,${chartH} ${billedPolyline} ${chartW},${chartH}`" fill="url(#areaAmber)"/>
            <polygon :points="`0,${chartH} ${collectedPolyline} ${chartW},${chartH}`" fill="url(#areaGreen)"/>
            <polyline :points="billedPolyline"    fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <polyline :points="collectedPolyline" fill="none" stroke="#4ade80" stroke-width="2" stroke-linejoin="round"/>
            <text v-for="lbl in trendLabels" :key="lbl.x" :x="lbl.x" :y="chartH + 16" text-anchor="middle" fill="#a0a0a0" font-size="9" font-family="Geist Sans">{{ lbl.label }}</text>
          </svg>
          <div class="flex items-center gap-4 mt-2">
            <div class="flex items-center gap-1.5 text-xs text-gray-900"><div class="w-3 h-0.5 bg-green-700 rounded"></div>{{ t('analytics.revenueTrend.billed') }}</div>
            <div class="flex items-center gap-1.5 text-xs text-gray-900"><div class="w-3 h-0.5 bg-green-400 rounded"></div>{{ t('analytics.revenueTrend.collected') }}</div>
          </div>
        </div>

        <!-- Top clients -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-1000 mb-1">{{ t('analytics.topClients.title') }}</h3>
          <p class="text-xs text-gray-700 mb-5">{{ t('analytics.topClients.subtitle') }}</p>
          <div v-if="topClients.length > 0" class="space-y-4">
            <div v-for="client in topClients" :key="client.name">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-gray-900 truncate max-w-[140px]">{{ client.name }}</span>
                <span class="text-xs font-mono font-medium text-gray-1000 shrink-0 ml-2">{{ client.revenue }}</span>
              </div>
              <div class="h-1.5 bg-gray-400 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" :style="{ width: `${client.pct}%`, backgroundColor: client.color }" />
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-700/60 mt-4">{{ t('analytics.topClients.empty') }}</p>
        </div>
      </div>

      <!-- Bar chart – Monthly invoice volume -->
      <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
        <h3 class="text-sm font-semibold text-gray-1000 mb-1">{{ t('analytics.invoiceVolume.title') }}</h3>
        <p class="text-xs text-gray-700 mb-4">{{ t('analytics.invoiceVolume.subtitle') }}</p>
        <svg :viewBox="`0 0 ${barChartW} ${barChartH + 14}`" class="w-full" style="height: 140px;">
          <defs>
            <linearGradient id="volBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00c853" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#00c853" stop-opacity="0.2"/>
            </linearGradient>
          </defs>
          <line v-for="y in barGridLines" :key="y" x1="0" :y1="y" :x2="barChartW" :y2="y" stroke="#292929" stroke-width="1"/>
          <rect
            v-for="bar in volumeBars" :key="bar.lx"
            :x="bar.x"
            :y="bar.y"
            :width="bar.w"
            :height="bar.h"
            rx="4"
            fill="url(#volBar)"
          />
          <text v-for="bar in volumeBars" :key="`lbl-${bar.lx}`" v-show="bar.showLabel" :x="bar.lx" :y="barChartH + 12" text-anchor="middle" fill="#a0a0a0" font-size="9" font-family="Geist Sans">{{ bar.label }}</text>
        </svg>
      </div>

      <!-- Invoice status breakdown row -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          v-for="[status, meta] in Object.entries(data.status_breakdown)"
          :key="status"
          class="bg-gray-200 border border-gray-400 rounded-xl p-4"
        >
          <div class="text-[10px] font-semibold uppercase tracking-wider text-gray-700 mb-2">{{ t(`common.status.${status}`) }}</div>
          <div class="text-xl font-semibold text-gray-1000 font-sans">{{ meta.count }}</div>
          <div v-if="meta.amount > 0" class="text-xs text-gray-700 mt-0.5">{{ fmtCurrency(meta.amount) }}</div>
        </div>
      </div>

      <!-- ─── Receipts Section ───────────────────────────────────────────────── -->
      <div class="border-t border-gray-400/50 pt-5">
        <h2 class="text-sm font-semibold text-gray-1000 mb-1">{{ t('analytics.receipts.title') }}</h2>
        <p class="text-xs text-gray-700 mb-4">{{ t('analytics.receipts.subtitle') }}</p>

        <!-- Receipt stat cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="w-8 h-8 rounded-lg bg-green-700/10 flex items-center justify-center mb-3">
              <svg class="w-4 h-4 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8M16 12H8M11 16H8"/></svg>
            </div>
            <div class="font-sans text-2xl font-semibold text-gray-1000">{{ data.receipt_stats.total }}</div>
            <div class="text-xs text-gray-700 mt-1">{{ t('analytics.receipts.total') }}</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <svg class="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="font-sans text-2xl font-semibold text-gray-1000">{{ data.receipt_stats.breakdown.finalized.count }}</div>
            <div class="text-xs text-gray-700 mt-1">{{ t('analytics.receipts.finalized') }}</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="w-8 h-8 rounded-lg bg-gray-500/50 flex items-center justify-center mb-3">
              <svg class="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div class="font-sans text-2xl font-semibold text-gray-1000">{{ data.receipt_stats.breakdown.draft.count }}</div>
            <div class="text-xs text-gray-700 mt-1">{{ t('analytics.receipts.drafts') }}</div>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
            <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
              <svg class="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
            <div class="font-sans text-2xl font-semibold text-gray-1000">{{ data.receipt_stats.breakdown.void.count }}</div>
            <div class="text-xs text-gray-700 mt-1">{{ t('analytics.receipts.void') }}</div>
          </div>
        </div>

        <!-- Monthly receipt volume bar chart -->
        <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-1000 mb-1">{{ t('analytics.receipts.volumeTitle') }}</h3>
          <p class="text-xs text-gray-700 mb-4">{{ t('analytics.receipts.volumeSubtitle') }}</p>
          <template v-if="receiptVolumeMax > 0">
            <svg :viewBox="`0 0 ${barChartW} ${barChartH + 14}`" class="w-full" style="height: 140px;">
              <defs>
                <linearGradient id="recBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#34d399" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/>
                </linearGradient>
              </defs>
              <line v-for="y in barGridLines" :key="y" x1="0" :y1="y" :x2="barChartW" :y2="y" stroke="#292929" stroke-width="1"/>
              <rect
                v-for="bar in receiptVolumeBars" :key="bar.lx"
                :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
                rx="4" fill="url(#recBar)"
              />
              <text v-for="bar in receiptVolumeBars" :key="`rl-${bar.lx}`" v-show="bar.showLabel" :x="bar.lx" :y="barChartH + 12" text-anchor="middle" fill="#a0a0a0" font-size="9" font-family="Geist Sans">{{ bar.label }}</text>
            </svg>
          </template>
          <p v-else class="text-xs text-gray-700/60 py-8 text-center">{{ t('analytics.receipts.volumeEmpty') }}</p>
        </div>
      </div>

    </template>

    <!-- Empty state before data loads -->
    <div v-else class="flex items-center justify-center py-20 text-gray-700 text-sm">
      {{ t('analytics.noData') }}
    </div>

  </div>
</template>
