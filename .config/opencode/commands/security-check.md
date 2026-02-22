---
description: Run security audit on code
agent: security-engineer
---

# Security Audit

Comprehensive security analysis to identify and mitigate vulnerabilities across the codebase. This command runs automated scans and manual reviews of critical paths.

## Skills Loaded

- `security`
- `cyber-security`
- `static-analysis`
- `dependency-management`
- `code-reviewer`

## When to Use

- Before any major release or feature deployment
- Upon adding new third-party dependencies
- Periodically as part of a recurring security review
- When a new vulnerability is reported in a dependency

## Process / Workflow

1. **Static Analysis**: Run `gosec` or equivalent static analysis tools to identify common security flaws like SQL injection or weak cryptography.
2. **Secret Detection**: Scan for hardcoded secrets, API keys, and credentials using `gitleaks` or similar detection tools.
3. **Dependency Check**: Run `govulncheck` or `npm audit` to identify vulnerabilities in the supply chain.
4. **Logic Review**: Manually audit authentication and authorisation patterns, ensuring the principle of least privilege is applied.
5. **Input Validation**: Check that all user-provided data is properly sanitised, validated, and encoded before processing.
6. **Vulnerability Report**: Consolidate findings into a prioritised report with clear remediation steps and severity ratings.
7. **Remediation**: Create targeted bug fixes for identified vulnerabilities using the `fix:` commit prefix.

$ARGUMENTS
