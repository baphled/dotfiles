---
description: Quality Assurance workflow - verify, find gaps, capture unintended behaviour
agent: qa-engineer
---

# Quality Assurance

This command initiates a comprehensive quality assurance workflow. The focus is on verifying system behaviour through diverse testing methods, identifying coverage gaps, and ensuring that all edge cases are properly handled.

## Skills Loaded

- `qa-engineer`
- `prove-correctness`
- `critical-thinking`
- `security`
- `cyber-security`

## Focus Areas

- **Test Coverage Analysis**: Identify packages or paths with low coverage using tools like `go tool cover`.
- **Edge Case Identification**: Look for boundary conditions, empty inputs, or unexpected data types.
- **Error Handling Verification**: Ensure that errors are not just caught but correctly propagated and wrapped with context.
- **Adversarial Testing**: Intentionally provide invalid inputs or simulate race conditions to see how the system reacts.

## Process

1. **Analyse Current State**: Run existing tests and generate a coverage report to find gaps.
2. **Define Test Scenarios**: Identify 3-5 high-value scenarios that are currently untested or under-tested.
3. **Execute Testing Strategies**:
   - **Boundary Value Analysis**: Test the minimum and maximum possible values.
   - **Error Path Testing**: Force failures in external dependencies (mocking) to verify error recovery.
   - **Security Audit**: Check for common vulnerabilities like SQL injection or insecure defaults.
   - **Performance / Stress Testing**: Where relevant, simulate high load to check for resource leaks.
4. **Document Findings**: Create issues or notes for any unintended behaviour discovered.
5. **Implement Fixes or Tests**: Create reproduction test cases for any bugs found and ensure they pass.
6. **Final Verification**: Run the full suite again to confirm no regressions and improved coverage.

$ARGUMENTS
