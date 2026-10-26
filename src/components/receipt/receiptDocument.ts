import type { IReceipt } from '@/services/receipt.service'

/**
 * What a receipt document renders from. Same camelCase shape as the receipt
 * editor's form, so the editor preview binds to it directly and saved receipts
 * (view page, public link) map onto it with `receiptToForm`.
 */
export interface ReceiptDocModel {
  number: string
  issueDate: string
  paidAt: string
  paymentMethod: string
  referenceNumber: string
  currency: string
  fromName: string
  fromTagline: string
  fromEmail: string
  fromPhone: string
  fromWebsite: string
  fromAddress: string
  fromBankName: string
  fromBankAccountName: string
  fromBankAccountNumber: string
  fromBankSortCode: string
  fromBankIban: string
  logoUrl: string
  toName: string
  toCompany: string
  toEmail: string
  toPhone: string
  toAddress: string
  items: { id: number; description: string; qty: number; unit: string; rate: number }[]
  taxes: { id: number; label: string; rate: number; type: 'percent' | 'flat' }[]
  discountType: 'percent' | 'flat'
  discount: number
  theme: string
  accentColor: string
  fontFamily: string
  signatureUrl: string
  stamp: string
  /** Shown under the total for PARTIALLY PAID / UNPAID receipts. */
  balanceDue: number
  /** What this receipt acknowledges; null = the full total. */
  amountPaid: number | null
  showWatermark: boolean
  watermarkText: string
  showTopBar: boolean
  showLogo: boolean
  showFooterLine: boolean
  showNotes: boolean
  showBankDetails: boolean
  showFlowtaliTag: boolean
  notes: string
  footerText: string
}

const OWES = ['UNPAID', 'PARTIALLY PAID']

/** Map an API receipt onto the editor/document shape. */
export function receiptToForm(rec: IReceipt): ReceiptDocModel & {
  paymentLinks: { id: number; type: string; value: string }[]
  stampUrl: string
} {
  return {
    number:                rec.number,
    issueDate:             rec.issue_date ?? '',
    paymentMethod:         rec.payment_method ?? '',
    paidAt:                rec.paid_at ?? '',
    referenceNumber:       rec.reference_number ?? '',
    currency:              rec.currency,
    fromName:              rec.from_name ?? '',
    fromTagline:           rec.from_tagline ?? '',
    fromEmail:             rec.from_email ?? '',
    fromPhone:             rec.from_phone ?? '',
    fromWebsite:           rec.from_website ?? '',
    fromAddress:           rec.from_address ?? '',
    fromBankName:          rec.from_bank_name ?? '',
    fromBankAccountName:   rec.from_bank_account_name ?? '',
    fromBankAccountNumber: rec.from_bank_account_number ?? '',
    fromBankSortCode:      rec.from_bank_sort_code ?? '',
    fromBankIban:          rec.from_bank_iban ?? '',
    logoUrl:               rec.logo_url ?? '',
    paymentLinks:          (rec.payment_links ?? []).map((l, i) => ({ id: i + 1, ...l })),
    toName:                rec.to_name ?? '',
    toCompany:             rec.to_company ?? '',
    toEmail:               rec.to_email ?? '',
    toPhone:               rec.to_phone ?? '',
    toAddress:             rec.to_address ?? '',
    items:                 (rec.items ?? []).map((item, i) => ({ ...item, unit: item.unit ?? '', id: i + 1 })),
    taxes:                 (rec.taxes ?? []).map((t, i) => ({ type: 'percent' as 'percent' | 'flat', ...t, id: i + 1 })),
    discountType:          rec.discount_type === 'flat' ? 'flat' : 'percent',
    discount:              Number(rec.discount ?? 0),
    theme:                 rec.theme,
    accentColor:           rec.accent_color,
    fontFamily:            rec.font_family ?? 'var(--font-sans)',
    signatureUrl:          rec.signature_url ?? '',
    stampUrl:              rec.stamp_url ?? '',
    stamp:                 rec.stamp ?? '',
    balanceDue:            OWES.includes(rec.stamp ?? '') && rec.stamp_custom_text && isFinite(Number(rec.stamp_custom_text))
                             ? Number(rec.stamp_custom_text)
                             : 0,
    amountPaid:            rec.amount_paid ?? null,
    showWatermark:         rec.show_watermark,
    watermarkText:         rec.watermark_text ?? '',
    showTopBar:            rec.show_top_bar,
    showLogo:              rec.show_logo,
    showFooterLine:        rec.show_footer_line,
    showNotes:             rec.show_notes,
    showBankDetails:       rec.show_bank_details,
    showFlowtaliTag:       rec.show_flowtali_tag,
    notes:                 rec.notes ?? '',
    footerText:            rec.footer_text ?? '',
  }
}
