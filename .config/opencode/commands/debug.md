---
description: Debugging workflow - diagnose and fix issues with rules enforcement
agent: senior-engineer
---

# Debug

Diagnose and fix complex issues, failing tests, or unexpected system behaviour. This command focuses on isolation and systematic analysis to find the root cause.

## Skills Loaded

- `debug-test` - Core debugging workflow
- `logging-observability` - Structured logging analysis
- `profiling` - Identifying performance-related bugs
- `memory-keeper` - Access previous debugging sessions

## When to Use

- Understanding why a test is failing with a cryptic error
- Investigating race conditions or concurrency issues
- Diagnosing production-only incidents or regressions
- Tracing execution through unfamiliar layers

## Process / Workflow

1. **Context Acquisition**
   - Gather all available logs, stack traces, and error messages
   - Check the memory-keeper for similar failures
   - Review recent changes in the area of failure

2. **Isolation and Reproduction**
   - Attempt to reproduce the failure in a controlled environment
   - Use the `debug-test` skill to create a minimal reproduction case
   - Run tests with verbose output: `make test V=1`

3. **Execution Analysis**
   - Add targeted logging or instrumentation to the code
   - Use a debugger (like `dlv` for Go) if available in the environment
   - Analyse the execution path to find where state deviates from expected

4. **Hypothesis and Verification**
   - Formulate a hypothesis for the root cause
   - Test the hypothesis by making temporary modifications
   - Confirm that the modification resolves the issue in the reproduction

5. **Implementation of Fix**
   - Apply a permanent fix according to `clean-code` standards
   - Follow the `fix.md` workflow for verification and regression testing
   - Ensure the solution is robust and properly documented

6. **Capture Learnings**
   - Document the root cause and solution in the `memory-keeper`
   - Update any relevant technical documentation or ADRs
   - Suggest preventative measures for similar issues

$ARGUMENTS
