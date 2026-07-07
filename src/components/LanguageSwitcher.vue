<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { Icon } from '@iconify/vue'
import { useLocaleStore } from '@/stores/locale'
import { LOCALIZED_ROUTE_NAMES } from '@/router'
import { SUPPORTED_LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from '@/i18n'

const route = useRoute()
const router = useRouter()
const localeStore = useLocaleStore()

const current = computed<Locale>(() => localeStore.current)

function switchTo(loc: Locale) {
  if (loc === current.value) return
  localeStore.setLocale(loc)

  // On locale-prefixed routes, rewrite the URL with/without the prefix so the
  // language is reflected in the path. On other routes (auth, app) the locale
  // is persisted-state only — just swap language in place, no navigation.
  if (!LOCALIZED_ROUTE_NAMES.has(route.name as string)) return

  const params = { ...route.params }
  if (loc === DEFAULT_LOCALE) delete params.locale
  else params.locale = loc

  router
    .replace({ name: route.name as string, params, query: route.query, hash: route.hash })
    .catch(() => router.replace({ name: 'home', params: loc === DEFAULT_LOCALE ? {} : { locale: loc } }))
}
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="flex items-center gap-1.5 text-sm text-gray-900 hover:text-gray-1000 transition-colors cursor-pointer"
      :aria-label="'Language: ' + LOCALE_LABELS[current]"
    >
      <Icon icon="heroicons:language" class="w-4 h-4" />
      <span class="uppercase font-medium">{{ current }}</span>
      <Icon icon="heroicons:chevron-down" class="w-3 h-3" />
    </MenuButton>

    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <MenuItems
        class="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-xl border border-gray-400/50 bg-gray-100 shadow-2xl focus:outline-none overflow-hidden"
      >
        <MenuItem v-for="loc in SUPPORTED_LOCALES" :key="loc" v-slot="{ active }">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors"
            :class="[
              active ? 'bg-gray-200 text-gray-1000' : 'text-gray-900',
              loc === current ? 'font-semibold text-green-700' : '',
            ]"
            @click="switchTo(loc)"
          >
            {{ LOCALE_LABELS[loc] }}
            <Icon v-if="loc === current" icon="heroicons:check" class="w-4 h-4" />
          </button>
        </MenuItem>
      </MenuItems>
    </transition>
  </Menu>
</template>
