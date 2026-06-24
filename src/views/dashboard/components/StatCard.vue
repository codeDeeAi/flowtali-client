<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  title: string;
  value: string;
  change: number;
  icon: string;
  color: 'amber' | 'red' | 'blue' | 'green';
  progress: number;
  loading?: boolean;
}>();

const colorMap = {
  amber: { bg: 'bg-green-700/10', text: 'text-green-700', bar: 'bg-green-700' },
  red:   { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-400' },
  blue:  { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-400' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-400' },
};

const c = colorMap[props.color];
</script>

<template>
  <div class="bg-gray-200 border border-gray-400 rounded-xl p-5 flex flex-col gap-4">

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="animate-pulse flex flex-col gap-4">
        <div class="flex items-start justify-between">
          <div class="w-10 h-10 rounded-lg bg-gray-400" />
          <div class="w-14 h-6 rounded-full bg-gray-400" />
        </div>
        <div>
          <div class="w-20 h-7 rounded bg-gray-400 mb-2" />
          <div class="w-24 h-4 rounded bg-gray-400" />
        </div>
        <div class="h-1 rounded-full bg-gray-400" />
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div class="flex items-start justify-between">
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', c.bg]">
          <Icon :icon="icon" :class="['w-5 h-5', c.text]" />
        </div>
        <span
          :class="[
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
          ]"
        >
          <Icon :icon="change >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="w-3 h-3" />
          {{ change >= 0 ? '+' : '' }}{{ change }}%
        </span>
      </div>

      <div>
        <div class="text-2xl font-bold text-gray-1000 tracking-tight">{{ value }}</div>
        <div class="text-sm text-gray-900 mt-0.5">{{ title }}</div>
      </div>

      <div class="h-1 bg-gray-500 rounded-full overflow-hidden">
        <div
          :class="['h-full rounded-full transition-all duration-700', c.bar]"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </template>

  </div>
</template>
