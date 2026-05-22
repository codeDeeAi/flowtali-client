import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import 'pinia-plugin-persistedstate'
import type { ILoginData, IOrganization } from '@/types/auth.types'
import type { IAuthUser } from '@/stores/types/auth.store.types'

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    const isAuthenticated = ref(false)
    const user = ref<IAuthUser | null>(null)
    const organizations = ref<IOrganization[]>([])
    const currentOrganization = ref<IOrganization | null>(null)

    const getUser = computed(() => user.value)
    const getToken = computed(() => user.value?.token ?? null)
    const isLoggedIn = computed(() => isAuthenticated.value)
    const getOrganizations = computed(() => organizations.value)
    const getCurrentOrganization = computed(() => currentOrganization.value)
    const getPermissions = computed(() => currentOrganization.value?.permissions ?? [])
    const getRoles = computed(() => currentOrganization.value?.roles ?? [])

    function setAuthData(loginData: ILoginData) {
      const { organizations: orgs, ...userData } = loginData
      user.value = userData
      organizations.value = orgs
      currentOrganization.value = orgs[0] ?? null
      isAuthenticated.value = true
    }

    function setCurrentOrganization(org: IOrganization) {
      currentOrganization.value = org
    }

    function addOrganization(org: IOrganization) {
      organizations.value.push(org)
      currentOrganization.value = org
    }

    function logout() {
      isAuthenticated.value = false
      user.value = null
      organizations.value = []
      currentOrganization.value = null
    }

    function clearAuthData() {
      logout()
    }

    function updateUserInfo(data: Partial<{ first_name: string; last_name: string; avatar: string | null }>) {
      if (!user.value) return
      user.value = { ...user.value, ...data }
    }

    function updateMfaEnabled(enabled: boolean) {
      if (user.value) user.value = { ...user.value, mfa_enabled: enabled }
    }

    function updateOrganization(org: IOrganization) {
      const idx = organizations.value.findIndex(o => o.id === org.id)
      if (idx !== -1) organizations.value[idx] = org
      if (currentOrganization.value?.id === org.id) currentOrganization.value = org
    }

    function updateCurrentOrgLogo(logo: string | null) {
      if (!currentOrganization.value) return
      currentOrganization.value = { ...currentOrganization.value, logo }
      // Also update the logo in the organizations list
      const idx = organizations.value.findIndex(o => o.id === currentOrganization.value?.id)
      if (idx !== -1) organizations.value[idx] = { ...organizations.value[idx]!, logo }
    }

    return {
      isAuthenticated,
      user,
      organizations,
      currentOrganization,
      getUser,
      getToken,
      isLoggedIn,
      getOrganizations,
      getCurrentOrganization,
      getPermissions,
      getRoles,
      setAuthData,
      setCurrentOrganization,
      addOrganization,
      logout,
      clearAuthData,
      updateUserInfo,
      updateMfaEnabled,
      updateOrganization,
      updateCurrentOrgLogo,
    }
  },
  { persist: true },
)
