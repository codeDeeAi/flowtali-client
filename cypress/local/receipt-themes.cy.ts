// Local harness only (seeded SQLite backend on :8340) — not part of CI.
const API = 'http://localhost:8340/api/v1'
const THEMES = ['classic', 'modern', 'minimal', 'bold', 'executive']

describe('receipt document renders the same everywhere', () => {
  let token = ''
  let orgId = ''
  let receiptId = ''
  let shareToken = ''

  before(() => {
    cy.request('POST', `${API}/auth/login`, { email: 'ada@example.test', password: 'Password123!' }).then(({ body }) => {
      token = body.data.token
      orgId = body.data.organizations[0].id
      const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      // A fresh invoice paid in part: 300 of 1,000.
      cy.request({ method: 'POST', url: `${API}/orgs/${orgId}/invoices`, headers: auth, body: {
        status: 'sent', to_name: 'Jane Doe', to_company: 'Acme Ltd', to_email: 'jane@acme.test',
        items: [{ description: 'Brand identity', qty: 1, unit: 'project', rate: 1000 }], taxes: [],
      } }).then(({ body: inv }) => {
        cy.request({ method: 'POST', url: `${API}/orgs/${orgId}/receipts/from-invoice/${inv.data.id}`, headers: auth,
          body: { amount: 300, payment_method: 'Cash' } }).then(({ body: rec }) => {
          receiptId = rec.data.receipt.id
          cy.request({ method: 'POST', url: `${API}/orgs/${orgId}/receipts/${receiptId}/links`, headers: auth,
            body: { visibility: 'public' } }).then(({ body: link }) => { shareToken = link.data.token })
        })
      })
    })
  })

  beforeEach(() => {
    cy.viewport(1280, 1400)
    cy.session('ada', () => {
      cy.visit('/signin')
      cy.get('input[type="email"]').type('ada@example.test')
      cy.get('input[type="password"]').type('Password123!', { log: false })
      cy.contains('button', 'Sign in to Flowtali').click()
      cy.url({ timeout: 20000 }).should('include', '/app')
      cy.contains('button', 'Skip for now', { timeout: 10000 }).click()
    })
  })

  THEMES.forEach((theme) => {
    it(`${theme}: view page and public link show 300 received, 700 due`, () => {
      cy.request({ method: 'PUT', url: `${API}/orgs/${orgId}/receipts/${receiptId}`,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, body: { theme } })

      cy.visit(`/app/receipts/${receiptId}`)
      cy.contains('$300.00').should('be.visible')
      cy.contains('$700.00').should('be.visible')
      cy.screenshot(`view-${theme}`, { capture: 'viewport' })

      cy.visit(`/share/r/${shareToken}`)
      cy.contains('$300.00').should('be.visible')
      cy.contains('$700.00').should('be.visible')
      cy.screenshot(`public-${theme}`, { capture: 'viewport' })
    })
  })

  it('editor preview uses the same document', () => {
    cy.visit(`/app/receipts/${receiptId}/edit`)
    cy.contains('$300.00', { timeout: 10000 }).should('be.visible')
    cy.screenshot('editor-preview', { capture: 'viewport' })
  })
})
