# Step Discipline Policy

All agents MUST execute every prescribed step. No exceptions.

## Permission chain

```
User → Orchestrator → Sub-agent
```

- Only **users** can request skipping steps
- Only **orchestrators** can relay skip permission to sub-agents
- **Sub-agents cannot self-authorise** skipping any step

## What counts as skipping

- Omitting a step entirely
- Replacing a prescribed step with a shortcut
- Producing placeholders or stubs instead of real work
- Adding `nolint`, `skip`, `pending`, or similar bypass markers
- Marking a step complete without performing it

## Rules

1. If a step seems unnecessary: **complete it anyway**, then report to the orchestrator
2. If a step is blocked: **report the blocker** — do not skip
3. If you disagree with a step: **execute it**, then raise the concern
4. Only orchestrators may grant skip permission, and only when the user explicitly requests it

## Enforcement

Violations of step discipline are treated as task failures. The orchestrator will:
1. Reject incomplete work
2. Require the skipped step to be completed
3. Log the violation for review
