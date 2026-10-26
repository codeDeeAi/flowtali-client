import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ClientService } from '@/services/client.service'
import { ProjectService } from '@/services/project.service'
import type { QuickClient } from '@/components/documents/quickDocument'

/**
 * Resolves who a new document is for from the route: `?client_id=` (from a
 * client page) or the client of `?project_id=`. `ready` flips once resolved,
 * even when there is no client or the lookup fails.
 */
export function useDocumentClient() {
  const route     = useRoute()
  const authStore = useAuthStore()
  const orgId     = computed(() => authStore.getCurrentOrganization?.id ?? '')

  const client = ref<QuickClient | null>(null)
  const ready  = ref(false)

  async function resolve() {
    try {
      let clientId = typeof route.query.client_id === 'string' ? route.query.client_id : ''
      const projectId = typeof route.query.project_id === 'string' ? route.query.project_id : ''

      if (!clientId && projectId && orgId.value) {
        const { data } = await ProjectService.get(orgId.value, projectId)
        clientId = data.data.client?.id ?? ''
      }
      if (!clientId || !orgId.value) return

      const { data } = await ClientService.get(orgId.value, clientId)
      const c = data.data
      client.value = {
        clientId: c.id,
        name:     c.full_name,
        company:  c.company ?? '',
        email:    c.email ?? '',
        phone:    c.phone_numbers?.[0] ?? '',
        address:  c.address?.full ?? '',
      }
    } catch {
      // No prefill — the user picks the client themselves.
    } finally {
      ready.value = true
    }
  }

  resolve()
  return { client, ready }
}
