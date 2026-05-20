<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth.ts'
import Pagination from '@/components/ui/Pagination.vue'
import { RoleService } from '@/services/role.service.ts'
import type { IRole, IPermissionGroup } from '@/types/role.types'

const { notify } = useNotification()
const authStore = useAuthStore()
const orgId = computed(() => authStore.currentOrganization?.id ?? '')

const ALL_TAGS = ['read', 'create', 'update', 'delete', 'manage'] as const
type Tag = (typeof ALL_TAGS)[number]

// ─── State ────────────────────────────────────────────────────────────────────
const roles = ref<IRole[]>([])
const permissionGroups = ref<IPermissionGroup[]>([])
const selectedRole = ref<IRole | null>(null)
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = 10
const isLoading = ref(false)

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadRoles = async (page = 1) => {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const res = await RoleService.list(orgId.value, { page, per_page: perPage })
    const d = res.data.data
    roles.value = d.data
    currentPage.value = d.current_page
    lastPage.value = d.last_page
    total.value = d.total
    if (!selectedRole.value && d.data.length) selectedRole.value = d.data[0]!
    else if (selectedRole.value) {
      const refreshed = d.data.find((r) => r.id === selectedRole.value!.id)
      if (refreshed) selectedRole.value = refreshed
    }
  } catch {
    notify('Failed to load roles.', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadFormData = async () => {
  if (!orgId.value) return
  try {
    const res = await RoleService.formData(orgId.value)
    permissionGroups.value = res.data.data.permission_groups
  } catch {
    // silently fail — modal will just be empty
  }
}

onMounted(() => {
  loadRoles()
  loadFormData()
})

// ─── Permission helpers ───────────────────────────────────────────────────────
const getIdentifier = (group: IPermissionGroup, tag: Tag): string | null => {
  return group.permissions.find((p) => p.tag === tag)?.identifier ?? null
}

const roleHasTag = (role: IRole | null, group: IPermissionGroup, tag: Tag): boolean => {
  if (!role) return false
  const id = getIdentifier(group, tag)
  return id ? role.permissions.includes(id) : false
}

const groupHasTag = (group: IPermissionGroup, tag: Tag): boolean =>
  group.permissions.some((p) => p.tag === tag)

// ─── Create / Edit modals ─────────────────────────────────────────────────────
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const isSaving = ref(false)

const createForm = ref({ name: '', description: '', permissions: new Set<string>() })
const editForm = ref({ name: '', description: '', permissions: new Set<string>() })
const targetRole = ref<IRole | null>(null)

const openCreate = () => {
  createForm.value = { name: '', description: '', permissions: new Set() }
  showCreateModal.value = true
}

const openEdit = (role: IRole) => {
  targetRole.value = role
  editForm.value = {
    name: role.name,
    description: role.description ?? '',
    permissions: new Set(role.permissions),
  }
  showEditModal.value = true
}

const openDelete = (role: IRole) => {
  targetRole.value = role
  showDeleteConfirm.value = true
}

const toggleCreatePerm = (group: IPermissionGroup, tag: Tag) => {
  const id = getIdentifier(group, tag)
  if (!id) return
  if (createForm.value.permissions.has(id)) createForm.value.permissions.delete(id)
  else createForm.value.permissions.add(id)
}

const toggleEditPerm = (group: IPermissionGroup, tag: Tag) => {
  const id = getIdentifier(group, tag)
  if (!id) return
  if (editForm.value.permissions.has(id)) editForm.value.permissions.delete(id)
  else editForm.value.permissions.add(id)
}

const handleCreate = async () => {
  if (!createForm.value.name.trim()) return
  isSaving.value = true
  try {
    await RoleService.create(orgId.value, {
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || null,
      permissions: [...createForm.value.permissions],
    })
    notify(`Role "${createForm.value.name}" created`, 'success')
    showCreateModal.value = false
    await loadRoles(currentPage.value)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to create role.'
    notify(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async () => {
  if (!targetRole.value || !editForm.value.name.trim()) return
  isSaving.value = true
  try {
    const updated = await RoleService.update(orgId.value, targetRole.value.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || null,
      permissions: [...editForm.value.permissions],
    })
    notify(`Role "${editForm.value.name}" updated`, 'success')
    showEditModal.value = false
    const updatedRole = updated.data.data
    const idx = roles.value.findIndex((r) => r.id === updatedRole.id)
    if (idx !== -1) roles.value[idx] = updatedRole
    if (selectedRole.value?.id === updatedRole.id) selectedRole.value = updatedRole
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to update role.'
    notify(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!targetRole.value) return
  isSaving.value = true
  try {
    await RoleService.delete(orgId.value, targetRole.value.id)
    notify(`Role "${targetRole.value.name}" deleted`, 'success')
    showDeleteConfirm.value = false
    if (selectedRole.value?.id === targetRole.value.id) selectedRole.value = null
    await loadRoles(currentPage.value > 1 && roles.value.length === 1 ? currentPage.value - 1 : currentPage.value)
    if (!selectedRole.value && roles.value.length > 0) selectedRole.value = roles.value[0] ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to delete role.'
    notify(msg, 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5 min-h-full">

    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="page-title">Roles & Permissions</h1>
        <p class="page-subtitle">{{ total }} role{{ total !== 1 ? 's' : '' }} · manage access control</p>
      </div>
      <button @click="openCreate" class="flex items-center gap-2 bg-amber hover:bg-amber-light text-charcoal-900 font-semibold text-xs px-3 py-2 rounded-lg transition-colors self-start sm:self-auto">
        <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> Create Role
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

      <!-- Role list -->
      <div class="flex flex-col gap-3">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-charcoal-700">
            <span class="text-xs font-semibold text-cream">Roles ({{ total }})</span>
          </div>

          <div v-if="isLoading" class="px-4 py-8 text-center text-cream-faint text-sm">Loading…</div>

          <div v-else-if="!roles.length" class="px-4 py-8 text-center text-cream-faint text-sm">No roles found.</div>

          <div
            v-for="role in roles" :key="role.id"
            :class="['px-4 py-3.5 border-b border-charcoal-700/60 last:border-0 cursor-pointer transition-colors group', selectedRole?.id === role.id ? 'bg-amber/5' : 'hover:bg-charcoal-700/40']"
            @click="selectedRole = role"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-cream">{{ role.name }}</span>
              <div class="flex items-center gap-1.5">
                <span :class="['status-badge text-[9px]', role.immutable ? 'role-system' : 'role-custom']">
                  {{ role.immutable ? 'System' : 'Custom' }}
                </span>
                <span v-if="role.is_disabled" class="status-badge text-[9px] status-inactive">Disabled</span>
                <div v-if="!role.immutable" class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <button @click="openEdit(role)" class="p-1 rounded hover:bg-charcoal-600 text-cream-faint hover:text-cream transition-colors">
                    <Icon icon="lucide:pencil" class="w-3 h-3" />
                  </button>
                  <button @click="openDelete(role)" class="p-1 rounded hover:bg-red-500/20 text-cream-faint hover:text-red-400 transition-colors">
                    <Icon icon="lucide:trash-2" class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <div class="text-xs text-cream-faint">{{ role.member_roles_count }} member{{ role.member_roles_count !== 1 ? 's' : '' }}</div>
            <div v-if="role.description" class="text-xs text-cream-faint/70 mt-0.5 truncate">{{ role.description }}</div>
          </div>
        </div>

        <Pagination v-model="currentPage" :total="total" :per-page="perPage" @update:model-value="loadRoles($event)" />
      </div>

      <!-- Permissions matrix -->
      <div class="md:col-span-2 bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div v-if="!selectedRole" class="flex items-center justify-center h-48 text-cream-faint text-sm">
          Select a role to view its permissions
        </div>
        <template v-else>
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-charcoal-700">
            <div>
              <div class="text-sm font-semibold text-cream">{{ selectedRole.name }} Permissions</div>
              <div v-if="selectedRole.description" class="text-xs text-cream-faint mt-0.5">{{ selectedRole.description }}</div>
            </div>
            <button v-if="!selectedRole.immutable" @click="openEdit(selectedRole)" class="flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 px-3 py-1.5 rounded-md transition-colors">
              <Icon icon="lucide:pencil" class="w-3 h-3" /> Edit Role
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="app-table">
              <thead>
                <tr>
                  <th class="min-w-32">Resource</th>
                  <th v-for="tag in ALL_TAGS" :key="tag" class="text-center capitalize">{{ tag }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in permissionGroups" :key="group.group_name">
                  <td class="font-medium text-cream text-sm">{{ group.name }}</td>
                  <td v-for="tag in ALL_TAGS" :key="tag" class="text-center">
                    <div v-if="!groupHasTag(group, tag)" class="w-5 h-5 rounded-md bg-charcoal-700/20 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:minus" class="w-2.5 h-2.5 text-charcoal-600" />
                    </div>
                    <div v-else-if="roleHasTag(selectedRole, group, tag)" class="w-5 h-5 rounded-md bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:check" class="w-3 h-3 text-green-400" />
                    </div>
                    <div v-else class="w-5 h-5 rounded-md bg-charcoal-700/50 border border-charcoal-600 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:x" class="w-2.5 h-2.5 text-cream-faint" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center gap-4 px-4 py-3 border-t border-charcoal-700">
            <div class="flex items-center gap-1.5 text-xs text-cream-faint">
              <div class="w-4 h-4 rounded bg-green-500/10 border border-green-500/25 flex items-center justify-center"><Icon icon="lucide:check" class="w-2.5 h-2.5 text-green-400" /></div>
              Allowed
            </div>
            <div class="flex items-center gap-1.5 text-xs text-cream-faint">
              <div class="w-4 h-4 rounded bg-charcoal-700/50 border border-charcoal-600 flex items-center justify-center"><Icon icon="lucide:x" class="w-2.5 h-2.5 text-cream-faint" /></div>
              Denied
            </div>
            <div class="flex items-center gap-1.5 text-xs text-cream-faint">
              <div class="w-4 h-4 rounded bg-charcoal-700/20 flex items-center justify-center"><Icon icon="lucide:minus" class="w-2.5 h-2.5 text-charcoal-600" /></div>
              N/A
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- ── Create Role Modal ──────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showCreateModal = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-display text-lg font-semibold text-cream">Create Role</h2>
            <button @click="showCreateModal = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs text-cream-faint">Role Name <span class="text-red-400">*</span></label>
                <input v-model="createForm.name" class="app-inp text-sm py-2 px-2" placeholder="e.g. Accountant" />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-cream-faint">Description</label>
                <input v-model="createForm.description" class="app-inp text-sm py-2 px-2" placeholder="What can this role do?" />
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-cream-faint uppercase tracking-wider mb-3">Permissions</div>
              <div class="border border-charcoal-600 rounded-xl overflow-hidden">
                <div class="grid grid-cols-[1fr_repeat(5,40px)] gap-0 text-[10px] font-semibold uppercase tracking-wider text-cream-faint bg-charcoal-700/50 px-4 py-2">
                  <span>Resource</span>
                  <span class="text-center" v-for="tag in ALL_TAGS" :key="tag">{{ tag[0]?.toUpperCase() }}</span>
                </div>
                <div
                  v-for="(group, i) in permissionGroups" :key="group.group_name"
                  :class="['grid grid-cols-[1fr_repeat(5,40px)] gap-0 items-center px-4 py-2.5 border-t border-charcoal-700/40', i % 2 !== 0 ? 'bg-charcoal-700/20' : '']"
                >
                  <span class="text-sm text-cream">{{ group.name }}</span>
                  <div v-for="tag in ALL_TAGS" :key="tag" class="flex justify-center">
                    <button
                      v-if="groupHasTag(group, tag)"
                      @click="toggleCreatePerm(group, tag)"
                      :class="['w-5 h-5 rounded border transition-colors', createForm.permissions.has(getIdentifier(group, tag)!) ? 'bg-amber border-amber' : 'border-charcoal-500 hover:border-charcoal-400']"
                    >
                      <Icon v-if="createForm.permissions.has(getIdentifier(group, tag)!)" icon="lucide:check" class="w-3 h-3 text-charcoal-900 mx-auto" />
                    </button>
                    <div v-else class="w-5 h-5"></div>
                  </div>
                </div>
              </div>
              <p class="text-[10px] text-cream-faint mt-1.5">R=Read · C=Create · U=Update · D=Delete · M=Manage</p>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="showCreateModal = false" class="flex-1 py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">Cancel</button>
            <button
              @click="handleCreate"
              :disabled="!createForm.name.trim() || isSaving"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', createForm.name.trim() && !isSaving ? 'bg-amber hover:bg-amber-light text-charcoal-900' : 'bg-amber/40 text-charcoal-900/50 cursor-not-allowed']"
            >
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ isSaving ? 'Creating…' : 'Create Role' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Edit Role Modal ────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showEditModal && targetRole" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showEditModal = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-display text-lg font-semibold text-cream">Edit Role</h2>
            <button @click="showEditModal = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs text-cream-faint">Role Name <span class="text-red-400">*</span></label>
                <input v-model="editForm.name" class="app-inp text-sm py-2 px-2" />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-cream-faint">Description</label>
                <input v-model="editForm.description" class="app-inp text-sm py-2 px-2" />
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-cream-faint uppercase tracking-wider mb-3">Permissions</div>
              <div class="border border-charcoal-600 rounded-xl overflow-hidden">
                <div class="grid grid-cols-[1fr_repeat(5,40px)] gap-0 text-[10px] font-semibold uppercase tracking-wider text-cream-faint bg-charcoal-700/50 px-4 py-2">
                  <span>Resource</span>
                  <span class="text-center" v-for="tag in ALL_TAGS" :key="tag">{{ tag[0]?.toUpperCase() }}</span>
                </div>
                <div
                  v-for="(group, i) in permissionGroups" :key="group.group_name"
                  :class="['grid grid-cols-[1fr_repeat(5,40px)] gap-0 items-center px-4 py-2.5 border-t border-charcoal-700/40', i % 2 !== 0 ? 'bg-charcoal-700/20' : '']"
                >
                  <span class="text-sm text-cream">{{ group.name }}</span>
                  <div v-for="tag in ALL_TAGS" :key="tag" class="flex justify-center">
                    <button
                      v-if="groupHasTag(group, tag)"
                      @click="toggleEditPerm(group, tag)"
                      :class="['w-5 h-5 rounded border transition-colors', editForm.permissions.has(getIdentifier(group, tag)!) ? 'bg-amber border-amber' : 'border-charcoal-500 hover:border-charcoal-400']"
                    >
                      <Icon v-if="editForm.permissions.has(getIdentifier(group, tag)!)" icon="lucide:check" class="w-3 h-3 text-charcoal-900 mx-auto" />
                    </button>
                    <div v-else class="w-5 h-5"></div>
                  </div>
                </div>
              </div>
              <p class="text-[10px] text-cream-faint mt-1.5">R=Read · C=Create · U=Update · D=Delete · M=Manage</p>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="showEditModal = false" class="flex-1 py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">Cancel</button>
            <button
              @click="handleEdit"
              :disabled="!editForm.name.trim() || isSaving"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', editForm.name.trim() && !isSaving ? 'bg-amber hover:bg-amber-light text-charcoal-900' : 'bg-amber/40 text-charcoal-900/50 cursor-not-allowed']"
            >
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ isSaving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Delete Confirm ─────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteConfirm && targetRole" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-cream">Delete "{{ targetRole.name }}"?</h3>
              <p class="text-xs text-cream-faint mt-1 leading-relaxed">This role will be permanently removed. Members assigned to it will lose these permissions.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
            <button @click="handleDelete" :disabled="isSaving" class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60">
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              Delete Role
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
