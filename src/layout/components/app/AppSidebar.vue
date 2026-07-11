<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { usePermissions } from '@/composables/usePermissions';
import { OrgService } from '@/services/org.service';
import { AuthService } from '@/services/auth.service';
import { useFeedbackStore } from '@/stores/feedback';
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
const { t } = useI18n();
const authStore      = useAuthStore();
const feedbackStore  = useFeedbackStore();
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

const PALETTE = ['#00c853', '#60a5fa', '#4ade80', '#a78bfa', '#f87171', '#fb923c', '#38bdf8', '#34d399'];

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
  dataTour?: string;
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
      { name: t('app.nav.dashboard'), icon: 'lucide:layout-dashboard', to: '/app/dashboard', dataTour: 'nav-dashboard' },
      { name: t('app.nav.ai'), icon: 'lucide:sparkles', to: '/app/ai', dataTour: 'nav-ai' },
    ],
  })

  // ── Documents ─────────────────────────────────────────
  const docItems: NavItem[] = []
  if (isBusinessOrg.value && can('projects.read')) docItems.push({ name: t('app.nav.projects'), icon: 'lucide:folder-kanban', to: '/app/projects', dataTour: 'nav-projects' })
  if (can('invoices.read'))    docItems.push({ name: t('app.nav.invoices'),    icon: 'lucide:file-text', to: '/app/invoices',    dataTour: 'nav-invoices' })
  if (can('receipts.read'))    docItems.push({ name: t('app.nav.receipts'),    icon: 'lucide:receipt',   to: '/app/receipts' })
  if (can('letterheads.read')) docItems.push({ name: t('app.nav.letterheads'), icon: 'lucide:file',      to: '/app/letterheads' })
  if (can('clients.read'))     docItems.push({ name: t('app.nav.clients'),     icon: 'lucide:users',     to: '/app/clients',     dataTour: 'nav-clients' })
  if (docItems.length) sections.push({ label: t('app.sections.documents'), items: docItems })

  // ── Organization (business only) ─────────────────────
  const orgItems: NavItem[] = []
  if (isBusinessOrg.value) {
    if (can('members.read')) {
      orgItems.push({ name: t('app.nav.members'), icon: 'lucide:users-2', to: '/app/members', dataTour: 'nav-members' })
    }
    if (can('roles.read')) {
      orgItems.push({ name: t('app.nav.roles'), icon: 'lucide:shield', to: '/app/roles', dataTour: 'nav-roles' })
    }
  }
  orgItems.push({ name: t('app.nav.orgPreferences'), icon: 'lucide:building-2', to: '/app/org-preferences', dataTour: 'nav-org-preferences' })
  orgItems.push({ name: t('app.nav.auditLogs'), icon: 'lucide:scroll-text', to: '/app/audit-logs' })

  sections.push({ label: isBusinessOrg.value ? t('app.sections.organization') : t('app.sections.workspace'), items: orgItems })

  // ── Account ───────────────────────────────────────────
  const accountItems: NavItem[] = []
  if (can('analytics.read')) accountItems.push({ name: t('app.nav.analytics'), icon: 'lucide:bar-chart-2', to: '/app/analytics', dataTour: 'nav-analytics' })
  accountItems.push({ name: t('app.nav.billing'), icon: 'lucide:credit-card', to: '/app/billing' })
  if (can('settings.read'))  accountItems.push({ name: t('app.nav.settings'),     icon: 'lucide:settings',     to: '/app/settings' })
  accountItems.push({ name: t('app.nav.profile'),   icon: 'lucide:user',         to: '/app/profile' })
  sections.push({ label: t('app.sections.account'), items: accountItems })

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
      'flex flex-col bg-bg-200 border-r border-gray-400 shrink-0 transition-all duration-300 h-full relative',
      'fixed md:static inset-y-0 left-0 z-30',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 hidden md:block',
      collapsed ? 'w-[60px]' : 'w-64',
    ]"
  >
    <!-- Mobile close button (floating, top-right) -->
    <button
      class="md:hidden absolute top-3 right-3 z-50 flex items-center justify-center w-7 h-7 rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
      @click="$emit('close')"
      :aria-label="t('app.sidebar.close')"
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
            ? 'bg-gray-400 border-green-700/30'
            : 'hover:bg-gray-400 border-transparent',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? (currentOrg?.name ?? '') : undefined"
        @click="orgDropOpen = !orgDropOpen"
      >
        <div
          v-if="currentOrg"
          class="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-bg-100"
          :style="currentOrg.logo ? {} : { backgroundColor: orgColor(currentOrg.id) }"
        >
          <img v-if="currentOrg.logo" :src="currentOrg.logo" :alt="currentOrg.name" class="w-full h-full object-cover" />
          <span v-else>{{ orgInitials(currentOrg.name) }}</span>
        </div>
        <div
          :class="['flex-1 min-w-0 text-left overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
        >
          <div class="text-sm font-medium text-gray-1000 truncate leading-tight">{{ currentOrg?.name ?? t('app.sidebar.selectOrg') }}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-xs text-green-700 font-medium capitalize">{{ currentOrg?.type ?? '' }}</span>
          </div>
        </div>
        <Icon
          v-if="!collapsed"
          icon="lucide:chevrons-up-down"
          :class="['w-3.5 h-3.5 shrink-0 transition-colors', orgDropOpen ? 'text-green-700' : 'text-gray-700 group-hover:text-gray-900']"
        />
      </button>

      <!-- Dropdown -->
      <Transition name="drop">
        <div
          v-if="orgDropOpen && !collapsed"
          class="absolute top-full left-0 right-0 mt-1.5 bg-gray-200 border border-gray-500 rounded-xl shadow-2xl z-50 overflow-hidden"
          style="box-shadow: 0 16px 48px rgba(0,0,0,0.6);"
        >
          <!-- Header label -->
          <div class="px-3 pt-3 pb-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-700">{{ t('app.sidebar.yourOrgs') }}</span>
          </div>

          <!-- Org list -->
          <div class="px-1.5 pb-1.5 space-y-0.5">
            <button
              v-for="org in organizations"
              :key="org.id"
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group/item"
              :class="currentOrg?.id === org.id ? 'bg-green-700/8' : 'hover:bg-gray-400'"
              @click="switchOrg(org)"
            >
              <div
                class="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-bg-100"
                :style="org.logo ? {} : { backgroundColor: orgColor(org.id) }"
              >
                <img v-if="org.logo" :src="org.logo" :alt="org.name" class="w-full h-full object-cover" />
                <span v-else>{{ orgInitials(org.name) }}</span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="text-xs font-medium text-gray-1000 truncate leading-tight">{{ org.name }}</div>
                <div class="text-[10px] text-gray-700">{{ orgRole(org) }}</div>
              </div>
              <Icon
                v-if="currentOrg?.id === org.id"
                icon="lucide:check"
                class="w-3.5 h-3.5 text-green-700 shrink-0"
              />
            </button>
          </div>

          <!-- Divider + Create button -->
          <div class="mx-3 h-px bg-gray-400 my-1"></div>
          <div class="px-1.5 pb-2">
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-green-700 hover:bg-green-700/8 transition-colors"
              @click="orgDropOpen = false; showCreateModal = true"
            >
              <div class="w-7 h-7 rounded-md border border-dashed border-green-700/40 flex items-center justify-center shrink-0">
                <Icon icon="lucide:plus" class="w-3.5 h-3.5" />
              </div>
              <span class="text-xs font-medium">{{ t('app.sidebar.createOrg') }}</span>
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
          <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="font-sans text-xl font-semibold text-gray-1000 mb-1">{{ t('app.createOrg.title') }}</h2>
            <p class="text-xs text-gray-700 mb-5">{{ t('app.createOrg.subtitle') }}</p>

            <div class="space-y-4 mb-5">
              <div>
                <label class="app-label">{{ t('app.createOrg.nameLabel') }}</label>
                <input
                  v-model="newOrgName"
                  class="app-inp"
                  placeholder="Acme Studio Inc."
                  @keydown.enter="createOrg"
                />
              </div>

              <div>
                <label class="app-label">{{ t('app.createOrg.typeLabel') }}</label>
                <div class="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    :class="[
                      'p-3 rounded-lg border text-left transition-colors',
                      newOrgType === 'business' ? 'border-green-700/40 bg-green-700/6' : 'border-gray-500 hover:border-gray-500',
                    ]"
                    @click="newOrgType = 'business'"
                  >
                    <div class="text-xs font-semibold" :class="newOrgType === 'business' ? 'text-green-700' : 'text-gray-900'">{{ t('app.createOrg.business') }}</div>
                    <div class="text-[10px] text-gray-700 mt-0.5">{{ t('app.createOrg.businessDesc') }}</div>
                  </button>
                  <button
                    :class="[
                      'p-3 rounded-lg border text-left transition-colors',
                      newOrgType === 'personal' ? 'border-green-700/40 bg-green-700/6' : 'border-gray-500 hover:border-gray-500',
                    ]"
                    @click="newOrgType = 'personal'"
                  >
                    <div class="text-xs font-semibold" :class="newOrgType === 'personal' ? 'text-green-700' : 'text-gray-900'">{{ t('app.createOrg.personal') }}</div>
                    <div class="text-[10px] text-gray-700 mt-0.5">{{ t('app.createOrg.personalDesc') }}</div>
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                class="flex-1 py-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors"
                @click="showCreateModal = false"
              >
                {{ t('app.createOrg.cancel') }}
              </button>
              <button
                class="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                :disabled="!newOrgName.trim() || isCreating"
                @click="createOrg"
              >
                <svg v-if="isCreating" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
                <span>{{ isCreating ? t('app.createOrg.creating') : t('app.createOrg.create') }}</span>
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
            'text-[10px] font-semibold uppercase tracking-widest text-gray-700 px-2 mb-1 transition-all duration-300',
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
          :data-tour="item.dataTour"
          :class="[
            'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors group relative',
            isActive(item.to)
              ? 'text-green-700 bg-green-100'
              : 'text-gray-900 hover:text-gray-1000 hover:bg-gray-400',
            collapsed ? 'justify-center' : '',
          ]"
          :title="collapsed ? item.name : undefined"
          @click="$emit('close')"
        >
          <!-- Active indicator bar -->
          <span
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-700 rounded-r"
          />

          <Icon :icon="item.icon" class="w-4 h-4 shrink-0" />

          <span
            :class="['flex-1 truncate overflow-hidden transition-all duration-300', collapsed ? 'hidden' : 'w-auto opacity-100']"
          >
            {{ item.name }}
          </span>

          <!-- Badge -->
          <span
            v-if="item.badge && !collapsed"
            class="text-[10px] font-semibold bg-green-700 text-bg-100 rounded-full px-1.5 py-0.5 leading-none shrink-0"
          >
            {{ item.badge }}
          </span>
        </RouterLink>
      </div>
    </nav>

    <!-- Feedback button -->
    <div class="px-2 pb-2 shrink-0">
      <button
        @click="feedbackStore.open()"
        :class="[
          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors text-gray-700 hover:text-gray-1000 hover:bg-gray-400',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? t('app.sidebar.shareFeedback') : undefined"
      >
        <Icon icon="lucide:message-square-plus" class="w-4 h-4 shrink-0" />
        <span :class="['text-xs font-medium transition-all duration-300', collapsed ? 'hidden' : '']">{{ t('app.sidebar.feedback') }}</span>
      </button>
    </div>

    <!-- User profile (bottom) -->
    <div
      class="px-2 py-3 border-t border-gray-400 shrink-0 relative"
      v-click-outside="() => (userMenuOpen = false)"
    >
      <!-- User menu dropdown (opens upward) -->
      <Transition name="drop-up">
        <div
          v-if="userMenuOpen && !collapsed"
          class="absolute bottom-full left-2 right-2 mb-1.5 bg-gray-200 border border-gray-500 rounded-xl shadow-2xl overflow-hidden z-50"
          style="box-shadow: 0 -8px 32px rgba(0,0,0,0.5);"
        >
          <div class="px-1.5 py-1.5 space-y-0.5">
            <RouterLink
              :to="{ name: 'profile' }"
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-400 transition-colors text-gray-900 hover:text-gray-1000"
              @click="userMenuOpen = false"
            >
              <Icon icon="lucide:user" class="w-3.5 h-3.5 shrink-0" />
              <span class="text-xs font-medium">{{ t('app.userMenu.myProfile') }}</span>
            </RouterLink>
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-900/30 transition-colors text-gray-900 hover:text-red-400 disabled:opacity-50"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              <Icon v-if="!isLoggingOut" icon="lucide:log-out" class="w-3.5 h-3.5 shrink-0" />
              <svg v-else class="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              <span class="text-xs font-medium">{{ isLoggingOut ? t('app.userMenu.signingOut') : t('app.userMenu.signOut') }}</span>
            </button>
          </div>
        </div>
      </Transition>

      <button
        :class="[
          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-400 transition-colors group',
          userMenuOpen ? 'bg-gray-400' : '',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? `${authStore.getUser?.first_name} ${authStore.getUser?.last_name}` : undefined"
        @click="userMenuOpen = !userMenuOpen"
      >
        <div class="w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-bg-100"
          :class="authStore.getUser?.avatar ? '' : 'bg-green-700'"
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
          <div class="text-sm font-medium text-gray-1000 truncate leading-tight capitalize">
            {{ authStore.getUser?.first_name }} {{ authStore.getUser?.last_name }}
          </div>
        </div>
        <Icon
          v-if="!collapsed"
          icon="lucide:more-horizontal"
          class="w-4 h-4 text-gray-700 group-hover:text-gray-900 shrink-0 transition-colors"
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
