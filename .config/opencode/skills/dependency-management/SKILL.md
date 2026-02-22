---
name: dependency-management
description: Manage Go modules safely - version constraints, security patches
category: General Cross Cutting
---

# Skill: dependency-management

## What I do

I provide expertise in managing Go modules and project dependencies. I focus on keeping dependencies secure, minimal, and reproducible through careful versioning and hygiene.

## When to use me

- When adding new third-party packages to the project
- When upgrading dependencies to address security vulnerabilities
- When cleaning up unused modules and ensuring `go.mod` reflects actual usage

## Core principles

1. **Hygiene**: Regularly run `go mod tidy` to remove unused dependencies and keep the module file clean.
2. **Reproducibility**: Ensure `go.sum` is always accurate and committed to version control.
3. **Security**: Proactively check for vulnerabilities using tools like `govulncheck`.
4. **Minimalism**: Only add dependencies when they provide significant value over a standard library implementation.

## Patterns & examples

**Updating dependencies:**
To upgrade a specific package to the latest version:
```bash
go get github.com/user/project@latest
go mod tidy
```

**Using the replace directive:**
Use `replace` for local development or patching dependencies until an official fix is released:
```text
replace github.com/user/project => ../local-path
```

**Checking for vulnerabilities:**
Run `govulncheck ./...` to scan your project and its dependencies for known security issues.

**Vendoring:**
If the project requires offline builds, use `go mod vendor` to keep a local copy of all dependencies in the `vendor` directory.

## Anti-patterns to avoid

- ❌ **Dependency bloat**: Adding large frameworks for trivial tasks. Evaluate the cost of maintenance before adding any new module.
- ❌ **Unverified versions**: Avoid using unstable "master" or "main" branches. Always pin to a specific tagged version or commit hash.
- ❌ **Manual go.mod editing**: Avoid editing the module file directly. Use Go commands to ensure the checksum database remains consistent.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/General-Cross-Cutting/Dependency Management.md`

## Related skills

- `golang`: For understanding package structure and imports
- `security`: For principles of vulnerability management
- `automation`: For setting up CI/CD checks on dependency health
