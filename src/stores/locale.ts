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
      apply(isSupportedLocale(loc) ? loc : DEFAULT_LOCALE)
    }

    /**
     * Resolve the initial locale when there is no locale in the URL:
     * persisted choice → browser language → default.
     */
    function resolveFromBrowser(): Locale {
      const nav = typeof navigator !== 'undefined' ? navigator.language : null
      return normalizeLocale(nav)
    }

    return { current, setLocale, resolveFromBrowser }
  },
  { persist: true },
)
