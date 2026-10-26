// Local harness only (seeded SQLite backend on :8340) — not part of CI.
const EMAIL = 'ada@example.test'
const PASSWORD = 'Password123!'

function login() {
  cy.session('ada', () => {
    cy.visit('/signin')
    cy.get('input[type="email"]').type(EMAIL)
    cy.get('input[type="password"]').type(PASSWORD, { log: false })
    cy.contains('button', 'Sign in to Flowtali').click()
    cy.url({ timeout: 20000 }).should('include', '/app')
    // Dismiss the first-run welcome tour; the choice is persisted with the session.
    cy.contains('button', 'Skip for now', { timeout: 10000 }).click()
  })
}

describe('quick create', () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    login()
  })

  it('creates an invoice in quick mode and records a payment', () => {
    cy.visit('/app/invoices/create?mode=quick')
    cy.contains('New invoice').should('be.visible')
    cy.screenshot('01-quick-invoice-empty')

    cy.get('input[placeholder*="Client name"]').type('Jane')
    cy.contains('button', 'Jane Doe').click()
    cy.get('input[placeholder="Item 1"]').type('Website redesign')
    cy.get('input[aria-label="Qty"]').first().clear().type('2')
    cy.get('input[aria-label="Price"]').first().clear().type('750')
    cy.contains('button', 'In 14 days').click()
    cy.screenshot('02-quick-invoice-filled')

    cy.contains('button', 'Save as draft').click()
    cy.url({ timeout: 15000 }).should('match', /\/app\/invoices\/(?!create)[^/?]+$/)
    cy.contains('button', 'Record payment').should('be.visible')
    cy.screenshot('03-invoice-view')

    cy.contains('button', 'Record payment').click()
    cy.get('input[type="number"]').last().clear().type('500')
    cy.screenshot('04-record-payment-partial')
    cy.contains('button', 'Record payment & issue receipt').click()
    cy.url({ timeout: 15000 }).should('include', '/app/receipts/')
    cy.screenshot('05-receipt-view')
  })

  it('opens quick receipt for the invoice and the full editor', () => {
    cy.visit('/app/receipts/create?mode=quick')
    cy.contains('New receipt').should('be.visible')
    cy.screenshot('06-quick-receipt')

    cy.visit('/app/invoices/create?mode=full')
    cy.contains('Switch to quick mode').should('be.visible')
    cy.contains('Loading…').should('not.exist')
    // Defaults applied: the org's name is the sender, the next number is set.
    cy.get('input[placeholder="Your Studio Name"], input').filter((_, el) => (el as HTMLInputElement).value === "Ada Tester's Organization").should('have.length.at.least', 1)
    cy.screenshot('07-full-editor')
  })

  it('shows document defaults and the invoice email/repeat modals', () => {
    cy.visit('/app/org-preferences')
    cy.contains('Document defaults').scrollIntoView().should('be.visible')
    cy.screenshot('08-document-defaults')

    cy.visit('/app/invoices')
    cy.contains('INV-0001').click()
    cy.contains('button', 'Email').click()
    cy.contains('Email invoice').should('be.visible')
    cy.screenshot('09-email-modal')
    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Repeat').click()
    cy.contains('Repeat this invoice').should('be.visible')
    cy.screenshot('10-repeat-modal')
  })
})
