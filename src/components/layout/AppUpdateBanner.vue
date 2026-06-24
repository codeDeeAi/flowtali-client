<script setup lang="ts">
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { Icon } from '@iconify/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  // Suppress Workbox's own reload inside the 'controlling' event handler.
  // Without this, both Workbox's handler AND our controllerchange listener
  // would call window.location.reload(), creating a double-reload loop.
  onNeedReload() {},

  onRegistered(r) {
    if (r) setInterval(() => r.update(), 60 * 60 * 1000)
  },
})

const isUpdating = ref(false)

async function doUpdate() {
  if (isUpdating.value) return
  isUpdating.value = true

  // Single { once: true } listener — fires exactly when the new SW takes control.
  let fallback: ReturnType<typeof setTimeout>
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => { clearTimeout(fallback); window.location.reload() },
    { once: true },
  )

  // If the SW never fires controllerchange (e.g. skipWaiting silently fails),
  // reload anyway so the user isn't stuck on a spinning button forever.
  fallback = setTimeout(() => window.location.reload(), 10_000)

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
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 bg-gray-200 border border-gray-500 rounded-xl shadow-2xl text-sm"
      role="alert"
    >
      <Icon icon="lucide:refresh-cw" class="w-4 h-4 text-green-700 shrink-0" />
      <span class="text-gray-900">A new version is available.</span>
      <button
        :disabled="isUpdating"
        class="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        @click="doUpdate"
      >
        <Icon v-if="isUpdating" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
        {{ isUpdating ? 'Updating…' : 'Update now' }}
      </button>
    </div>
  </Transition>
</template>
