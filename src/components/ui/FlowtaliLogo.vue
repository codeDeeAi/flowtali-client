<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'icon' | 'wordmark' | 'full'
type Theme = 'dark' | 'light'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: number
  theme?: Theme
}>(), {
  variant: 'full',
  size: 24,
  theme: 'dark',
})

const textClass = computed(() => props.theme === 'light' ? 'text-gray-800' : 'text-gray-1000')
</script>

<template>
  <!-- Icon only: "F" lettermark -->
  <svg
    v-if="variant === 'icon'"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Flowtali"
  >
    <rect width="32" height="32" rx="7" fill="#00c853" />
    <rect x="10" y="7" width="3.5" height="18" rx="0.75" fill="#000" />
    <rect x="10" y="7" width="13" height="3.5" rx="0.75" fill="#000" />
    <rect x="10" y="14" width="9.5" height="3.5" rx="0.75" fill="#000" />
  </svg>

  <!-- Wordmark only -->
  <span
    v-else-if="variant === 'wordmark'"
    class="font-sans font-bold tracking-tight leading-none select-none"
    :style="{ fontSize: size + 'px' }"
  >
    <span class="text-green-700">Flow</span><span :class="textClass">tali</span>
  </span>

  <!-- Full: icon + wordmark -->
  <span v-else class="inline-flex items-center select-none" :style="{ gap: (size * 0.35) + 'px' }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Flowtali"
    >
      <rect width="32" height="32" rx="7" fill="#00c853" />
      <rect x="10" y="7" width="3.5" height="18" rx="0.75" fill="#000" />
      <rect x="10" y="7" width="13" height="3.5" rx="0.75" fill="#000" />
      <rect x="10" y="14" width="9.5" height="3.5" rx="0.75" fill="#000" />
    </svg>
    <span
      class="font-sans font-bold tracking-tight leading-none"
      :style="{ fontSize: size + 'px' }"
    >
      <span class="text-green-700">Flow</span><span :class="textClass">tali</span>
    </span>
  </span>
</template>
