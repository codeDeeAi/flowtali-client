<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';
import { OrgService } from '@/services/org.service';
import type { IOrganization } from '@/types/auth.types';

defineProps<{
  mobileOpen: boolean;
}>();

defineEmits<{
  close: [];
}>();

const collapsed = ref(false);
const route = useRoute();
const authStore = useAuthStore();

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
  orgDropOpen.value = false;
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
  badge?: number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/app/dashboard' },
    ],
  },
  {
    label: 'Documents',
    items: [
      { name: 'Invoices', icon: 'lucide:file-text', to: '/app/invoices', badge: 12 },
      { name: 'Letterheads', icon: 'lucide:file', to: '/app/letterheads' },
      { name: 'Clients', icon: 'lucide:users', to: '/app/clients' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { name: 'Members', icon: 'lucide:users-2', to: '/app/members' },
      { name: 'Roles & Permissions', icon: 'lucide:shield', to: '/app/roles' },
      { name: 'Org Preferences', icon: 'lucide:building-2', to: '/app/org-preferences' },
      { name: 'Audit Logs', icon: 'lucide:scroll-text', to: '/app/audit-logs' },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Analytics', icon: 'lucide:bar-chart-2', to: '/app/analytics' },
      { name: 'Subscription', icon: 'lucide:credit-card', to: '/app/subscription' },
      { name: 'Settings', icon: 'lucide:settings', to: '/app/settings' },
      { name: 'My Profile', icon: 'lucide:user', to: '/app/profile' },
    ],
  },
];

function isActive(to: string) {
  return route.path.startsWith(to);
}
</script>

<template>
  <!-- Sidebar: fixed overlay on mobile, static in flex on desktop -->
  <aside
    :class="[
      'flex flex-col bg-dark-light border-r border-charcoal-700 shrink-0 transition-all duration-300 h-full overflow-hidden',
      // Mobile: absolute overlay, slide in/out
      'fixed md:static inset-y-0 left-0 z-30',
      // Mobile open/close
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      // Desktop collapsed state
      collapsed ? 'w-[60px]' : 'w-64',
    ]"
  >
    <!-- Logo row -->
    <div class="flex items-center h-14 px-3 border-b border-charcoal-700 shrink-0">
      <div class="flex items-center gap-2.5 flex-1 min-w-0">
        <div class="w-7 h-7 rounded-md bg-amber flex items-center justify-center shrink-0">
          <Icon icon="lucide:zap" class="w-4 h-4 text-charcoal-900" />
        </div>
        <span
          :class="['font-semibold text-cream text-sm overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
        >
          Flowtali
        </span>
      </div>

      <!-- Collapse toggle (desktop only) -->
      <button
        class="hidden md:flex items-center justify-center w-6 h-6 rounded text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors shrink-0"
        @click="collapsed = !collapsed"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <Icon :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" class="w-4 h-4" />
      </button>

      <!-- Close button (mobile only) -->
      <button
        class="md:hidden flex items-center justify-center w-6 h-6 rounded text-cream-faint hover:text-cream hover:bg-charcoal-700 transition-colors shrink-0"
        @click="$emit('close')"
        aria-label="Close sidebar"
      >
        <Icon icon="lucide:x" class="w-4 h-4" />
      </button>
    </div>

    <!-- Workspace switcher -->
    <div
      data-org-switcher
      :class="['mx-2 mt-3 mb-1 shrink-0 relative', collapsed ? 'px-0' : '']"
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
          class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0"
          :style="{ backgroundColor: orgColor(currentOrg.id) }"
        >
          {{ orgInitials(currentOrg.name) }}
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
                class="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-charcoal-900 shrink-0"
                :style="{ backgroundColor: orgColor(org.id) }"
              >
                {{ orgInitials(org.name) }}
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
    <div class="px-2 py-3 border-t border-charcoal-700 shrink-0">
      <RouterLink
        :to="{ name: 'profile' }"
        :class="[
          'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-charcoal-700 transition-colors group',
          collapsed ? 'justify-center' : '',
        ]"
        :title="collapsed ? `${authStore.getUser?.first_name} ${authStore.getUser?.last_name}` : undefined"
      >
        <div class="w-7 h-7 rounded-full bg-amber flex items-center justify-center text-xs font-bold text-charcoal-900 shrink-0">
          {{ (authStore.getUser?.first_name?.[0] ?? '').toUpperCase() }}{{ (authStore.getUser?.last_name?.[0] ?? '').toUpperCase() }}
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
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
/* Org dropdown */
.drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }

/* Create org modal */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
