---
name: bdd-anti-patterns
description: Library of common BDD mistakes and how to fix them
category: Testing BDD
---

# Skill: bdd-anti-patterns

## What I do

I identify and provide remediation for common BDD anti-patterns. I ensure tests remain stable, maintainable, and business-focused by stripping away implementation-specific details.

## When to use me

- Auditing existing Gherkin scenarios for fragility
- Refactoring slow or flaky E2E tests
- Moving low-level UI tests into unit test suites
- Clarifying vague or ambiguous test language
- Stabilising tests that depend on hard-coded data

## Core principles

1. **Test Behaviour, Not Presentation** — Avoid testing modals, animations, or styling
2. **Workflow over Mechanics** — Don't test buttons, keys, or gestures directly
3. **Outcome over Process** — Focus on the goal achieved, not the steps taken
4. **Data Flexibility** — Use generated or relative data instead of hard-coded IDs
5. **Single Responsibility** — One business rule per scenario

## Patterns & examples

**Fixing Modal Testing:**
- ❌ **Bad:** `Then the settings modal should appear and be centred`
- ✅ **Fixed:** `Then I should be able to update my preferences`

**Fixing Keyboard Mechanics:**
- ❌ **Bad:** `When I press the "j" key`
- ✅ **Fixed:** `When I navigate down the list`

**Fixing Vague Outcomes:**
- ❌ **Bad:** `Then the output should be good`
- ✅ **Fixed:** `Then the total should be £108.25 (including 8.25% tax)`

**Fixing Brittle Data:**
- ❌ **Bad:** `Given user ID 12345 exists`
- ✅ **Fixed:** `Given I have a registered user account`

## Anti-patterns to avoid

- ❌ **Modal Mechanics** — Testing how a dialog opens instead of what it does
- ❌ **Keyboard Shortcuts** — Coupling tests to specific input methods
- ❌ **Form Mechanics** — Testing tab order or focus instead of data entry
- ❌ **Implementation Details** — Testing internal function calls or database queries
- ❌ **Vague Language** — Scenarios that a non-technical person cannot understand
- ❌ **The "Mega-Scenario"** — One scenario testing 20+ steps of an entire journey

## Related skills

- `bdd-workflow` - The foundational BDD development cycle
- `bdd-best-practices` - Positive patterns to follow
- `e2e-testing` - The execution layer for BDD scenarios
- `test-fixtures` - Managing data to avoid brittleness
