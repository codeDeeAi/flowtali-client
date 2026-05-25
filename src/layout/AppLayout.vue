<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { ProfileService } from '@/services/profile.service'
import AppHeader from './components/app/AppHeader.vue'
import AppSidebar from './components/app/AppSidebar.vue'

const authStore  = useAuthStore()
const mobileOpen = ref(false)
const collapsed  = ref(false)

// Changing this key destroys and remounts the active page, re-running all
// onMounted data fetches against the newly selected organisation.
const orgViewKey = computed(() => authStore.getCurrentOrganization?.id ?? 'no-org')

// Sync avatar from API on every mount so the sidebar always shows the latest photo
// even for sessions that pre-date the avatar field being added to the login response.
onMounted(async () => {
  try {
    const res = await ProfileService.get()
    authStore.updateUserInfo({ avatar: res.data.data.avatar })
  } catch {}
})
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

      <AppSidebar
        :mobile-open="mobileOpen"
        :collapsed="collapsed"
        @close="mobileOpen = false"
        @toggle-collapse="collapsed = !collapsed"
      />

      <!-- Floating collapse toggle (desktop only) -->
      <button
        class="hidden md:flex absolute top-5 z-40 w-5 h-5 rounded-full bg-charcoal-800 border border-charcoal-600 items-center justify-center text-cream-faint hover:text-cream hover:border-charcoal-500 transition-all duration-300 shadow-lg"
        :style="{ left: collapsed ? 'calc(60px - 10px)' : 'calc(256px - 10px)' }"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="collapsed = !collapsed"
      >
        <Icon
          :icon="collapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'"
          class="w-3 h-3"
        />
      </button>

      <div class="flex-1 bg-charcoal-900 overflow-auto">
        <RouterView :key="orgViewKey" />
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
