import { defineStore } from 'pinia';
import type { IState } from '@/stores/types/app.store.types';

export const useAppStore = defineStore(
  'app-store',
  {
    state: (): IState => ({
      theme: 'dark',
      sidebarCollapsed: false,
    }),
    getters: {
      getTheme: (state) => state.theme,
      isSidebarCollapsed: (state) => state.sidebarCollapsed,
      getAppName: () => 'Flowtali',
    },
    actions: {
      setTheme(theme: 'light' | 'dark') {
        this.theme = theme;
      },
      toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      },
    },
    persist: true
  });
