<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const router = useRouter()
const { t } = useI18n()

useSeo({
  title: t('changelog.seo.title'),
  description: t('changelog.seo.description'),
  canonical: 'https://flowtali.com/changelog',
  localePath: '/changelog',
})

function badgeLabel(badge: string | null): string {
  if (badge === 'Latest') return t('changelog.badges.latest')
  if (badge === 'Launch') return t('changelog.badges.launch')
  return badge ?? ''
}

type ChangeType = 'new' | 'improved' | 'fix'

interface Release {
  version: string
  date: string
  badge: string | null
  changes: { type: ChangeType; text: string }[]
}

// Release chrome (versions, order, badges, change types) lives here; the change
// text and dates are localized in changelog.json (entries.* / dates.*).
interface ReleaseMeta {
  version: string
  dateKey: string
  badge: string | null
  changes: { type: ChangeType; key: string }[]
}

const releaseMeta: ReleaseMeta[] = [
  { version: 'v2.0', dateKey: 'jul2026', badge: 'Latest', changes: [
    { type: 'new', key: 'r20_1' },
    { type: 'new', key: 'r20_2' },
    { type: 'new', key: 'r20_3' },
    { type: 'new', key: 'r20_4' },
    { type: 'new', key: 'r20_5' },
    { type: 'improved', key: 'r20_6' },
    { type: 'improved', key: 'r20_7' },
  ] },
  { version: 'v1.9', dateKey: 'jul2026', badge: null, changes: [
    { type: 'new', key: 'r19_1' },
    { type: 'new', key: 'r19_2' },
    { type: 'improved', key: 'r19_3' },
    { type: 'improved', key: 'r19_4' },
    { type: 'improved', key: 'r19_5' },
  ] },
  { version: 'v1.8', dateKey: 'jun2026', badge: null, changes: [
    { type: 'new', key: 'r18_1' },
    { type: 'new', key: 'r18_2' },
    { type: 'new', key: 'r18_3' },
    { type: 'improved', key: 'r18_4' },
    { type: 'improved', key: 'r18_5' },
    { type: 'improved', key: 'r18_6' },
    { type: 'improved', key: 'r18_7' },
    { type: 'improved', key: 'r18_8' },
    { type: 'improved', key: 'r18_9' },
  ] },
  { version: 'v1.7', dateKey: 'jun2026', badge: null, changes: [
    { type: 'new', key: 'r17_1' },
    { type: 'new', key: 'r17_2' },
    { type: 'new', key: 'r17_3' },
    { type: 'improved', key: 'r17_4' },
    { type: 'improved', key: 'r17_5' },
    { type: 'improved', key: 'r17_6' },
    { type: 'fix', key: 'r17_7' },
  ] },
  { version: 'v1.6', dateKey: 'jun2026', badge: null, changes: [
    { type: 'fix', key: 'r16_1' },
    { type: 'fix', key: 'r16_2' },
    { type: 'fix', key: 'r16_3' },
    { type: 'improved', key: 'r16_4' },
  ] },
  { version: 'v1.5', dateKey: 'jun2026', badge: null, changes: [
    { type: 'new', key: 'r15_1' },
    { type: 'new', key: 'r15_2' },
    { type: 'new', key: 'r15_3' },
    { type: 'new', key: 'r15_4' },
    { type: 'new', key: 'r15_5' },
    { type: 'fix', key: 'r15_6' },
  ] },
  { version: 'v1.4', dateKey: 'may2026', badge: null, changes: [
    { type: 'new', key: 'r14_1' },
    { type: 'new', key: 'r14_2' },
    { type: 'new', key: 'r14_3' },
    { type: 'new', key: 'r14_4' },
    { type: 'new', key: 'r14_5' },
    { type: 'improved', key: 'r14_6' },
    { type: 'fix', key: 'r14_7' },
  ] },
  { version: 'v1.3', dateKey: 'apr2026', badge: null, changes: [
    { type: 'new', key: 'r13_1' },
    { type: 'new', key: 'r13_2' },
    { type: 'new', key: 'r13_3' },
    { type: 'new', key: 'r13_4' },
    { type: 'improved', key: 'r13_5' },
    { type: 'fix', key: 'r13_6' },
  ] },
  { version: 'v1.2', dateKey: 'mar2026', badge: null, changes: [
    { type: 'new', key: 'r12_1' },
    { type: 'new', key: 'r12_2' },
    { type: 'new', key: 'r12_3' },
    { type: 'new', key: 'r12_4' },
    { type: 'improved', key: 'r12_5' },
    { type: 'fix', key: 'r12_6' },
  ] },
  { version: 'v1.1', dateKey: 'feb2026', badge: null, changes: [
    { type: 'new', key: 'r11_1' },
    { type: 'new', key: 'r11_2' },
    { type: 'new', key: 'r11_3' },
    { type: 'new', key: 'r11_4' },
    { type: 'improved', key: 'r11_5' },
    { type: 'fix', key: 'r11_6' },
  ] },
  { version: 'v1.0', dateKey: 'jan2026', badge: 'Launch', changes: [
    { type: 'new', key: 'r10_1' },
    { type: 'new', key: 'r10_2' },
    { type: 'new', key: 'r10_3' },
    { type: 'new', key: 'r10_4' },
    { type: 'new', key: 'r10_5' },
  ] },
]

const releases = computed<Release[]>(() =>
  releaseMeta.map((r) => ({
    version: r.version,
    date: t(`changelog.dates.${r.dateKey}`),
    badge: r.badge,
    changes: r.changes.map((c) => ({ type: c.type, text: t(`changelog.entries.${c.key}`) })),
  })),
)

const typeConfig: Record<ChangeType, { label: string; classes: string }> = {
  new:      { label: 'New',      classes: 'bg-green-700/10 text-green-700 border-green-700/20' },
  improved: { label: 'Improved', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  fix:      { label: 'Fix',      classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-1000">

    <!-- Nav -->
    <header class="border-b border-gray-300 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
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
    <main class="max-w-3xl mx-auto px-6 py-14">
      <div class="mb-14">
        <div class="inline-flex items-center gap-2 bg-green-700/10 border border-green-700/20 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          {{ t('changelog.badge') }}
        </div>
        <h1 class="text-4xl font-bold font-sans text-gray-1000 mb-3">{{ t('changelog.title') }}</h1>
        <p class="text-gray-900 leading-relaxed">{{ t('changelog.subtitle') }}</p>
      </div>

      <!-- Timeline -->
      <div class="relative">
        <div class="absolute left-0 top-0 bottom-0 w-px bg-gray-400 ml-[5px]"></div>

        <div v-for="release in releases" :key="release.version" class="relative pl-10 mb-14 last:mb-0">
          <!-- Dot -->
          <div class="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-green-700 border-2 border-gray-100"></div>

          <!-- Header -->
          <div class="flex items-center gap-3 mb-5">
            <span class="text-xl font-bold font-sans text-gray-1000">{{ release.version }}</span>
            <span v-if="release.badge" class="text-xs font-semibold px-2 py-0.5 rounded-full border"
              :class="release.badge === 'Latest' ? 'bg-green-700/10 text-green-700 border-green-700/20' : 'bg-gray-400 text-gray-900 border-gray-500'">
              {{ badgeLabel(release.badge) }}
            </span>
            <span class="text-sm text-gray-700 ml-auto">{{ release.date }}</span>
          </div>

          <!-- Changes -->
          <div class="space-y-3">
            <div v-for="(change, i) in release.changes" :key="i" class="flex items-start gap-3">
              <span class="mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                :class="typeConfig[change.type].classes">
                {{ t('changelog.types.' + change.type) }}
              </span>
              <p class="text-sm text-gray-900 leading-relaxed">{{ change.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-300 mt-8 px-6 py-8 text-center">
      <div class="flex items-center justify-center gap-6 text-sm text-gray-700">
        <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.privacyPolicy') }}</router-link>
        <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.termsOfService') }}</router-link>
        <router-link :to="{ name: 'contact' }" class="hover:text-gray-1000 transition-colors">{{ t('legal.contact') }}</router-link>
      </div>
      <p class="text-xs text-gray-700/50 mt-4">{{ t('legal.copyright', { year: new Date().getFullYear() }) }}</p>
    </footer>
  </div>
</template>
