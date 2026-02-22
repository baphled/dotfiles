---
description: Fix a bug following TDD with regression test
agent: senior-engineer
---

# Fix Bug

Diagnose and resolve software bugs using a test-driven approach. This command ensures that every fix is accompanied by a regression test to prevent the issue from reoccurring.

## Skills Loaded

- `bdd-workflow` - Workflow for reproducing and fixing
- `debug-test` - Advanced debugging techniques and patterns
- `clean-code` - Maintain code quality during fixes
- `ai-commit` - Creation of attributed commits

## When to Use

- Resolving a reported bug or issue
- Fixing a failing CI build or test suite
- Addressing unexpected behaviour in production or staging environments

## Process / Workflow

1. **Bug Reproduction**
   - Analyse the bug report and $ARGUMENTS to understand the failure
   - Create a reproduction test case that fails (RED)
   - Save the reproduction as a regression test in the relevant suite

2. **Root Cause Analysis (RCA)**
   - Use the `debug-test` skill to trace the execution flow
   - Inspect variables, state, and environmental factors
   - Identify the specific lines or logic causing the issue

3. **Implementation of the Fix**
   - Apply the minimum necessary change to fix the bug
   - Ensure the fix doesn't violate existing `architecture` boundaries
   - Verify success by running the reproduction test (GREEN)

4. **Regression Verification**
   - Run the full test suite for the modified package: `make test`
   - Execute project-wide compliance: `make check-compliance`
   - Verify that no unrelated functionality was broken

5. **Polish and Commit**
   - Refactor the fix for clarity if needed (Boy Scout Rule)
   - Follow the `commit.md` workflow for the fix
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

$ARGUMENTS
