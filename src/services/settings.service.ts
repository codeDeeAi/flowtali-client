import http from './utils/http'

export interface IOrgSettings {
  name?:            string
  industry:         string | null
  company_size:     string | null
  address:          string | null
  default_currency: string
  payment_terms:    string
  default_tax_rate: number
  require_mfa:      boolean
  ip_allowlist:     string[]
}

export interface INotificationPref {
  email:  boolean
  in_app: boolean
}

export interface INotificationPrefs {
  invoice_paid:    INotificationPref
  invoice_overdue: INotificationPref
  invoice_viewed:  INotificationPref
  member_joined:   INotificationPref
  role_changed:    INotificationPref
}

export const SettingsService = {
  getOrgSettings(orgId: string) {
    return http.get<{ data: IOrgSettings }>(`/api/v1/orgs/${orgId}/settings`)
  },

  updateGeneralSettings(orgId: string, data: Partial<IOrgSettings> & { name?: string }) {
    return http.put<{ data: IOrgSettings }>(`/api/v1/orgs/${orgId}/settings/general`, data)
  },

  updateSecuritySettings(orgId: string, data: { require_mfa?: boolean; ip_allowlist?: string[] }) {
    return http.put<{ data: IOrgSettings }>(`/api/v1/orgs/${orgId}/settings/security`, data)
  },

  getNotificationPrefs() {
    return http.get<{ data: INotificationPrefs }>('/api/v1/profile/notifications')
  },

  updateNotificationPrefs(data: INotificationPrefs) {
    return http.put<{ data: INotificationPrefs }>('/api/v1/profile/notifications', data)
  },

  uploadOrgLogo(orgId: string, file: File) {
    const form = new FormData()
    form.append('logo', file)
    return http.post<{ data: { logo: string | null } }>(`/api/v1/orgs/${orgId}/settings/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteOrgLogo(orgId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/settings/logo`)
  },
}
