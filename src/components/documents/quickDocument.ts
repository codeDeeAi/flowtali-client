// Shared bits for the Quick invoice / Quick receipt forms.

export const QUICK_CURRENCIES = [
  { code: 'USD', sym: '$' }, { code: 'EUR', sym: '€' }, { code: 'GBP', sym: '£' },
  { code: 'NGN', sym: '₦' }, { code: 'CAD', sym: 'CA$' }, { code: 'AUD', sym: 'A$' },
  { code: 'JPY', sym: '¥' }, { code: 'INR', sym: '₹' }, { code: 'ZAR', sym: 'R' },
  { code: 'CHF', sym: 'Fr' }, { code: 'AED', sym: 'د.إ' },
]

export const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Card / Stripe', 'PayPal', 'Wise', 'Crypto', 'Cheque', 'Other']

export interface QuickLineItem { id: number; description: string; qty: number; rate: number }

export interface QuickClient {
  clientId: string | null
  name: string
  company: string
  email: string
  phone: string
  address: string
}

export const blankClient = (): QuickClient => ({ clientId: null, name: '', company: '', email: '', phone: '', address: '' })

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const addDaysIso = (iso: string, days: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const currencySymbol = (code: string) => QUICK_CURRENCIES.find(c => c.code === code)?.sym ?? code + ' '

export const subtotalOf = (items: QuickLineItem[]) =>
  items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0)

export const taxAmountOf = (subtotal: number, tax: { rate: number; type: 'percent' | 'flat' } | null) =>
  !tax ? 0 : tax.type === 'flat' ? Number(tax.rate) || 0 : subtotal * (Number(tax.rate) || 0) / 100

/** API line-item shape (quick forms always bill in plain "items"). */
export const toApiItems = (items: QuickLineItem[]) =>
  items.map(i => ({ description: i.description.trim(), qty: Number(i.qty) || 0, unit: 'items', rate: Number(i.rate) || 0 }))

/** Editor (camelCase) "bill to" fields for a client, used by the full-editor prefill. */
export const clientToEditorFields = (c: QuickClient) => ({
  toName: c.name, toCompany: c.company, toEmail: c.email, toPhone: c.phone, toAddress: c.address,
})
