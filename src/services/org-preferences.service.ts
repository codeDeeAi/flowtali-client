import http from './utils/http'
import type { IOrgBankAccount, IOrgBrandColor, IOrgInvoiceProfile, IOrgPreferences, IOrgStamp } from '@/types/org-preferences.types'

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

  updateInvoiceProfiles(orgId: string, profiles: IOrgInvoiceProfile[]) {
    return http.put<{ data: { invoice_profiles: IOrgInvoiceProfile[] } }>(`/api/v1/orgs/${orgId}/preferences/invoice-profiles`, { profiles })
  },

  updateBankAccounts(orgId: string, bank_accounts: IOrgBankAccount[]) {
    return http.put<{ data: { bank_accounts: IOrgBankAccount[] } }>(`/api/v1/orgs/${orgId}/preferences/bank-accounts`, { bank_accounts })
  },

  attachSignature(orgId: string, payload: { name: string; role: string; media_id: string }) {
    return http.post(`/api/v1/orgs/${orgId}/preferences/signatures`, payload)
  },

  deleteSignature(orgId: string, mediaId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/preferences/signatures/${mediaId}`)
  },

  attachLogo(orgId: string, payload: { label: string; media_id: string }) {
    return http.post(`/api/v1/orgs/${orgId}/preferences/logos`, payload)
  },

  deleteLogo(orgId: string, mediaId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/preferences/logos/${mediaId}`)
  },
}
