---
name: bdd-best-practices
description: Universal BDD best practices for writing high-quality executable specifications
category: Testing BDD
---

# Skill: bdd-best-practices

## What I do

I provide universal best practices for Behaviour-Driven Development, focusing on bridge building between business and technical stakeholders through clear, outcome-oriented executable specifications.

## When to use me

- Defining business-critical workflows (registration, payments, data export)
- Establishing shared language through concrete examples
- Structuring scenarios for long-term maintainability
- Deciding what should be a BDD test versus a unit test
- Refining Gherkin steps to be survivable across UI changes

## Core principles

1. **Business Outcomes** — Describe WHAT the system does, not HOW it works
2. **Concrete Examples** — Use real data points to ground abstract rules
3. **The Three Amigos** — Collaborate early with PO, Tester, and Developer
4. **Declarative Style** — Focus on the goal, hide the implementation in step definitions
5. **Living Documentation** — Ensure specs are readable by non-technical stakeholders

## Patterns & examples

**Outcome-focused Scenario:**
```gherkin
# ✅ Correct: Business value documentation
Scenario: Customer receives bulk discount
  Given I have items worth £100 in my basket
  And a "10% off £50+" promotion is active
  When I complete the checkout
  Then the total should be £90
  And the confirmation email should show the discount
```

**Step Definition Encapsulation:**
```javascript
// ✅ Correct: HOW is hidden in step definitions
When("I log in", () => {
  page.fill("#email", "alice@example.com")
  page.fill("#password", "secret")
  page.click("#submit")
  page.waitForNavigation()
})
```

**The Test Pyramid Ratio:**
- **BDD/E2E (20%)** — Critical user journeys and multi-system flows
- **Integration (40%)** — Service boundaries and data transformations
- **Unit (40%)** — Algorithms, calculations, and UI mechanics

## Anti-patterns to avoid

- ❌ **UI Mechanics** (`When I click the blue button`) — Use business actions instead
- ❌ **Keyboard Shortcuts** (`When I press Tab`) — Test the workflow goal
- ❌ **Incidental Detail** — Don't include IDs or internal data structures in Gherkin
- ❌ **Scenario Bloat** — Keep scenarios to 3-8 steps; split if they exceed 15
- ❌ **Duplicate Coverage** — Don't test validation logic in BDD if unit tests cover it

## Related skills

- `bdd-workflow` - The overall BDD outside-in development cycle
- `bdd-anti-patterns` - Comprehensive library of mistakes to avoid
- `cucumber` - Executable specification runner
- `tdd-workflow` - The inner loop of technical implementation
