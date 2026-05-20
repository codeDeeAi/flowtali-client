import http from './utils/http'
import type { IOrgBrandColor, IOrgPreferences, IOrgStamp } from '@/types/org-preferences.types'

export const OrgPreferencesService = {
  get(orgId: string) {
    return http.get<{ data: IOrgPreferences }>(`/api/v1/orgs/${orgId}/preferences`)
  },

  updateStamps(orgId: string, stamps: IOrgStamp[]) {
    return http.put<{ data: { stamps: IOrgStamp[] } }>(`/api/v1/orgs/${orgId}/preferences/stamps`, { stamps })
  },

  updateBrandColors(orgId: string, brand_colors: IOrgBrandColor[]) {
    return http.put<{ data: { brand_colors: IOrgBrandColor[] } }>(`/api/v1/orgs/${orgId}/preferences/brand-colors`, { brand_colors })
  },

  uploadSignature(orgId: string, formData: FormData) {
    return http.post(`/api/v1/orgs/${orgId}/preferences/signatures`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteSignature(orgId: string, mediaId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/preferences/signatures/${mediaId}`)
  },

  uploadLogo(orgId: string, formData: FormData) {
    return http.post(`/api/v1/orgs/${orgId}/preferences/logos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteLogo(orgId: string, mediaId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/preferences/logos/${mediaId}`)
  },
}
