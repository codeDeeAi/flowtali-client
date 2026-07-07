<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t, tm, rt } = useI18n()

useSeo({
  title: t('contact.title'),
  description: t('contact.subtitle'),
  canonical: 'https://flowtali.com/contact',
  localePath: '/contact',
})

// Icons stay in code; titles/descriptions come from i18n.
const HELP_ICONS = [
  'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
]
const helpItems = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tm('contact.helpItems') as any[]).map((item, i) => ({
    title: rt(item.title),
    desc: rt(item.desc),
    icon: HELP_ICONS[i] ?? '',
  })),
)

const copied = ref(false)
function copyEmail() {
  navigator.clipboard.writeText('flowtaliltd@gmail.com').catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-1000">

    <!-- Nav -->
    <header class="border-b border-gray-300 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-1000 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        {{ t('legal.back') }}
      </button>
      <div class="flex items-center gap-4">
        <LanguageSwitcher />
        <router-link to="/" class="font-sans text-lg font-bold text-green-700">Flowtali</router-link>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-20">

      <!-- Header -->
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-green-700/10 border border-green-700/20 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          {{ t('contact.badge') }}
        </div>
        <h1 class="text-4xl font-bold font-sans text-gray-1000 mb-4">{{ t('contact.title') }}</h1>
        <p class="text-gray-900 text-lg max-w-xl mx-auto">
          {{ t('contact.subtitle') }}
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8">

        <!-- Contact card -->
        <div class="space-y-4">

          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div class="text-sm font-semibold text-gray-1000">{{ t('contact.emailUs') }}</div>
                <div class="text-xs text-gray-700">{{ t('contact.emailUsSub') }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a href="mailto:flowtaliltd@gmail.com" class="flex-1 text-sm font-mono text-green-700 hover:underline truncate">
                flowtaliltd@gmail.com
              </a>
              <button
                @click="copyEmail"
                class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-400 hover:bg-gray-500 border border-gray-500 text-gray-900 hover:text-gray-1000 rounded-lg transition-colors"
              >
                <svg v-if="!copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                <svg v-else class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ copied ? t('contact.copied') : t('contact.copy') }}
              </button>
            </div>
          </div>

          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3"/></svg>
              </div>
              <div>
                <div class="text-sm font-semibold text-gray-1000">{{ t('contact.responseTime') }}</div>
                <div class="text-xs text-gray-700">{{ t('contact.responseTimeSub') }}</div>
              </div>
            </div>
            <p class="text-sm text-gray-900">{{ t('contact.responseBodyPre') }} <strong class="text-gray-1000">{{ t('contact.responseBodyStrong') }}</strong>{{ t('contact.responseBodyPost') }}</p>
          </div>

        </div>

        <!-- What to write about -->
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 space-y-5">
          <h3 class="text-base font-semibold text-gray-1000">{{ t('contact.helpTitle') }}</h3>

          <div class="space-y-3">
            <div v-for="item in helpItems" :key="item.title"
              class="flex items-start gap-3"
            >
              <div class="w-7 h-7 rounded-lg bg-gray-400 border border-gray-500 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/></svg>
              </div>
              <div>
                <div class="text-sm font-medium text-gray-1000">{{ item.title }}</div>
                <div class="text-xs text-gray-700 mt-0.5 leading-relaxed">{{ item.desc }}</div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-gray-400">
            <a href="mailto:flowtaliltd@gmail.com" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm rounded-xl transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              {{ t('contact.sendEmail') }}
            </a>
          </div>
        </div>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-300 mt-4 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-gray-700">
        <router-link :to="{ name: 'about' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.about') }}</router-link>
        <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.privacy') }}</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.terms') }}</router-link>
      </div>
      <p class="text-xs text-gray-700/50 mt-4">{{ t('legal.copyright', { year: new Date().getFullYear() }) }}</p>
    </footer>
  </div>
</template>
