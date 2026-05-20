import http from './utils/http'

export interface ISharedLink {
  id: string
  token: string
  label: string | null
  visibility: 'public' | 'private'
  access_code: string | null
  expires_at: string | null
  is_active: boolean
  views: number
  unique_views: number
  last_viewed_at: string | null
  view_log: { timestamp: string; browser: string }[]
  created_at: string
}

export const SharedLinksService = {
  list(orgId: string, letterheadId: string) {
    return http.get<{ data: ISharedLink[] }>(`/api/v1/orgs/${orgId}/letterheads/${letterheadId}/links`)
  },

  create(orgId: string, letterheadId: string, payload: {
    label?: string
    visibility: 'public' | 'private'
    access_code?: string
    validity_days?: number | null
  }) {
    return http.post<{ data: ISharedLink }>(`/api/v1/orgs/${orgId}/letterheads/${letterheadId}/links`, payload)
  },

  revoke(orgId: string, letterheadId: string, linkId: string) {
    return http.put<{ data: ISharedLink }>(`/api/v1/orgs/${orgId}/letterheads/${letterheadId}/links/${linkId}/revoke`, {})
  },

  delete(orgId: string, letterheadId: string, linkId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/letterheads/${letterheadId}/links/${linkId}`)
  },

  // Public endpoints (no auth)
  getByToken(token: string, code?: string) {
    return http.get<{ data: { link: ISharedLink; letterhead: any } }>(`/api/v1/share/l/${token}`, {
      params: code ? { code } : {},
    })
  },

  recordView(token: string) {
    return http.post(`/api/v1/share/l/${token}/view`, {})
  },
}
