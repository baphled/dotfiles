---
description: Fix architecture violations detected by check-compliance
agent: senior-engineer
---

# Fix Architecture Violations

Fix architectural layer violations and dependency direction issues. This command ensures the codebase adheres to clean architecture principles by remediating boundary breaches.

## Skills Loaded

- `fix-architecture` — Diagnose and remediate boundary violations
- `architecture` — Enforce layer separation and dependency rules
- `clean-code` — Apply SOLID principles during refactoring

## When to Use

- After `make check-compliance` reports architectural violations
- When circular dependencies are detected between packages
- When a lower layer (e.g. domain) incorrectly imports a higher layer (e.g. infrastructure)
- During refactoring to improve system structure and maintainability

## Process / Workflow

1. **Identify Violations**: Run architecture validation checks using `make check-compliance` or specific linters to find breaches.
2. **Analyse Breaches**: Identify specific violations such as:
   - Screens importing intents (view-to-orchestrator leak)
   - UIKit importing screens (infrastructure-to-view leak)
   - Behaviors importing screens (logic-to-view leak)
   - Service importing CLI (business-to-transport leak)
   - Repository importing service (persistence-to-logic leak)
   - Domain importing any internal package (core must be pure)
3. **Plan Remediation**: Determine the correct dependency direction for each violation. Sketch missing abstractions or interfaces if necessary.
4. **Execute Fixes**: Address each violation following dependency direction rules:
   - Extract interfaces to invert dependencies where appropriate.
   - Move code to the correct layer based on its responsibility.
   - Ensure domain entities only import from the standard library.
5. **Verify Fixes**: Run compliance checks again to confirm all violations are resolved.
6. **Final Validation**: Ensure all tests pass and the system remains functional after structural changes.
7. **Commit**: Use `make ai-commit` to record the architectural improvements.

$ARGUMENTS
