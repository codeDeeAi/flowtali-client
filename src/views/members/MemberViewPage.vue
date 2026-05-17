<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/notification.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { MemberService } from '@/services/member.service.ts'
import type { IMember, IMemberRole } from '@/types/member.types'

const router = useRouter()
const route = useRoute()
const { notify } = useNotification()
const authStore = useAuthStore()
const orgId = computed(() => authStore.getCurrentOrganization?.id ?? '')

const member = ref<IMember | null>(null)
const availableRoles = ref<IMemberRole[]>([])
const loading = ref(true)
const notFound = ref(false)
const isSaving = ref(false)
const showRemoveConfirm = ref(false)
const showChangeRole = ref(false)
const newRoleIds = ref<string[]>([])

onMounted(async () => {
  if (!orgId.value) { loading.value = false; return }
  try {
    const [memberRes, formRes] = await Promise.all([
      MemberService.get(orgId.value, route.params.id as string),
      MemberService.formData(orgId.value),
    ])
    member.value = memberRes.data.data
    availableRoles.value = formRes.data.data.roles
    newRoleIds.value = member.value.roles.map((r) => r.id)
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    if (err?.response?.status === 404) notFound.value = true
    else notify('Failed to load member.', 'error')
  } finally {
    loading.value = false
  }
})

const memberInitials = computed(() => {
  const n = member.value?.user?.full_name ?? ''
  const parts = n.trim().split(' ')
  return parts.length >= 2 ? ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() : n.slice(0, 2).toUpperCase()
})

const avatarColor = computed(() => {
  if (!member.value) return '#e8a83e'
  const colors = ['#e8a83e', '#60a5fa', '#a78bfa', '#4ade80', '#f87171', '#38bdf8', '#fb923c', '#34d399']
  let h = 0
  for (let i = 0; i < member.value.id.length; i++) h = (h * 31 + member.value.id.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
})

const joinedDate = computed(() =>
  member.value ? new Date(member.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
)

const toggleNewRole = (roleId: string) => {
  const idx = newRoleIds.value.indexOf(roleId)
  if (idx === -1) newRoleIds.value.push(roleId)
  else newRoleIds.value.splice(idx, 1)
}

const handleChangeRole = async () => {
  if (!member.value) return
  isSaving.value = true
  try {
    const res = await MemberService.updateRoles(orgId.value, member.value.id, {
      role_ids: newRoleIds.value,
    })
    member.value = res.data.data
    notify('Roles updated successfully.', 'success')
    showChangeRole.value = false
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to update roles.'
    notify(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

const handleRemove = async () => {
  if (!member.value) return
  isSaving.value = true
  try {
    await MemberService.remove(orgId.value, member.value.id)
    notify(`${member.value.user?.full_name ?? 'Member'} has been removed.`, 'success')
    showRemoveConfirm.value = false
    router.push({ name: 'members' })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    const msg = err?.response?.data?.message ?? 'Failed to remove member.'
    notify(msg, 'error')
  } finally {
    isSaving.value = false
  }
}
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
              <h1 class="page-title">{{ member.user?.full_name }}</h1>
              <span v-if="member.is_owner" class="status-badge role-owner">Owner</span>
              <template v-else>
                <span v-for="role in member.roles" :key="role.id" class="status-badge role-custom">{{ role.name }}</span>
                <span v-if="!member.roles.length" class="status-badge role-member">No role</span>
              </template>
              <span :class="['status-badge', member.is_active ? 'status-active' : 'status-inactive']">{{ member.is_active ? 'Active' : 'Inactive' }}</span>
            </div>
            <p class="page-subtitle">Member since {{ joinedDate }}</p>
          </div>
        </div>
        <div v-if="!member.is_owner" class="flex items-center gap-2 ml-9 sm:ml-0">
          <button
            @click="showChangeRole = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 hover:border-charcoal-500 text-cream-faint hover:text-cream rounded-lg transition-colors"
          >
            <Icon icon="lucide:shield" class="w-3.5 h-3.5" /> Change Roles
          </button>
          <button
            @click="showRemoveConfirm = true"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-colors"
          >
            <Icon icon="lucide:user-x" class="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      </div>

      <!-- Layout -->
      <div class="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">

        <!-- Left: Profile card -->
        <div class="flex flex-col gap-5">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5 space-y-5">
            <div class="flex flex-col items-center text-center">
              <div class="relative mb-3">
                <div class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-charcoal-900" :style="{ backgroundColor: avatarColor }">
                  {{ memberInitials }}
                </div>
                <span :class="['absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-charcoal-800', member.is_active ? 'bg-green-400' : 'bg-charcoal-500']"></span>
              </div>
              <div class="text-base font-semibold text-cream">{{ member.user?.full_name }}</div>
              <div class="text-xs text-cream-faint mt-0.5">{{ member.user?.email }}</div>
            </div>

            <div class="h-px bg-charcoal-700"></div>

            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:mail" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Email</div>
                  <div class="text-xs text-cream truncate">{{ member.user?.email }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:calendar" class="w-3.5 h-3.5 text-cream-faint" />
                </div>
                <div>
                  <div class="text-[10px] text-cream-faint uppercase tracking-wide">Member Since</div>
                  <div class="text-xs text-cream">{{ joinedDate }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
              <div class="text-2xl font-bold text-cream">{{ member.roles.length }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Roles</div>
            </div>
            <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
              <div class="text-xs font-semibold text-cream">{{ member.is_active ? 'Active' : 'Inactive' }}</div>
              <div class="text-xs text-cream-faint mt-0.5">Status</div>
            </div>
          </div>
        </div>

        <!-- Right: Roles & Permissions -->
        <div class="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
          <div class="px-5 py-4 border-b border-charcoal-700">
            <h3 class="text-sm font-semibold text-cream">Assigned Roles</h3>
            <p class="text-xs text-cream-faint mt-0.5">
              {{ member.is_owner ? 'Organization owner — has full access' : member.roles.length ? `${member.roles.length} role${member.roles.length !== 1 ? 's' : ''} assigned` : 'No roles assigned' }}
            </p>
          </div>
          <div v-if="member.is_owner" class="flex items-center gap-3 px-5 py-6">
            <div class="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:crown" class="w-4 h-4 text-amber" />
            </div>
            <div>
              <div class="text-sm font-medium text-cream">Owner</div>
              <div class="text-xs text-cream-faint mt-0.5">Full access to all organization features</div>
            </div>
          </div>
          <div v-else-if="!member.roles.length" class="flex flex-col items-center justify-center py-12">
            <Icon icon="lucide:shield-off" class="w-8 h-8 text-cream-faint/30 mb-3" />
            <p class="text-xs text-cream-faint">No roles assigned</p>
          </div>
          <div v-else class="divide-y divide-charcoal-700/60">
            <div v-for="role in member.roles" :key="role.id" class="flex items-start gap-3 px-5 py-4">
              <div class="w-7 h-7 rounded-lg bg-charcoal-700 flex items-center justify-center shrink-0 mt-0.5">
                <Icon icon="lucide:shield" class="w-3.5 h-3.5 text-amber" />
              </div>
              <div>
                <div class="text-sm font-medium text-cream">{{ role.name }}</div>
                <div v-if="role.description" class="text-xs text-cream-faint mt-0.5">{{ role.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ── Change Roles Modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showChangeRole && member" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showChangeRole = false">
          <div class="bg-charcoal-800 border border-charcoal-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-lg font-semibold text-cream">Change Roles</h2>
              <button @click="showChangeRole = false" class="p-1.5 rounded-lg hover:bg-charcoal-700 text-cream-faint hover:text-cream transition-colors">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-cream-faint mb-5">
              Updating roles for <span class="text-cream font-medium">{{ member.user?.full_name }}</span>
            </p>

            <div class="space-y-1.5 mb-5 max-h-60 overflow-y-auto">
              <label
                v-for="role in availableRoles" :key="role.id"
                :class="['flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors', newRoleIds.includes(role.id) ? 'border-amber bg-amber/5' : 'border-charcoal-600 bg-charcoal-700/30 hover:border-charcoal-500']"
              >
                <input type="checkbox" :value="role.id" :checked="newRoleIds.includes(role.id)" @change="toggleNewRole(role.id)" class="sr-only" />
                <div :class="['w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors', newRoleIds.includes(role.id) ? 'border-amber bg-amber' : 'border-charcoal-500']">
                  <Icon v-if="newRoleIds.includes(role.id)" icon="lucide:check" class="w-2.5 h-2.5 text-charcoal-900" />
                </div>
                <div>
                  <div class="text-sm font-medium text-cream">{{ role.name }}</div>
                  <div v-if="role.description" class="text-xs text-cream-faint mt-0.5">{{ role.description }}</div>
                </div>
              </label>
              <div v-if="!availableRoles.length" class="text-xs text-cream-faint/70 text-center py-3">No roles available.</div>
            </div>

            <div class="flex gap-2">
              <button @click="showChangeRole = false" class="flex-1 py-2.5 rounded-lg bg-charcoal-700 hover:bg-charcoal-600 text-cream-muted hover:text-cream text-sm transition-colors">Cancel</button>
              <button
                @click="handleChangeRole"
                :disabled="isSaving"
                :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors', !isSaving ? 'bg-amber hover:bg-amber-light text-charcoal-900' : 'bg-amber/40 text-charcoal-900/50 cursor-not-allowed']"
              >
                <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                {{ isSaving ? 'Saving…' : 'Update Roles' }}
              </button>
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
                  <span class="text-cream font-medium">{{ member.user?.full_name }}</span> will lose access immediately. This cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button @click="showRemoveConfirm = false" class="px-4 py-2 text-xs font-medium text-cream-faint hover:text-cream bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 rounded-lg transition-colors">Cancel</button>
              <button
                @click="handleRemove"
                :disabled="isSaving"
                class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Icon v-if="isSaving" icon="lucide:loader-2" class="w-3 h-3 animate-spin" />
                Remove member
              </button>
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
