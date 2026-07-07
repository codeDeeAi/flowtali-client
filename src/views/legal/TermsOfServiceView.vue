<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t, tm, rt } = useI18n()

useSeo({
  title: t('terms.seo.title'),
  description: t('terms.seo.description'),
  canonical: 'https://flowtali.com/legal/terms',
  localePath: '/terms',
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listOf = (key: string) => computed(() => (tm(key) as any[]).map((x) => rt(x)))
const s2Items = listOf('terms.s2.items')
const s3Items = listOf('terms.s3.items')
const s4Items = listOf('terms.s4.items')
const s5Items = listOf('terms.s5.items')
const s7Items = listOf('terms.s7.items')
const s10Items = listOf('terms.s10.items')
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

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-6 py-12">
      <div class="mb-10">
        <h1 class="text-4xl font-bold font-sans text-gray-1000 mb-3">{{ t('terms.title') }}</h1>
        <p class="text-gray-700 text-sm">{{ t('terms.lastUpdated') }}</p>
      </div>

      <div class="prose prose-invert max-w-none space-y-8 text-gray-900 leading-relaxed">

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s1.h') }}</h2>
          <p>{{ t('terms.s1.p1') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s2.h') }}</h2>
          <p>{{ t('terms.s2.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s2Items" :key="i">{{ item }}</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s3.h') }}</h2>
          <p>{{ t('terms.s3.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s3Items" :key="i">{{ item }}</li>
          </ul>
          <p class="mt-3">{{ t('terms.s3.note') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s4.h') }}</h2>
          <p>{{ t('terms.s4.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s4Items" :key="i">{{ item }}</li>
          </ul>
          <p class="mt-3">{{ t('terms.s4.note') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s5.h') }}</h2>
          <p>{{ t('terms.s5.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s5Items" :key="i">{{ item }}</li>
          </ul>
          <p class="mt-3">{{ t('terms.s5.note') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s6.h') }}</h2>
          <p>{{ t('terms.s6.p1') }}</p>
          <p class="mt-3">{{ t('terms.s6.p2') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s7.h') }}</h2>
          <p>{{ t('terms.s7.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s7Items" :key="i">{{ item }}</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s8.h') }}</h2>
          <p>{{ t('terms.s8.p1') }}</p>
          <p class="mt-3">{{ t('terms.s8.p2') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s9.h') }}</h2>
          <p>{{ t('terms.s9.p1') }}</p>
          <p class="mt-3">{{ t('terms.s9.p2') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s10.h') }}</h2>
          <p>{{ t('terms.s10.p1') }}</p>
          <ul class="list-disc pl-5 space-y-2 mt-2">
            <li v-for="(item, i) in s10Items" :key="i">{{ item }}</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s11.h') }}</h2>
          <p>{{ t('terms.s11.p1') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s12.h') }}</h2>
          <p>{{ t('terms.s12.p1') }}</p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-gray-1000 mb-3">{{ t('terms.s13.h') }}</h2>
          <p>{{ t('terms.s13.p1') }}</p>
          <div class="mt-3 p-4 bg-gray-200 border border-gray-400 rounded-xl text-sm">
            <p><strong class="text-gray-1000">Flowtali</strong></p>
            <p class="mt-1">{{ t('terms.s13.emailLabel') }} <a href="mailto:flowtaliltd@gmail.com" class="text-green-700 hover:underline">flowtaliltd@gmail.com</a></p>
          </div>
        </section>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-300 mt-16 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-gray-700">
        <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.privacyPolicy') }}</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.termsOfService') }}</router-link>
      </div>
      <p class="text-xs text-gray-700/50 mt-4">{{ t('legal.copyright', { year: new Date().getFullYear() }) }}</p>
    </footer>
  </div>
</template>
