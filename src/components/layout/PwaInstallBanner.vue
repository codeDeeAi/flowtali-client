<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePwaInstall } from '@/composables/usePwaInstall'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'

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
      class="fixed bottom-4 left-4 right-4 z-[9998] max-w-sm mx-auto flex items-center gap-3 px-4 py-3 bg-gray-200 border border-gray-500 rounded-xl shadow-2xl"
      role="complementary"
      aria-label="Install Flowtali app"
    >
      <!-- Flowtali logomark -->
      <FlowtaliLogo variant="icon" :size="40" />

      <!-- Copy -->
      <div class="flex-1 min-w-0">
        <p class="text-gray-1000 font-semibold text-sm leading-tight">Install Flowtali</p>
        <p class="text-gray-700 text-xs mt-0.5">Add to your home screen</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 shrink-0">
        <button
          class="text-green-700 font-semibold text-sm hover:text-green-800 transition-colors"
          @click="install"
        >
          Install
        </button>
        <button
          class="text-gray-700 hover:text-gray-1000 transition-colors"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <Icon icon="lucide:x" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>
