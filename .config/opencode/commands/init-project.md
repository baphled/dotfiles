---
description: Initialize a new project with all essential configuration files
agent: sysop
---

# Initialize New Project

Create new project with complete CI/CD setup and automation.

## Creates

- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/release.yml` - Release pipeline
- `.git-hooks/pre-commit` - Pre-commit validation
- `.git-hooks/commit-msg` - Commit message linting
- `.commitlintrc.json` - Conventional commits config
- `.releaserc.json` - Semantic release config
- `CHANGELOG.md` - Release notes
- `Makefile` - Build automation
- `.gitignore` - Ignore patterns
- `README.md` - Project documentation
- `AGENTS.md` - AI agent instructions

## Project Type Detection

- **Go:** `go.mod` or `*.go` files
- **Node.js:** `package.json` or `node_modules`
- **Python:** `requirements.txt`, `pyproject.toml`, `*.py`
- **Mixed:** Multiple languages

$ARGUMENTS
