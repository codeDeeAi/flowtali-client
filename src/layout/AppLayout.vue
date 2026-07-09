<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { useTourStore } from '@/stores/tour'
import { useLocaleStore } from '@/stores/locale'
import { useFeedbackStore } from '@/stores/feedback'
import { ProfileService } from '@/services/profile.service'
import { OrgService } from '@/services/org.service'
import AppHeader from './components/app/AppHeader.vue'
import AppSidebar from './components/app/AppSidebar.vue'
import FeedbackModal from '@/components/modals/FeedbackModal.vue'
import WelcomeTourModal from '@/components/modals/WelcomeTourModal.vue'
import TourGuide from '@/components/tour/TourGuide.vue'
import AppBottomNav from './components/app/AppBottomNav.vue'

const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const tourStore = useTourStore()
const localeStore = useLocaleStore()
const feedbackStore = useFeedbackStore()
const router = useRouter()
const route = useRoute()

// Billing/account routes remain reachable while paywalled so the user can subscribe.
const PAYWALL_ALLOWED = new Set(['billing', 'profile'])
const mobileOpen = ref(false)
const collapsed = ref(false)
const showWelcomeModal = ref(false)
const currentUserEmail = ref('')

// On every mount (including post-org-switch reload) refresh profile and org permissions
// so the app never operates on stale cached data.
onMounted(async () => {
  const orgId = authStore.getCurrentOrganization?.id
  await Promise.allSettled([
    ProfileService.get().then(res => {
      const p = res.data.data
      currentUserEmail.value = p.email
      authStore.updateUserInfo({ first_name: p.first_name, last_name: p.last_name, avatar: p.avatar })
      authStore.updateMfaEnabled(p.mfa_enabled)
      // Adopt the user's server-stored language preference (authoritative across devices).
      localeStore.syncFromServer(p.locale)
    }),
    orgId
      ? OrgService.getMyMembership(orgId).then(res => authStore.updateOrganization(res.data.data))
      : Promise.resolve(),
    subStore.load(),
  ])

  // Once the free trial ends (and no paid plan), send the user to billing.
  if (subStore.isPaywalled && !PAYWALL_ALLOWED.has(String(route.name ?? ''))) {
    router.replace({ name: 'billing', query: { paywall: subStore.freeWindowExpired ? 'free_trial_ended' : 'subscription_required' } })
  }

  if (currentUserEmail.value && !tourStore.hasSeenWelcome(currentUserEmail.value)) {
    showWelcomeModal.value = true
  }

  // Deep-link from marketing emails: open the feedback panel, then clean the URL.
  if (route.query.feedback) {
    feedbackStore.open()
    const rest = { ...route.query }
    delete rest.feedback
    router.replace({ query: rest })
  }
})

function handleStartTour() {
  if (currentUserEmail.value) tourStore.markWelcomeSeen(currentUserEmail.value)
  showWelcomeModal.value = false
  tourStore.startTour()
}

function handleSkipTour() {
  if (currentUserEmail.value) tourStore.markWelcomeSeen(currentUserEmail.value)
  showWelcomeModal.value = false
}
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
        class="hidden md:flex absolute top-5 z-40 w-5 h-5 rounded-full bg-gray-200 border border-gray-500 items-center justify-center text-gray-700 hover:text-gray-1000 hover:border-gray-500 transition-all duration-300 shadow-lg"
        :style="{ left: collapsed ? 'calc(60px - 10px)' : 'calc(256px - 10px)' }"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="collapsed = !collapsed">
        <Icon :icon="collapsed ? 'lucide:chevron-right' : 'lucide:chevron-left'" class="w-3 h-3" />
      </button>

      <div class="bg-gray-100 overflow-auto pb-16 md:pb-0" :class="{ hidden: mobileOpen, 'flex-1': !mobileOpen }">
        <RouterView />
      </div>
    </main>
  </div>

  <AppBottomNav />
  <FeedbackModal />
  <WelcomeTourModal v-if="showWelcomeModal" @start-tour="handleStartTour" @skip="handleSkipTour" />
  <TourGuide />
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
