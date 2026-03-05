---
description: Testing workflow - write and debug tests with TDD and BDD
agent: qa-engineer
---

# Testing Workflow

Write and debug tests with TDD and BDD approaches. This command ensures that testing is behaviour-focused rather than implementation-focused, following an outside-in cycle.

## Skills Loaded

- `bdd-workflow`
- `ginkgo-gomega` / `jest` / `rspec-testing` / `embedded-testing` / `playwright`
- `test-fixtures`
- `clean-code`
- `prove-correctness`

## When to Use

- Before implementing new features to define behaviour
- When fixing bugs to create a reproduction test case
- During refactoring to ensure no regressions occur
- When improving test coverage for existing packages

## Process

1. **Detect Project Context**: Identify the language and preferred framework:
   - Go: `Ginkgo` / `Gomega`
   - JavaScript/TypeScript: `Jest` / `Playwright`
   - Ruby: `RSpec`
   - C++: `embedded-testing`
2. **Outside-In BDD Cycle**:
   - Start with an acceptance test (e.g. Gherkin or a high-level integration test).
   - See the test fail (RED).
   - Write a unit spec for the first component needed.
   - Implement the minimum code required to pass the unit spec (GREEN).
   - Refactor the implementation while keeping tests green.
   - Repeat until the high-level acceptance test passes.
3. **Behaviour Verification**:
   - Ensure tests describe *what* the system does, not *how* it does it.
   - Use descriptive `Describe`, `Context`, and `It` blocks.
   - Avoid testing private methods or internal state directly.
4. **Data Management**:
   - Use `test-fixtures` to generate realistic data.
   - Ensure tests are isolated and do not depend on external state.
5. **Execution and Coverage**:
   - Run the full suite: `make test` or equivalent.
   - Verify coverage for modified packages: `make coverage`.
   - Aim for 95% coverage on new or modified logic.

$ARGUMENTS
