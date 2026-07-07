<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);

const pages = computed(() => [
  { id: 'products', name: t('nav.products') },
  { id: 'features', name: t('nav.features') },
  { id: 'pricing', name: t('nav.pricing') },
  { id: 'testimonials', name: t('nav.reviews') },
  { id: 'faq', name: t('nav.faq') },
]);

const route = useRoute();
const router = useRouter();
const scrolled = ref<boolean>(false);
const mobileMenuOpen = ref<boolean>(false);

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
  }
);

const scrollTo = (id: string) => {

  if (route.name === 'home') {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  };

  router.push({ name: 'home' }).then(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  });
};

const handleScroll = () => scrolled.value = window.scrollY > 20;

onMounted(() => window.addEventListener('scroll', handleScroll));

onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>
<template>
  <!-- Desktop -->
  <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-gray-100/95 backdrop-blur-xl border-b border-gray-400/50 shadow-2xl' : ''">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link :to="{ name: 'home' }" class="flex items-center cursor-pointer">
        <FlowtaliLogo variant="full" :size="22" />
      </router-link>
      <div class="hidden md:flex items-center gap-8">
        <span v-for="page in pages" :key="page.id" class="nav-link" @click="scrollTo(page.id)">{{ page.name }}</span>
        <router-link :to="{ name: 'docs.embed' }" class="nav-link">{{ t('nav.developers') }}</router-link>
      </div>
      <div class="hidden md:flex items-center gap-3">
        <LanguageSwitcher />
        <template v-if="isLoggedIn">
          <router-link :to="{ name: 'dashboard' }" class="btn-primary text-sm px-5 py-2.5">{{ t('nav.dashboard') }}</router-link>
        </template>
        <template v-else>
          <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-4 py-2">{{ t('nav.login') }}</router-link>
          <router-link :to="{ name: 'signup' }" class="btn-primary text-sm px-5 py-2.5">{{ t('nav.getStartedFree') }}</router-link>
        </template>
      </div>
      <button class="md:hidden p-2 text-gray-900" @click="mobileMenuOpen = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  </nav>

  <!-- Mobile -->
  <div v-if="mobileMenuOpen" class="mobile-menu flex flex-col p-8 pt-24">
    <button class="absolute top-5 right-6 p-2 text-gray-900" @click="mobileMenuOpen = false">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
    <router-link :to="{ name: 'home' }" class="mb-2">
      <FlowtaliLogo variant="wordmark" :size="36" />
    </router-link>
    <div class="section-divider mb-8"></div>
    <div class="flex flex-col gap-6">
      <span v-for="page in pages" :key="page.id"
        class="text-gray-900 text-xl font-light cursor-pointer hover:text-gray-1000"
        @click="scrollTo(page.id); mobileMenuOpen = false">{{ page.name }}</span>
      <router-link :to="{ name: 'docs.embed' }" @click="mobileMenuOpen = false"
        class="text-gray-900 text-xl font-light hover:text-gray-1000 transition-colors">{{ t('nav.developers') }}</router-link>
    </div>
    <div class="mt-auto flex flex-col gap-3">
      <div class="flex justify-center pb-2">
        <LanguageSwitcher />
      </div>
      <template v-if="isLoggedIn">
        <router-link :to="{ name: 'dashboard' }" class="btn-primary w-full py-3">{{ t('nav.dashboard') }}</router-link>
      </template>
      <template v-else>
        <router-link :to="{ name: 'signin' }" class="btn-ghost w-full py-3">{{ t('nav.login') }}</router-link>
        <router-link :to="{ name: 'signup' }" class="btn-primary w-full py-3">{{ t('nav.getStartedFree') }}</router-link>
      </template>
    </div>
  </div>
</template>
