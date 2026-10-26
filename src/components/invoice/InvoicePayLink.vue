<script setup lang="ts">
/**
 * "Pay online" call-to-action printed on an invoice. A real link on screen,
 * and the URL spelled out so it still works from a printed or PDF copy.
 */
import { useI18n } from 'vue-i18n'

defineProps<{ url: string; accent: string }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex items-center justify-between gap-4 rounded-md"
    style="padding: 10px 14px; margin-top: 16px; border: 1px solid"
    :style="{ borderColor: accent + '55', background: accent + '0d' }"
  >
    <div class="min-w-0">
      <div class="font-semibold text-gray-800" style="font-size: 12px">{{ t('document.payOnline') }}</div>
      <a :href="url" target="_blank" rel="noopener" class="font-mono break-all" style="font-size: 10px" :style="{ color: accent }">{{ url }}</a>
    </div>
    <a
      :href="url"
      target="_blank"
      rel="noopener"
      class="shrink-0 rounded font-semibold text-white"
      style="font-size: 11px; padding: 6px 12px"
      :style="{ background: accent }"
    >{{ t('document.payNow') }}</a>
  </div>
</template>
