<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);

const pages = [
  {
    id: 'products',
    name: 'Products'
  },
  {
    id: 'features',
    name: 'Features'
  },
  {
    id: 'pricing',
    name: 'Pricing'
  },
  {
    id: 'testimonials',
    name: 'Reviews'
  },
  {
    id: 'faq',
    name: 'FAQ'
  }
];

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
    :class="scrolled ? 'bg-charcoal-900/95 backdrop-blur-xl border-b border-charcoal-700/50 shadow-2xl' : ''">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link :to="{ name: 'home' }" class="flex items-center gap-3 cursor-pointer">
        <div
          class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber to-amber-light flex items-center justify-center amber-glow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 8h10M7 12h6M7 16h4" />
          </svg>
        </div>
        <span class="font-display font-semibold text-xl text-cream tracking-wide">Flowtali</span>
      </router-link>
      <div class="hidden md:flex items-center gap-8">
        <span v-for="page in pages" :key="page.id" class="nav-link" @click="scrollTo(page.id)">{{ page.name }}</span>
      </div>
      <div class="hidden md:flex items-center gap-3">
        <template v-if="isLoggedIn">
          <router-link :to="{ name: 'dashboard' }" class="btn-primary text-sm px-5 py-2.5">Dashboard</router-link>
        </template>
        <template v-else>
          <router-link :to="{ name: 'signin' }" class="btn-ghost text-sm px-4 py-2">Log in</router-link>
          <router-link :to="{ name: 'signup' }" class="btn-primary text-sm px-5 py-2.5">Get started free</router-link>
        </template>
      </div>
      <button class="md:hidden p-2 text-cream-muted" @click="mobileMenuOpen = true">
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
    <button class="absolute top-5 right-6 p-2 text-cream-muted" @click="mobileMenuOpen = false">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
    <router-link :to="{ name: 'home' }"
      class="font-display text-4xl font-semibold text-cream mb-2">Flowtali</router-link>
    <div class="section-divider mb-8"></div>
    <div class="flex flex-col gap-6">
      <span v-for="page in pages" :key="page.id"
        class="text-cream-muted text-xl font-light cursor-pointer hover:text-cream"
        @click="scrollTo(page.id); mobileMenuOpen = false">{{ page.name }}</span>

    </div>
    <div class="mt-auto flex flex-col gap-3">
      <template v-if="isLoggedIn">
        <router-link :to="{ name: 'dashboard' }" class="btn-primary w-full py-3">Dashboard</router-link>
      </template>
      <template v-else>
        <router-link :to="{ name: 'signin' }" class="btn-ghost w-full py-3">Log in</router-link>
        <router-link :to="{ name: 'signup' }" class="btn-primary w-full py-3">Get started free</router-link>
      </template>
    </div>
  </div>
</template>
