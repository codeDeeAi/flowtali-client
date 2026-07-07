<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
</script>
<template>
  <footer class="border-t border-gray-400/30 py-12 bg-bg-100">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-5 gap-10 mb-12">
        <div class="md:col-span-2">
          <router-link :to="{ name: 'home' }" class="flex items-center mb-4 cursor-pointer">
            <FlowtaliLogo variant="full" :size="20" />
          </router-link>
          <p class="text-gray-700 text-sm leading-relaxed max-w-xs">{{ t('footer.tagline') }}</p>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">{{ t('footer.products') }}</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'signup' }"
              class="text-gray-700 text-sm hover:text-gray-1000 cursor-pointer transition-colors">{{ t('footer.invoiceGenerator') }}</router-link>
            <router-link :to="{ name: 'signup' }"
              class="text-gray-700 text-sm hover:text-gray-1000 cursor-pointer transition-colors">{{ t('footer.letterheadGenerator') }}</router-link>
            <span class="text-gray-700 text-sm cursor-not-allowed opacity-50">{{ t('footer.pricing') }}</span>
            <router-link :to="{ name: 'changelog' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.changelog') }}</router-link>
          </div>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">{{ t('footer.developers') }}</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'docs.embed' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.embedSdk') }}</router-link>
            <router-link :to="{ name: 'docs.embed', hash: '#auth' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.apiKeys') }}</router-link>
            <router-link :to="{ name: 'docs.embed', hash: '#events' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.events') }}</router-link>
            <router-link :to="{ name: 'changelog' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.changelog') }}</router-link>
          </div>
        </div>
        <div>
          <div class="text-gray-1000 text-sm font-semibold mb-4">{{ t('footer.company') }}</div>
          <div class="flex flex-col gap-2.5">
            <router-link :to="{ name: 'about' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.about') }}</router-link>
            <router-link :to="{ name: 'privacy' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.privacy') }}</router-link>
            <router-link :to="{ name: 'terms' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.terms') }}</router-link>
            <router-link :to="{ name: 'contact' }"
              class="text-gray-700 text-sm hover:text-gray-1000 transition-colors">{{ t('footer.contact') }}</router-link>
          </div>
        </div>
      </div>
      <div class="section-divider mb-6"></div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-gray-700 text-xs">{{ t('footer.copyright', { year: new Date().getFullYear() }) }}</div>
        <div class="flex items-center gap-5 text-gray-700 text-xs">
          <router-link :to="{ name: 'about' }" class="hover:text-gray-1000 transition-colors">{{ t('footer.about') }}</router-link>
          <router-link :to="{ name: 'privacy' }" class="hover:text-gray-1000 transition-colors">{{ t('footer.privacy') }}</router-link>
          <router-link :to="{ name: 'terms' }" class="hover:text-gray-1000 transition-colors">{{ t('footer.terms') }}</router-link>
          <router-link :to="{ name: 'contact' }" class="hover:text-gray-1000 transition-colors">{{ t('footer.contact') }}</router-link>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  </footer>
</template>
