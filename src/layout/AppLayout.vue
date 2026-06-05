<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { ProfileService } from '@/services/profile.service'
import { OrgService } from '@/services/org.service'
import AppHeader from './components/app/AppHeader.vue'
import AppSidebar from './components/app/AppSidebar.vue'
import FeedbackModal from '@/components/modals/FeedbackModal.vue'

const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const mobileOpen = ref(false)
const collapsed = ref(false)

// On every mount (including post-org-switch reload) refresh profile and org permissions
// so the app never operates on stale cached data.
onMounted(async () => {
  const orgId = authStore.getCurrentOrganization?.id
  await Promise.allSettled([
    ProfileService.get().then(res => {
      const p = res.data.data
      authStore.updateUserInfo({ first_name: p.first_name, last_name: p.last_name, avatar: p.avatar })
      authStore.updateMfaEnabled(p.mfa_enabled)
    }),
    orgId
      ? OrgService.getMyMembership(orgId).then(res => authStore.updateOrganization(res.data.data))
      : Promise.resolve(),
    subStore.load(),
  ])
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader @toggle-sidebar="mobileOpen = !mobileOpen" />

    <main class="flex flex-row h-full overflow-hidden relative">
      <!-- Mobile overlay backdrop -->
      <Transition name="fade">
        <div v-if="mobileOpen" class="md:hidden fixed inset-0 bg-black/60 z-20" @click="mobileOpen = false" />
      </Transition>

      <AppSidebar :mobile-open="mobileOpen" :collapsed="collapsed" @close="mobileOpen = false"
        @toggle-collapse="collapsed = !collapsed" />

      <!-- Floating collapse toggle (desktop only) -->
      <button
        class="hidden md:flex absolute top-5 z-40 w-5 h-5 rounded-full bg-charcoal-800 border border-charcoal-600 items-center justify-center text-cream-faint hover:text-cream hover:border-charcoal-500 transition-all duration-300 shadow-lg"
        :style="{ left: collapsed ? 'calc(60px - 10px)' : 'calc(256px - 10px)' }"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="collapsed = !collapsed">
        <Icon :icon="collapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'" class="w-3 h-3" />
      </button>

      <div class=" bg-charcoal-900 overflow-auto" :class="{ hidden: mobileOpen, 'flex-1': !mobileOpen }">
        <RouterView />
      </div>
    </main>
  </div>

  <FeedbackModal />
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
