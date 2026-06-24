<script setup lang="ts">
import { computed } from 'vue';

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

const hasData = computed(() => props.trendData && props.trendData.length > 0)

const data = computed(() => {
  if (!hasData.value) return []
  return props.trendData!.map(d => d.collected)
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
  <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="animate-pulse">
        <div class="flex items-start justify-between mb-5">
          <div>
            <div class="w-32 h-4 rounded bg-gray-400 mb-2" />
            <div class="w-44 h-3 rounded bg-gray-400" />
          </div>
          <div class="w-28 h-7 rounded-lg bg-gray-400" />
        </div>
        <div class="flex items-end gap-1.5 h-[140px]">
          <div v-for="i in 14" :key="i" class="flex-1 rounded-t bg-gray-400" :style="{ height: `${30 + Math.sin(i * 0.8) * 25 + 25}%` }" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div class="flex items-start justify-between mb-5">
        <div>
          <h3 class="text-sm font-semibold text-gray-1000">Revenue Overview</h3>
          <p class="text-xs text-gray-700 mt-0.5">Invoice payments received</p>
        </div>
      </div>

      <div v-if="!hasData" class="flex items-center justify-center h-[140px] text-xs text-gray-700">
        No revenue data yet
      </div>

      <svg
        v-else
        :viewBox="`0 0 ${chartW} ${chartH}`"
        class="w-full"
        :style="{ height: '140px' }"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00c853" />
            <stop offset="100%" stop-color="#00c853" stop-opacity="0.25" />
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
