---
name: core-auto-detect
description: Automatic environment detection and skill activation based on context
category: Session Knowledge
---

# Skill: core-auto-detect

## What I do

I detect project environments by scanning root-level files and recommend appropriate skills to load. I enable agents to automatically activate domain expertise without explicit user configuration, reducing context switching and improving workflow efficiency.

## When to use me

- Starting a new development session in an unfamiliar project
- Determining which skills to load based on project type
- Automating skill selection in CI/CD or batch workflows
- Reducing manual skill specification overhead
- Ensuring consistent skill recommendations across team workflows

## Core principles

1. **File-presence detection** — Identify project type by checking for standard configuration files in root directory only (no recursive scanning)
2. **Skill mapping** — Each detected environment maps to a curated set of recommended skills that provide immediate value
3. **Non-invasive** — Detection is read-only, requires no network calls, and completes in milliseconds
4. **Composable** — Multiple detections can fire simultaneously (e.g., Go project with GitHub Actions loads both golang and github-expert)

## Detection rules & skill recommendations

### Go Projects
**Detection:** `go.mod` exists in root directory

**Recommended skills:**
- `golang` — Go idioms, patterns, concurrency, error handling
- `ginkgo-gomega` — BDD testing framework for Go
- `clean-code` — SOLID principles applied to Go
- `concurrency` — Goroutines, channels, sync primitives (if concurrent code detected)

**Example:** Project with `go.mod` → load golang, ginkgo-gomega, clean-code

### Node.js / JavaScript Projects
**Detection:** `package.json` exists in root directory

**Recommended skills:**
- `javascript` — ES6+, async patterns, Node.js idioms
- `jest` — Testing framework for JavaScript/TypeScript
- `clean-code` — Naming, function size, SOLID in JavaScript

**Example:** Project with `package.json` → load javascript, jest, clean-code

### Ruby Projects
**Detection:** `Gemfile` exists in root directory

**Recommended skills:**
- `ruby` — Ruby idioms, RubyGems, Rails patterns
- `rspec-testing` — RSpec BDD testing framework
- `clean-code` — Ruby-specific naming and patterns

**Example:** Project with `Gemfile` → load ruby, rspec-testing, clean-code

### Python Projects
**Detection:** `pyproject.toml` OR `setup.py` exists in root directory

**Recommended skills:**
- `python` — Python idioms, async patterns, package management
- `clean-code` — Naming conventions, function design

**Example:** Project with `pyproject.toml` → load python, clean-code

### Embedded / Microcontroller Projects
**Detection:** `platformio.ini` exists in root directory

**Recommended skills:**
- `cpp` — C++ for embedded systems, Arduino, ESP8266/ESP32
- `platformio` — PlatformIO build system and workflows
- `embedded-testing` — Hardware-in-the-loop testing patterns

**Example:** Project with `platformio.ini` → load cpp, platformio, embedded-testing

### Rust Projects
**Detection:** `Cargo.toml` exists in root directory

**Recommended skills:**
- `rust` — Rust idioms, ownership, error handling (if available)
- `clean-code` — Rust-specific patterns

**Example:** Project with `Cargo.toml` → load rust, clean-code

### Nix / NixOS Projects
**Detection:** `flake.nix` OR `shell.nix` exists in root directory

**Recommended skills:**
- `nix` — Nix package manager, flakes, reproducible builds
- `devops` — Infrastructure as code patterns

**Example:** Project with `flake.nix` → load nix, devops

### CI/CD / GitHub Actions
**Detection:** `.github/workflows/` directory exists in root directory

**Recommended skills:**
- `github-expert` — GitHub Actions, workflows, CI/CD best practices
- `devops` — CI/CD pipelines, infrastructure automation
- `automation` — Eliminating repetitive tasks

**Example:** Project with `.github/workflows/` → load github-expert, devops, automation

### Build Automation
**Detection:** `Makefile` exists in root directory

**Recommended skills:**
- `automation` — Build automation, task elimination
- `scripter` — Bash scripting for build tasks

**Example:** Project with `Makefile` → load automation, scripter

## Patterns & examples

### Single-language project
```
Project structure:
  go.mod
  go.sum
  main.go
  
Detection fires: Go project detected
Recommended skills: golang, ginkgo-gomega, clean-code
```

### Polyglot project with CI/CD
```
Project structure:
  go.mod
  package.json
  .github/workflows/test.yml
  Makefile
  
Detection fires: Go project, Node.js project, GitHub Actions, Build automation
Recommended skills: golang, ginkgo-gomega, javascript, jest, github-expert, devops, automation, clean-code
```

### Embedded project with build system
```
Project structure:
  platformio.ini
  Makefile
  
Detection fires: Embedded project, Build automation
Recommended skills: cpp, platformio, embedded-testing, automation, scripter
```

## Anti-patterns to avoid

- ❌ **Recursive filesystem scanning** — Slow and unnecessary; check root directory only
- ❌ **Network calls during detection** — Detection must be instant and offline
- ❌ **Recommending skills for non-existent files** — Only recommend if file is confirmed present
- ❌ **Over-recommending skills** — Suggest 2-4 core skills per environment, not 10+
- ❌ **Ignoring skill composition** — `clean-code` applies to all languages; include it in every recommendation

## Related skills

- `clean-code` — Applies across all detected environments
- `automation` — Complements build system detection
- `devops` — Complements CI/CD detection
- `critical-thinking` — For evaluating when to trust auto-detection vs manual selection
