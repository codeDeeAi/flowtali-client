<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown.vue'
import ProfileDropdown from '@/components/profile/ProfileDropdown.vue'
import FlowtaliLogo from '@/components/ui/FlowtaliLogo.vue'

defineEmits<{
  toggleSidebar: []
}>()

const route     = useRoute()
const authStore = useAuthStore()

const orgName = computed(() => authStore.currentOrganization?.name ?? '')

const PAGE_TITLES: Record<string, string> = {
  dashboard:            'Dashboard',
  invoices:             'Invoices',
  'invoices.create':    'New Invoice',
  'invoices.view':      'Invoice',
  'invoices.edit':      'Edit Invoice',
  letterheads:          'Letterheads',
  'letterheads.create': 'New Letterhead',
  'letterheads.view':   'Letterhead',
  'letterheads.edit':   'Edit Letterhead',
  clients:              'Clients',
  'clients.create':     'New Client',
  'clients.view':       'Client',
  'clients.edit':       'Edit Client',
  members:              'Members',
  'members.view':       'Member',
  roles:                'Roles & Permissions',
  'org-preferences':    'Org Preferences',
  'audit-logs':         'Audit Logs',
  analytics:            'Analytics',
  subscription:         'Subscription',
  settings:             'Settings',
  profile:              'My Profile',
}

const pageTitle = computed(() => PAGE_TITLES[String(route.name)] ?? '')
</script>

<template>
  <nav class="flex items-center justify-between px-4 h-14 bg-bg-200 border-b border-gray-400 shrink-0 z-10">

    <!-- Left: hamburger + logo + breadcrumb -->
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button
        class="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-gray-900 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
        @click="$emit('toggleSidebar')"
        aria-label="Toggle sidebar"
      >
        <Icon icon="lucide:menu" class="w-5 h-5" />
      </button>

      <!-- Flowtali wordmark -->
      <RouterLink :to="{ name: 'dashboard' }" class="flex items-center shrink-0">
        <FlowtaliLogo variant="full" :size="18" />
      </RouterLink>

      <!-- Page title (mobile only) -->
      <span v-if="pageTitle" class="md:hidden text-sm font-semibold text-gray-1000">{{ pageTitle }}</span>

      <!-- Breadcrumb (desktop only) -->
      <div v-if="orgName && pageTitle" class="hidden md:flex items-center gap-1.5 text-sm">
        <div class="w-px h-4 bg-gray-400 mx-0.5"></div>
        <span class="text-gray-900 truncate max-w-35">{{ orgName }}</span>
        <Icon icon="lucide:chevron-right" class="w-3.5 h-3.5 text-gray-700 shrink-0" />
        <span class="text-gray-1000 font-medium">{{ pageTitle }}</span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1.5">
      <!-- Notifications dropdown -->
      <NotificationsDropdown />

      <!-- Profile dropdown -->
      <ProfileDropdown />
    </div>

  </nav>
</template>
