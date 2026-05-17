<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';

const period = ref('Last 30 days');

const kpis = [
  { label: 'Total Revenue',      value: '$48,200', change: '+12%', positive: true,  icon: 'lucide:dollar-sign' },
  { label: 'Avg Invoice Value',  value: '$1,025',  change: '+8%',  positive: true,  icon: 'lucide:trending-up' },
  { label: 'Collection Rate',    value: '82%',     change: '+3%',  positive: true,  icon: 'lucide:percent' },
  { label: 'Avg Days to Pay',    value: '14d',     change: '-2d',  positive: true,  icon: 'lucide:clock' },
];

const topClients = [
  { name: 'Globex Corp',   revenue: '$42,200', pct: 100, color: '#e8a83e' },
  { name: 'Frontier Tech', revenue: '$28,600', pct: 68,  color: '#60a5fa' },
  { name: 'Studio X',      revenue: '$21,000', pct: 50,  color: '#4ade80' },
  { name: 'Pixel Works',   revenue: '$18,400', pct: 44,  color: '#a78bfa' },
  { name: 'Nova Agency',   revenue: '$9,800',  pct: 23,  color: '#f87171' },
];

// SVG line chart data
const chartW = 540;
const chartH = 160;
const billedPoints = [
  [0,140],[60,120],[120,90],[180,100],[240,60],[300,80],[360,50],[420,65],[480,40],[540,55],
];
const collectedPoints = [
  [0,155],[60,145],[120,130],[180,135],[240,110],[300,120],[360,100],[420,115],[480,90],[540,95],
];
const toPolyline = (pts: number[][]) => pts.map(p => p.join(',')).join(' ');
const billedLine = computed(() => toPolyline(billedPoints));
const collectedLine = computed(() => toPolyline(collectedPoints));

const months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const barData = [60,95,75,110,85,130,100,145,120,155];
const maxBar = Math.max(...barData);

const gridLines = [32, 64, 96, 128, 160];
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Analytics</h1>
        <p class="page-subtitle">Revenue insights and performance metrics</p>
      </div>
      <select v-model="period" class="app-select text-xs py-2 w-40 self-start sm:self-auto">
        <option>Last 30 days</option>
        <option>Last 3 months</option>
        <option>Last 12 months</option>
        <option>All time</option>
      </select>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
            <Icon :icon="kpi.icon" class="w-4 h-4 text-amber" />
          </div>
          <span :class="['text-xs font-semibold', kpi.positive ? 'text-green-400' : 'text-red-400']">
            {{ kpi.change }}
          </span>
        </div>
        <div class="font-display text-2xl font-semibold text-cream">{{ kpi.value }}</div>
        <div class="text-xs text-cream-faint mt-1">{{ kpi.label }}</div>
        <div class="text-[10px] text-cream-faint/60 mt-0.5">vs last period</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

      <!-- Revenue trend (line chart) -->
      <div class="xl:col-span-2 bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <div class="mb-4">
          <h3 class="text-sm font-semibold text-cream">Revenue Trend</h3>
          <p class="text-xs text-cream-faint mt-0.5">Monthly billed vs collected</p>
        </div>
        <svg :viewBox="`0 0 ${chartW} ${chartH + 20}`" class="w-full" style="height: 180px;">
          <defs>
            <linearGradient id="areaAmber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e8a83e" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#e8a83e" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#4ade80" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="#4ade80" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <!-- Grid lines -->
          <line v-for="y in gridLines" :key="y" x1="0" :y1="y" :x2="chartW" :y2="y" stroke="#222228" stroke-width="1"/>
          <!-- Area fills -->
          <polygon :points="`0,${chartH} ${billedLine} ${chartW},${chartH}`" fill="url(#areaAmber)"/>
          <polygon :points="`0,${chartH} ${collectedLine} ${chartW},${chartH}`" fill="url(#areaGreen)"/>
          <!-- Lines -->
          <polyline :points="billedLine" fill="none" stroke="#e8a83e" stroke-width="2" stroke-linejoin="round"/>
          <polyline :points="collectedLine" fill="none" stroke="#4ade80" stroke-width="2" stroke-linejoin="round"/>
          <!-- Dots on billed line -->
          <circle v-for="pt in billedPoints" :key="`d${pt[0]}`" :cx="pt[0]" :cy="pt[1]" r="3" fill="#e8a83e"/>
          <!-- X axis labels -->
          <text v-for="(m, i) in months" :key="m" :x="i * 60" :y="chartH + 16" text-anchor="middle" fill="#6b6560" font-size="9" font-family="DM Sans">{{ m }}</text>
        </svg>
        <div class="flex items-center gap-4 mt-2">
          <div class="flex items-center gap-1.5 text-xs text-cream-muted"><div class="w-3 h-0.5 bg-amber rounded"></div>Billed</div>
          <div class="flex items-center gap-1.5 text-xs text-cream-muted"><div class="w-3 h-0.5 bg-green-400 rounded"></div>Collected</div>
        </div>
      </div>

      <!-- Top clients -->
      <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
        <h3 class="text-sm font-semibold text-cream mb-1">Top Clients</h3>
        <p class="text-xs text-cream-faint mb-5">By revenue this period</p>
        <div class="space-y-4">
          <div v-for="client in topClients" :key="client.name">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-cream-muted">{{ client.name }}</span>
              <span class="text-xs font-mono font-medium text-cream">{{ client.revenue }}</span>
            </div>
            <div class="h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :style="{ width: `${client.pct}%`, backgroundColor: client.color }" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bar chart – Monthly invoices -->
    <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
      <h3 class="text-sm font-semibold text-cream mb-1">Monthly Invoice Volume</h3>
      <p class="text-xs text-cream-faint mb-4">Number of invoices issued per month</p>
      <svg viewBox="0 0 580 140" class="w-full" style="height: 140px;">
        <defs>
          <linearGradient id="volBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e8a83e" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#e8a83e" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        <line v-for="y in [28,56,84,112,140]" :key="y" x1="0" :y1="y" x2="580" :y2="y" stroke="#222228" stroke-width="1"/>
        <rect
          v-for="(v, i) in barData" :key="i"
          :x="i * 58 + 10"
          :y="130 - (v / maxBar) * 120"
          width="38"
          :height="(v / maxBar) * 120"
          rx="4"
          fill="url(#volBar)"
        />
        <text v-for="(m, i) in months" :key="m" :x="i * 58 + 29" y="138" text-anchor="middle" fill="#6b6560" font-size="9" font-family="DM Sans">{{ m }}</text>
      </svg>
    </div>

  </div>
</template>
