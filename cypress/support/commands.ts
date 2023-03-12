export {}

// Cypress passes subject automatically, we need to remove it from inferred function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never

declare global {
  namespace Cypress {
    interface Chainable {
      getByDataTest: typeof inferGet
      findByDataTest: OmitFirstArg<typeof inferFind>
    }
  }
}

// Cypress types do not export JQuery which wraps HTMLElement from cy.get
const inferGet = (id: string, args?: Parameters<typeof cy.get>[1]) => cy.get(`[data-test="${id}"]`, args)
const inferFind = (subject: any, id: string, args?: Parameters<typeof cy.find>[1]) =>
  subject.find(`[data-test="${id}"]`, args)

/**
 * Command by data-test
 */
Cypress.Commands.add("getByDataTest", inferGet)
Cypress.Commands.add("findByDataTest", { prevSubject: true }, inferFind)
