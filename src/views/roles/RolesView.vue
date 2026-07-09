<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { useSubscriptionStore } from '@/stores/subscription'
import Pagination from '@/components/ui/Pagination.vue'
import { RoleService } from '@/services/role.service.ts'
import type { IRole, IPermissionGroup } from '@/types/role.types'

const router    = useRouter()
const { t } = useI18n()
const { notify } = useNotification()
const authStore = useAuthStore()
const subStore  = useSubscriptionStore()
const orgId     = computed(() => authStore.currentOrganization?.id ?? '')
const canAccess = computed(() => subStore.isBusiness)

const ALL_TAGS = ['read', 'create', 'update', 'delete', 'manage'] as const
type Tag = (typeof ALL_TAGS)[number]

// ─── Permission toggle helpers ────────────────────────────────────────────────
const togglePerm = (perms: Set<string>, identifier: string) => {
  if (perms.has(identifier)) perms.delete(identifier)
  else perms.add(identifier)
}

const groupAllEnabled = (perms: Set<string>, group: IPermissionGroup): boolean =>
  group.permissions.length > 0 && group.permissions.every(p => perms.has(p.identifier))

const toggleGroup = (perms: Set<string>, group: IPermissionGroup) => {
  if (groupAllEnabled(perms, group)) {
    group.permissions.forEach(p => perms.delete(p.identifier))
  } else {
    group.permissions.forEach(p => perms.add(p.identifier))
  }
}

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
    notify(t('roles.toasts.loadFailed'), 'error')
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


const handleCreate = async () => {
  if (!createForm.value.name.trim()) return
  isSaving.value = true
  try {
    await RoleService.create(orgId.value, {
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || null,
      permissions: [...createForm.value.permissions],
    })
    notify(t('roles.toasts.created', { name: createForm.value.name }), 'success')
    showCreateModal.value = false
    await loadRoles(currentPage.value)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? t('roles.toasts.createFailed')
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
    notify(t('roles.toasts.updated', { name: editForm.value.name }), 'success')
    showEditModal.value = false
    const updatedRole = updated.data.data
    const idx = roles.value.findIndex((r) => r.id === updatedRole.id)
    if (idx !== -1) roles.value[idx] = updatedRole
    if (selectedRole.value?.id === updatedRole.id) selectedRole.value = updatedRole
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? t('roles.toasts.updateFailed')
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
    notify(t('roles.toasts.deleted', { name: targetRole.value.name }), 'success')
    showDeleteConfirm.value = false
    if (selectedRole.value?.id === targetRole.value.id) selectedRole.value = null
    await loadRoles(currentPage.value > 1 && roles.value.length === 1 ? currentPage.value - 1 : currentPage.value)
    if (!selectedRole.value && roles.value.length > 0) selectedRole.value = roles.value[0] ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? t('roles.toasts.deleteFailed')
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
        <h1 class="page-title">{{ t('roles.title') }}</h1>
        <p class="page-subtitle">{{ canAccess ? t('roles.subtitle', total) : t('roles.businessRequired') }}</p>
      </div>
      <button v-if="canAccess" @click="openCreate" class="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-bg-100 font-semibold text-xs px-3 py-2 rounded-lg transition-colors self-start sm:self-auto">
        <Icon icon="lucide:plus" class="w-3.5 h-3.5" /> {{ t('roles.createRole') }}
      </button>
    </div>

    <!-- Upgrade wall -->
    <div v-if="!canAccess" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-14 h-14 rounded-2xl bg-green-700/10 border border-green-700/20 flex items-center justify-center mb-5">
        <Icon icon="lucide:shield-check" class="w-7 h-7 text-green-700" />
      </div>
      <h2 class="text-xl font-semibold text-gray-1000 mb-2">{{ t('roles.upgrade.title') }}</h2>
      <p class="text-gray-900 text-sm max-w-sm mb-6">{{ t('roles.upgrade.desc') }}</p>
      <button @click="router.push({ name: 'billing' })"
        class="px-6 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-bg-100 text-sm font-semibold transition-colors">
        {{ t('roles.upgrade.cta') }}
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">

      <!-- Role list -->
      <div class="flex flex-col gap-3">
        <div class="bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-400">
            <span class="text-xs font-semibold text-gray-1000">{{ t('roles.rolesCount', { count: total }) }}</span>
          </div>

          <div v-if="isLoading" class="px-4 py-8 text-center text-gray-700 text-sm">{{ t('roles.loading') }}</div>

          <div v-else-if="!roles.length" class="px-4 py-8 text-center text-gray-700 text-sm">{{ t('roles.noRoles') }}</div>

          <div
            v-for="role in roles" :key="role.id"
            :class="['px-4 py-3.5 border-b border-gray-400/60 last:border-0 cursor-pointer transition-colors group', selectedRole?.id === role.id ? 'bg-green-700/5' : 'hover:bg-gray-400/40']"
            @click="selectedRole = role"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-1000">{{ role.name }}</span>
              <div class="flex items-center gap-1.5">
                <span :class="['status-badge text-[9px]', role.immutable ? 'role-system' : 'role-custom']">
                  {{ role.immutable ? t('roles.system') : t('roles.custom') }}
                </span>
                <span v-if="role.is_disabled" class="status-badge text-[9px] status-inactive">{{ t('roles.disabled') }}</span>
                <div v-if="!role.immutable" class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <button @click="openEdit(role)" class="p-1 rounded hover:bg-gray-500 text-gray-700 hover:text-gray-1000 transition-colors">
                    <Icon icon="lucide:pencil" class="w-3 h-3" />
                  </button>
                  <button @click="openDelete(role)" class="p-1 rounded hover:bg-red-500/20 text-gray-700 hover:text-red-400 transition-colors">
                    <Icon icon="lucide:trash-2" class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-700">{{ t('roles.memberCount', role.member_roles_count) }}</div>
            <div v-if="role.description" class="text-xs text-gray-700/70 mt-0.5 truncate">{{ role.description }}</div>
          </div>
        </div>

        <Pagination v-model="currentPage" :total="total" :per-page="perPage" @update:model-value="loadRoles($event)" />
      </div>

      <!-- Permissions matrix -->
      <div class="md:col-span-2 bg-gray-200 border border-gray-400 rounded-xl overflow-hidden">
        <div v-if="!selectedRole" class="flex items-center justify-center h-48 text-gray-700 text-sm">
          {{ t('roles.selectRole') }}
        </div>
        <template v-else>
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-400">
            <div>
              <div class="text-sm font-semibold text-gray-1000">{{ t('roles.rolePermissions', { name: selectedRole.name }) }}</div>
              <div v-if="selectedRole.description" class="text-xs text-gray-700 mt-0.5">{{ selectedRole.description }}</div>
            </div>
            <button v-if="!selectedRole.immutable" @click="openEdit(selectedRole)" class="flex items-center gap-1.5 text-xs text-gray-900 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 px-3 py-1.5 rounded-md transition-colors">
              <Icon icon="lucide:pencil" class="w-3 h-3" /> {{ t('roles.editRole') }}
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="app-table">
              <thead>
                <tr>
                  <th class="min-w-32">{{ t('roles.matrix.resource') }}</th>
                  <th v-for="tag in ALL_TAGS" :key="tag" class="text-center">{{ t(`roles.tags.${tag}`) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in permissionGroups" :key="group.group_name">
                  <td class="font-medium text-gray-1000 text-sm">{{ group.name }}</td>
                  <td v-for="tag in ALL_TAGS" :key="tag" class="text-center">
                    <div v-if="!groupHasTag(group, tag)" class="w-5 h-5 rounded-md bg-gray-400/20 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:minus" class="w-2.5 h-2.5 text-gray-500" />
                    </div>
                    <div v-else-if="roleHasTag(selectedRole, group, tag)" class="w-5 h-5 rounded-md bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:check" class="w-3 h-3 text-green-400" />
                    </div>
                    <div v-else class="w-5 h-5 rounded-md bg-gray-400/50 border border-gray-500 flex items-center justify-center mx-auto">
                      <Icon icon="lucide:x" class="w-2.5 h-2.5 text-gray-700" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center gap-4 px-4 py-3 border-t border-gray-400">
            <div class="flex items-center gap-1.5 text-xs text-gray-700">
              <div class="w-4 h-4 rounded bg-green-500/10 border border-green-500/25 flex items-center justify-center"><Icon icon="lucide:check" class="w-2.5 h-2.5 text-green-400" /></div>
              {{ t('roles.legend.allowed') }}
            </div>
            <div class="flex items-center gap-1.5 text-xs text-gray-700">
              <div class="w-4 h-4 rounded bg-gray-400/50 border border-gray-500 flex items-center justify-center"><Icon icon="lucide:x" class="w-2.5 h-2.5 text-gray-700" /></div>
              {{ t('roles.legend.denied') }}
            </div>
            <div class="flex items-center gap-1.5 text-xs text-gray-700">
              <div class="w-4 h-4 rounded bg-gray-400/20 flex items-center justify-center"><Icon icon="lucide:minus" class="w-2.5 h-2.5 text-gray-500" /></div>
              {{ t('roles.legend.na') }}
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
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-sans text-lg font-semibold text-gray-1000">{{ t('roles.createModal.title') }}</h2>
            <button @click="showCreateModal = false" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs text-gray-700">{{ t('roles.createModal.roleName') }} <span class="text-red-400">*</span></label>
                <input v-model="createForm.name" class="app-inp text-sm py-2 px-2" :placeholder="t('roles.createModal.roleNamePlaceholder')" />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-gray-700">{{ t('roles.createModal.description') }}</label>
                <input v-model="createForm.description" class="app-inp text-sm py-2 px-2" :placeholder="t('roles.createModal.descriptionPlaceholder')" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-semibold text-gray-1000">{{ t('roles.createModal.permissions') }} <span class="text-red-400">*</span></label>
                <button
                  class="w-6 h-6 flex items-center justify-center rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
                  :title="t('roles.createModal.resetAll')"
                  @click="createForm.permissions = new Set()"
                >
                  <Icon icon="lucide:rotate-ccw" class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="space-y-2.5">
                <div
                  v-for="group in permissionGroups" :key="group.group_name"
                  class="border border-gray-500 rounded-xl overflow-hidden"
                >
                  <!-- Group header -->
                  <div class="flex items-start justify-between gap-3 px-4 py-3.5 bg-gray-400/30">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-gray-1000">{{ group.name }}</div>
                      <div class="text-xs text-gray-700 mt-0.5 leading-relaxed">{{ group.description }}</div>
                    </div>
                    <button
                      class="text-xs font-semibold text-green-700 hover:text-green-800 shrink-0 mt-0.5 transition-colors"
                      @click="toggleGroup(createForm.permissions, group)"
                    >
                      {{ t('roles.createModal.toggleGroup') }}
                    </button>
                  </div>
                  <!-- Individual permissions -->
                  <div
                    v-for="perm in group.permissions" :key="perm.identifier"
                    class="flex items-start justify-between gap-3 px-4 py-3 border-t border-gray-500/60"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-medium text-gray-1000">{{ perm.name }}</span>
                        <span class="text-[10px] font-mono font-semibold text-gray-700 border border-gray-500 bg-gray-400 px-1.5 py-0.5 rounded leading-none">
                          {{ perm.tag.toUpperCase() }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-700 mt-0.5 leading-relaxed">{{ perm.description }}</p>
                    </div>
                    <!-- Toggle switch -->
                    <button
                      :class="['relative w-10 h-5 rounded-full overflow-hidden transition-colors duration-200 shrink-0 mt-0.5 focus:outline-none', createForm.permissions.has(perm.identifier) ? 'bg-green-700' : 'bg-gray-500 border border-gray-500']"
                      @click="togglePerm(createForm.permissions, perm.identifier)"
                    >
                      <span :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200', createForm.permissions.has(perm.identifier) ? 'translate-x-5' : 'translate-x-0']" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="showCreateModal = false" class="flex-1 py-2.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors">{{ t('roles.createModal.cancel') }}</button>
            <button
              @click="handleCreate"
              :disabled="!createForm.name.trim() || isSaving"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', createForm.name.trim() && !isSaving ? 'bg-green-700 hover:bg-green-800 text-bg-100' : 'bg-green-700/40 text-bg-100/50 cursor-not-allowed']"
            >
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ isSaving ? t('roles.createModal.creating') : t('roles.createModal.create') }}
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
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-sans text-lg font-semibold text-gray-1000">{{ t('roles.editModal.title') }}</h2>
            <button @click="showEditModal = false" class="p-1.5 rounded-lg hover:bg-gray-400 text-gray-700 hover:text-gray-1000 transition-colors">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 mb-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs text-gray-700">{{ t('roles.createModal.roleName') }} <span class="text-red-400">*</span></label>
                <input v-model="editForm.name" class="app-inp text-sm py-2 px-2" />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-gray-700">{{ t('roles.createModal.description') }}</label>
                <input v-model="editForm.description" class="app-inp text-sm py-2 px-2" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-semibold text-gray-1000">{{ t('roles.createModal.permissions') }} <span class="text-red-400">*</span></label>
                <button
                  class="w-6 h-6 flex items-center justify-center rounded-md text-gray-700 hover:text-gray-1000 hover:bg-gray-400 transition-colors"
                  :title="t('roles.createModal.resetAll')"
                  @click="editForm.permissions = new Set()"
                >
                  <Icon icon="lucide:rotate-ccw" class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="space-y-2.5">
                <div
                  v-for="group in permissionGroups" :key="group.group_name"
                  class="border border-gray-500 rounded-xl overflow-hidden"
                >
                  <!-- Group header -->
                  <div class="flex items-start justify-between gap-3 px-4 py-3.5 bg-gray-400/30">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-gray-1000">{{ group.name }}</div>
                      <div class="text-xs text-gray-700 mt-0.5 leading-relaxed">{{ group.description }}</div>
                    </div>
                    <button
                      class="text-xs font-semibold text-green-700 hover:text-green-800 shrink-0 mt-0.5 transition-colors"
                      @click="toggleGroup(editForm.permissions, group)"
                    >
                      {{ t('roles.createModal.toggleGroup') }}
                    </button>
                  </div>
                  <!-- Individual permissions -->
                  <div
                    v-for="perm in group.permissions" :key="perm.identifier"
                    class="flex items-start justify-between gap-3 px-4 py-3 border-t border-gray-500/60"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-medium text-gray-1000">{{ perm.name }}</span>
                        <span class="text-[10px] font-mono font-semibold text-gray-700 border border-gray-500 bg-gray-400 px-1.5 py-0.5 rounded leading-none">
                          {{ perm.tag.toUpperCase() }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-700 mt-0.5 leading-relaxed">{{ perm.description }}</p>
                    </div>
                    <!-- Toggle switch -->
                    <button
                      :class="['relative w-10 h-5 rounded-full overflow-hidden transition-colors duration-200 shrink-0 mt-0.5 focus:outline-none', editForm.permissions.has(perm.identifier) ? 'bg-green-700' : 'bg-gray-500 border border-gray-500']"
                      @click="togglePerm(editForm.permissions, perm.identifier)"
                    >
                      <span :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200', editForm.permissions.has(perm.identifier) ? 'translate-x-5' : 'translate-x-0']" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="showEditModal = false" class="flex-1 py-2.5 rounded-lg bg-gray-400 hover:bg-gray-500 text-gray-900 hover:text-gray-1000 text-sm transition-colors">{{ t('roles.createModal.cancel') }}</button>
            <button
              @click="handleEdit"
              :disabled="!editForm.name.trim() || isSaving"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', editForm.name.trim() && !isSaving ? 'bg-green-700 hover:bg-green-800 text-bg-100' : 'bg-green-700/40 text-bg-100/50 cursor-not-allowed']"
            >
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              {{ isSaving ? t('roles.editModal.saving') : t('roles.editModal.save') }}
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
        <div class="bg-gray-200 border border-gray-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:trash-2" class="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-1000">{{ t('roles.deleteModal.title', { name: targetRole.name }) }}</h3>
              <p class="text-xs text-gray-700 mt-1 leading-relaxed">{{ t('roles.deleteModal.body') }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-1000 bg-gray-400 hover:bg-gray-500 border border-gray-500 rounded-lg transition-colors">{{ t('roles.deleteModal.cancel') }}</button>
            <button @click="handleDelete" :disabled="isSaving" class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60">
              <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
              {{ t('roles.deleteModal.delete') }}
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
