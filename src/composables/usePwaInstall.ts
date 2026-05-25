import { ref, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 30

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)

  const isDismissedRecently = () => {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    return (Date.now() - parseInt(ts, 10)) < DISMISS_DAYS * 864e5
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    if (!isDismissedRecently() && !window.matchMedia('(display-mode: standalone)').matches) {
      canInstall.value = true
    }
  }

  const handleAppInstalled = () => {
    canInstall.value = false
    deferredPrompt.value = null
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  const install = async () => {
    if (!deferredPrompt.value) return
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      canInstall.value = false
      deferredPrompt.value = null
    }
  }

  const dismiss = () => {
    canInstall.value = false
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  return { canInstall, install, dismiss }
}
