import http from '@/services/utils/http'
import type {
  IRole,
  IRoleFormData,
  IRoleListResponse,
  ICreateRolePayload,
  IUpdateRolePayload,
} from '@/types/role.types'

export const RoleService = {
  list(orgId: string, params?: { search?: string; page?: number; per_page?: number }) {
    return http.get<{ data: IRoleListResponse }>(`/api/v1/orgs/${orgId}/roles`, { params })
  },

  formData(orgId: string) {
    return http.get<{ data: IRoleFormData }>(`/api/v1/orgs/${orgId}/roles/form-data`)
  },

  get(orgId: string, roleId: string) {
    return http.get<{ data: IRole }>(`/api/v1/orgs/${orgId}/roles/${roleId}`)
  },

  create(orgId: string, payload: ICreateRolePayload) {
    return http.post<{ data: IRole }>(`/api/v1/orgs/${orgId}/roles`, payload)
  },

  update(orgId: string, roleId: string, payload: IUpdateRolePayload) {
    return http.put<{ data: IRole }>(`/api/v1/orgs/${orgId}/roles/${roleId}`, payload)
  },

  delete(orgId: string, roleId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/roles/${roleId}`)
  },

  toggle(orgId: string, roleId: string) {
    return http.patch<{ data: IRole }>(`/api/v1/orgs/${orgId}/roles/${roleId}/toggle`)
  },
}
