import http from '@/services/utils/http'
import type { ILoginData } from '@/types/auth.types'

export interface IMfaChallenge {
  type: '2fa' | 'mfa_setup'
  user_id: string
  email: string
}

export const AuthService = {
  register(data: {
    first_name: string
    last_name: string
    email: string
    password: string
    terms_and_privacy_consent_given: boolean
  }) {
    return http.post('/api/v1/auth/register', data)
  },

  login(email: string, password: string) {
    return http.post<{ data: ILoginData | IMfaChallenge }>('/api/v1/auth/login', { email, password })
  },

  verifyMfa(user_id: string, otp: string) {
    return http.post<{ data: ILoginData }>('/api/v1/auth/mfa/verify', { user_id, otp })
  },

  resendMfaCode(user_id: string) {
    return http.post('/api/v1/auth/mfa/resend', { user_id })
  },

  completeForcedMfaSetup(user_id: string, otp: string) {
    return http.post<{ data: ILoginData }>('/api/v1/auth/mfa/setup/complete', { user_id, otp })
  },

  resendForcedSetupCode(user_id: string) {
    return http.post('/api/v1/auth/mfa/setup/resend', { user_id })
  },

  logout() {
    return http.post('/api/v1/auth/logout')
  },

  forgotPassword(email: string) {
    return http.post('/api/v1/auth/password/forgot', { email })
  },

  resetPassword(email: string, token: string, password: string, password_confirmation: string) {
    return http.post('/api/v1/auth/password/reset', { email, token, password, password_confirmation })
  },

  verifyEmail(user_id: string, token: string) {
    return http.post('/api/v1/auth/email/verify', { user_id, token })
  },

  resendEmailVerification(email: string) {
    return http.post('/api/v1/auth/email/resend', { email })
  },

  getGoogleRedirectUrl() {
    return http.get<{ data: { redirect_url: string } }>('/api/v1/auth/google/redirect')
  },

  googleCallback(code: string) {
    return http.post<{ data: ILoginData }>('/api/v1/auth/google/callback', { code })
  },

  requestMagicLogin(email: string) {
    return http.post('/api/v1/auth/magic-login', { email })
  },

  verifyMagicLogin(user_id: string, token: string) {
    return http.post<{ data: ILoginData }>('/api/v1/auth/magic-login/verify', { user_id, token })
  },
}
