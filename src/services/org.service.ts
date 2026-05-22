import http from '@/services/utils/http'
import type { IOrganization } from '@/types/auth.types'

export const OrgService = {
  create(data: { name: string; description?: string; type: 'business' | 'personal' }) {
    return http.post<{ data: IOrganization }>('/api/v1/orgs', data)
  },

  getMyMembership(orgId: string) {
    return http.get<{ data: IOrganization }>(`/api/v1/orgs/${orgId}/me`)
  },
}
