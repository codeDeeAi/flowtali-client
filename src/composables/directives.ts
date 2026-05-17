import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface ICheckPermissions {
  hasOne: (permission: string) => boolean
  hasAny: (permissions: string[]) => boolean
  hasAll: (permissions: string[]) => boolean
}

export function useDirectives() {

  const authStore = useAuthStore();

  const checkPermissions = (): ICheckPermissions => {
    const hasOne = (permission: string): boolean => {
      return computed(() => {
        const userPermissions = authStore.getPermissions;
        return userPermissions.includes(permission);
      }).value;
    };

    const hasAny = (permissions: string[]): boolean => {
      return computed(() => {
        const userPermissions = authStore.getPermissions;
        return permissions.some(permission => userPermissions.includes(permission));
      }).value;
    };

    const hasAll = (permissions: string[]): boolean => {
      return computed(() => {
        const userPermissions = authStore.getPermissions;
        return permissions.every(permission => userPermissions.includes(permission));
      }).value;
    };

    return { hasOne, hasAny, hasAll }
  };

  return {
    checkPermissions
  }
}
