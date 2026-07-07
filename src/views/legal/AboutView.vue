<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t, tm, rt } = useI18n()

useSeo({
  title: t('about.seo.title'),
  description: t('about.seo.description'),
  canonical: 'https://flowtali.com/about',
  localePath: '/about',
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stats = computed(() => (tm('about.stats') as any[]).map((s) => ({ value: rt(s.value), label: rt(s.label) })))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const values = computed(() => (tm('about.values') as any[]).map((v) => ({ title: rt(v.title), desc: rt(v.desc) })))
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-1000">

    <!-- Nav -->
    <header class="border-b border-gray-300 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-1000 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        {{ t('legal.back') }}
      </button>
      <div class="flex items-center gap-4">
        <LanguageSwitcher />
        <router-link to="/" class="font-sans text-lg font-bold text-green-700">Flowtali</router-link>
      </div>
    </header>

    <!-- Hero -->
    <section class="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
      <div class="inline-flex items-center gap-2 bg-green-700/10 border border-green-700/20 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
        {{ t('about.badge') }}
      </div>
      <h1 class="text-5xl font-bold font-sans text-gray-1000 mb-6 leading-tight">
        {{ t('about.heroTitleLine1') }}<br class="hidden md:block" /> {{ t('about.heroTitleLine2') }}
      </h1>
      <p class="text-lg text-gray-900 max-w-2xl mx-auto leading-relaxed">
        {{ t('about.heroSubtitle') }}
      </p>
    </section>

    <!-- Mission -->
    <section class="max-w-5xl mx-auto px-6 py-16">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-3xl font-bold font-sans text-gray-1000 mb-5">{{ t('about.missionTitle') }}</h2>
          <div class="space-y-4 text-gray-900 leading-relaxed">
            <p>{{ t('about.missionP1') }}</p>
            <p>{{ t('about.missionP2') }}</p>
            <p>
              {{ t('about.missionP3a') }} <em class="text-gray-1000 not-italic font-medium">{{ t('about.missionP3Quote') }}</em> {{ t('about.missionP3b') }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="stat in stats" :key="stat.label" class="bg-gray-200 border border-gray-400 rounded-2xl p-6 text-center">
            <div class="text-3xl font-bold text-green-700 mb-1">{{ stat.value }}</div>
            <div class="text-sm text-gray-900">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="border-t border-gray-300 py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl font-bold font-sans text-gray-1000 mb-10 text-center">{{ t('about.valuesTitle') }}</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">{{ values[0]?.title }}</h3>
            <p class="text-sm text-gray-900 leading-relaxed">{{ values[0]?.desc }}</p>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">{{ values[1]?.title }}</h3>
            <p class="text-sm text-gray-900 leading-relaxed">{{ values[1]?.desc }}</p>
          </div>
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6">
            <div class="w-10 h-10 rounded-xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h3 class="font-semibold text-gray-1000 mb-2">{{ values[2]?.title }}</h3>
            <p class="text-sm text-gray-900 leading-relaxed">{{ values[2]?.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h2 class="text-3xl font-bold font-sans text-gray-1000 mb-4">{{ t('about.ctaTitle') }}</h2>
      <p class="text-gray-900 mb-8">{{ t('about.ctaSubtitle') }}</p>
      <div class="flex items-center justify-center gap-4 flex-wrap">
        <router-link :to="{ name: 'signup' }" class="px-6 py-3 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm rounded-xl transition-colors">
          {{ t('about.ctaPrimary') }}
        </router-link>
        <router-link :to="{ name: 'contact' }" class="px-6 py-3 bg-gray-200 hover:bg-gray-400 border border-gray-400 text-gray-1000 text-sm font-medium rounded-xl transition-colors">
          {{ t('about.ctaSecondary') }}
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-300 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-gray-700">
        <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.privacy') }}</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.terms') }}</router-link>
        <router-link :to="{ name: 'contact' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.contact') }}</router-link>
      </div>
      <p class="text-xs text-gray-700/50 mt-4">{{ t('legal.copyright', { year: new Date().getFullYear() }) }}</p>
    </footer>
  </div>
</template>
