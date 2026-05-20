import http from './utils/http'

export interface IAuditLog {
  id: string
  organization_id: string | null
  user_id: string | null
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
