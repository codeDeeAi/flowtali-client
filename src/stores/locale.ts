import { ref, type WritableComputedRef } from 'vue'
import { defineStore } from 'pinia'
import 'pinia-plugin-persistedstate'
import {
  DEFAULT_LOCALE,
  i18n,
  isSupportedLocale,
  normalizeLocale,
  type Locale,
} from '@/i18n'

export const useLocaleStore = defineStore(
  'locale-store',
  () => {
    const current = ref<Locale>(DEFAULT_LOCALE)

    function apply(loc: Locale) {
      current.value = loc
      // legacy:false ⇒ i18n.global.locale is a WritableComputedRef
      ;(i18n.global.locale as WritableComputedRef<Locale>).value = loc
      if (typeof document !== 'undefined') {
        document.documentElement.lang = loc
      }
    }

    /** Explicit user choice (or route-driven). Persisted via the store. */
    function setLocale(loc: string | null | undefined) {
      const next = isSupportedLocale(loc) ? loc : DEFAULT_LOCALE
      apply(next)
      // Persist the choice server-side for logged-in users so it drives
      // locale-aware emails / API messages beyond the current session.
      // Fire-and-forget; dynamic imports avoid a circular store↔http dependency.
      void persistToBackend(next)
    }

    async function persistToBackend(loc: Locale) {
      try {
        const [{ useAuthStore }, { ProfileService }] = await Promise.all([
          import('@/stores/auth'),
          import('@/services/profile.service'),
        ])
        if (!useAuthStore().isLoggedIn) return
        await ProfileService.update({ locale: loc })
      } catch {
        // Non-critical: the Accept-Language header still localizes this session.
      }
    }

    /**
     * Apply the locale the backend has stored for the authenticated user.
     * Authoritative across devices; does NOT echo back to the server.
     */
    function syncFromServer(loc: string | null | undefined) {
      if (isSupportedLocale(loc) && loc !== current.value) apply(loc)
    }

    /**
     * Resolve the initial locale when there is no locale in the URL:
     * persisted choice → browser language → default.
     */
    function resolveFromBrowser(): Locale {
      const nav = typeof navigator !== 'undefined' ? navigator.language : null
      return normalizeLocale(nav)
    }

    return { current, setLocale, syncFromServer, resolveFromBrowser }
  },
  { persist: true },
)
