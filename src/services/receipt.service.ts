import http from './utils/http'

export interface IReceiptItem {
  id?: number
  description: string
  qty: number
  unit: string
  rate: number
}

export interface IReceiptTax {
  id?: number
  label: string
  rate: number
}

export interface IReceiptPaymentLink {
  id?: number
  type: string
  value: string
}

export interface IReceiptTotals {
  subtotal: number
  discount_amt: number
  taxes_total: number
  total: number
}

export interface IReceipt {
  id: string
  number: string
  status: string
  issue_date: string | null
  payment_method: string | null
  paid_at: string | null
  reference_number: string | null
  currency: string
  from_name: string | null
  from_tagline: string | null
  from_email: string | null
  from_phone: string | null
  from_website: string | null
  from_address: string | null
  from_bank_name: string | null
  from_bank_account_name: string | null
  from_bank_account_number: string | null
  from_bank_sort_code: string | null
  from_bank_iban: string | null
  logo_url: string | null
  payment_links: IReceiptPaymentLink[]
  to_name: string | null
  to_company: string | null
  to_email: string | null
  to_phone: string | null
  to_address: string | null
  items: IReceiptItem[]
  taxes: IReceiptTax[]
  discount_type: string
  discount: number
  theme: string
  accent_color: string
  font_family: string | null
  signature_url: string | null
  stamp_url: string | null
  stamp: string | null
  stamp_color: string | null
  stamp_custom_text: string | null
  show_watermark: boolean
  watermark_text: string | null
  show_top_bar: boolean
  show_logo: boolean
  show_footer_line: boolean
  show_notes: boolean
  show_bank_details: boolean
  show_flowtali_tag: boolean
  notes: string | null
  footer_text: string | null
  uses: number
  last_used_at: string | null
  totals: IReceiptTotals
  created_at: string
  updated_at: string
}

export interface IReceiptStats {
  total: number
  finalized: number
  draft: number
  most_recent: { id: string; number: string } | null
}

export interface IReceiptDraftData {
  organization: {
    id: string
    name: string
    brand_colors: string[]
    stamps: Array<{ text: string; color: string; text_color?: string }>
    invoice_profiles: Array<{
      id: string
      name: string
      tagline?: string | null
      email?: string | null
      phone?: string | null
      website?: string | null
      address?: string | null
      logo_url?: string | null
    }>
    bank_accounts: Array<{
      id: string
      label: string
      bank_name?: string | null
      account_name?: string | null
      account_number?: string | null
      sort_code?: string | null
      iban?: string | null
      swift?: string | null
      currency?: string | null
      notes?: string | null
    }>
    payment_links: Array<{
      id: string
      label: string
      type: string
      value: string
    }>
  } | null
  clients: Array<{
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    address: string | null
  }>
  logos: Array<{ id: string; url: string }>
  signatures: Array<{ id: string; url: string }>
}

export interface IReceiptSharedLink {
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

export const ReceiptService = {
  list(orgId: string, params?: { search?: string; status?: string; page?: number; per_page?: number }) {
    return http.get<{ data: { data: IReceipt[]; current_page: number; last_page: number; total: number } }>(
      `/api/v1/orgs/${orgId}/receipts`,
      { params },
    )
  },
  draftData(orgId: string) {
    return http.get<{ data: IReceiptDraftData }>(`/api/v1/orgs/${orgId}/receipts/draft-data`)
  },
  stats(orgId: string) {
    return http.get<{ data: IReceiptStats }>(`/api/v1/orgs/${orgId}/receipts/stats`)
  },
  get(orgId: string, receiptId: string) {
    return http.get<{ data: IReceipt }>(`/api/v1/orgs/${orgId}/receipts/${receiptId}`)
  },
  create(orgId: string, payload: Record<string, any>) {
    return http.post<{ data: IReceipt }>(`/api/v1/orgs/${orgId}/receipts`, payload)
  },
  update(orgId: string, receiptId: string, payload: Record<string, any>) {
    return http.put<{ data: IReceipt }>(`/api/v1/orgs/${orgId}/receipts/${receiptId}`, payload)
  },
  delete(orgId: string, receiptId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/receipts/${receiptId}`)
  },
}

export const ReceiptSharedLinksService = {
  list(orgId: string, receiptId: string) {
    return http.get<{ data: IReceiptSharedLink[] }>(`/api/v1/orgs/${orgId}/receipts/${receiptId}/links`)
  },
  create(orgId: string, receiptId: string, payload: {
    label?: string
    visibility: 'public' | 'private'
    access_code?: string
    validity_days?: number | null
  }) {
    return http.post<{ data: IReceiptSharedLink }>(`/api/v1/orgs/${orgId}/receipts/${receiptId}/links`, payload)
  },
  revoke(orgId: string, receiptId: string, linkId: string) {
    return http.put<{ data: IReceiptSharedLink }>(`/api/v1/orgs/${orgId}/receipts/${receiptId}/links/${linkId}/revoke`, {})
  },
  delete(orgId: string, receiptId: string, linkId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/receipts/${receiptId}/links/${linkId}`)
  },
  getByToken(token: string, code?: string) {
    return http.get<{ data: { link: IReceiptSharedLink; receipt: IReceipt } }>(`/api/v1/share/r/${token}`, {
      params: code ? { code } : {},
    })
  },
  recordView(token: string) {
    return http.post(`/api/v1/share/r/${token}/view`, {})
  },
}
