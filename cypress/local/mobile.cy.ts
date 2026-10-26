// Local harness only — phone-width screenshots.
describe('mobile', () => {
  beforeEach(() => {
    cy.session('ada', () => {
      cy.visit('/signin')
      cy.get('input[type="email"]').type('ada@example.test')
      cy.get('input[type="password"]').type('Password123!', { log: false })
      cy.contains('button', 'Sign in to Flowtali').click()
      cy.url({ timeout: 20000 }).should('include', '/app')
      cy.contains('button', 'Skip for now', { timeout: 10000 }).click()
    })
  })
  it('quick invoice at 390px', () => {
    cy.viewport(390, 844)
    cy.visit('/app/invoices/create?mode=quick')
    cy.get('input[placeholder*="Client name"]').type('Jane')
    cy.contains('button', 'Jane Doe').click()
    cy.get('input[placeholder="Item 1"]').type('Logo design')
    cy.wait(500)
    cy.get('span.sm\\:hidden').first().should('be.visible').and('contain', 'Qty')
    cy.get('input[placeholder="Item 1"]').parent().screenshot('quick-invoice-390-items')
  })
})
