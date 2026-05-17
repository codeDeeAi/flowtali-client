<script setup lang="ts">
import { computed } from 'vue';

const segments = [
  { label: 'Paid',    value: 28, color: '#4ade80' },
  { label: 'Due',     value: 11, color: '#e8a83e' },
  { label: 'Overdue', value: 5,  color: '#f87171' },
  { label: 'Draft',   value: 3,  color: '#6b7280' },
];

const total = segments.reduce((sum, s) => sum + s.value, 0);

const R = 40;
const cx = 50;
const cy = 50;
const strokeWidth = 11;
const gap = 2.5;
const circumference = 2 * Math.PI * R;

const arcs = computed(() => {
  let offset = -(circumference / 4); // start from top
  return segments.map(seg => {
    const length = (seg.value / total) * circumference - gap;
    const dasharray = `${length} ${circumference}`;
    const dashoffset = offset;
    offset -= length + gap;
    return { ...seg, dasharray, dashoffset: String(dashoffset) };
  });
});
</script>

<template>
  <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-cream">Invoice Status</h3>
        <p class="text-xs text-cream-faint mt-0.5">This month</p>
      </div>
    </div>

    <!-- Donut chart + legend -->
    <div class="flex items-center gap-6">
      <!-- SVG Donut -->
      <div class="relative shrink-0">
        <svg viewBox="0 0 100 100" class="w-28 h-28 -rotate-0">
          <circle
            v-for="arc in arcs"
            :key="arc.label"
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
        <!-- Center label -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-cream leading-none">{{ total }}</span>
          <span class="text-[10px] text-cream-faint mt-0.5">total</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-col gap-2.5 flex-1">
        <div
          v-for="seg in segments"
          :key="seg.label"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: seg.color }" />
            <span class="text-sm text-cream-muted">{{ seg.label }}</span>
          </div>
          <span class="text-sm font-semibold text-cream">{{ seg.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
