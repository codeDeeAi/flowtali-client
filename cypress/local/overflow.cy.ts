// Local harness only — reports pages that scroll sideways.
const PAGES = ['/app/dashboard', '/app/invoices', '/app/receipts', '/app/clients', '/app/invoices/create?mode=quick', '/app/receipts/create?mode=quick', '/app/org-preferences']

describe('horizontal overflow', () => {
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

  ;[1280, 390].forEach((width) => {
    it(`at ${width}px`, () => {
      cy.viewport(width, 900)
      PAGES.forEach((path) => {
        cy.visit(path)
        cy.wait(800)
        cy.document().then((doc) => {
          const over = doc.documentElement.scrollWidth - doc.documentElement.clientWidth
          let widest = ''
          if (over > 0) {
            const vw = doc.documentElement.clientWidth
            const offenders = [...doc.querySelectorAll<HTMLElement>('body *')]
              .filter(el => el.getBoundingClientRect().right > vw + 1)
              .map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`)
            widest = offenders.slice(0, 3).join(' | ')
          }
          cy.task('log', `${width}px ${path}: overflow=${over}px ${widest}`)
        })
      })
    })
  })
})
