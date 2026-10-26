import axios from 'axios'
import http from './utils/http'
import type { IPayLinkSummary, ISubAccount, ISubAccountCreateData, PayoutProvider } from '@/types/payout.types'

export const SubAccountService = {
  list(orgId: string) {
    return http.get<{ data: ISubAccount[] }>(`/api/v1/orgs/${orgId}/sub-accounts`)
  },

  createData(orgId: string) {
    return http.get<{ data: ISubAccountCreateData }>(`/api/v1/orgs/${orgId}/sub-accounts/create-data`)
  },

  resolve(orgId: string, payload: { provider: 'paystack'; bank_code: string; account_number: string }) {
    return http.post<{ data: { account_name: string; bank_code: string } }>(`/api/v1/orgs/${orgId}/sub-accounts/resolve`, payload)
  },

  create(orgId: string, payload: { provider: PayoutProvider; accept_fee: boolean } & Record<string, unknown>) {
    return http.post<{ data: ISubAccount }>(`/api/v1/orgs/${orgId}/sub-accounts`, payload)
  },

  onboardingLink(orgId: string, id: string) {
    return http.post<{ data: { url: string } }>(`/api/v1/orgs/${orgId}/sub-accounts/${id}/onboarding-link`)
  },

  sync(orgId: string, id: string) {
    return http.post<{ data: ISubAccount }>(`/api/v1/orgs/${orgId}/sub-accounts/${id}/sync`)
  },

  deactivate(orgId: string, id: string) {
    return http.put<{ data: ISubAccount }>(`/api/v1/orgs/${orgId}/sub-accounts/${id}/deactivate`)
  },
}

export const PayLinkService = {
  get(token: string) {
    return http.get<{ data: IPayLinkSummary }>(`/api/v1/pay/${token}`)
  },

  start(token: string, payload: { email: string; name?: string }) {
    return http.post<{ data: { checkout_url: string; reference: string } }>(`/api/v1/pay/${token}`, payload)
  },

  verify(token: string, reference: string) {
    return http.get<{ data: { status: 'pending' | 'succeeded' | 'failed'; summary: IPayLinkSummary } }>(
      `/api/v1/pay/${token}/verify`,
      { params: { reference } },
    )
  },
}

/** The API's own message for a failed request, if it sent one. */
export function apiError(err: unknown): { message?: string; status?: number } {
  if (!axios.isAxiosError(err)) return {}
  return { message: err.response?.data?.message, status: err.response?.status }
}
