import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEmbedAuthStore } from '@/stores/embedAuth'
import { usePermissions } from '@/composables/usePermissions'

/**
 * Shim that delegates to the embed auth store when inside an embed route,
 * and falls back to the regular permission system otherwise.
 */
export function useEmbedPermissions() {
  const route = useRoute()
  const embedStore = useEmbedAuthStore()
  const regularPerms = usePermissions()

  const isEmbed = computed(() => !!route.meta.embed)

  const permissions = computed(() =>
    isEmbed.value ? embedStore.permissions : regularPerms.permissions.value,
  )

  function can(permission: string): boolean {
    return isEmbed.value ? embedStore.hasPermission(permission) : regularPerms.can(permission)
  }

  function canAny(...perms: string[]): boolean {
    return perms.some(p => can(p))
  }

  function canAll(...perms: string[]): boolean {
    return perms.every(p => can(p))
  }

  const isOwner = computed(() => isEmbed.value ? false : regularPerms.isOwner.value)
  const isPersonalOrg = computed(() => isEmbed.value ? false : regularPerms.isPersonalOrg.value)
  const isBusinessOrg = computed(() => isEmbed.value ? true : regularPerms.isBusinessOrg.value)

  return { can, canAny, canAll, isOwner, isPersonalOrg, isBusinessOrg, permissions, isEmbed }
}
