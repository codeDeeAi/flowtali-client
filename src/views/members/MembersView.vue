<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useLoaders } from '@/composables/loaders.ts';
import { useFormErrors } from '@/composables/formErrors';
import { useYupForm } from '@/composables/useYupForm.ts';
import { useNotification } from '@/composables/notification.ts';
import { inviteSchema } from './validation/schema.ts';
import InputField from '@/components/form/InputField.vue';
import Pagination from '@/components/ui/Pagination.vue';

const router  = useRouter();
const { notify } = useNotification();
const { validate } = useYupForm();
const { setErrors, clearAllErrors, getError } = useFormErrors();
const { initLoaders, setLoader, getLoader } = useLoaders();

initLoaders({ isSending: false });

// ─── Types ───────────────────────────────────────────────────────────────────
type Role = 'Owner' | 'Admin' | 'Editor' | 'Member';

interface Member {
  id: number; name: string; email: string; initials: string;
  color: string; role: Role; active: boolean; lastActive: string; joined: string;
}

interface PendingInvite {
  id: number; email: string; role: string; sent: string;
}

// ─── State ───────────────────────────────────────────────────────────────────
const searchQuery  = ref('');
const currentPage  = ref(1);
const perPage      = 5;

const showInviteModal   = ref(false);
const showChangeRole    = ref(false);
const showRemoveConfirm = ref(false);
const selectedMember    = ref<Member | null>(null);

const inviteForm = ref({ email: '', role: 'Member' });
const newRole    = ref<Role>('Member');

const members = ref<Member[]>([
  { id: 1, name: 'Ada Lovelace',    email: 'ada@acmestudio.io',    initials: 'AL', color: '#e8a83e', role: 'Owner',  active: true,  lastActive: 'Just now',    joined: 'Jan 2024' },
  { id: 2, name: 'Luca Ferretti',   email: 'luca@acmestudio.io',   initials: 'LF', color: '#60a5fa', role: 'Admin',  active: true,  lastActive: '1h ago',      joined: 'Mar 2024' },
  { id: 3, name: 'Priya Nair',      email: 'priya@acmestudio.io',  initials: 'PN', color: '#a78bfa', role: 'Member', active: false, lastActive: '3 days ago',  joined: 'Jul 2024' },
  { id: 4, name: 'Marcus Bell',     email: 'marcus@acmestudio.io', initials: 'MB', color: '#4ade80', role: 'Editor', active: true,  lastActive: '30 min ago',  joined: 'Sep 2024' },
  { id: 5, name: 'Sofia Chen',      email: 'sofia@acmestudio.io',  initials: 'SC', color: '#f87171', role: 'Member', active: false, lastActive: '2 weeks ago', joined: 'Nov 2024' },
  { id: 6, name: 'James Okafor',    email: 'james@acmestudio.io',  initials: 'JO', color: '#38bdf8', role: 'Editor', active: true,  lastActive: '4h ago',      joined: 'Dec 2024' },
]);

const pendingInvites = ref<PendingInvite[]>([
  { id: 1, email: 'james@studio.co',  role: 'Editor', sent: '2 days ago' },
  { id: 2, email: 'sofia@creative.io', role: 'Member', sent: '5 days ago' },
]);

// ─── Derived ─────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return q
    ? members.value.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      )
    : members.value;
});

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const onSearch = () => { currentPage.value = 1; };

// ─── Role config ─────────────────────────────────────────────────────────────
const roleClass: Record<string, string> = {
  Owner: 'role-owner', Admin: 'role-admin', Editor: 'role-editor', Member: 'role-member',
};

const roleOptions: { value: Role; label: string; desc: string }[] = [
  { value: 'Admin',  label: 'Admin',  desc: 'Full access except billing' },
  { value: 'Editor', label: 'Editor', desc: 'Can create and edit documents' },
  { value: 'Member', label: 'Member', desc: 'Can manage own documents only' },
];

// ─── Invite ───────────────────────────────────────────────────────────────────
const openInvite = () => {
  inviteForm.value = { email: '', role: 'Member' };
  clearAllErrors();
  showInviteModal.value = true;
};

const handleInvite = async () => {
  clearAllErrors();
  const valid = await validate(inviteSchema, inviteForm.value);
  if (!valid.valid) { setErrors(valid.errors ?? {}); return; }

  setLoader('isSending', true);
  await new Promise(r => setTimeout(r, 1000));
  setLoader('isSending', false);

  pendingInvites.value.unshift({
    id: Date.now(),
    email: inviteForm.value.email,
    role: inviteForm.value.role,
    sent: 'Just now',
  });

  notify(`Invitation sent to ${inviteForm.value.email}`, 'success');
  showInviteModal.value = false;
};

const revokeInvite = (id: number) => {
  const inv = pendingInvites.value.find(i => i.id === id);
  pendingInvites.value = pendingInvites.value.filter(i => i.id !== id);
  if (inv) notify(`Invitation to ${inv.email} revoked`, 'success');
};

const resendInvite = (inv: PendingInvite) => {
  inv.sent = 'Just now';
  notify(`Invitation resent to ${inv.email}`, 'success');
};

// ─── Change Role ──────────────────────────────────────────────────────────────
const openChangeRole = (m: Member) => {
  selectedMember.value = m;
  newRole.value = m.role === 'Owner' ? 'Admin' : m.role;
  showChangeRole.value = true;
};

const handleChangeRole = () => {
  if (!selectedMember.value) return;
  const m = members.value.find(x => x.id === selectedMember.value!.id);
  if (m) m.role = newRole.value;
  notify(`${selectedMember.value.name}'s role updated to ${newRole.value}`, 'success');
  showChangeRole.value = false;
};

// ─── Remove ───────────────────────────────────────────────────────────────────
const openRemove = (m: Member) => {
  selectedMember.value = m;
  showRemoveConfirm.value = true;
};

const handleRemove = () => {
  if (!selectedMember.value) return;
  members.value = members.value.filter(m => m.id !== selectedMember.value!.id);
  notify(`${selectedMember.value.name} has been removed`, 'success');
  showRemoveConfirm.value = false;
};
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Team Members</h1>
        <p class="page-subtitle">{{ members.length }} members in Acme Design Studio</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-faint" />
          <input v-model="searchQuery" @input="onSearch" placeholder="Search members…" class="app-inp pl-8 text-xs py-2 w-44" />
        </div>
        <button
          @click="openInvite"
          class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <Icon icon="lucide:user-round-plus" class="w-3.5 h-3.5" /> Invite Member
        </button>
      </div>
    </div>

    <!-- Pending invites -->
    <div v-if="pendingInvites.length" class="bg-amber/5 border border-amber/20 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon icon="lucide:mail" class="w-4 h-4 text-amber" />
        <span class="text-xs font-semibold text-amber">Pending Invitations ({{ pendingInvites.length }})</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="inv in pendingInvites" :key="inv.id"
          class="flex items-center justify-between py-2 border-b border-amber/10 last:border-0"
        >
          <div>
            <span class="text-sm text-cream-muted">{{ inv.email }}</span>
            <span class="text-xs text-cream-faint ml-2">· Sent {{ inv.sent }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span :class="['status-badge', roleClass[inv.role] ?? 'role-member']">{{ inv.role }}</span>
            <button @click="resendInvite(inv)" class="text-xs text-amber hover:text-amber-light transition-colors">Resend</button>
            <button @click="revokeInvite(inv.id)" class="text-xs text-red-400 hover:text-red-300 transition-colors">Revoke</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty search state -->
    <div v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-12 h-12 rounded-full bg-charcoal-700 flex items-center justify-center mb-4">
        <Icon icon="lucide:users" class="w-6 h-6 text-cream-faint" />
      </div>
      <p class="text-cream-faint text-sm">No members found</p>
      <p class="text-cream-faint/60 text-xs mt-1">Try adjusting your search query</p>
    </div>

    <!-- Members table -->
    <div v-else class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">

      <!-- Desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="app-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in paginated" :key="m.id"
              class="cursor-pointer"
              @click="router.push({ name: 'members.view', params: { id: m.id } })"
            >
              <td>
                <div class="flex items-center gap-3">
                  <div class="relative shrink-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900" :style="{ backgroundColor: m.color }">
                      {{ m.initials }}
                    </div>
                    <span :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-charcoal-800', m.active ? 'bg-green-400' : 'bg-charcoal-500']"></span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-cream">{{ m.name }}</div>
                    <div class="text-xs text-cream-faint">{{ m.email }}</div>
                  </div>
                </div>
              </td>
              <td><span :class="['status-badge', roleClass[m.role]]">{{ m.role }}</span></td>
              <td><span :class="['status-badge', m.active ? 'status-active' : 'status-inactive']">{{ m.active ? 'Active' : 'Inactive' }}</span></td>
              <td class="text-xs text-cream-faint">{{ m.lastActive }}</td>
              <td class="text-xs text-cream-faint">{{ m.joined }}</td>
              <td @click.stop>
                <div class="flex items-center gap-1.5">
                  <button
                    @click="openChangeRole(m)"
                    class="text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Change Role
                  </button>
                  <button
                    v-if="m.role !== 'Owner'"
                    @click="openRemove(m)"
                    class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="sm:hidden divide-y divide-charcoal-700">
        <div
          v-for="m in paginated" :key="m.id"
          class="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-charcoal-700/40 transition-colors"
          @click="router.push({ name: 'members.view', params: { id: m.id } })"
        >
          <div class="flex items-center gap-3">
            <div class="relative shrink-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-charcoal-900" :style="{ backgroundColor: m.color }">
                {{ m.initials }}
              </div>
              <span :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-charcoal-800', m.active ? 'bg-green-400' : 'bg-charcoal-500']"></span>
            </div>
            <div>
              <div class="text-sm font-medium text-cream">{{ m.name }}</div>
              <div class="text-xs text-cream-faint">{{ m.email }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span :class="['status-badge', roleClass[m.role]]">{{ m.role }}</span>
            <div class="flex items-center gap-1.5" @click.stop>
              <button @click="openChangeRole(m)" class="text-[10px] text-cream-muted hover:text-cream bg-charcoal-700 px-2 py-0.5 rounded transition-colors">Role</button>
              <button v-if="m.role !== 'Owner'" @click="openRemove(m)" class="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-0.5 rounded transition-colors">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <Pagination
      v-if="filtered.length > 0"
      v-model="currentPage"
      :total="filtered.length"
      :per-page="perPage"
    />

  </div>

  <!-- ── Invite Modal ──────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showInviteModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showInviteModal = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="font-display text-lg font-semibold text-cream">Invite Team Member</h2>
              <p class="text-xs text-cream-faint mt-0.5">Send an invitation to join Acme Design Studio</p>
            </div>
            <button @click="showInviteModal = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <InputField
              v-model="inviteForm.email"
              label-text="Email Address"
              type="email"
              :is-required="true"
              :error="getError('email').value || ''"
              input-classes="px-2 py-2 text-sm transition-colors"
              autocapitalize="none"
              autocomplete="email"
              placeholder="colleague@company.com"
            />

            <!-- Role picker -->
            <div class="space-y-1">
              <label class="flex text-sm text-cream-faint">
                <span>Role</span>
                <span class="text-red-400 ml-0.5">*</span>
              </label>
              <div class="space-y-2">
                <label
                  v-for="opt in roleOptions" :key="opt.value"
                  :class="[
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    inviteForm.role === opt.value
                      ? 'border-amber bg-amber/5'
                      : 'border-charcoal-600 bg-charcoal-700/30 hover:border-charcoal-500',
                  ]"
                >
                  <input type="radio" :value="opt.value" v-model="inviteForm.role" class="sr-only" />
                  <div :class="['w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors', inviteForm.role === opt.value ? 'border-amber' : 'border-charcoal-500']">
                    <div v-if="inviteForm.role === opt.value" class="w-1.5 h-1.5 rounded-full bg-amber"></div>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-cream">{{ opt.label }}</div>
                    <div class="text-xs text-cream-faint mt-0.5">{{ opt.desc }}</div>
                  </div>
                </label>
              </div>
              <small v-if="getError('role').value" class="text-red-400 text-xs">{{ getError('role').value }}</small>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="showInviteModal = false" class="flex-1 py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">
              Cancel
            </button>
            <button
              @click="handleInvite"
              :disabled="getLoader('isSending') || !inviteForm.email"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', inviteForm.email && !getLoader('isSending') ? 'bg-amber hover:bg-amber-light text-charcoal-900' : 'bg-amber/40 text-charcoal-900/50 cursor-not-allowed']"
            >
              <Icon v-if="getLoader('isSending')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              <Icon v-else icon="lucide:send" class="w-3.5 h-3.5" />
              {{ getLoader('isSending') ? 'Sending…' : 'Send Invitation' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Change Role Modal ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showChangeRole && selectedMember" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showChangeRole = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-display text-lg font-semibold text-cream">Change Role</h2>
            <button @click="showChangeRole = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>
          <p class="text-xs text-cream-faint mb-5">
            Updating role for <span class="text-cream font-medium">{{ selectedMember.name }}</span>
          </p>

          <div class="space-y-2 mb-5">
            <label
              v-for="opt in roleOptions" :key="opt.value"
              :class="[
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                newRole === opt.value
                  ? 'border-amber bg-amber/5'
                  : 'border-charcoal-600 bg-charcoal-700/30 hover:border-charcoal-500',
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

  <!-- ── Remove Confirmation ───────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showRemoveConfirm && selectedMember" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showRemoveConfirm = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user-x" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-cream">Remove member?</h3>
              <p class="text-xs text-cream-faint mt-1 leading-relaxed">
                <span class="text-cream font-medium">{{ selectedMember.name }}</span> will lose access to Acme Design Studio immediately. This cannot be undone.
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
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
