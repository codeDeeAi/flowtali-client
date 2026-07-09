<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

export interface IStatusBreakdown {
  paid:    { count: number; amount: number }
  sent:    { count: number; amount: number }
  overdue: { count: number; amount: number }
  draft:   { count: number; amount: number }
  void:    { count: number; amount: number }
}

const props = defineProps<{
  breakdown?: IStatusBreakdown
  loading?: boolean
}>()

const segments = computed(() => {
  if (!props.breakdown) return []
  return [
    { key: 'paid',    value: props.breakdown.paid.count,    color: '#4ade80' },
    { key: 'sent',    value: props.breakdown.sent.count,    color: '#38bdf8' },
    { key: 'overdue', value: props.breakdown.overdue.count, color: '#f87171' },
    { key: 'draft',   value: props.breakdown.draft.count,   color: '#6b7280' },
  ].filter(s => s.value > 0)
})

const total = computed(() => segments.value.reduce((sum, s) => sum + s.value, 0))

const R = 40;
const cx = 50;
const cy = 50;
const strokeWidth = 11;
const gap = 2.5;
const circumference = 2 * Math.PI * R;

const arcs = computed(() => {
  let offset = -(circumference / 4);
  return segments.value.map(seg => {
    const length = total.value > 0
      ? (seg.value / total.value) * circumference - gap
      : 0;
    const dasharray = `${length} ${circumference}`;
    const dashoffset = offset;
    offset -= length + gap;
    return { ...seg, dasharray, dashoffset: String(dashoffset) };
  });
});
</script>

<template>
  <div class="bg-gray-200 border border-gray-400 rounded-xl p-5">

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="animate-pulse">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="w-28 h-4 rounded bg-gray-400 mb-2" />
            <div class="w-16 h-3 rounded bg-gray-400" />
          </div>
        </div>
        <div class="flex items-center gap-6">
          <div class="w-28 h-28 rounded-full bg-gray-400 shrink-0" />
          <div class="flex flex-col gap-3 flex-1">
            <div v-for="i in 4" :key="i" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-gray-500" />
                <div class="w-12 h-3 rounded bg-gray-400" />
              </div>
              <div class="w-6 h-3 rounded bg-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-1000">{{ t('dashboard.statusChart.title') }}</h3>
          <p class="text-xs text-gray-700 mt-0.5">{{ t('dashboard.statusChart.thisMonth') }}</p>
        </div>
      </div>

      <div v-if="!breakdown || total === 0" class="flex items-center justify-center h-28 text-xs text-gray-700">
        {{ t('dashboard.recentInvoices.empty') }}
      </div>

      <div v-else class="flex items-center gap-6">
      <!-- SVG Donut -->
      <div class="relative shrink-0">
        <svg viewBox="0 0 100 100" class="w-28 h-28 -rotate-0">
          <circle
            v-for="arc in arcs"
            :key="arc.key"
            :cx="cx"
            :cy="cy"
            :r="R"
            fill="none"
            :stroke="arc.color"
            :stroke-width="strokeWidth"
            :stroke-dasharray="arc.dasharray"
            :stroke-dashoffset="arc.dashoffset"
            stroke-linecap="butt"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-gray-1000 leading-none">{{ total }}</span>
          <span class="text-[10px] text-gray-700 mt-0.5">{{ t('dashboard.statusChart.total') }}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-col gap-2.5 flex-1">
        <div
          v-for="seg in segments"
          :key="seg.key"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: seg.color }" />
            <span class="text-sm text-gray-900">{{ t('common.status.' + seg.key) }}</span>
          </div>
          <span class="text-sm font-semibold text-gray-1000">{{ seg.value }}</span>
        </div>
      </div>
    </div>
    </template>

  </div>
</template>
