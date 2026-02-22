---
description: Run comprehensive project compliance checks
agent: qa-engineer
---

# Check Compliance

Run comprehensive project compliance checks to ensure that all quality standards, architectural rules, and security policies are met. This command provides a rigorous validation of the current branch state.

## Skills Loaded

- `check-compliance`
- `architecture`
- `security`
- `static-analysis`
- `clean-code`

## When to Use

- Before merging a branch into the main repository
- When preparing a release candidate
- To verify that recent changes haven't violated project constraints

## Process / Workflow

1. **Environment Verification**: Confirm that all necessary tools and environment variables are correctly configured.
2. **Build Validation**: Execute a full project build to ensure compilation success across all packages.
3. **Automated Test Suite**: Run the complete test suite (`make test`) and verify that 100% of tests pass.
4. **Coverage Enforcement**: 
   - Check coverage reports for all packages.
   - Verify that new or modified logic meets the minimum coverage threshold (default 95%).
5. **Static Analysis and Linting**:
   - Run linters to identify code style violations and potential bugs.
   - Use `static-analysis` tools to check for complex logic or performance bottlenecks.
6. **Architecture Boundary Check**:
   - Validate that dependencies only point inward towards the domain layer.
   - Ensure no circular dependencies or layer-skipping violations exist.
7. **Security and Vulnerability Scan**:
   - Perform a full scan for hardcoded secrets, insecure API usage, and known vulnerabilities.
8. **Compliance Reporting**: 
   - Generate a summary report with pass/fail status for each check.
   - Detail any failures that require immediate attention before completion.

$ARGUMENTS
