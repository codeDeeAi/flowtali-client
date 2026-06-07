<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  modelValue: number;
  total: number;
  perPage: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [page: number];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)));

const from = computed(() => Math.min((props.modelValue - 1) * props.perPage + 1, props.total));
const to   = computed(() => Math.min(props.modelValue * props.perPage, props.total));

// Build page number list with ellipsis
const pages = computed<(number | '...')[]>(() => {
  const total = totalPages.value;
  const cur   = props.modelValue;

  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | '...')[] = [1];

  if (cur > 3)              result.push('...');
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) result.push(p);
  if (cur < total - 2)      result.push('...');

  result.push(total);
  return result;
});

const go = (page: number) => {
  if (page < 1 || page > totalPages.value || page === props.modelValue) return;
  emit('update:modelValue', page);
};
</script>

<template>
  <div v-if="total > 0" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <!-- Count label -->
    <p class="text-xs text-cream-faint">
      Showing <span class="text-cream font-medium">{{ from }}–{{ to }}</span> of
      <span class="text-cream font-medium">{{ total }}</span>
    </p>

    <!-- Controls -->
    <div class="flex items-center gap-1">
      <!-- Prev -->
      <button
        @click="go(modelValue - 1)"
        :disabled="modelValue === 1"
        class="flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-lg border border-charcoal-600 bg-charcoal-800 text-cream-faint transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-charcoal-500 hover:enabled:text-cream"
      >
        <Icon icon="lucide:chevron-left" class="w-3.5 h-3.5" />
      </button>

      <!-- Pages -->
      <template v-for="(p, i) in pages" :key="i">
        <span
          v-if="p === '...'"
          class="flex items-center justify-center w-9 h-9 md:w-7 md:h-7 text-xs text-cream-faint select-none"
        >…</span>
        <button
          v-else
          @click="go(p)"
          :class="[
            'flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-lg border text-xs font-medium transition-colors',
            p === modelValue
              ? 'border-amber bg-amber text-charcoal-900 font-semibold'
              : 'border-charcoal-600 bg-charcoal-800 text-cream-faint hover:border-charcoal-500 hover:text-cream',
          ]"
        >{{ p }}</button>
      </template>

      <!-- Next -->
      <button
        @click="go(modelValue + 1)"
        :disabled="modelValue === totalPages"
        class="flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded-lg border border-charcoal-600 bg-charcoal-800 text-cream-faint transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-charcoal-500 hover:enabled:text-cream"
      >
        <Icon icon="lucide:chevron-right" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
