---
description: Create a new intent with proper architecture
agent: senior-engineer
---

# Create New Intent

Create a new intent following established architecture patterns. This command guides the setup of a new user workflow, ensuring all necessary components and directory structures are correctly implemented.

## Skills Loaded

- `create-intent` — Intent orchestrator patterns and state machines
- `architecture` — Layer boundaries and dependency direction
- `clean-code` — Legible and maintainable implementation

## When to Use

- Adding a new user workflow to the application
- Creating a multi-step process like a wizard or form flow
- Implementing a CRUD workflow for a new domain entity
- Building an entry point for a new feature

## Process / Workflow

1. **Information Gathering**: Identify the intent name and purpose. Use the verb+noun convention (e.g., `captureevent`).
2. **Directory Structure**: Create the internal directory structure under `internal/cli/intents/<intentname>/`.
3. **Core Files**: Implement the following files based on existing patterns:
   - `intent.go`: Orchestrates state transitions and dispatching.
   - `states.go`: Defines the intent state machine enum and transitions.
   - `intent_test.go`: Behavioural tests for the intent logic.
   - `states_test.go`: Tests for state transitions.
4. **Internal Components**: Develop the necessary sub-packages:
   - `domain/`: Entities and value objects for the workflow.
   - `service/`: Business logic the intent delegates to.
   - `repository/`: Persistence interfaces and implementations.
   - `handler/`: Input processing and transport logic.
5. **Initialiser Function**: Implement the `New()` function to inject dependencies and set the initial state.
6. **Architecture Verification**: Run `make check-compliance` to ensure the new intent respects layer boundaries.
7. **Intent Registration**: Wire the new intent into the application router or registry.
8. **Final Testing**: Ensure all tests pass and the new workflow is accessible.

$ARGUMENTS
