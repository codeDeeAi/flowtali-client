export type ClientType = 'organization' | 'individual' | 'freelancer' | 'agency' | 'other'

export interface IClientAddress {
  full?: string
}

export interface IClient {
  id: string
  full_name: string
  company: string | null
  client_type: ClientType
  email: string | null
  phone_numbers: string[]
  address: IClientAddress | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface IClientFormData {
  client_types: { value: ClientType; label: string }[]
}

export interface IPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface IClientListResponse {
  data: IClient[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface ICreateClientPayload {
  full_name: string
  company?: string | null
  client_type: ClientType
  email?: string | null
  phone_numbers?: string[] | null
  address?: IClientAddress | null
  notes?: string | null
}

export interface IUpdateClientPayload extends Partial<ICreateClientPayload> {}
