import http from './utils/http'

export interface IProjectClient {
  id: string
  name: string
  company: string | null
  email: string | null
}

export interface IProjectFinancials {
  contract_value: number | null
  total_invoiced: number
  total_received: number
  balance: number
  paid_percent: number
}

export interface IProject {
  id: string
  number: string
  title: string
  description: string | null
  status: string
  status_tracking: string
  currency: string
  contract_value: number | null
  start_date: string | null
  end_date: string | null
  client: IProjectClient | null
  invoice_count: number
  receipt_count: number
  letterhead_count: number
  financials?: IProjectFinancials
  created_at: string
  updated_at: string
}

export interface IProjectStats {
  total: number
  draft: number
  active: number
  on_hold: number
  completed: number
  cancelled: number
}

export interface IProjectFile {
  id: string
  project_id: string
  name: string
  type: 'upload' | 'url'
  url: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface IProjectActivity {
  id: string
  project_id: string
  user: { id: string; name: string } | null
  type: string
  title: string
  body: string | null
  meta: Record<string, any> | null
  created_at: string
}

export interface IProjectDocSummary {
  id: string
  number: string
  status: string
  currency: string | null
  to_name: string | null
  created_at: string
  // invoice-specific
  issue_date?: string | null
  due_date?: string | null
  // receipt-specific
  paid_at?: string | null
  stamp?: string | null
  // letterhead-specific
  name?: string
}

export const ProjectService = {
  list(
    orgId: string,
    params?: { search?: string; status?: string; client_id?: string; page?: number; per_page?: number },
  ) {
    return http.get<{ data: { data: IProject[]; total: number; last_page: number } }>(
      `/api/v1/orgs/${orgId}/projects`,
      { params },
    )
  },

  stats(orgId: string) {
    return http.get<{ data: IProjectStats }>(`/api/v1/orgs/${orgId}/projects/stats`)
  },

  draftData(orgId: string) {
    return http.get<{ data: { statuses: string[]; tracking_options: string[] } }>(
      `/api/v1/orgs/${orgId}/projects/draft-data`,
    )
  },

  get(orgId: string, projectId: string) {
    return http.get<{ data: IProject }>(`/api/v1/orgs/${orgId}/projects/${projectId}`)
  },

  create(orgId: string, payload: Record<string, any>) {
    return http.post<{ data: IProject }>(`/api/v1/orgs/${orgId}/projects`, payload)
  },

  update(orgId: string, projectId: string, payload: Record<string, any>) {
    return http.put<{ data: IProject }>(`/api/v1/orgs/${orgId}/projects/${projectId}`, payload)
  },

  delete(orgId: string, projectId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/projects/${projectId}`)
  },

  // Documents
  listInvoices(orgId: string, projectId: string) {
    return http.get<{ data: IProjectDocSummary[] }>(`/api/v1/orgs/${orgId}/projects/${projectId}/invoices`)
  },

  attachInvoice(orgId: string, projectId: string, invoiceId: string) {
    return http.post(`/api/v1/orgs/${orgId}/projects/${projectId}/invoices`, { id: invoiceId })
  },

  detachInvoice(orgId: string, projectId: string, invoiceId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/projects/${projectId}/invoices/${invoiceId}`)
  },

  listReceipts(orgId: string, projectId: string) {
    return http.get<{ data: IProjectDocSummary[] }>(`/api/v1/orgs/${orgId}/projects/${projectId}/receipts`)
  },

  attachReceipt(orgId: string, projectId: string, receiptId: string) {
    return http.post(`/api/v1/orgs/${orgId}/projects/${projectId}/receipts`, { id: receiptId })
  },

  detachReceipt(orgId: string, projectId: string, receiptId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/projects/${projectId}/receipts/${receiptId}`)
  },

  listLetterheads(orgId: string, projectId: string) {
    return http.get<{ data: IProjectDocSummary[] }>(`/api/v1/orgs/${orgId}/projects/${projectId}/letterheads`)
  },

  attachLetterhead(orgId: string, projectId: string, letterheadId: string) {
    return http.post(`/api/v1/orgs/${orgId}/projects/${projectId}/letterheads`, { id: letterheadId })
  },

  detachLetterhead(orgId: string, projectId: string, letterheadId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/projects/${projectId}/letterheads/${letterheadId}`)
  },

  // Activity
  listActivities(orgId: string, projectId: string, params?: { per_page?: number; page?: number }) {
    return http.get<{ data: { data: IProjectActivity[]; total: number; last_page: number } }>(
      `/api/v1/orgs/${orgId}/projects/${projectId}/activities`,
      { params },
    )
  },

  addNote(orgId: string, projectId: string, body: string) {
    return http.post<{ data: IProjectActivity }>(
      `/api/v1/orgs/${orgId}/projects/${projectId}/activities`,
      { body },
    )
  },

  // Files
  listFiles(orgId: string, projectId: string) {
    return http.get<{ data: IProjectFile[] }>(`/api/v1/orgs/${orgId}/projects/${projectId}/files`)
  },

  addFile(
    orgId: string,
    projectId: string,
    payload: { name: string; type: 'upload' | 'url'; url: string; file_size?: number; mime_type?: string },
  ) {
    return http.post<{ data: IProjectFile }>(
      `/api/v1/orgs/${orgId}/projects/${projectId}/files`,
      payload,
    )
  },

  deleteFile(orgId: string, projectId: string, fileId: string) {
    return http.delete(`/api/v1/orgs/${orgId}/projects/${projectId}/files/${fileId}`)
  },
}
