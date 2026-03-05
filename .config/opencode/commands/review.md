---
description: Code review workflow - enforce rules and quality before merge
agent: qa-engineer
---

# Code Review

Systematic review of code changes to ensure correctness, quality, and security before merging into the main branch. This command follows a multi-pass approach for thorough analysis.

## Skills Loaded

- `code-reviewer`
- `architecture`
- `security`
- `clean-code`
- `bdd-workflow`

## When to Use

- Before merging a Pull Request or local branch
- Reviewing critical or complex code changes
- Peer-reviewing a colleague's work
- Self-reviewing changes before submission

## Process / Workflow

1. **Context Analysis**: Understand the goal of the changes and the problem being solved.
2. **Correctness Pass**: Verify that the changes implement the intended logic and handle edge cases correctly.
3. **Quality & Style Pass**: Check for clean code principles, naming clarity, and adherence to project style guides.
4. **Architecture Check**: Ensure the changes respect layer boundaries and architectural patterns.
5. **Security Audit**: Scan for security vulnerabilities, secret leaks, and insecure data handling.
6. **Test Coverage**: Verify that all new logic is covered by meaningful unit and integration tests.
7. **Documentation Review**: Check that READMEs, API docs, and comments are updated as needed.
8. **Feedback Delivery**: Provide constructive, actionable feedback with clear severity levels (MUST, SHOULD, CONSIDER).

$ARGUMENTS
