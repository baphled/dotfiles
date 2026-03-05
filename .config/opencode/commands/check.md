---
description: Run comprehensive compliance and quality checks
agent: qa-engineer
---

# Compliance and Quality Checks

Run comprehensive quality and compliance checks to ensure the codebase remains healthy, secure, and adheres to architectural boundaries. This command should be executed before submitting any pull request.

## Skills Loaded

- `check-compliance`
- `architecture`
- `security`
- `static-analysis`
- `performance`

## When to Use

- Before creating a pull request to catch common errors
- After merging significant changes to ensure stability
- Periodically to maintain overall project health

## Process / Checks Run

1. **Build Verification**: Ensure the project compiles without errors.
2. **Full Compliance Suite**: Execute `make check-compliance` for a top-to-bottom project health check.
3. **Architecture Validation**: Run `make check-intent-architecture` to enforce layer isolation and dependency directions.
4. **Pattern Enforcement**: Use `make check-patterns` to ensure naming conventions and coding patterns are consistent.
5. **Security Scan**: Run `make gosec` or equivalent to detect vulnerabilities and insecure configurations.
6. **Linter Execution**: Check for code smells and stylistic issues that might lead to bugs.
7. **Test Suite Execution**: Run `make test` to verify that all existing tests pass correctly.
8. **Coverage Analysis**: Ensure that modified packages meet the 95% coverage threshold.
9. **Final Summary**: Report the status of each check, identifying any blockers that must be resolved.

$ARGUMENTS
