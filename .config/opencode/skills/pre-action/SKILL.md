---
name: pre-action
description: Mandatory decision framework - clarify goal, evaluate options, choose consciously before acting
category: Core Universal
---

# Skill: pre-action

## What I do

I force deliberate thinking before significant action: clarify the goal, understand constraints, evaluate options, and choose the best approach rather than reacting immediately.

## When to use me

- Always load automatically before major coding, deployment, or irreversible changes
- When facing unclear requirements or multiple viable approaches
- Before committing to an architecture or design decision

## Core principles

1. Stop and think—pause before acting
2. Clarify intent—state goal, constraints, success criteria
3. Evaluate options—consider at least 2 approaches before deciding
4. Choose consciously—make explicit trade-off decisions
5. Verify understanding—confirm you've grasped the problem

## Mid-chain reflection (sequential tool use)

When executing a chain of sequential tool calls where each step depends on the
previous result, apply a reflection step between calls:

**After each significant tool result, ask:**
- Does this result change my plan?
- Am I still on the right path, or do I need to backtrack?
- Do I have all information needed for the next step?

**Before any irreversible action, verify:**
- What exactly will this change?
- Is this the right target (file, record, resource)?
- Can I undo this if wrong?

**When results are unexpected, stop and reassess:**
- Why did I get this result?
- Does my mental model need updating?
- Should I try a different approach?

This is distinct from upfront pre-action thinking — it is reactive, triggered by
new information from tool results. Most valuable in long tool chains, policy-heavy
environments, and sequential decisions where mistakes compound.

## Decision triggers

- Always-active: load with every agent session automatically
- Load before `critical-thinking` for rigorous analysis of complex decisions
- Load with `memory-keeper` to capture decision reasoning
- For detailed decision frameworks, refer to Obsidian vault (memory-keeper will point there)

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Core-Universal/Pre Action.md`
