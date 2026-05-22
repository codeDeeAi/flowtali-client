import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermissions() {
  const authStore = useAuthStore()

  const currentOrg = computed(() => authStore.getCurrentOrganization)

  const isPersonalOrg = computed(() => currentOrg.value?.type === 'personal')
  const isBusinessOrg = computed(() => currentOrg.value?.type === 'business')
  const isOwner       = computed(() => currentOrg.value?.is_owner === true)

  const permissions = computed(() => currentOrg.value?.permissions ?? [])

  function can(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function canAny(...perms: string[]): boolean {
    return perms.some(p => can(p))
  }

  function canAll(...perms: string[]): boolean {
    return perms.every(p => can(p))
  }

  return {
    can,
    canAny,
    canAll,
    isPersonalOrg,
    isBusinessOrg,
    isOwner,
    permissions,
  }
}
