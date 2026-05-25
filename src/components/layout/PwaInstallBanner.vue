<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePwaInstall } from '@/composables/usePwaInstall'

const { canInstall, install, dismiss } = usePwaInstall()

// Delay so it doesn't flash on load before the prompt event has fired
const ready = ref(false)
onMounted(() => setTimeout(() => { ready.value = true }, 3000))
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="canInstall && ready"
      class="fixed bottom-4 left-4 right-4 z-[9998] max-w-sm mx-auto flex items-center gap-3 px-4 py-3 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-2xl"
      role="complementary"
      aria-label="Install Flowtali app"
    >
      <!-- Flowtali logomark -->
      <div class="w-10 h-10 rounded-xl bg-amber flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" stroke-width="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 8h10M7 12h6M7 16h4" />
        </svg>
      </div>

      <!-- Copy -->
      <div class="flex-1 min-w-0">
        <p class="text-cream font-semibold text-sm leading-tight">Install Flowtali</p>
        <p class="text-cream-faint text-xs mt-0.5">Add to your home screen</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 shrink-0">
        <button
          class="text-amber font-semibold text-sm hover:text-amber-light transition-colors"
          @click="install"
        >
          Install
        </button>
        <button
          class="text-cream-faint hover:text-cream transition-colors"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <Icon icon="lucide:x" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>
