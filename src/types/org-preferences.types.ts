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
  document_defaults: IDocumentDefaults
}

/** Org-wide defaults for new invoices and receipts (Org Preferences → Document defaults). */
export interface IDocumentDefaults {
  profile_id: string | null
  bank_account_ids: string[]
  payment_link_ids: string[]
  logo_url: string | null
  signature_url: string | null
  theme: 'classic' | 'modern' | 'minimal' | 'bold' | 'executive'
  accent_color: string | null
  font_family: string | null
  payment_terms: string | null
  tax: { label: string; rate: number; type: 'percent' | 'flat' } | null
  notes: string | null
  receipt_notes: string | null
  footer_text: string | null
  invoice_prefix: string
  receipt_prefix: string
  /** Email clients automatic payment reminders (sent / overdue invoices). */
  auto_reminders: boolean
  /** Days relative to the due date: negative = before. */
  reminder_offsets: number[]
}
