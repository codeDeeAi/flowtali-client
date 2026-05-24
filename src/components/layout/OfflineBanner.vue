<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const { isOnline, justReconnected } = useNetworkStatus()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <!-- Offline -->
    <div
      v-if="!isOnline"
      class="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-charcoal-900 border-b border-red-500/30 text-red-400 text-xs font-medium"
      role="status"
      aria-live="assertive"
    >
      <Icon icon="lucide:wifi-off" class="w-3.5 h-3.5 shrink-0" />
      <span>You're offline — changes will sync when you reconnect</span>
    </div>

    <!-- Just reconnected -->
    <div
      v-else-if="justReconnected"
      class="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-charcoal-900 border-b border-green-500/30 text-green-400 text-xs font-medium"
      role="status"
      aria-live="polite"
    >
      <Icon icon="lucide:wifi" class="w-3.5 h-3.5 shrink-0" />
      <span>Back online</span>
    </div>
  </Transition>
</template>
