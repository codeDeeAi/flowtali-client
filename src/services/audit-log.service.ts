import http from './utils/http'

export interface IAuditLogUser {
  id: string | null
  name: string
  email: string | null
  profile_photo: string | null
  is_active: boolean
}

export interface IAuditLogEventType {
  key: string
  label: string
  icon: string
  color: string
}

export interface IAuditLog {
  id: string
  organization_id: string | null
  user_id: string | null
  user: IAuditLogUser
  event: string
  action: string
  resource_type: string | null
  resource_id: string | null
  resource_label: string | null
  status: 'success' | 'failed'
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export const AuditLogService = {
  eventTypes(orgId: string) {
    return http.get<{ data: { types: IAuditLogEventType[] } }>(
      `/api/v1/orgs/${orgId}/audit-logs/event-types`,
    )
  },

  export(orgId: string, params?: {
    search?: string
    event?: string
    date_from?: string
    date_to?: string
  }) {
    return http.get(`/api/v1/orgs/${orgId}/audit-logs/export`, {
      params,
      responseType: 'blob',
    })
  },

  list(orgId: string, params?: {
    search?: string
    event?: string
    date_from?: string
    date_to?: string
    page?: number
    per_page?: number
  }) {
    return http.get<{ data: { data: IAuditLog[]; current_page: number; last_page: number; total: number } }>(
      `/api/v1/orgs/${orgId}/audit-logs`,
      { params },
    )
  },
}
