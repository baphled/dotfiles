---
description: Development task workflow - write code with TDD and core rules
agent: senior-engineer
---

# Development Task

Execute a development task following TDD and clean code principles. This command covers the general end-to-end development cycle from requirements analysis to final commit.

## Skills Loaded

- `golang` / `ruby` / `javascript` / `cpp` (detected by environment)
- `bdd-workflow` - Outside-in development mindset
- `clean-code` - Maintain readability and SOLID principles
- `architecture` - Ensure layer boundary compliance
- `check-compliance` - Pre-commit validation checks
- `ai-commit` - Proper attribution for AI-generated code

## When to Use

- Starting a new feature or sub-component
- Modifying existing logic while following the Boy Scout Rule
- General engineering tasks that require code changes and verification

## Process / Workflow

1. **Analyse Requirements**
   - Review the task description and $ARGUMENTS
   - Search the memory-keeper and knowledge base for related patterns
   - Use `pre-action` to evaluate implementation approaches

2. **Establish Baseline (BDD)**
   - Identify the language and test framework (e.g. Go with Ginkgo, Ruby with RSpec)
   - Write an acceptance test or scenario first (RED)
   - Run the tests to confirm failure: `make test` or language-specific runner

3. **Smallest-Change Implementation (RED-GREEN)**
   - Implement the minimum code required to pass the test
   - Follow `clean-code` principles during implementation
   - Verify success by running tests again

4. **Refactor and Polish (GREEN-REFACTOR)**
   - Improve code structure without changing behaviour
   - Ensure `architecture` boundaries are respected
   - Check for redundant code or potential simplifications

5. **Validation and Compliance**
   - Run full project checks: `make check-compliance`
   - Fix any linter warnings or architectural violations
   - Verify all tests pass across the entire suite

6. **Create AI-Attributed Commit**
   - Plan atomic commits using `git_master`
   - Write message to `/tmp/commit.txt`
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

$ARGUMENTS
