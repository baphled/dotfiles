---
description: Clean up code applying Boy Scout Rule
agent: senior-engineer
---

# Code Cleanup

Apply the Boy Scout Rule by leaving the codebase cleaner than you found it. This command focuses on non-functional improvements like removing dead code, fixing formatting, and improving naming to reduce technical debt.

## Skills Loaded

- `clean-code` - Naming and structure principles
- `refactor` - Small-scale structural improvements
- `ai-commit` - Attributed commits for cleanup work

## When to Use

- Removing obsolete functions or variables after a refactor
- Improving readability of a file you've just modified
- Correcting formatting or linting issues
- Standardising naming conventions across a package

## Process / Workflow

1. **Audit Target Area**
   - Identify dead code, unused imports, or magic numbers
   - Review variable and function names for intent-revealing clarity
   - Check for formatting inconsistencies or lack of comments

2. **Dead Code Removal**
   - Use `lsp_find_references` to confirm code is truly unused
   - Delete obsolete code and comments
   - Remove unused imports or package-level declarations

3. **Readability Improvements**
   - Apply better naming to variables and functions (naming reveals intent)
   - Extract small helper functions for complex logic
   - Format the code according to project standards (e.g. `gofmt`, `prettier`)

4. **Verification**
   - Ensure the cleanup has zero functional impact
   - Run tests for the modified files: `make test`
   - Run compliance checks: `make check-compliance`

5. **Commit Cleanup**
   - Create a dedicated `chore:` or `refactor:` commit for the cleanup
   - Group related cleanup actions into atomic changes
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

6. **Documentation Update**
   - Reflect any naming or structural changes in relevant documentation
   - Update READMEs or internal wiki pages if necessary

$ARGUMENTS
