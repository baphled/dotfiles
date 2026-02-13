---
description: Generate VHS tape for PR evidence - demonstrate changes visually
agent: vhs-director
---

# VHS PR Evidence

Generate VHS tape for pull request evidence.

## Purpose

Create terminal recordings that demonstrate PR changes visually:
- Show before/after functionality
- Demonstrate new features
- Validate UI/CLI changes
- Provide visual evidence for code review

## Context

This command routes to the VHS Director agent with PR-specific context. The agent will:
1. Analyse the PR diff to understand changes
2. Identify UI/CLI changes to demonstrate
3. Create tape showing before/after or new functionality
4. Upload GIF to PR comment

## Skills Loaded

- `vhs`
- `git-master`
- `github-expert`

$ARGUMENTS
