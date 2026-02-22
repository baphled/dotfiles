---
description: Run housekeeping and maintenance tasks on the codebase
agent: sysop
---

# Maintenance Tasks

Perform routine housekeeping to ensure codebase health and longevity. This command automates the "Boy Scout Rule" by cleaning up code, updating dependencies, and refreshing documentation.

## Skills Loaded

- `devops`
- `dependency-management`
- `automation`
- `documentation-writing`
- `check-compliance`

## When to Use

- Weekly or monthly scheduled maintenance
- After a major feature release to clean up technical debt
- When noticing outdated dependencies or stale documentation

## Process / Workflow

1. **Dependency Audit**: Check for outdated or vulnerable dependencies using `go list -m -u all` or `npm outdated`.
2. **Security Scan**: Run `govulncheck` or `npm audit` to identify known security vulnerabilities.
3. **Safe Updates**: Apply non-breaking updates (patches and minor versions) and verify with tests.
4. **Code Cleanup**: Identify and remove dead code, unused files, and temporary debug statements.
5. **Documentation Refresh**: Update READMEs and internal docs to reflect the latest changes and architectural decisions.
6. **Compliance Check**: Run `make check-compliance` to ensure all maintenance changes adhere to project standards.
7. **Atomic Commit**: Commit changes using `make ai-commit` with the `chore:` prefix.

$ARGUMENTS
