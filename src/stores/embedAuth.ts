import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useEmbedAuthStore = defineStore('embed-auth-store', () => {
  const token = ref<string | null>(null)
  const orgId = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const userReference = ref<string | null>(null)
  const isReady = ref(false)

  const isAuthenticated = computed(() => isReady.value && !!orgId.value)

  function init(session: { token: string; org_id: string; permissions: string[]; user_reference: string }) {
    token.value = session.token
    orgId.value = session.org_id
    permissions.value = session.permissions
    userReference.value = session.user_reference
    isReady.value = true
  }

  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function clear() {
    token.value = null
    orgId.value = null
    permissions.value = []
    userReference.value = null
    isReady.value = false
  }

  return { token, orgId, permissions, userReference, isReady, isAuthenticated, init, hasPermission, clear }
})
