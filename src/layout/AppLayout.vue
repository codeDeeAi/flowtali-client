<script setup lang="ts">
import { ref } from 'vue';
import { RouterView } from 'vue-router';
import AppHeader from './components/app/AppHeader.vue';
import AppSidebar from './components/app/AppSidebar.vue';

const mobileOpen = ref(false);
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader @toggle-sidebar="mobileOpen = !mobileOpen" />
    <main class="flex flex-row h-full overflow-hidden relative">
      <!-- Mobile overlay backdrop -->
      <Transition name="fade">
        <div
          v-if="mobileOpen"
          class="md:hidden fixed inset-0 bg-black/60 z-20"
          @click="mobileOpen = false"
        />
      </Transition>

      <AppSidebar :mobile-open="mobileOpen" @close="mobileOpen = false" />

      <div class="flex-1 bg-charcoal-900 overflow-auto">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>