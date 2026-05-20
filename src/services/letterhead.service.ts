import http from './utils/http'

export interface ILetterhead {
  id: string
  name: string
  uses: number
  last_used_at: string | null
  // company
  company: string | null
  tagline: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  reg_number: string | null
  vat_number: string | null
  logo_url: string | null
  signature_url: string | null
  // content
  subject: string | null
  salutation: string | null
  body: string | null
  closing: string | null
  signer_name: string | null
  signer_title: string | null
  footer_left: string | null
  footer_center: string | null
  footer_right: string | null
  date: string | null
  ref_number: string | null
  show_date: boolean
  show_ref: boolean
  // design
  theme: string
  accent_color: string
  font_family: string | null
  header_layout: string
  watermark: string | null
  show_watermark: boolean
  watermark_color: string
  stamp: string | null
  show_top_bar: boolean
  show_bottom_bar: boolean
  show_logo: boolean
  show_divider: boolean
  show_footer: boolean
  show_line_numbers: boolean
  paper_size: string
  orientation: string
  created_at: string
  updated_at: string
}

export interface ILetterheadListItem {
  id: string
  name: string
  theme: string
  accent_color: string
  company: string | null
  tagline: string | null
  watermark: string | null
  uses: number
  last_used_at: string | null
  created_at: string
}

export const LetterheadService = {
  list(orgId: string, params?: { search?: string; page?: number; per_page?: number }) {
    return http.get<{ data: { data: ILetterhead[] } }>(`/api/v1/orgs/${orgId}/letterheads`, { params })
  },

  get(orgId: string, id: string) {
    return http.get<{ data: ILetterhead }>(`/api/v1/orgs/${orgId}/letterheads/${id}`)
  },

  create(orgId: string, data: Partial<ILetterhead>) {
    return http.post<{ data: ILetterhead }>(`/api/v1/orgs/${orgId}/letterheads`, data)
  },

  update(orgId: string, id: string, data: Partial<ILetterhead>) {
    return http.put<{ data: ILetterhead }>(`/api/v1/orgs/${orgId}/letterheads/${id}`, data)
  },

  delete(orgId: string, id: string) {
    return http.delete(`/api/v1/orgs/${orgId}/letterheads/${id}`)
  },
}
