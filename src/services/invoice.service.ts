import http from './utils/http'

export interface IInvoiceItem {
  id?: number
  description: string
  qty: number
  unit: string
  rate: number
}

export interface IInvoiceTax {
  id?: number
  label: string
  rate: number
}

export interface IInvoicePaymentLink {
  id?: number
  type: string
  value: string
}

export interface IInvoiceTotals {
  subtotal: number
  discount_amt: number
  taxes_total: number
  total: number
}

export interface IInvoice {
  id: string
  number: string
  status: string
  issue_date: string | null
  due_date: string | null
  payment_terms: string | null
  currency: string
  po_number: string | null
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
  payment_links: IInvoicePaymentLink[]
  to_name: string | null
  to_company: string | null
  to_email: string | null
  to_phone: string | null
  to_address: string | null
  items: IInvoiceItem[]
  taxes: IInvoiceTax[]
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
  totals: IInvoiceTotals
  created_at: string
  updated_at: string
}

export interface IInvoiceStats {
  total: number
  paid: number
  draft: number
  overdue: number
  most_recent: { id: string; number: string } | null
}

export interface IInvoiceDraftData {
  organization: {
    id: string
    name: string
    default_currency: string
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

export interface IInvoiceSharedLink {
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

export const InvoiceService = {
  list(orgId: string, params?: { search?: string; status?: string; page?: number; per_page?: number }) {
    return http.get<{ data: { data: IInvoice[]; current_page: number; last_page: number; total: number } }>(
      `/api/v1/orgs/${orgId}/invoices`,
      { params },
    )
  },
  draftData(orgId: string) {
    return http.get<{ data: IInvoiceDraftData }>(`/api/v1/orgs/${orgId}/invoices/draft-data`)
  },
  stats(orgId: string) {
    return http.get<{ data: IInvoiceStats }>(`/api/v1/orgs/${orgId}/invoices/stats`)
  },
  get(orgId: string, invoiceId: string) {
    return http.get<{ data: IInvoice }>(`/api/v1/orgs/${orgId}/invoices/${invoiceId}`)
  },
  create(orgId: string, payload: Record<string, any>) {
    return http.post<{ data: IInvoice }>(`/api/v1/orgs/${orgId}/invoices`, payload)
  },
  update(orgId: string, invoiceId: string, payload: Record<string, any>) {
    return http.put<{ data: IInvoice }>(`/api/v1/orgs/${orgId}/invoices/${invoiceId}`, payload)
  },
  delete(orgId: string, invoiceId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/invoices/${invoiceId}`)
  },
}

export const InvoiceSharedLinksService = {
  list(orgId: string, invoiceId: string) {
    return http.get<{ data: IInvoiceSharedLink[] }>(`/api/v1/orgs/${orgId}/invoices/${invoiceId}/links`)
  },
  create(orgId: string, invoiceId: string, payload: {
    label?: string
    visibility: 'public' | 'private'
    access_code?: string
    validity_days?: number | null
  }) {
    return http.post<{ data: IInvoiceSharedLink }>(`/api/v1/orgs/${orgId}/invoices/${invoiceId}/links`, payload)
  },
  revoke(orgId: string, invoiceId: string, linkId: string) {
    return http.put<{ data: IInvoiceSharedLink }>(`/api/v1/orgs/${orgId}/invoices/${invoiceId}/links/${linkId}/revoke`, {})
  },
  delete(orgId: string, invoiceId: string, linkId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/invoices/${invoiceId}/links/${linkId}`)
  },
  getByToken(token: string, code?: string) {
    return http.get<{ data: { link: IInvoiceSharedLink; invoice: IInvoice } }>(`/api/v1/share/i/${token}`, {
      params: code ? { code } : {},
    })
  },
  recordView(token: string) {
    return http.post(`/api/v1/share/i/${token}/view`, {})
  },
}
