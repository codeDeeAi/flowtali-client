import http from './utils/http'

export interface ISubscriptionPlanPrices {
  monthly: number
  annual: number
  monthly_display: string
  annual_display: string
  annual_per_month: string
}

export interface ISubscriptionPlan {
  id: string
  slug: string
  name: string
  description: string
  is_free: boolean
  features: Record<string, boolean | number | null>
  prices: {
    NGN: ISubscriptionPlanPrices
    USD: ISubscriptionPlanPrices
  }
}

export interface ISubscription {
  id: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  billing_interval: 'monthly' | 'annual'
  billing_currency: 'NGN' | 'USD'
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  is_active: boolean
  plan: {
    id: string
    slug: string
    name: string
    features: Record<string, boolean | number | null>
  } | null
}

export interface ISubscriptionTransaction {
  id: string
  tx_ref: string
  paystack_reference: string | null
  amount: number
  formatted_amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed'
  type: string
  paid_at: string | null
  created_at: string
}

export const SubscriptionService = {
  getPlans(country?: string) {
    return http.get<{ data: { plans: ISubscriptionPlan[]; recommended_currency: 'NGN' | 'USD' } }>(
      '/api/v1/pricing',
      { params: country ? { country } : {} },
    )
  },

  getSubscription(orgId: string) {
    return http.get<{ data: ISubscription }>(`/api/v1/orgs/${orgId}/subscription`)
  },

  initialize(orgId: string, payload: { plan: string; interval: 'monthly' | 'annual'; currency: 'NGN' | 'USD' }) {
    return http.post<{ data: { payment_url: string; reference: string; amount: number; currency: string } }>(
      `/api/v1/orgs/${orgId}/subscription/initialize`,
      payload,
    )
  },

  verify(orgId: string, reference: string) {
    return http.post<{ data: ISubscription }>(`/api/v1/orgs/${orgId}/subscription/verify`, { reference })
  },

  cancel(orgId: string) {
    return http.delete<{ data: ISubscription }>(`/api/v1/orgs/${orgId}/subscription`)
  },

  getTransactions(orgId: string, page = 1) {
    return http.get<{ data: { data: ISubscriptionTransaction[]; total: number; last_page: number } }>(
      `/api/v1/orgs/${orgId}/subscription/transactions`,
      { params: { page } },
    )
  },
}
