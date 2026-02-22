---
description: Refactor code following clean code and Boy Scout Rule
agent: senior-engineer
---

# Safe Refactoring

Improve the internal structure of existing code without altering its external behaviour. This command enforces a disciplined, step-by-step approach to ensure that the system remains functional at all times.

## Skills Loaded

- `refactor` - Core refactoring patterns and techniques
- `clean-code` - Readability and maintainability standards
- `architecture` - Ensuring layer integrity
- `ai-commit` - Attributed commits for structural changes

## When to Use

- Extracting logic to reduce duplication (DRY)
- Improving variable, function, or package naming
- Reorganising code to follow clean architecture layers
- Simplifying complex conditionals or long functions

## Process / Workflow

1. **Verify Baseline (GREEN)**
   - Ensure that all tests for the target code are passing
   - Run the full suite if the refactor has wide impact: `make test`
   - NEVER start refactoring on broken or unstable code

2. **Identify Refactoring Target**
   - Select a specific, atomic target for improvement
   - Define the desired end-state using `clean-code` principles
   - Use `pre-action` to evaluate the risk and impact of the change

3. **Incremental Execution**
   - Apply ONE structural change at a time (e.g. Rename → Extract → Move)
   - Run tests immediately after each change to verify behaviour preservation
   - Revert immediately if a change breaks existing functionality

4. **Validation and Compliance**
   - Run project-wide checks: `make check-compliance`
   - Verify that all architectural boundaries are still respected
   - Check that documentation remains accurate for the refactored code

5. **Atomic Commits**
   - Create separate commits for each logical refactoring step
   - Follow the `commit.md` workflow for high-quality attribution
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

6. **Post-Refactor Review**
   - Ensure that the final code is significantly cleaner than the start
   - Verify that zero functional changes were introduced
   - Update any relevant ADRs if the refactor changes design patterns

$ARGUMENTS
