---
description: Implement a feature following TDD and clean code principles
agent: senior-engineer
---

# Implement Feature

Implement a feature following the Outside-In BDD workflow. This ensures that every line of code is driven by a requirement and that the implementation meets the acceptance criteria.

## Skills Loaded

- `bdd-workflow` - Guide for RED-GREEN-REFACTOR cycle
- `test-fixtures` - Design patterns for test data
- `clean-code` - SOLID and DRY principles
- `architecture` - Layer boundary enforcement
- `ai-commit` - Creation of attributed commits

## When to Use

- Adding a new capability to the system
- Creating a new API endpoint or CLI command
- Implementing a new business rule or domain entity

## Process / Workflow

1. **Requirements to Scenarios**
   - Translate the feature request into executable Gherkin scenarios
   - Define "Given/When/Then" steps for the main path and key edge cases
   - Save scenarios in `.feature` files or equivalent test blocks

2. **Outside-In RED Phase**
   - Write an acceptance test that describes the desired behaviour
   - Run the test to confirm it fails: `make test-acceptance`
   - Use `playwright` for web-based features or internal service runners for APIs

3. **Inward to Units (RED-GREEN)**
   - Identify the first component needed (e.g. domain model, repository)
   - Write a unit test for this component
   - Implement the minimum logic to pass the unit test
   - Repeat for all components required by the acceptance test

4. **Refactor Phase**
   - Clean up the implementation once the tests are GREEN
   - Ensure the new code follows `clean-code` and `architecture` standards
   - Check for duplicated logic or opportunities for better design patterns

5. **Verification**
   - Run the full test suite: `make test`
   - Execute compliance checks: `make check-compliance`
   - Ensure no regressions were introduced

6. **Final Commit**
   - Split changes into atomic commits if necessary
   - Follow the `commit.md` workflow for creation and attribution
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

$ARGUMENTS
