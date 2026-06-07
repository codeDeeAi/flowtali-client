<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/auth.service'

const route = useRoute()
const router = useRouter()
const { can, isBusinessOrg } = usePermissions()
const authStore = useAuthStore()

const showMore = ref(false)
const isLoggingOut = ref(false)

const moreItems = computed(() => {
  const items: { name: string; icon: string; to: string }[] = []
  if (isBusinessOrg.value && can('projects.read'))  items.push({ name: 'Projects',        icon: 'lucide:folder-kanban', to: '/app/projects' })
  if (can('receipts.read'))                         items.push({ name: 'Receipts',         icon: 'lucide:receipt',       to: '/app/receipts' })
  if (can('letterheads.read'))                      items.push({ name: 'Letterheads',      icon: 'lucide:file',          to: '/app/letterheads' })
  if (isBusinessOrg.value && can('members.read'))   items.push({ name: 'Members',          icon: 'lucide:users-2',       to: '/app/members' })
  if (isBusinessOrg.value && can('roles.read'))     items.push({ name: 'Roles',            icon: 'lucide:shield',        to: '/app/roles' })
  items.push({ name: 'Org Preferences', icon: 'lucide:building-2',  to: '/app/org-preferences' })
  if (can('analytics.read'))                        items.push({ name: 'Analytics',        icon: 'lucide:bar-chart-2',   to: '/app/analytics' })
  items.push({ name: 'Billing',         icon: 'lucide:credit-card', to: '/app/billing' })
  if (can('settings.read'))                         items.push({ name: 'Settings',         icon: 'lucide:settings',      to: '/app/settings' })
  items.push({ name: 'My Profile',      icon: 'lucide:user',        to: '/app/profile' })
  return items
})

function isActive(path: string) {
  return route.path.startsWith(path)
}

function navigate(to: string) {
  showMore.value = false
  router.push(to)
}

async function handleLogout() {
  showMore.value = false
  isLoggingOut.value = true
  try { await AuthService.logout() } catch {}
  authStore.logout()
  router.push({ name: 'signin' })
}
</script>

<template>
  <div class="md:hidden">

    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="showMore" class="fixed inset-0 bg-black/60 z-40" @click="showMore = false" />
    </Transition>

    <!-- More drawer (bottom sheet) -->
    <Transition name="slide-up">
      <div
        v-if="showMore"
        class="fixed bottom-16 left-0 right-0 z-50 bg-charcoal-800 border-t border-charcoal-700 rounded-t-2xl shadow-2xl max-h-[72vh] flex flex-col"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-2 shrink-0">
          <div class="w-10 h-1 rounded-full bg-charcoal-600" />
        </div>

        <!-- User info -->
        <div class="flex items-center gap-3 px-5 py-3 border-b border-charcoal-700/60 shrink-0">
          <div class="w-9 h-9 rounded-full bg-amber flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0">
            {{ (authStore.getUser?.first_name?.[0] ?? '').toUpperCase() }}{{ (authStore.getUser?.last_name?.[0] ?? '').toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-cream truncate capitalize">
              {{ authStore.getUser?.first_name }} {{ authStore.getUser?.last_name }}
            </div>
            <div class="text-xs text-cream-faint truncate">{{ authStore.getCurrentOrganization?.name }}</div>
          </div>
        </div>

        <!-- Nav grid (scrollable) -->
        <div class="grid grid-cols-3 gap-1 p-3 overflow-y-auto">
          <button
            v-for="item in moreItems"
            :key="item.to"
            :class="[
              'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors',
              isActive(item.to) ? 'bg-amber/10 text-amber' : 'text-cream-muted hover:bg-charcoal-700 hover:text-cream',
            ]"
            @click="navigate(item.to)"
          >
            <Icon :icon="item.icon" class="w-5 h-5 shrink-0" />
            <span class="text-[10px] font-medium text-center leading-tight">{{ item.name }}</span>
          </button>
        </div>

        <!-- Sign out -->
        <div class="px-3 pb-4 pt-2 border-t border-charcoal-700/60 shrink-0">
          <button
            :disabled="isLoggingOut"
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium disabled:opacity-50"
            @click="handleLogout"
          >
            <Icon v-if="!isLoggingOut" icon="lucide:log-out" class="w-4 h-4" />
            <Icon v-else icon="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Bottom bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 bg-dark-light border-t border-charcoal-700 flex items-stretch h-16 bottom-nav-safe">

      <!-- Dashboard -->
      <RouterLink
        :to="{ name: 'dashboard' }"
        :class="['flex-1 flex flex-col items-center justify-center gap-1 transition-colors', isActive('/app/dashboard') ? 'text-amber' : 'text-cream-faint']"
      >
        <Icon icon="lucide:layout-dashboard" class="w-5 h-5" />
        <span class="text-[10px] font-medium">Home</span>
      </RouterLink>

      <!-- Invoices -->
      <RouterLink
        v-if="can('invoices.read')"
        :to="{ name: 'invoices' }"
        :class="['flex-1 flex flex-col items-center justify-center gap-1 transition-colors', isActive('/app/invoices') ? 'text-amber' : 'text-cream-faint']"
      >
        <Icon icon="lucide:file-text" class="w-5 h-5" />
        <span class="text-[10px] font-medium">Invoices</span>
      </RouterLink>

      <!-- FAB (raised centre button) -->
      <div class="flex-1 flex items-center justify-center">
        <RouterLink
          v-if="can('invoices.create')"
          :to="{ name: 'invoices.create' }"
          class="w-12 h-12 -mt-5 rounded-full bg-amber hover:bg-amber-light flex items-center justify-center shadow-lg shadow-amber/30 transition-colors"
          aria-label="New Invoice"
        >
          <Icon icon="lucide:plus" class="w-5 h-5 text-charcoal-900" />
        </RouterLink>
      </div>

      <!-- Clients -->
      <RouterLink
        v-if="can('clients.read')"
        :to="{ name: 'clients' }"
        :class="['flex-1 flex flex-col items-center justify-center gap-1 transition-colors', isActive('/app/clients') ? 'text-amber' : 'text-cream-faint']"
      >
        <Icon icon="lucide:users" class="w-5 h-5" />
        <span class="text-[10px] font-medium">Clients</span>
      </RouterLink>

      <!-- More -->
      <button
        :class="['flex-1 flex flex-col items-center justify-center gap-1 transition-colors', showMore ? 'text-amber' : 'text-cream-faint']"
        @click="showMore = !showMore"
      >
        <Icon icon="lucide:grid-2x2" class="w-5 h-5" />
        <span class="text-[10px] font-medium">More</span>
      </button>

    </nav>
  </div>
</template>

<style scoped>
.bottom-nav-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease; }
.slide-up-leave-active { transition: transform 0.2s ease, opacity 0.15s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
