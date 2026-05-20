import http from './utils/http'

export interface IUserProfile {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: { number: string; country_code?: string }[] | null
  job_title: string | null
  avatar: string | null
  mfa_enabled: boolean
  email_verified_at: string | null
  created_at: string
}

export interface ISession {
  id: number
  name: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  is_current: boolean
}

export const ProfileService = {
  get() {
    return http.get<{ data: IUserProfile }>('/api/v1/profile')
  },

  update(data: { first_name?: string; last_name?: string; phone?: unknown; job_title?: string }) {
    return http.put<{ data: IUserProfile }>('/api/v1/profile', data)
  },

  uploadAvatar(file: File) {
    const fd = new FormData()
    fd.append('avatar', file)
    return http.post<{ data: IUserProfile }>('/api/v1/profile/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  changePassword(current_password: string, password: string, password_confirmation: string) {
    return http.put('/api/v1/profile/password', { current_password, password, password_confirmation })
  },

  listSessions() {
    return http.get<{ data: ISession[] }>('/api/v1/profile/sessions')
  },

  revokeSession(tokenId: number) {
    return http.delete(`/api/v1/profile/sessions/${tokenId}`)
  },

  revokeAllSessions() {
    return http.delete<{ data: { revoked: number } }>('/api/v1/profile/sessions')
  },
}
