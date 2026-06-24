<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useLoaders } from '@/composables/loaders.ts'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { useSubscriptionStore } from '@/stores/subscription'
import Pagination from '@/components/ui/Pagination.vue'
import { MemberService } from '@/services/member.service.ts'
import type { IMember, IMemberRole, IInvitation } from '@/types/member.types'

const router    = useRouter()
const { notify } = useNotification()
const { initLoaders, setLoader, getLoader } = useLoaders()
const authStore = useAuthStore()
const subStore  = useSubscriptionStore()
const orgId     = computed(() => authStore.currentOrganization?.id ?? '')
const canInvite = computed(() => subStore.isBusiness)

initLoaders({ isSending: false })

// ─── State ────────────────────────────────────────────────────────────────────
const members = ref<IMember[]>([])
const availableRoles = ref<IMemberRole[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 10
const isLoading = ref(false)

const showAddModal = ref(false)
const showChangeRole = ref(false)
const showRemoveConfirm = ref(false)
const selectedMember = ref<IMember | null>(null)

const addForm = ref({ email: '', role_ids: [] as string[] })
const addEmailError = ref('')
const newRoleIds = ref<string[]>([])

const pendingInvitations = ref<IInvitation[]>([])
const isLoadingInvitations = ref(false)

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadMembers = async (page = 1) => {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await MemberService.list(orgId.value, {
      search: searchQuery.value || undefined,
      page,
      per_page: perPage,
    })
    const d = res.data.data
    members.value = d.data
    currentPage.value = d.current_page
    lastPage.value = d.last_page
    total.value = d.total
  } catch {
    notify('Failed to load members.', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadFormData = async () => {
  if (!orgId.value) return
  try {
    const res = await MemberService.formData(orgId.value)
    availableRoles.value = res.data.data.roles
  } catch {
    // silently fail
  }
}

const loadInvitations = async () => {
  if (!orgId.value) return
  isLoadingInvitations.value = true
  try {
    const res = await MemberService.listInvitations(orgId.value)
    pendingInvitations.value = res.data.data
  } catch {
    // silently fail
  } finally {
    isLoadingInvitations.value = false
  }
}

const cancelInvite = async (id: string) => {
  try {
    await MemberService.cancelInvitation(orgId.value, id)
    notify('Invitation cancelled.', 'success')
    await loadInvitations()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to cancel invitation.'
    notify(msg, 'error')
  }
}

onMounted(() => {
  loadMembers()
  loadFormData()
  loadInvitations()
})

const onSearch = () => {
  currentPage.value = 1
  loadMembers(1)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const memberInitials = (m: IMember) => {
  const n = m.user?.full_name ?? ''
  const parts = n.trim().split(' ')
  return parts.length >= 2 ? ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() : n.slice(0, 2).toUpperCase()
}

const avatarColor = (id: string) => {
  const colors = ['#00c853', '#60a5fa', '#a78bfa', '#4ade80', '#f87171', '#38bdf8', '#fb923c', '#34d399']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

// ─── Add member ───────────────────────────────────────────────────────────────
const openAdd = async () => {
  addForm.value = { email: '', role_ids: [] }
  addEmailError.value = ''
  await loadFormData()
  showAddModal.value = true
}

const toggleAddRole = (roleId: string) => {
  const idx = addForm.value.role_ids.indexOf(roleId)
  if (idx === -1) addForm.value.role_ids.push(roleId)
  else addForm.value.role_ids.splice(idx, 1)
}

const handleAdd = async () => {
  addEmailError.value = ''
  if (!addForm.value.email.trim()) {
    addEmailError.value = 'Email is required.'
    return
  }
  setLoader('isSending', true)
  try {
    await MemberService.invite(orgId.value, {
      email: addForm.value.email.trim(),
      role_ids: addForm.value.role_ids,
    })
    notify('Invitation sent successfully.', 'success')
    showAddModal.value = false
    await loadInvitations()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to send invitation.'
    addEmailError.value = msg
  } finally {
    setLoader('isSending', false)
  }
}

// ─── Change roles ─────────────────────────────────────────────────────────────
const openChangeRole = async (m: IMember) => {
  selectedMember.value = m
  newRoleIds.value = m.roles.map((r) => r.id)
  await loadFormData()
  showChangeRole.value = true
}

const toggleNewRole = (roleId: string) => {
  const idx = newRoleIds.value.indexOf(roleId)
  if (idx === -1) newRoleIds.value.push(roleId)
  else newRoleIds.value.splice(idx, 1)
}

const handleChangeRole = async () => {
  if (!selectedMember.value) return
  setLoader('isSending', true)
  try {
    await MemberService.updateRoles(orgId.value, selectedMember.value.id, {
      role_ids: newRoleIds.value,
    })
    notify('Member roles updated.', 'success')
    showChangeRole.value = false
    await loadMembers(currentPage.value)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to update roles.'
    notify(msg, 'error')
  } finally {
    setLoader('isSending', false)
  }
}

// ─── Remove ───────────────────────────────────────────────────────────────────
const openRemove = (m: IMember) => {
  selectedMember.value = m
  showRemoveConfirm.value = true
}

const handleRemove = async () => {
  if (!selectedMember.value) return
  setLoader('isSending', true)
  try {
    await MemberService.remove(orgId.value, selectedMember.value.id)
    notify(`${selectedMember.value.user?.full_name ?? 'Member'} has been removed.`, 'success')
    showRemoveConfirm.value = false
    await loadMembers(currentPage.value > 1 && members.value.length === 1 ? currentPage.value - 1 : currentPage.value)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to remove member.'
    notify(msg, 'error')
  } finally {
    setLoader('isSending', false)
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Team Members</h1>
          <p class="page-subtitle">{{ total }} member{{ total !== 1 ? 's' : '' }}</p>
        </div>
        <button v-if="canInvite" @click="openAdd" class="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
          <Icon icon="lucide:user-round-plus" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Add Member</span>
          <span class="sm:hidden">Add</span>
        </button>
        <button v-else @click="router.push({ name: 'billing' })" class="flex items-center gap-1.5 border border-green-700/40 text-green-700 text-xs px-3 py-2 rounded-lg transition-colors hover:bg-green-700/10">
          <Icon icon="lucide:lock" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Upgrade to invite</span>
          <span class="sm:hidden">Upgrade</span>
        </button>
      </div>
      <div class="relative">
        <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700" />
        <input v-model="searchQuery" type="search" @input="onSearch" placeholder="Search members…" class="app-inp pl-8 text-xs py-2 w-full" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <Icon icon="lucide:loader-2" class="w-6 h-6 text-gray-700 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="!members.length" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center mb-4">
        <Icon icon="lucide:users" class="w-6 h-6 text-gray-700" />
      </div>
      <p class="text-gray-700 text-sm">No members found</p>
      <p v-if="searchQuery" class="text-gray-700/60 text-xs mt-1">Try adjusting your search query</p>
    </div>

    <!-- Members table -->
    <div v-else class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">

      <!-- Desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="app-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in members" :key="m.id"
              class="cursor-pointer"
              @click="router.push({ name: 'members.view', params: { id: m.id } })"
            >
              <td>
                <div class="flex items-center gap-3">
                  <div class="relative shrink-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg-100" :style="{ backgroundColor: avatarColor(m.id) }">
                      {{ memberInitials(m) }}
                    </div>
                    <span :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-300', m.is_active ? 'bg-green-400' : 'bg-gray-500']"></span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-1000">{{ m.user?.full_name }}</div>
                    <div class="text-xs text-gray-700">{{ m.user?.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span v-if="m.is_owner" class="status-badge role-owner">Owner</span>
                <span v-else-if="m.roles.length" class="text-xs text-gray-900">{{ m.roles.map(r => r.name).join(', ') }}</span>
                <span v-else class="text-xs text-gray-700/50">No role</span>
              </td>
              <td><span :class="['status-badge', m.is_active ? 'status-active' : 'status-inactive']">{{ m.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="text-xs text-gray-700">{{ new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }}</td>
              <td @click.stop>
                <div class="flex items-center gap-1.5">
                  <button v-if="!m.is_owner" @click="openChangeRole(m)" class="text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-2.5 py-1 rounded-md transition-colors">
                    Change Role
                  </button>
                  <button v-if="!m.is_owner" @click="openRemove(m)" class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1 rounded-md transition-colors">
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="sm:hidden divide-y divide-gray-400">
        <div
          v-for="m in members" :key="m.id"
          class="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-400/40 transition-colors"
          @click="router.push({ name: 'members.view', params: { id: m.id } })"
        >
          <div class="flex items-center gap-3">
            <div class="relative shrink-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-bg-100" :style="{ backgroundColor: avatarColor(m.id) }">
                {{ memberInitials(m) }}
              </div>
              <span :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-300', m.is_active ? 'bg-green-400' : 'bg-gray-500']"></span>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-1000">{{ m.user?.full_name }}</div>
              <div class="text-xs text-gray-700">{{ m.user?.email }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span v-if="m.is_owner" class="status-badge role-owner">Owner</span>
            <span v-else-if="m.roles.length" class="text-xs text-gray-900">{{ m.roles[0]?.name }}</span>
            <div v-if="!m.is_owner" class="flex items-center gap-1.5" @click.stop>
              <button @click="openChangeRole(m)" class="text-[10px] text-gray-900 hover:text-gray-1000 bg-gray-400 px-2 py-0.5 rounded transition-colors">Role</button>
              <button @click="openRemove(m)" class="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-0.5 rounded transition-colors">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Pagination v-if="total > perPage" v-model="currentPage" :total="total" :per-page="perPage" @update:model-value="loadMembers($event)" />

    <!-- Pending Invitations -->
    <div v-if="isLoadingInvitations || pendingInvitations.length" class="mt-6">
      <h2 class="text-sm font-semibold text-gray-1000 mb-3">Pending Invitations</h2>

      <div v-if="isLoadingInvitations" class="flex justify-center py-8">
        <Icon icon="lucide:loader-2" class="w-5 h-5 text-gray-700 animate-spin" />
      </div>

      <div v-else class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden divide-y divide-gray-400">
        <div v-for="inv in pendingInvitations" :key="inv.id" class="flex items-center justify-between px-4 py-3">
          <div>
            <div class="text-sm text-gray-1000">{{ inv.email }}</div>
            <div class="text-xs text-gray-700 mt-0.5">
              <span v-if="inv.role_ids.length">{{ inv.role_ids.length }} role{{ inv.role_ids.length !== 1 ? 's' : '' }}</span>
              <span v-else>No roles assigned</span>
              &middot; Expires {{ new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </div>
          </div>
          <button
            @click="cancelInvite(inv.id)"
            class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- ── Add Member Modal ──────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showAddModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showAddModal = false">
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="font-sans text-lg font-semibold text-gray-1000">Add Team Member</h2>
              <p class="text-xs text-gray-700 mt-0.5">An invitation email will be sent to the address</p>
            </div>
            <button @click="showAddModal = false" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <div class="space-y-1">
              <label class="flex text-sm text-gray-700">Email Address <span class="text-red-400 ml-0.5">*</span></label>
              <input
                v-model="addForm.email"
                type="email"
                class="app-inp px-2 py-2 text-sm w-full"
                placeholder="colleague@company.com"
                autocomplete="off"
              />
              <small v-if="addEmailError" class="text-red-400 text-xs">{{ addEmailError }}</small>
            </div>

            <div v-if="availableRoles.length" class="space-y-1">
              <label class="text-sm text-gray-700">Assign Roles <span class="text-gray-700/50 text-xs">(optional)</span></label>
              <div class="space-y-1.5 max-h-48 overflow-y-auto">
                <label
                  v-for="role in availableRoles" :key="role.id"
                  :class="['flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors', addForm.role_ids.includes(role.id) ? 'border-green-700 bg-green-700/5' : 'border-gray-500 bg-gray-400/30 hover:border-gray-500']"
                >
                  <input type="checkbox" :value="role.id" :checked="addForm.role_ids.includes(role.id)" @change="toggleAddRole(role.id)" class="sr-only" />
                  <div :class="['w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors', addForm.role_ids.includes(role.id) ? 'border-green-700 bg-green-700' : 'border-gray-500']">
                    <Icon v-if="addForm.role_ids.includes(role.id)" icon="lucide:check" class="w-2.5 h-2.5 text-bg-100" />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-1000">{{ role.name }}</div>
                    <div v-if="role.description" class="text-xs text-gray-700 mt-0.5">{{ role.description }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div v-else class="text-xs text-gray-700/70 text-center py-2">No roles available — create roles first.</div>
          </div>

          <div class="flex gap-2">
            <button @click="showAddModal = false" class="flex-1 py-2.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors">Cancel</button>
            <button
              @click="handleAdd"
              :disabled="getLoader('isSending') || !addForm.email.trim()"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', addForm.email.trim() && !getLoader('isSending') ? 'bg-green-700 hover:bg-green-800 text-bg-100' : 'bg-green-700/40 text-bg-100/50 cursor-not-allowed']"
            >
              <Icon v-if="getLoader('isSending')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ getLoader('isSending') ? 'Sending…' : 'Send Invite' }}
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
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-sans text-lg font-semibold text-gray-1000">Change Roles</h2>
            <button @click="showChangeRole = false" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>
          <p class="text-xs text-gray-700 mb-5">
            Updating roles for <span class="text-gray-1000 font-medium">{{ selectedMember.user?.full_name }}</span>
          </p>

          <div class="space-y-1.5 mb-5 max-h-60 overflow-y-auto">
            <label
              v-for="role in availableRoles" :key="role.id"
              :class="['flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors', newRoleIds.includes(role.id) ? 'border-green-700 bg-green-700/5' : 'border-gray-500 bg-gray-400/30 hover:border-gray-500']"
            >
              <input type="checkbox" :value="role.id" :checked="newRoleIds.includes(role.id)" @change="toggleNewRole(role.id)" class="sr-only" />
              <div :class="['w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors', newRoleIds.includes(role.id) ? 'border-green-700 bg-green-700' : 'border-gray-500']">
                <Icon v-if="newRoleIds.includes(role.id)" icon="lucide:check" class="w-2.5 h-2.5 text-bg-100" />
              </div>
              <div>
                <div class="text-sm font-medium text-gray-1000">{{ role.name }}</div>
                <div v-if="role.description" class="text-xs text-gray-700 mt-0.5">{{ role.description }}</div>
              </div>
            </label>
            <div v-if="!availableRoles.length" class="text-xs text-gray-700/70 text-center py-3">No roles available.</div>
          </div>

          <div class="flex gap-2">
            <button @click="showChangeRole = false" class="flex-1 py-2.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors">Cancel</button>
            <button
              @click="handleChangeRole"
              :disabled="getLoader('isSending')"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', !getLoader('isSending') ? 'bg-green-700 hover:bg-green-800 text-bg-100' : 'bg-green-700/40 text-bg-100/50 cursor-not-allowed']"
            >
              <Icon v-if="getLoader('isSending')" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ getLoader('isSending') ? 'Saving…' : 'Update Roles' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Remove Confirmation ───────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showRemoveConfirm && selectedMember" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showRemoveConfirm = false">
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user-x" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-1000">Remove member?</h3>
              <p class="text-xs text-gray-700 mt-1 leading-relaxed">
                <span class="text-gray-1000 font-medium">{{ selectedMember.user?.full_name }}</span> will lose access immediately.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button @click="showRemoveConfirm = false" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors">Cancel</button>
            <button
              @click="handleRemove"
              :disabled="getLoader('isSending')"
              class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
            >
              <Icon v-if="getLoader('isSending')" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              Remove member
            </button>
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
