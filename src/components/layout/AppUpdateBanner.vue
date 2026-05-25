<script setup lang="ts">
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { Icon } from '@iconify/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    // Check for updates every 60 minutes
    if (r) setInterval(() => r.update(), 60 * 60 * 1000)
  },
})

const isUpdating = ref(false)

async function doUpdate() {
  if (isUpdating.value) return
  isUpdating.value = true

  // Reload only after the new SW has genuinely taken control.
  // Using updateServiceWorker(true) can reload before controllerchange fires,
  // leaving the old SW still active so needRefresh triggers again → infinite loop.
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true },
  )

  await updateServiceWorker(false)
}
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
      v-if="needRefresh"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-2xl text-sm"
      role="alert"
    >
      <Icon icon="lucide:refresh-cw" class="w-4 h-4 text-amber shrink-0" />
      <span class="text-cream-muted">A new version is available.</span>
      <button
        :disabled="isUpdating"
        class="flex items-center gap-1.5 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        @click="doUpdate"
      >
        <Icon v-if="isUpdating" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
        {{ isUpdating ? 'Updating…' : 'Update now' }}
      </button>
    </div>
  </Transition>
</template>
