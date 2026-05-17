import http from '@/services/utils/http'
import type {
  IClient,
  IClientFormData,
  IClientListResponse,
  ICreateClientPayload,
  IUpdateClientPayload,
} from '@/types/client.types'

export const ClientService = {
  list(
    orgId: string,
    params?: { search?: string; page?: number; per_page?: number },
  ) {
    return http.get<{ data: IClientListResponse }>(`/api/v1/orgs/${orgId}/clients`, {
      params,
    })
  },

  formData(orgId: string) {
    return http.get<{ data: IClientFormData }>(`/api/v1/orgs/${orgId}/clients/form-data`)
  },

  get(orgId: string, clientId: string) {
    return http.get<{ data: IClient }>(`/api/v1/orgs/${orgId}/clients/${clientId}`)
  },

  create(orgId: string, payload: ICreateClientPayload) {
    return http.post<{ data: IClient }>(`/api/v1/orgs/${orgId}/clients`, payload)
  },

  update(orgId: string, clientId: string, payload: IUpdateClientPayload) {
    return http.put<{ data: IClient }>(`/api/v1/orgs/${orgId}/clients/${clientId}`, payload)
  },

  delete(orgId: string, clientId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/clients/${clientId}`)
  },
}
