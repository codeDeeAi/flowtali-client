export type PayoutProvider = 'paystack' | 'bachs'

export type SubAccountStatus = 'pending' | 'active' | 'inactive'

export interface ISubAccount {
  id: string
  provider: PayoutProvider
  currency: string
  label: string
  status: SubAccountStatus
  platform_fee_percent: number
  chargeable_currencies: string[]
  requires_onboarding: boolean
  account_name?: string | null
  bank_name?: string | null
  account_last4?: string | null
  country?: string | null
  requirements_due: string[]
  created_at: string
  updated_at: string
}

export interface ISubAccountField {
  name: string
  label: string
  type: 'select' | 'text' | 'email'
  required: boolean
  options: { label: string; value: string }[]
}

export interface ISubAccountProviderInfo {
  provider: PayoutProvider
  settlement_currency: string
  chargeable_currencies: string[]
  requires_onboarding: boolean
  fields: ISubAccountField[]
}

export interface ISubAccountCreateData {
  platform_fee_percent: number
  providers: ISubAccountProviderInfo[]
}

export interface IPayLinkSummary {
  invoice: {
    number: string
    from_name: string | null
    logo_url: string | null
    to_name: string | null
    to_company: string | null
    to_email: string | null
    issue_date: string | null
    due_date: string | null
    currency: string
    total: number
    status: string
    paid_at: string | null
    accent_color: string | null
  }
  payable: boolean
  reason: 'paid' | 'void' | 'unavailable' | 'currency' | 'empty' | null
  provider: PayoutProvider | null
  charge: { amount: number; currency: string; fx_rate: number | null; converted: boolean } | null
}
