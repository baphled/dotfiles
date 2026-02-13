---
name: skill-discovery
description: Proactively suggest relevant skills.sh skills during task execution based on context
category: Agent Guidance
---

# Skill: skill-discovery

## What I do

I proactively identify moments during task execution where a community skill from [skills.sh](https://skills.sh) would materially improve the agent's output. Rather than relying on the user to know every available skill, I surface relevant suggestions at the right moment — once per session, with user consent required before import.

## When to suggest a skill

Trigger a suggestion when ANY of these conditions are met:

1. **Unfamiliar library or framework** — The task involves a library not covered by installed skills (e.g., user asks about Prisma but no `prisma` skill is loaded)
2. **Explicit skill gap** — The agent recognises it lacks domain expertise for the current task (e.g., "I'm not sure about the best pattern for..." or hallucinating API signatures)
3. **User signals need** — The user says "I need help with X", "is there a skill for Y", or "how do I do Z" where Z is a specific technology
4. **Task keyword match** — The task description contains technology names that map to known skill categories (e.g., "deploy to Kubernetes" → check for `kubernetes` skill)
5. **Repeated uncertainty** — The agent has made 2+ uncertain statements about the same technology in one session

## How to search for skills

### Step 1: Check installed skills first

Before suggesting, verify the skill isn't already available:

```bash
# List currently installed skills
ls ~/.config/opencode/skills/
```

### Step 2: Search skills.sh

Use the skills.sh registry to find community skills:

```bash
# Search by keyword
npx @anthropic/skills search <keyword>

# Browse the leaderboard for popular skills
# https://skills.sh/leaderboard
```

### Step 3: Evaluate quality signals

Before suggesting, check:
- **Downloads/stars** — Prefer skills with community traction
- **Last updated** — Prefer recently maintained skills
- **Description match** — Skill description aligns with the actual need
- **Size** — Skills should be under 5KB (per system convention)

## How to present suggestions

Use this exact format when suggesting a skill:

```
💡 **Skill suggestion:** `{skill-name}` may help with this task.

**Why:** {one-sentence reason tied to the current task}
**Source:** skills.sh — {download count} downloads
**To install:** `npx @anthropic/skills install {owner}/{skill-name}`

Want me to install it? (yes/no)
```

Only proceed with installation if the user explicitly confirms.

## Guardrails

1. **Maximum 1 suggestion per session** — Do not nag. One well-timed suggestion is valuable; repeated suggestions are annoying
2. **User consent required** — NEVER auto-import a skill. Always ask first and wait for confirmation
3. **70% confidence threshold** — Only suggest when you are at least 70% confident the skill would materially improve the task outcome. If unsure, stay silent
4. **No self-promotion** — Do not suggest skills that duplicate already-installed capabilities
5. **No interruption** — Present suggestions at natural breakpoints (between steps, after completing a subtask), never mid-implementation
6. **Explain the gap** — Always articulate what specific capability is missing and how the skill fills it

## Core principles

1. **Right skill, right moment** — Quality over quantity; one perfect suggestion beats five mediocre ones
2. **Transparency** — Always show the source, popularity, and reason for suggestion
3. **User agency** — The user decides; the agent recommends
4. **Installed-first** — Always check local skills before searching externally

## Examples

### Example 1: React patterns

**Context:** User asks "Help me implement server-side rendering with Next.js"

**Agent check:** `ls ~/.config/opencode/skills/ | grep -i next` → no results

**Suggestion:**
```
💡 **Skill suggestion:** `nextjs` may help with this task.

**Why:** Your task involves Next.js SSR patterns and I don't have a specialised Next.js skill loaded.
**Source:** skills.sh — 2.4k downloads
**To install:** `npx @anthropic/skills install vercel/nextjs`

Want me to install it? (yes/no)
```

### Example 2: Testing framework

**Context:** User asks "Write Playwright tests for our login flow"

**Agent check:** `ls ~/.config/opencode/skills/ | grep -i playwright` → found `playwright/SKILL.md`

**Result:** No suggestion needed — skill already installed. Load it instead:
```
Loading skill: playwright (already installed)
```

### Example 3: Infrastructure

**Context:** User asks "Set up Terraform for our AWS infrastructure"

**Agent check:** No `terraform` skill installed. Agent has made 2 uncertain statements about Terraform state management.

**Suggestion:**
```
💡 **Skill suggestion:** `terraform` may help with this task.

**Why:** I've been uncertain about Terraform state management patterns, and a specialised skill would provide authoritative guidance.
**Source:** skills.sh — 1.8k downloads
**To install:** `npx @anthropic/skills install hashicorp/terraform`

Want me to install it? (yes/no)
```

## Anti-patterns to avoid

- ❌ **Suggesting on every task** — One suggestion per session maximum; respect the user's attention
- ❌ **Auto-importing without consent** — Always ask, never assume
- ❌ **Suggesting installed skills** — Check local skills directory first
- ❌ **Low-confidence suggestions** — Below 70% confidence, stay silent rather than guess
- ❌ **Interrupting flow** — Wait for natural breakpoints between task steps
- ❌ **Suggesting for well-known stdlib** — Don't suggest skills for standard library usage

## Related skills

- `core-auto-detect` — Detects environment context that informs skill suggestions
- `tool-usage-discipline` — Ensures proper tool and skill usage patterns
- `clean-code` — Applies across all domains
