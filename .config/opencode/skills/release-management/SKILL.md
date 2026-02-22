---
name: release-management
description: Versioning, changelogs, release notes, and release branch management
category: Delivery
---

# Skill: release-management

## What I do

I provide a structured approach to delivering software. I focus on managing the lifecycle of a release from planning and versioning to branch management and final deployment, ensuring that every release is predictable, documented, and safe.

## When to use me

- When planning a new version of a product or service
- To manage the process of tagging and releasing a new version
- When maintaining a CHANGELOG.md and writing release notes
- During feature freezes or when coordinating stakeholder sign-off
- To manage hotfixes and patches outside the normal release cycle

## Core principles

1. **Semantic Versioning (SemVer)** — Use a consistent versioning scheme (MAJOR.MINOR.PATCH) to communicate the nature of changes to users.
2. **Predictable Cadence** — Deliver releases on a regular schedule to manage expectations and reduce the scope of each release.
3. **Traceability** — Every release must be traceable back to specific commits, pull requests, and requirements.
4. **Documentation** — Clear, user-focused release notes are as important as the code itself.

## Patterns & examples

**Semantic Versioning (SemVer 2.0.0):**
- **MAJOR**: Incompatible API changes.
- **MINOR**: Add functionality in a backwards-compatible manner.
- **PATCH**: Backwards-compatible bug fixes.

**Changelog Template (Keep a Changelog):**
```markdown
## [1.2.3] - 2026-02-22
### Added
- New dark mode toggle in settings.
### Changed
- Improved dashboard loading performance.
### Fixed
- Corrected a bug where login failed on certain browsers.
```

**Release Branching Strategy:**
- **main**: Always stable, matches production.
- **develop**: Integration branch for the next release.
- **release/vX.Y.Z**: Dedicated branch for final testing and stabilisation before merging to main.
- **hotfix/vX.Y.Z**: Emergency fix branch that merges back to main and develop.

## Anti-patterns to avoid

- ❌ **"Big Bang" releases** — Releasing too many changes at once increases risk and makes debugging harder.
- ❌ **Ignoring breaking changes** — Failing to communicate backwards-incompatible changes can break downstream systems.
- ❌ **Lack of a rollback plan** — Every release must have a clear procedure for reverting if something goes wrong.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Delivery/Release Management.md`

## Related skills

- `release-notes` — Writing clear and impactful release communication
- `breaking-changes` — Managing backwards compatibility and migration
- `rollback-recovery` — Handling failed releases
- `documentation-writing` — Maintaining changelogs and documentation
- `devops` — Core deployment and delivery pipelines
