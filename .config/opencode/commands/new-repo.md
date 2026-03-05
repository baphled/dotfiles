---
description: Create a new repository with proper patterns
agent: sysop
---

# Create New Repository

Initialize a new project with a standardized structure, proper configuration, and essential automation. This command ensures consistency and best practices from the first commit.

## Skills Loaded

- `architecture`
- `devops`
- `automation`
- `configuration-management`
- `github-expert`

## When to Use

- Starting a new internal or open-source project
- Moving a proof of concept into a formal repository
- Creating a template or boilerplate project

## Process / Workflow

1. **Requirements Gathering**: Identify the project name, purpose, and primary technology stack.
2. **Repo Creation**: Use `gh repo create` to initialize a new repository on GitHub with the correct visibility.
3. **Project Scaffolding**: Create a standard directory structure (e.g., `src/`, `tests/`, `docs/`, `bin/`) and a `.gitignore` file.
4. **Essential Documentation**: Generate a comprehensive `README.md`, `LICENSE`, and `CONTRIBUTING.md`.
5. **CI/CD Setup**: Configure basic GitHub Actions workflows for linting, testing, and building.
6. **Automation Config**: Initialize a `Makefile` or `justfile` for common development tasks.
7. **Initial Commit**: Create the first commit with proper attribution using `make ai-commit`.
8. **Branch Protection**: Configure branch protection rules for the `main` or `master` branch.

$ARGUMENTS
