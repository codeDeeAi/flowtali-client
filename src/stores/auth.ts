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
    }
  },
  { persist: true },
)
