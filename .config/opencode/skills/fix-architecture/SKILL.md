---
name: fix-architecture
description: Diagnose and fix architecture violations
category: Code Quality
---

# Skill: fix-architecture

## What I do

I diagnose and fix architecture violations detected by compliance checks. I guide the remediation of layer boundary breaches, circular dependencies, and SOLID principle violations through incremental, test-backed refactoring.

## When to use me

- After compliance checks detect violations (e.g., `check-compliance`)
- When refactoring to improve system structure
- During code reviews when architectural issues are identified
- When dependencies point in the wrong direction

## Core principles

1. **Understand first** - Know the rule being violated and why before changing code.
2. **Fix root cause** - Address fundamental design flaws, not just linter symptoms.
3. **Incremental fixes** - Make small, testable changes; keep tests green at all times.
4. **Safety net** - Ensure comprehensive tests exist before moving code across layers.
5. **Document decisions** - Record architectural changes for future maintainers.

## Common Violations & Fixes

| Violation | Problem | Fix |
|-----------|---------|-----|
| **Layer Breach** | UI directly accessing DB | Introduce Service and Repository layers |
| **Circular Dep** | Module A <-> Module B | Extract shared interface / Dependency Inversion |
| **God Object** | One class does everything | Split into focused, single-responsibility services |
| **Feature Envy** | Method uses another class more | Move method to the envied class |
| **Wrong Direction** | Domain depends on Infra | Use Dependency Inversion (Domain defines interfaces) |

## Diagnostic Process

1. **Identify** - Run `check-compliance` or linters to find violations.
2. **Analyse** - Understand the rule and why the code violates it.
3. **Design** - Sketch the target architecture and missing abstractions.
4. **Implement** - Small steps: Extract Interface -> Move Code -> Verify.
5. **Verify** - Run compliance checks again to confirm the fix.

## Anti-patterns to avoid

- ❌ **Big Bang Refactoring** - Fixing all violations in one massive PR
- ❌ **Ignoring Tests** - Refactoring architecture without a safety net
- ❌ **Suppressing Warnings** - Silencing linters without fixing the design flaw
- ❌ **Over-Engineering** - Adding unnecessary abstractions for simple code

## Related skills

- `architecture` - Understanding the patterns to move towards
- `refactor` - Safe code transformation techniques
- `check-compliance` - Detecting the violations
- `clean-code` - SOLID principles foundation

