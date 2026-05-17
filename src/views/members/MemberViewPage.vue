<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/notification.ts';

const router = useRouter();
const route  = useRoute();
const { notify } = useNotification();

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'Owner' | 'Admin' | 'Editor' | 'Member';

interface Member {
  id: number; name: string; email: string; initials: string;
  color: string; role: Role; active: boolean; lastActive: string;
  joined: string; phone: string; department: string; bio: string;
}

interface ActivityItem {
  id: number; action: string; target: string; time: string; icon: string; iconColor: string;
}

interface Permission { resource: string; view: boolean | null; create: boolean | null; edit: boolean | null; delete: boolean | null; }

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockMembers: Member[] = [
  { id: 1, name: 'Ada Lovelace',  email: 'ada@acmestudio.io',    initials: 'AL', color: '#e8a83e', role: 'Owner',  active: true,  lastActive: 'Just now',    joined: 'Jan 2024', phone: '+1 415 555 0101', department: 'Leadership', bio: 'Founder and creative director of Acme Design Studio.' },
  { id: 2, name: 'Luca Ferretti', email: 'luca@acmestudio.io',   initials: 'LF', color: '#60a5fa', role: 'Admin',  active: true,  lastActive: '1h ago',      joined: 'Mar 2024', phone: '+39 02 1234 5678', department: 'Operations', bio: 'Handles day-to-day operations and client relationships.' },
  { id: 3, name: 'Priya Nair',    email: 'priya@acmestudio.io',  initials: 'PN', color: '#a78bfa', role: 'Member', active: false, lastActive: '3 days ago',  joined: 'Jul 2024', phone: '+91 98765 43210', department: 'Design',     bio: 'Brand and visual identity designer.' },
  { id: 4, name: 'Marcus Bell',   email: 'marcus@acmestudio.io', initials: 'MB', color: '#4ade80', role: 'Editor', active: true,  lastActive: '30 min ago',  joined: 'Sep 2024', phone: '+1 212 555 0199', department: 'Design',     bio: 'Motion and interactive design specialist.' },
  { id: 5, name: 'Sofia Chen',    email: 'sofia@acmestudio.io',  initials: 'SC', color: '#f87171', role: 'Member', active: false, lastActive: '2 weeks ago', joined: 'Nov 2024', phone: '+86 10 6552 0100', department: 'Marketing', bio: 'Social media and content strategy.' },
  { id: 6, name: 'James Okafor',  email: 'james@acmestudio.io',  initials: 'JO', color: '#38bdf8', role: 'Editor', active: true,  lastActive: '4h ago',      joined: 'Dec 2024', phone: '+234 1 461 0000',  department: 'Design',    bio: 'UI/UX and product design lead.' },
];

const mockActivity: Record<number, ActivityItem[]> = {
  1: [
    { id: 1, action: 'Created invoice',    target: 'INV-0042 for Globex Corp',     time: '2h ago',      icon: 'lucide:file-plus',    iconColor: 'text-green-400' },
    { id: 2, action: 'Invited member',     target: 'james@studio.co as Editor',    time: '1 day ago',   icon: 'lucide:user-plus',    iconColor: 'text-blue-400' },
    { id: 3, action: 'Updated settings',   target: 'Organisation preferences',     time: '2 days ago',  icon: 'lucide:settings',     iconColor: 'text-cream-faint' },
    { id: 4, action: 'Created letterhead', target: '"Studio Minimal" template',    time: '4 days ago',  icon: 'lucide:layout',       iconColor: 'text-amber' },
    { id: 5, action: 'Marked paid',        target: 'INV-0039 · $1,200',           time: '1 week ago',  icon: 'lucide:check-circle', iconColor: 'text-green-400' },
  ],
  2: [
    { id: 1, action: 'Updated client',     target: 'James Johnson – Globex Corp',  time: '3h ago',      icon: 'lucide:user-cog',     iconColor: 'text-blue-400' },
    { id: 2, action: 'Sent invoice',       target: 'INV-0041 to Pixel Works',      time: '1 day ago',   icon: 'lucide:send',         iconColor: 'text-amber' },
    { id: 3, action: 'Changed role',       target: 'Priya Nair → Member',          time: '5 days ago',  icon: 'lucide:shield',       iconColor: 'text-purple-400' },
  ],
  3: [
    { id: 1, action: 'Created invoice',    target: 'INV-0040 for Nova Agency',     time: '3 days ago',  icon: 'lucide:file-plus',    iconColor: 'text-green-400' },
    { id: 2, action: 'Added client',       target: 'Kofi Acheampong – Nova Agency', time: '1 week ago', icon: 'lucide:user-plus',    iconColor: 'text-blue-400' },
  ],
  4: [
    { id: 1, action: 'Edited invoice',     target: 'INV-0038 – Studio X',          time: '30 min ago',  icon: 'lucide:file-edit',    iconColor: 'text-amber' },
    { id: 2, action: 'Created letterhead', target: '"Bold & Dark" template',       time: '2 days ago',  icon: 'lucide:layout',       iconColor: 'text-amber' },
    { id: 3, action: 'Added client',       target: 'Marcus Bell – Studio X',       time: '1 week ago',  icon: 'lucide:user-plus',    iconColor: 'text-blue-400' },
  ],
  5: [
    { id: 1, action: 'Created invoice',    target: 'INV-0036 for a client',        time: '2 weeks ago', icon: 'lucide:file-plus',    iconColor: 'text-green-400' },
  ],
  6: [
    { id: 1, action: 'Edited invoice',     target: 'INV-0037 – Frontier Tech',     time: '4h ago',      icon: 'lucide:file-edit',    iconColor: 'text-amber' },
    { id: 2, action: 'Created invoice',    target: 'INV-0035 for Frontier Tech',   time: '2 days ago',  icon: 'lucide:file-plus',    iconColor: 'text-green-400' },
    { id: 3, action: 'Added client',       target: 'Chen Wei – Frontier Tech',     time: '3 weeks ago', icon: 'lucide:user-plus',    iconColor: 'text-blue-400' },
  ],
};

const rolePermissions: Record<Role, Permission[]> = {
  Owner: [
    { resource: 'Invoices',     view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Clients',      view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Letterheads',  view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Members',      view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Settings',     view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Billing',      view: true,  create: true,  edit: true,  delete: true  },
  ],
  Admin: [
    { resource: 'Invoices',     view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Clients',      view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Letterheads',  view: true,  create: true,  edit: true,  delete: true  },
    { resource: 'Members',      view: true,  create: true,  edit: true,  delete: false },
    { resource: 'Settings',     view: true,  create: true,  edit: true,  delete: false },
    { resource: 'Billing',      view: true,  create: false, edit: false, delete: false },
  ],
  Editor: [
    { resource: 'Invoices',     view: true,  create: true,  edit: true,  delete: false },
    { resource: 'Clients',      view: true,  create: true,  edit: true,  delete: false },
    { resource: 'Letterheads',  view: true,  create: true,  edit: true,  delete: false },
    { resource: 'Members',      view: true,  create: false, edit: false, delete: false },
    { resource: 'Settings',     view: false, create: false, edit: false, delete: false },
    { resource: 'Billing',      view: false, create: false, edit: false, delete: false },
  ],
  Member: [
    { resource: 'Invoices',     view: true,  create: true,  edit: null,  delete: false },
    { resource: 'Clients',      view: true,  create: true,  edit: null,  delete: false },
    { resource: 'Letterheads',  view: true,  create: true,  edit: null,  delete: false },
    { resource: 'Members',      view: true,  create: false, edit: false, delete: false },
    { resource: 'Settings',     view: false, create: false, edit: false, delete: false },
    { resource: 'Billing',      view: false, create: false, edit: false, delete: false },
  ],
};

// ─── State ─────────────────────────────────────────────────────────────────
const member   = ref<Member | null>(null);
const activity = ref<ActivityItem[]>([]);
const loading  = ref(true);
const notFound = ref(false);
const showRemoveConfirm = ref(false);
const showChangeRole    = ref(false);
const newRole  = ref<Role>('Member');

onMounted(async () => {
  await new Promise(r => setTimeout(r, 350));
  const id    = Number(route.params.id);
  const found = mockMembers.find(m => m.id === id);
  if (!found) { notFound.value = true; loading.value = false; return; }
  member.value   = found;
  activity.value = mockActivity[id] ?? [];
  newRole.value  = found.role === 'Owner' ? 'Admin' : found.role;
  loading.value  = false;
});

// ─── Derived ────────────────────────────────────────────────────────────────
const permissions = computed(() =>
  member.value ? rolePermissions[member.value.role] : []
);

const roleClass: Record<string, string> = {
  Owner: 'role-owner', Admin: 'role-admin', Editor: 'role-editor', Member: 'role-member',
};

const roleOptions: { value: Role; label: string; desc: string }[] = [
  { value: 'Admin',  label: 'Admin',  desc: 'Full access except billing' },
  { value: 'Editor', label: 'Editor', desc: 'Can create and edit documents' },
  { value: 'Member', label: 'Member', desc: 'Can manage own documents only' },
];

// ─── Actions ──────────────────────────────────────────────────────────────
const handleChangeRole = () => {
  if (!member.value) return;
  member.value.role = newRole.value;
  notify(`Role updated to ${newRole.value}`, 'success');
  showChangeRole.value = false;
};

const handleRemove = () => {
  if (!member.value) return;
  notify(`${member.value.name} has been removed`, 'success');
  showRemoveConfirm.value = false;
  router.push({ name: 'members' });
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-6 min-h-full">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-cream-faint animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:user-x" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">Member not found</p>
      <button @click="router.push({ name: 'members' })" class="mt-4 text-amber text-sm hover:underline">Back to members</button>
    </div>

    <template v-else-if="member">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <button @click="router.push({ name: 'members' })" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors shrink-0">
            <Icon icon="lucide:arrow-left" class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">{{ member.name }}</h1>
              <span :class="['status-badge', roleClass[member.role]]">{{ member.role }}</span>
              <span :class="['status-badge', member.active ? 'status-active' : 'status-inactive']">{{ member.active ? 'Active' : 'Inactive' }}</span>
            </div>
            <p class="page-subtitle">{{ member.department }} · Member since {{ member.joined }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-9 sm:ml-0">
          <button
            v-if="member.role !== 'Owner'"
            @click="showChangeRole = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 hover:border-charcoal-500 text-cream-faint hover:text-cream rounded-lg transition-colors"
          >
            <Icon icon="lucide:shield" class="w-3.5 h-3.5" /> Change Role
          </button>
          <button
            v-if="member.role !== 'Owner'"
            @click="showRemoveConfirm = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-colors"
          >
            <Icon icon="lucide:user-x" class="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">

        <!-- ── Left column ────────────────────────────────── -->
        <div class="flex flex-col gap-5">

          <!-- Profile card -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
            <!-- Avatar + online indicator -->
            <div class="flex flex-col items-center text-center">
              <div class="relative mb-3">
                <div class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-charcoal-900" :style="{ backgroundColor: member.color }">
                  {{ member.initials }}
                </div>
                <span :class="['absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-charcoal-800', member.active ? 'bg-green-400' : 'bg-charcoal-500']"></span>
              </div>
              <div class="text-base font-semibold text-cream">{{ member.name }}</div>
              <div class="text-xs text-cream-faint mt-0.5">{{ member.department }}</div>
              <p v-if="member.bio" class="text-xs text-cream-muted leading-relaxed mt-3">{{ member.bio }}</p>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <!-- Contact details -->
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:mail" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Email</div>
                  <div class="text-xs text-cream truncate">{{ member.email }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:phone" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Phone</div>
                  <div class="text-xs text-cream">{{ member.phone }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:clock" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Last Active</div>
                  <div class="text-xs text-cream">{{ member.lastActive }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:calendar" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Member Since</div>
                  <div class="text-xs text-cream">{{ member.joined }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick stats -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
              <div class="text-2xl font-bold text-cream">{{ activity.length }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Actions</div>
            </div>
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
              <div class="w-5 h-5 mx-auto mb-1">
                <span :class="['status-badge text-[10px]', roleClass[member.role]]">{{ member.role }}</span>
              </div>
              <div class="text-xs text-cream-faint">Role</div>
            </div>
          </div>

        </div>

        <!-- ── Right column ───────────────────────────────── -->
        <div class="flex flex-col gap-5">

          <!-- Permissions matrix -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
              <div>
                <h3 class="text-sm font-semibold text-cream">Permissions</h3>
                <p class="text-xs text-cream-faint mt-0.5">Based on {{ member.role }} role</p>
              </div>
              <span :class="['status-badge', roleClass[member.role]]">{{ member.role }}</span>
            </div>
            <div class="overflow-x-auto">
              <table class="app-table">
                <thead>
                  <tr>
                    <th class="min-w-32">Resource</th>
                    <th class="text-center">View</th>
                    <th class="text-center">Create</th>
                    <th class="text-center">Edit</th>
                    <th class="text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="perm in permissions" :key="perm.resource">
                    <td class="font-medium text-cream text-sm">{{ perm.resource }}</td>
                    <td v-for="key in ['view','create','edit','delete'] as const" :key="key" class="text-center">
                      <div v-if="(perm as any)[key] === true" class="w-5 h-5 rounded-md bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto">
                        <Icon icon="lucide:check" class="w-3 h-3 text-green-400" />
                      </div>
                      <div v-else-if="(perm as any)[key] === null" class="w-5 h-5 rounded-md bg-amber/10 border border-amber/25 flex items-center justify-center mx-auto">
                        <Icon icon="lucide:minus" class="w-2.5 h-2.5 text-amber" />
                      </div>
                      <div v-else class="w-5 h-5 rounded-md bg-charcoal-700/50 border border-charcoal-600 flex items-center justify-center mx-auto">
                        <Icon icon="lucide:x" class="w-2.5 h-2.5 text-cream-faint/50" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="flex items-center gap-4 px-5 py-3 border-t border-charcoal-700">
              <div class="flex items-center gap-1.5 text-xs text-cream-faint">
                <div class="w-4 h-4 rounded bg-green-500/10 border border-green-500/25 flex items-center justify-center"><Icon icon="lucide:check" class="w-2.5 h-2.5 text-green-400" /></div>
                Allowed
              </div>
              <div class="flex items-center gap-1.5 text-xs text-cream-faint">
                <div class="w-4 h-4 rounded bg-charcoal-700/50 border border-charcoal-600 flex items-center justify-center"><Icon icon="lucide:x" class="w-2.5 h-2.5 text-cream-faint/50" /></div>
                Denied
              </div>
              <div class="flex items-center gap-1.5 text-xs text-cream-faint">
                <div class="w-4 h-4 rounded bg-amber/10 border border-amber/25 flex items-center justify-center"><Icon icon="lucide:minus" class="w-2.5 h-2.5 text-amber" /></div>
                Own only
              </div>
            </div>
          </div>

          <!-- Activity log -->
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl">
            <div class="px-5 py-4 border-b border-charcoal-700">
              <h3 class="text-sm font-semibold text-cream">Recent Activity</h3>
              <p class="text-xs text-cream-faint mt-0.5">Latest actions by {{ member.name.split(' ')[0] }}</p>
            </div>

            <div v-if="activity.length === 0" class="flex flex-col items-center justify-center py-12">
              <Icon icon="lucide:activity" class="w-8 h-8 text-cream-faint/30 mb-3" />
              <p class="text-xs text-cream-faint">No recent activity</p>
            </div>

            <div v-else class="divide-y divide-charcoal-700/60">
              <div
                v-for="item in activity" :key="item.id"
                class="flex items-start gap-3 px-5 py-3.5"
              >
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon :icon="item.icon" :class="['w-3.5 h-3.5', item.iconColor]" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="text-xs font-medium text-cream">{{ item.action }}</span>
                    <span class="text-[10px] text-cream-faint shrink-0">{{ item.time }}</span>
                  </div>
                  <div class="text-xs text-cream-faint mt-0.5 truncate">{{ item.target }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>

    <!-- ── Change Role Modal ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showChangeRole && member" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showChangeRole = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-lg font-semibold text-cream">Change Role</h2>
              <button @click="showChangeRole = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-cream-faint mb-5">
              Updating role for <span class="text-cream font-medium">{{ member.name }}</span>
            </p>

            <div class="space-y-2 mb-5">
              <label
                v-for="opt in roleOptions" :key="opt.value"
                :class="[
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  newRole === opt.value ? 'border-amber bg-amber/5' : 'border-charcoal-600 bg-charcoal-700/30 hover:border-charcoal-500',
                ]"
              >
                <input type="radio" :value="opt.value" v-model="newRole" class="sr-only" />
                <div :class="['w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors', newRole === opt.value ? 'border-amber' : 'border-charcoal-500']">
                  <div v-if="newRole === opt.value" class="w-1.5 h-1.5 rounded-full bg-amber"></div>
                </div>
                <div>
                  <div class="text-sm font-medium text-cream">{{ opt.label }}</div>
                  <div class="text-xs text-cream-faint mt-0.5">{{ opt.desc }}</div>
                </div>
              </label>
            </div>

            <div class="flex gap-2">
              <button @click="showChangeRole = false" class="flex-1 py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">Cancel</button>
              <button @click="handleChangeRole" class="flex-1 py-2.5 rounded-lg bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-sm transition-colors">Update Role</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Remove Confirmation ────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showRemoveConfirm && member" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showRemoveConfirm = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Icon icon="lucide:user-x" class="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-cream">Remove member?</h3>
                <p class="text-xs text-cream-faint mt-1 leading-relaxed">
                  <span class="text-cream font-medium">{{ member.name }}</span> will lose access to Acme Design Studio immediately. This cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button @click="showRemoveConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
              <button @click="handleRemove" class="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Remove member</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
