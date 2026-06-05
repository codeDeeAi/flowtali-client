import http from '@/services/utils/http'

export interface IOrgApiKey {
  id: string
  name: string
  publishable_key: string
  allowed_domains: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface ICreateApiKeyPayload {
  name: string
  allowed_domains?: string[]
}

export interface ICreateApiKeyResponse {
  key: IOrgApiKey
  secret: string
}

export const ApiKeyService = {
  list(orgId: string) {
    return http.get<{ data: { data: IOrgApiKey[] } }>(`/api/v1/orgs/${orgId}/api-keys`)
  },

  create(orgId: string, payload: ICreateApiKeyPayload) {
    return http.post<{ data: ICreateApiKeyResponse }>(`/api/v1/orgs/${orgId}/api-keys`, payload)
  },

  revoke(orgId: string, keyId: string) {
    return http.put(`/api/v1/orgs/${orgId}/api-keys/${keyId}/revoke`, {})
  },

  destroy(orgId: string, keyId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/api-keys/${keyId}`)
  },
}
