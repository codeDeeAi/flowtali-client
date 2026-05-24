<script setup lang="ts">
import { ref, computed } from 'vue';

export interface IRevenueTrendItem {
  month: string
  year: number
  billed: number
  collected: number
}

const props = defineProps<{
  trendData?: IRevenueTrendItem[]
  loading?: boolean
}>()

type Period = '7D' | '1M' | '3M' | '1Y';

const activePeriod = ref<Period>('1M');
const periods: Period[] = ['7D', '1M', '3M', '1Y'];

const allData: Record<Period, number[]> = {
  '7D': [62, 75, 55, 88, 70, 95, 80],
  '1M': [30, 42, 38, 50, 45, 55, 48, 62, 58, 70, 75, 82, 88, 95],
  '3M': [28, 35, 40, 38, 50, 55, 48, 60, 58, 70, 65, 78],
  '1Y': [30, 38, 45, 42, 55, 48, 52, 62, 58, 68, 72, 95],
};

const data = computed(() => {
  if (props.trendData && props.trendData.length > 0) {
    return props.trendData.map(d => d.collected)
  }
  return allData[activePeriod.value]
})

const chartW = 300;
const chartH = 120;
const barGap = 4;
const paddingX = 8;
const paddingTop = 8;
const paddingBottom = 8;

const bars = computed(() => {
  const values = data.value;
  const maxVal = Math.max(...values, 1);
  const totalBars = values.length;
  const availableW = chartW - paddingX * 2;
  const barW = Math.floor(availableW / totalBars) - barGap;
  const availableH = chartH - paddingTop - paddingBottom;

  return values.map((v, i) => {
    const barH = (v / maxVal) * availableH;
    return {
      x: paddingX + i * (barW + barGap),
      y: paddingTop + availableH - barH,
      width: barW,
      height: barH,
    };
  });
});
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="animate-pulse">
        <div class="flex items-start justify-between mb-5">
          <div>
            <div class="w-32 h-4 rounded bg-charcoal-700 mb-2" />
            <div class="w-44 h-3 rounded bg-charcoal-700" />
          </div>
          <div class="w-28 h-7 rounded-lg bg-charcoal-700" />
        </div>
        <div class="flex items-end gap-1.5 h-[140px]">
          <div v-for="i in 14" :key="i" class="flex-1 rounded-t bg-charcoal-700" :style="{ height: `${30 + Math.sin(i * 0.8) * 25 + 25}%` }" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div class="flex items-start justify-between mb-5">
        <div>
          <h3 class="text-sm font-semibold text-cream">Revenue Overview</h3>
          <p class="text-xs text-cream-faint mt-0.5">Invoice payments received</p>
        </div>
        <div v-if="!trendData" class="flex items-center gap-0.5 bg-charcoal-700 rounded-lg p-0.5">
          <button
            v-for="p in periods"
            :key="p"
            :class="[
              'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
              activePeriod === p
                ? 'bg-amber text-charcoal-900'
                : 'text-cream-muted hover:text-cream',
            ]"
            @click="activePeriod = p"
          >
            {{ p }}
          </button>
        </div>
      </div>

      <svg
        :viewBox="`0 0 ${chartW} ${chartH}`"
        class="w-full"
        :style="{ height: '140px' }"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e8a83e" />
            <stop offset="100%" stop-color="#e8a83e" stop-opacity="0.25" />
          </linearGradient>
        </defs>
        <rect
          v-for="(bar, i) in bars"
          :key="i"
          :x="bar.x"
          :y="bar.y"
          :width="bar.width"
          :height="bar.height"
          rx="3"
          ry="3"
          fill="url(#barGrad)"
        />
      </svg>
    </template>

  </div>
</template>
