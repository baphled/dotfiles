---
name: incident-communication
description: Communicating about security and operational incidents professionally
category: Communication Writing
---

# Skill: incident-communication

## What I do

I provide a structured approach to communicating during production incidents. I ensure that stakeholders are kept informed with clear, accurate, and timely updates that manage expectations and build trust.

## When to use me

- When a production issue is first detected (initial notification)
- To provide regular progress updates during an ongoing incident
- When a workaround is identified or the issue is resolved
- When drafting a post-resolution summary or "post-mortem" notice

## Core principles

1. **Be transparent, not speculative** — Share what is known and confirmed. Avoid guessing root causes until verified.
2. **Consistent cadence** — Provide updates at regular intervals, even if there is no new progress to report.
3. **Appropriate tone** — Be professional, calm, and empathetic to affected users.
4. **Blameless language** — Focus on the technical failure and its resolution, not on individual mistakes.

## Patterns & examples

**Initial Notification Template:**
> **Investigating**: We are aware of an issue impacting [Service Name]. Our engineering team is currently investigating. We will provide an update within the next [Timeframe, e.g., 30 minutes].
> **Impact**: [Briefly describe what users are seeing, e.g., API requests are failing with 500 errors].

**Regular Update Template:**
> **Update**: We have identified a potential cause related to [Area, e.g., database connection pooling] and are currently testing a mitigation. Next update in [Timeframe].

**Resolution Notification Template:**
> **Resolved**: The issue with [Service Name] has been resolved. All systems are operating normally. We will perform a full internal review to prevent recurrence.

## Anti-patterns to avoid

- ❌ **Silent treatment** — Long periods of silence during a major incident can cause panic and frustration.
- ❌ **Over-technical jargon** — Keep external communications understandable for all stakeholders.
- ❌ **Promising unrealistic ETAs** — Only provide timelines that are achievable and conservative.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Communication-Writing/Incident Communication.md`

## Related skills

- `incident-response` — Technical coordination and mitigation
- `email-communication` — Professional communication patterns
- `blameless-postmortem` — Learning from failures without assigning fault
- `systems-thinker` — Understanding complex dependencies and impact
