import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const justReconnected = ref(false)

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function handleOnline() {
    isOnline.value = true
    justReconnected.value = true
    // Clear the "reconnected" indicator after 3s
    reconnectTimer = setTimeout(() => {
      justReconnected.value = false
    }, 3000)
  }

  function handleOffline() {
    isOnline.value = false
    justReconnected.value = false
    if (reconnectTimer) clearTimeout(reconnectTimer)
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (reconnectTimer) clearTimeout(reconnectTimer)
  })

  return { isOnline, justReconnected }
}
