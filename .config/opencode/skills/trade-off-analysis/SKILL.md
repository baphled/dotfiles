---
name: trade-off-analysis
description: Systematically evaluate trade-offs when comparing alternatives
category: Thinking Analysis
---

# Skill: trade-off-analysis

## What I do

I systematically evaluate the pros and cons of different technical options. I ensure that every choice acknowledges what is being gained AND what is being sacrificed, avoiding the trap of believing in "perfect" solutions.

## When to use me

- When choosing between multiple competing libraries, frameworks, or tools
- Before committing to a major architectural change
- To resolve disagreement between different technical proposals
- When requirements pull the system in different directions (e.g. speed vs reliability)

## Core principles

1. **No silver bullets** — Every technical choice has a cost. If you haven't found the trade-off, you haven't looked hard enough.
2. **Weighting criteria** — Rank your criteria by business impact (e.g. "Operational simplicity" may be more important than "Max throughput" for our current stage).
3. **Reversibility assessment** — Hard-to-undo decisions require more rigorous trade-off analysis.
4. **Time-horizon thinking** — Consider both the short-term benefit (speed of delivery) and long-term cost (maintenance, technical debt).

## Patterns & examples

**Decision Matrix Example:**
| Option | Speed | Reliability | Simplicity | Maintenance | Total Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Option A (Serverless) | 5 | 3 | 5 | 5 | 18 |
| Option B (Kubernetes) | 3 | 5 | 2 | 1 | 11 |
*(Weighting: Reliability 50%, Speed 20%, Simplicity 20%, Maintenance 10%)*

**Trade-off Mapping:**
- **Gain:** Faster time to market with library X.
- **Sacrifice:** Limited customisation, dependency on a third-party vendor.
- **Decision:** Accept sacrifice for the next 6 months to validate the MVP.

## Anti-patterns to avoid

- ❌ **Analysis paralysis** — Spending too long on trade-offs for reversible, low-impact decisions.
- ❌ **Ignoring "shadow costs"** — Only looking at technical merits while ignoring developer training, operational overhead, and long-term support.
- ❌ **Bias towards "new and shiny"** — Choosing a tool because it's interesting, while ignoring its lack of maturity or community support.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Thinking-Analysis/Trade Off Analysis.md`

## Related skills

- `critical-thinking` — Validating the logic of the analysis
- `justify-decision` — Documenting the chosen trade-off
- `systems-thinker` — Understanding how trade-offs ripple through the system
- `assumption-tracker` — Surfacing the assumptions that underlie the options
