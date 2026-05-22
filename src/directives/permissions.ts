import type { App, Directive } from 'vue'
import { useAuthStore } from '@/stores/auth'

function getPermissions(): string[] {
  const store = useAuthStore()
  return store.getCurrentOrganization?.permissions ?? []
}

function getOrgType(): string {
  const store = useAuthStore()
  return store.getCurrentOrganization?.type ?? ''
}

/**
 * v-can="'clients.create'"
 * Removes the element from the DOM if the user lacks the given permission.
 *
 * v-can.disable="'clients.create'"
 * Keeps the element but adds disabled + visual opacity instead of removing it.
 */
export const vCan: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const required = binding.value
    const has = getPermissions().includes(required)

    if (!has) {
      if (binding.modifiers.disable) {
        el.setAttribute('disabled', 'true')
        el.style.opacity = '0.4'
        el.style.pointerEvents = 'none'
        el.style.cursor = 'not-allowed'
      } else {
        el.style.display = 'none'
      }
    }
  },
  updated(el, binding) {
    const required = binding.value
    const has = getPermissions().includes(required)

    if (binding.modifiers.disable) {
      if (!has) {
        el.setAttribute('disabled', 'true')
        el.style.opacity = '0.4'
        el.style.pointerEvents = 'none'
        el.style.cursor = 'not-allowed'
      } else {
        el.removeAttribute('disabled')
        el.style.opacity = ''
        el.style.pointerEvents = ''
        el.style.cursor = ''
      }
    } else {
      el.style.display = has ? '' : 'none'
    }
  },
}

/**
 * v-business-org
 * Removes the element from the DOM when the current org is personal.
 * Use on anything that only makes sense for business orgs (members, roles).
 */
export const vBusinessOrg: Directive<HTMLElement> = {
  mounted(el) {
    if (getOrgType() !== 'business') {
      el.style.display = 'none'
    }
  },
  updated(el) {
    el.style.display = getOrgType() === 'business' ? '' : 'none'
  },
}

export function registerPermissionDirectives(app: App) {
  app.directive('can', vCan)
  app.directive('business-org', vBusinessOrg)
}
