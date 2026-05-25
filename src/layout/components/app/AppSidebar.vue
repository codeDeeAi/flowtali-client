<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { usePermissions } from '@/composables/usePermissions';
import { OrgService } from '@/services/org.service';
import { AuthService } from '@/services/auth.service';
import type { IOrganization } from '@/types/auth.types';

defineProps<{
  mobileOpen: boolean;
  collapsed: boolean;
}>();

defineEmits<{
  close: [];
  toggleCollapse: [];
}>();
const route = useRoute();
const router = useRouter();
const authStore    = useAuthStore();
const { can, isBusinessOrg } = usePermissions();

// ── User menu ────────────────────────────────────────────────
const userMenuOpen = ref(false);
const isLoggingOut = ref(false);

async function handleLogout() {
  isLoggingOut.value = true;
  try {
    await AuthService.logout();
  } catch {
    // Token may already be invalid; proceed with local logout
  } finally {
    authStore.logout();
    router.push({ name: 'signin' });
  }
}

// ── Org switcher ──────────────────────────────────────────────
const organizations = computed(() => authStore.getOrganizations);
const currentOrg = computed(() => authStore.getCurrentOrganization);

const orgDropOpen = ref(false);
const showCreateModal = ref(false);
const newOrgName = ref('');
const newOrgType = ref<'business' | 'personal'>('business');
const isCreating = ref(false);

const PALETTE = ['#e8a83e', '#60a5fa', '#4ade80', '#a78bfa', '#f87171', '#fb923c', '#38bdf8', '#34d399'];

function orgInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function orgColor(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length]!;
}

function orgRole(org: IOrganization): string {
  if (org.is_owner) return 'Owner';
  return org.roles[0]?.name ?? 'Member';
}

function switchOrg(org: IOrganization) {
  authStore.setCurrentOrganization(org);
  window.location.reload();
}

async function createOrg() {
  if (!newOrgName.value.trim() || isCreating.value) return;
  isCreating.value = true;
  try {
    const res = await OrgService.create({
      name: newOrgName.value.trim(),
      type: newOrgType.value,
    });
    authStore.addOrganization(res.data.data);
    newOrgName.value = '';
    newOrgType.value = 'business';
    showCreateModal.value = false;
    orgDropOpen.value = false;
  } finally {
    isCreating.value = false;
  }
}

// v-click-outside directive (local) — uses WeakMap to avoid patching HTMLElement
const clickOutsideHandlers = new WeakMap<HTMLElement, (e: Event) => void>();
const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    const handler = (e: Event) => {
      if (!el.contains(e.target as Node)) binding.value();
    };
    clickOutsideHandlers.set(el, handler);
    document.addEventListener('click', handler, true);
  },
  unmounted(el: HTMLElement) {
    const handler = clickOutsideHandlers.get(el);
    if (handler) document.removeEventListener('click', handler, true);
  },
};

interface NavItem {
  name: string;
  icon: string;
  to: string;
  badge?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections = computed<NavSection[]>(() => {
  const sections: NavSection[] = []

  // ── Always visible ────────────────────────────────────
  sections.push({
    items: [
      { name: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/app/dashboard' },
    ],
  })

  // ── Documents ─────────────────────────────────────────
  const docItems: NavItem[] = []
  if (isBusinessOrg.value && can('projects.read')) docItems.push({ name: 'Projects', icon: 'lucide:folder-kanban', to: '/app/projects' })
  if (can('invoices.read'))    docItems.push({ name: 'Invoices',    icon: 'lucide:file-text', to: '/app/invoices' })
  if (can('receipts.read'))    docItems.push({ name: 'Receipts',    icon: 'lucide:receipt',   to: '/app/receipts' })
  if (can('letterheads.read')) docItems.push({ name: 'Letterheads', icon: 'lucide:file',      to: '/app/letterheads' })
  if (can('clients.read'))     docItems.push({ name: 'Clients',     icon: 'lucide:users',     to: '/app/clients' })
  if (docItems.length) sections.push({ label: 'Documents', items: docItems })

  // ── Organization (business only) ─────────────────────
  const orgItems: NavItem[] = []
  if (isBusinessOrg.value) {
    if (can('members.read')) {
      orgItems.push({ name: 'Members', icon: 'lucide:users-2', to: '/app/members' })
    }
    if (can('roles.read')) {
      orgItems.push({ name: 'Roles & Permissions', icon: 'lucide:shield', to: '/app/roles' })
    }
  }
  orgItems.push({ name: 'Org Preferences', icon: 'lucide:building-2', to: '/app/org-preferences' })
  orgItems.push({ name: 'Audit Logs', icon: 'lucide:scroll-text', to: '/app/audit-logs' })

  sections.push({ label: isBusinessOrg.value ? 'Organization' : 'Workspace', items: orgItems })

  // ── Account ───────────────────────────────────────────
  const accountItems: { name: string; icon: string; to: string }[] = []
  if (can('analytics.read')) accountItems.push({ name: 'Analytics',    icon: 'lucide:bar-chart-2',  to: '/app/analytics' })
  accountItems.push({ name: 'Subscription', icon: 'lucide:credit-card',  to: '/app/subscription' })
  if (can('settings.read'))  accountItems.push({ name: 'Settings',     icon: 'lucide:settings',     to: '/app/settings' })
  accountItems.push({ name: 'My Profile',   icon: 'lucide:user',         to: '/app/profile' })
  sections.push({ label: 'Account', items: accountItems })

  return sections
})

function isActive(to: string) {
  return route.path.startsWith(to);
}
</script>

<template>
  <!-- Sidebar: fixed overlay on mobile, static in flex on desktop -->
  <aside
    :class="[
      'flex flex-col bg-dark-light border-r border-charcoal-700 shrink-0 transition-all duration-300 h-full relative',
      'fixed md:static inset-y-0 left-0 z-30',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      collapsed ? 'w-[60px]' : 'w-64',
    ]"
  >
    <!-- Mobile close button (floating, top-right) -->
    <button
      class="md:hidden absolute top-3 right-3 z-50 flex items-center justify-center w-7 h-7 rounded-md text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors"
      @click="$emit('close')"
      aria-label="Close sidebar"
    >
      <Icon icon="lucide:x" class="w-4 h-4" />
    </button>

    <!-- Workspace switcher -->
    <div
      data-org-switcher
      :class="['mx-2 mb-1 shrink-0 relative mt-12 md:mt-3', collapsed ? 'px-0' : '']"
      v-click-outside="() => (orgDropOpen = false)"
    >
      <!-- Trigger button -->
      <button
        :class="[
          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors group border',
          orgDropOpen
            ? 'bg-charcoal-700 border-amber/30'
            : 'hover:bg-charcoal-700 border-transparent',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? (currentOrg?.name ?? '') : undefined"
        @click="orgDropOpen = !orgDropOpen"
      >
        <div
          v-if="currentOrg"
          class="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-charcoal-900"
          :style="currentOrg.logo ? {} : { backgroundColor: orgColor(currentOrg.id) }"
        >
          <img v-if="currentOrg.logo" :src="currentOrg.logo" :alt="currentOrg.name" class="w-full h-full object-cover" />
          <span v-else>{{ orgInitials(currentOrg.name) }}</span>
        </div>
        <div
          :class="['flex-1 min-w-0 text-left overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
        >
          <div class="text-sm font-medium text-cream truncate leading-tight">{{ currentOrg?.name ?? 'Select organization' }}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-xs text-amber font-medium capitalize">{{ currentOrg?.type ?? '' }}</span>
          </div>
        </div>
        <Icon
          v-if="!collapsed"
          icon="lucide:chevrons-up-down"
          :class="['w-3.5 h-3.5 shrink-0 transition-colors', orgDropOpen ? 'text-amber' : 'text-cream-faint group-hover:text-cream-muted']"
        />
      </button>

      <!-- Dropdown -->
      <Transition name="drop">
        <div
          v-if="orgDropOpen && !collapsed"
          class="absolute top-full left-0 right-0 mt-1.5 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-2xl z-50 overflow-hidden"
          style="box-shadow: 0 16px 48px rgba(0,0,0,0.6);"
        >
          <!-- Header label -->
          <div class="px-3 pt-3 pb-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-widest text-cream-faint">Your Organizations</span>
          </div>

          <!-- Org list -->
          <div class="px-1.5 pb-1.5 space-y-0.5">
            <button
              v-for="org in organizations"
              :key="org.id"
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group/item"
              :class="currentOrg?.id === org.id ? 'bg-amber/8' : 'hover:bg-charcoal-700'"
              @click="switchOrg(org)"
            >
              <div
                class="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-charcoal-900"
                :style="org.logo ? {} : { backgroundColor: orgColor(org.id) }"
              >
                <img v-if="org.logo" :src="org.logo" :alt="org.name" class="w-full h-full object-cover" />
                <span v-else>{{ orgInitials(org.name) }}</span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="text-xs font-medium text-cream truncate leading-tight">{{ org.name }}</div>
                <div class="text-[10px] text-cream-faint">{{ orgRole(org) }}</div>
              </div>
              <Icon
                v-if="currentOrg?.id === org.id"
                icon="lucide:check"
                class="w-3.5 h-3.5 text-amber shrink-0"
              />
            </button>
          </div>

          <!-- Divider + Create button -->
          <div class="mx-3 h-px bg-charcoal-700 my-1"></div>
          <div class="px-1.5 pb-2">
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-amber hover:bg-amber/8 transition-colors"
              @click="orgDropOpen = false; showCreateModal = true"
            >
              <div class="w-7 h-7 rounded-md border border-dashed border-amber/40 flex items-center justify-center shrink-0">
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
              </div>
              <span class="text-xs font-medium">Create organization</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Create Org Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          @click.self="showCreateModal = false"
        >
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="font-display text-xl font-semibold text-cream mb-1">Create Organization</h2>
            <p class="text-xs text-cream-faint mb-5">Set up a new workspace for your team or business</p>

            <div class="space-y-4 mb-5">
              <div>
                <label class="app-label">Organization Name</label>
                <input
                  v-model="newOrgName"
                  class="app-inp"
                  placeholder="Acme Studio Inc."
                  @keydown.enter="createOrg"
                />
              </div>

              <div>
                <label class="app-label">Type</label>
                <div class="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    :class="[
                      'p-3 rounded-lg border text-left transition-colors',
                      newOrgType === 'business' ? 'border-amber/40 bg-amber/6' : 'border-charcoal-600 hover:border-charcoal-500',
                    ]"
                    @click="newOrgType = 'business'"
                  >
                    <div class="text-xs font-semibold" :class="newOrgType === 'business' ? 'text-amber' : 'text-cream-muted'">Business</div>
                    <div class="text-[10px] text-cream-faint mt-0.5">Team & client management</div>
                  </button>
                  <button
                    :class="[
                      'p-3 rounded-lg border text-left transition-colors',
                      newOrgType === 'personal' ? 'border-amber/40 bg-amber/6' : 'border-charcoal-600 hover:border-charcoal-500',
                    ]"
                    @click="newOrgType = 'personal'"
                  >
                    <div class="text-xs font-semibold" :class="newOrgType === 'personal' ? 'text-amber' : 'text-cream-muted'">Personal</div>
                    <div class="text-[10px] text-cream-faint mt-0.5">Solo freelancer mode</div>
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                class="flex-1 py-2 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors"
                @click="showCreateModal = false"
              >
                Cancel
              </button>
              <button
                class="flex-1 py-2 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                :disabled="!newOrgName.trim() || isCreating"
                @click="createOrg"
              >
                <svg v-if="isCreating" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
                <span>{{ isCreating ? 'Creating…' : 'Create' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-4 mt-1">
      <div v-for="section in navSections" :key="section.label ?? 'main'">
        <!-- Section label -->
        <div
          v-if="section.label"
          :class="[
            'text-[10px] font-semibold uppercase tracking-widest text-cream-faint px-2 mb-1 transition-all duration-300',
            collapsed ? 'opacity-0 select-none' : 'opacity-100',
          ]"
        >
          {{ section.label }}
        </div>

        <!-- Nav items -->
        <RouterLink
          v-for="item in section.items"
          :key="item.name"
          :to="item.to"
          :class="[
            'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors group relative',
            isActive(item.to)
              ? 'text-amber bg-amber-dim'
              : 'text-cream-muted hover:text-cream hover:bg-charcoal-700',
            collapsed ? 'justify-center' : '',
          ]"
          :title="collapsed ? item.name : undefined"
          @click="$emit('close')"
        >
          <!-- Active indicator bar -->
          <span
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber rounded-r"
          />

          <Icon :icon="item.icon" class="w-4 h-4 shrink-0" />

          <span
            :class="['flex-1 truncate overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
          >
            {{ item.name }}
          </span>

          <!-- Badge -->
          <span
            v-if="item.badge && !collapsed"
            class="text-[10px] font-semibold bg-amber text-charcoal-900 rounded-full px-1.5 py-0.5 leading-none shrink-0"
          >
            {{ item.badge }}
          </span>
        </RouterLink>
      </div>
    </nav>

    <!-- User profile (bottom) -->
    <div
      class="px-2 py-3 border-t border-charcoal-700 shrink-0 relative"
      v-click-outside="() => (userMenuOpen = false)"
    >
      <!-- User menu dropdown (opens upward) -->
      <Transition name="drop-up">
        <div
          v-if="userMenuOpen && !collapsed"
          class="absolute bottom-full left-2 right-2 mb-1.5 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-2xl overflow-hidden z-50"
          style="box-shadow: 0 -8px 32px rgba(0,0,0,0.5);"
        >
          <div class="px-1.5 py-1.5 space-y-0.5">
            <RouterLink
              :to="{ name: 'profile' }"
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-charcoal-700 transition-colors text-cream-muted hover:text-cream"
              @click="userMenuOpen = false"
            >
              <Icon icon="lucide:user" class="w-3.5 h-3.5 shrink-0" />
              <span class="text-xs font-medium">My Profile</span>
            </RouterLink>
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-900/30 transition-colors text-cream-muted hover:text-red-400 disabled:opacity-50"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              <Icon v-if="!isLoggingOut" icon="lucide:log-out" class="w-3.5 h-3.5 shrink-0" />
              <svg v-else class="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              <span class="text-xs font-medium">{{ isLoggingOut ? 'Signing out…' : 'Sign out' }}</span>
            </button>
          </div>
        </div>
      </Transition>

      <button
        :class="[
          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-charcoal-700 transition-colors group',
          userMenuOpen ? 'bg-charcoal-700' : '',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? `${authStore.getUser?.first_name} ${authStore.getUser?.last_name}` : undefined"
        @click="userMenuOpen = !userMenuOpen"
      >
        <div class="w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-charcoal-900"
          :class="authStore.getUser?.avatar ? '' : 'bg-amber'"
        >
          <img
            v-if="authStore.getUser?.avatar"
            :src="authStore.getUser.avatar"
            :alt="`${authStore.getUser.first_name} ${authStore.getUser.last_name}`"
            class="w-full h-full object-cover"
          />
          <span v-else>
            {{ (authStore.getUser?.first_name?.[0] ?? '').toUpperCase() }}{{ (authStore.getUser?.last_name?.[0] ?? '').toUpperCase() }}
          </span>
        </div>
        <div
          :class="['flex-1 min-w-0 text-left overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
        >
          <div class="text-sm font-medium text-cream truncate leading-tight capitalize">
            {{ authStore.getUser?.first_name }} {{ authStore.getUser?.last_name }}
          </div>
        </div>
        <Icon
          v-if="!collapsed"
          icon="lucide:more-horizontal"
          class="w-4 h-4 text-cream-faint group-hover:text-cream-muted shrink-0 transition-colors"
        />
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Org dropdown (opens downward) */
.drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }

/* User menu (opens upward) */
.drop-up-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-up-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.drop-up-enter-from, .drop-up-leave-to { opacity: 0; transform: translateY(6px); }

/* Create org modal */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
