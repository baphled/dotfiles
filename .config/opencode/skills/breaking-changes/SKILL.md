---
name: breaking-changes
description: Managing backwards compatibility, deprecation, and migration strategies
category: Domain Architecture
---

# Skill: breaking-changes

## What I do

I manage the safe evolution of APIs, libraries, and systems. I provide strategies for Semantic Versioning (SemVer), multi-phase deprecation workflows, and migration patterns (Expand-Contract, Strangler Fig) to minimise disruption to consumers.

## When to use me

- Evolving public APIs or shared library interfaces
- Planning major version releases (v1 → v2)
- Modifying database schemas or message formats
- Removing deprecated features or endpoints
- Updating dependencies that introduce breaking changes

## Core principles

1. **SemVer Discipline** — MAJOR (breaking), MINOR (feature), PATCH (fix). Communicate impact clearly through versioning.
2. **Announce → Warn → Remove** — Never remove without a deprecation period. Use `Deprecated:` markers and log warnings.
3. **Expand-Contract** — Add new functionality, migrate consumers, then remove old functionality (essential for zero-downtime DB migrations).
4. **Default to Backwards-Compatible** — Prefer optional parameters with defaults or new endpoints over modifying existing ones.
5. **Fail Safe** — Ensure consumers don't crash when encountering unknown fields or deprecated endpoints.

## Patterns & examples

**Three-Phase Deprecation (Go):**
```go
// Phase 1 & 2: Announce and Warn
// Deprecated: Use GetUserV2 instead. This will be removed in v3.0.0.
func GetUser(id string) (*User, error) {
    log.Warn("GetUser is deprecated; migrate to GetUserV2")
    return GetUserV2(context.Background(), id)
}

// Phase 3: Remove in next MAJOR version.
```

**Expand-Contract SQL Pattern:**
1. **Expand**: `ALTER TABLE users ADD COLUMN full_name VARCHAR(255);` (Dual write to both).
2. **Migrate**: Backfill `full_name` from `first_name` + `last_name`.
3. **Contract**: Remove `first_name` and `last_name` columns.

**URL Versioning:**
```go
router.HandleFunc("/v1/users/{id}", h.GetUserV1)
router.HandleFunc("/v2/users/{id}", h.GetUserV2)
```

## Anti-patterns to avoid

- ❌ **Silent Breaking Changes** — Changing logic or validation rules without version bumps or notification.
- ❌ **Immediate Removal** — Deleting code without a deprecation phase; breaks all dependent builds.
- ❌ **Breaking Internal APIs Carelessly** — Shared internal libraries deserve the same respect as public APIs.
- ❌ **Inconsistent Versioning** — Mixing major version bumps with minor feature additions.
- ❌ **Missing Migration Guides** — Forcing consumers to reverse-engineer how to move to the new version.

## Related skills

- `api-design` — Designing APIs that are easy to evolve
- `release-management` — Managing the release lifecycle of versions
- `dependency-management` — Handling breaking changes from upstream sources
- `feature-flags` — Using toggles to manage the transition between versions
