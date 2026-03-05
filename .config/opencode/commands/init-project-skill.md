---
description: Initialize a new project with complete automation setup
agent: sysop
---

# Create Project Automation Skill

Generate reusable project automation skills for specific workflows and project-specific tasks. This command creates a complete package with testing and documentation.

## Skills Loaded

- `new-skill`
- `automation`
- `scripter`
- `documentation-writing`
- `bdd-workflow`

## When to Use

- Creating a new specialized skill for project-specific operations
- Automating complex multi-step workflows with a single command
- Packaging internal tools and procedures as reusable skills

## Process / Workflow

1. **Skill Design**: Define the skill name, purpose, and required tool integrations.
2. **Directory Structure**: Create the skill directory and initialize essential files (`skill.yaml`, `README.md`).
3. **Tool Implementation**: Define the automation workflows and tool interactions within the skill.
4. **Testing Strategy**: Implement unit and integration tests using `bdd-workflow` patterns.
5. **Documentation**: Write clear usage guides, examples, and troubleshooting steps in the skill's `README.md`.
6. **Project Integration**: Configure the project to auto-load the new skill for relevant agents.
7. **Verification**: Run a manual dry run and automated tests to ensure correctness.
8. **Finalisation**: Commit the new skill to the repository with the `feat:` prefix.

$ARGUMENTS
