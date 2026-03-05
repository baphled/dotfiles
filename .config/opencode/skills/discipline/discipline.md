# Skill: discipline

**classification:** Core Universal
**tier:** T0 (System Behavior)

## What I do

I enforce two non-negotiable rules across all agents: (1) every prescribed step must be executed without shortcuts, and (2) significant changes must trigger KB Curator documentation.

## When to use me

- **Always** — loaded as a baseline skill for every agent via skill-discovery
- Before skipping or shortcutting any workflow step
- After completing setup changes or project milestones

## Step Discipline (MANDATORY)

Execute EVERY step prescribed by your skills, workflow, and task prompt. No skipping. No shortcuts. No self-authorisation.

- **Permission chain**: User → Orchestrator → Sub-agent
- Sub-agents CANNOT self-authorise skipping any step
- Only orchestrators can grant skip permission (when user explicitly requests)
- If a step seems unnecessary: complete it anyway, then report to orchestrator

**What counts as skipping:**
- Omitting a step entirely
- Replacing a step with a shortcut
- Producing placeholders/stubs instead of completing work
- Adding nolint, skip, pending markers to bypass work

## KB Curator Integration

### MANDATORY triggers (no exceptions)

Three situations ALWAYS require delegating to KB Curator before your task is considered complete:

1. **Project or feature work** — Feature completion, task set done, project milestone reached. Document what was built, changed, or decided.
2. **Exploration or investigation** — Research, codebase exploration, or investigation that produced new understanding. Document discoveries, patterns, and conclusions.
3. **Agentic flow or config changes** — Any modification to agent files, skill files, commands, AGENTS.md, oh-my-opencode.jsonc, or OpenCode configuration.

Run KB Curator as a **fire-and-forget background task** so it does not block your work:

```typescript
task(
  subagent_type="Knowledge Base Curator",
  run_in_background=true,
  load_skills=[],
  prompt="Sync: {what changed}"
)
```

> Skipping KB Curator for these categories is a **blocking violation**.

## Anti-patterns to avoid

- Skipping steps because they "seem unnecessary"
- Self-authorising shortcuts without orchestrator approval
- Producing stubs or placeholders instead of real work
- Forgetting KB Curator after setup changes or project completion
- Running KB Curator synchronously when it should be fire-and-forget

## KB Reference

~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Core-Universal/Discipline.md

## Related skills

- pre-action — Decision framework that runs before execution; discipline ensures execution completes fully
- memory-keeper — Captures discoveries; discipline ensures KB Curator documents them
- clean-code — Code quality principles; discipline ensures they are applied without shortcuts
