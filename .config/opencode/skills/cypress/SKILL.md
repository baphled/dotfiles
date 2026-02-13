---
name: cypress
description: Cypress E2E testing framework for web applications
category: Testing BDD
---

# Skill: cypress

## What I do

I provide Cypress E2E testing expertise: selector strategies, waiting and retry patterns, custom commands, API intercepts, and best practices for reliable browser-based tests.

## When to use me

- Writing end-to-end tests for web applications
- Choosing resilient selectors and waiting strategies
- Intercepting and stubbing network requests
- Creating reusable custom commands
- Debugging flaky or timing-dependent tests

## Core principles

1. **Test user behaviour** - Interact as users do (click, type, navigate)
2. **No arbitrary waits** - Use Cypress auto-retry and `cy.intercept` instead of `cy.wait(ms)`
3. **Data-testid selectors** - Resilient to UI changes, not tied to CSS/structure
4. **API intercepts** - Control backend responses for deterministic tests
5. **Independent tests** - Each test sets up its own state (use `cy.request` for speed)

## Patterns & examples

**Resilient selectors:**
```javascript
// ✅ Correct: data-testid, resilient to CSS changes
cy.get('[data-testid="submit-btn"]').click();
cy.findByRole('button', { name: /submit/i }).click();

// ❌ Wrong: brittle CSS selectors
cy.get('.btn-primary.mt-4 > span').click();
cy.get('#app > div:nth-child(3) > button').click();
```

**Network intercepts:**
```javascript
// ✅ Correct: intercept API and control response
cy.intercept('GET', '/api/users', {
  statusCode: 200,
  body: [{ id: 1, name: 'Alice' }]
}).as('getUsers');

cy.visit('/users');
cy.wait('@getUsers');
cy.get('[data-testid="user-list"]').should('contain', 'Alice');
```

**Custom commands:**
```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.request('POST', '/api/auth/login', { email, password })
    .its('body.token')
    .then(token => {
      window.localStorage.setItem('authToken', token);
    });
});

// In tests - fast, no UI login needed
beforeEach(() => {
  cy.login('test@example.com', 'password123');
  cy.visit('/dashboard');
});
```

**Waiting correctly:**
```javascript
// ✅ Correct: wait for element state, Cypress auto-retries
cy.get('[data-testid="results"]').should('have.length.greaterThan', 0);
cy.get('[data-testid="status"]').should('contain', 'Complete');

// ✅ Correct: wait for specific network request
cy.intercept('POST', '/api/orders').as('createOrder');
cy.get('[data-testid="submit"]').click();
cy.wait('@createOrder').its('response.statusCode').should('eq', 201);

// ❌ Wrong: arbitrary time-based wait
cy.wait(3000);
cy.get('.results').should('exist');
```

## Anti-patterns to avoid

- ❌ `cy.wait(ms)` for timing (use intercepts and assertions instead)
- ❌ CSS/XPath selectors tied to styling (use `data-testid`)
- ❌ Testing through the UI for setup (use `cy.request` for auth, seed data)
- ❌ Tests depending on other tests' state (each test independent)
- ❌ Asserting on DOM structure (assert on visible text and behaviour)

## Related skills

- `javascript` - Core JS/TS patterns used in Cypress
- `jest` - Unit testing (complementary to Cypress E2E)
- `e2e-testing` - General E2E testing patterns
- `bdd-workflow` - BDD cycle with Cypress
