---
description: Challenge a solution or idea to find weaknesses before implementation
agent: tech-lead
---

# Challenge Design Decision

Stress-test a proposed design, architecture, or solution before implementation. This command uses adversarial thinking to uncover hidden flaws and improve robustness.

## Skills Loaded

- `devils-advocate` — Adversarial thinking and stress-testing
- `critical-thinking` — Rigorous analysis and assumption testing
- `systems-thinker` — Anticipate systemic failures and second-order effects

## When to Use

- Before committing to a major design or architectural change
- When a proposal seems overly optimistic or lacks edge case consideration
- To avoid groupthink or "happy path" bias during planning
- When the cost of reversing the decision is high

## Process / Workflow

1. **Understand Proposal**: Comprehensively review the proposed solution, its goals, and constraints.
2. **Identify Assumptions**: Explicitly list all assumptions the design relies on (e.g., system availability, throughput, user behaviour).
3. **Stress-Test Edge Cases**: Explore how the design handles failure modes such as network outages, partial service failure, or unexpected input.
4. **Identify Flaws**: Locate potential weaknesses, security vulnerabilities, or performance bottlenecks.
5. **Evaluate Alternatives**: Consider at least one alternative approach that could achieve the same goal.
6. **Analyse Second-Order Effects**: Determine how the change will impact other parts of the system over time.
7. **Produce Critique**: Create a structured report detailing the risks and findings.
8. **Suggest Mitigations**: Provide recommendations to address the identified weaknesses.

$ARGUMENTS
