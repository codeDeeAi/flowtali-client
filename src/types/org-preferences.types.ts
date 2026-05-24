export interface IOrgStamp {
  text: string
  color: string
  text_color?: string
}

export interface IOrgBrandColor {
  name: string
  hex: string
}

export interface IOrgSignature {
  id: string
  type: string
  url: string
  extras: {
    name: string
    role: string
    mime_type?: string
    size?: number
  }
}

export interface IOrgLogo {
  id: string
  type: string
  url: string
  extras: {
    label: string
    mime_type?: string
    size?: number
  }
}

export interface IOrgInvoiceProfile {
  id: string
  name: string
  tagline?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  logo_url?: string | null
}

export interface IOrgBankAccount {
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
}

export interface IOrgPaymentLink {
  id: string
  label: string
  type: string
  value: string
}

export interface IOrgPreferences {
  stamps: IOrgStamp[]
  brand_colors: IOrgBrandColor[]
  invoice_profiles: IOrgInvoiceProfile[]
  bank_accounts: IOrgBankAccount[]
  payment_links: IOrgPaymentLink[]
  signatures: IOrgSignature[]
  logos: IOrgLogo[]
}
