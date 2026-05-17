import { defineStore } from 'pinia'
import type { IState } from '@/stores/types/auth.store.types'
import type { ILoginData, IOrganization } from '@/types/auth.types'

export const useAuthStore = defineStore('auth-store', {
  state: (): IState => ({
    isAuthenticated: false,
    user: null,
    organizations: [],
    currentOrganization: null,
  }),

  getters: {
    getUser: (state) => state.user,
    getToken: (state) => state.user?.token ?? null,
    isLoggedIn: (state) => state.isAuthenticated,
    getOrganizations: (state) => state.organizations,
    getCurrentOrganization: (state) => state.currentOrganization,
    getPermissions: (state) => state.currentOrganization?.permissions ?? [],
    getRoles: (state) => state.currentOrganization?.roles ?? [],
  },

  actions: {
    setAuthData(loginData: ILoginData) {
      const { organizations, ...user } = loginData
      this.user = user
      this.organizations = organizations
      this.currentOrganization = organizations[0] ?? null
      this.isAuthenticated = true
    },

    setCurrentOrganization(org: IOrganization) {
      this.currentOrganization = org
    },

    logout() {
      this.isAuthenticated = false
      this.user = null
      this.organizations = []
      this.currentOrganization = null
    },

    clearAuthData() {
      this.logout()
    },
  },

  persist: true,
})
