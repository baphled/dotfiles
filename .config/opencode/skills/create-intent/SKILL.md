---
name: create-intent
description: Create a new intent with proper subdirectory structure following architecture
category: Workflow Orchestration
---

# Skill: create-intent

## What I do

I guide creating new intents in the KaRiya TUI architecture: the correct directory structure, naming conventions, state machine pattern, and screen integration. Intents are the workflow orchestrators.

## When to use me

- Adding a new user workflow to the application
- Creating a multi-step process (wizard, form flow)
- Building a new feature entry point
- Implementing a CRUD workflow for a domain entity

## Core principles

1. **Intents orchestrate** - They manage state transitions, not business logic
2. **One intent per workflow** - Each user journey gets its own intent
3. **State machine pattern** - Explicit states with clear transitions
4. **Screens are views** - Intent owns state, screen renders it
5. **Naming convention** - Verb+noun: `browsetimeline`, `captureevent`, `editsummary`

## Directory structure

```
internal/cli/intents/<intentname>/
    intent.go           # State machine, Update/View dispatch
    intent_test.go      # Intent behaviour tests
    states.go           # State enum and transitions
    states_test.go      # State transition tests
```

## Patterns & examples

**Intent skeleton:**
```go
package intentname

import (
    tea "github.com/charmbracelet/bubbletea"
)

type IntentState int

const (
    StateLoading IntentState = iota
    StateList
    StateDetail
    StateError
)

type Intent struct {
    state  IntentState
    screen tea.Model
    // dependencies injected via constructor
    service *service.MyService
}

func New(svc *service.MyService) *Intent {
    return &Intent{
        state:   StateLoading,
        service: svc,
    }
}

func (i *Intent) Init() tea.Cmd {
    return i.loadData
}

func (i *Intent) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch i.state {
    case StateLoading:
        return i.handleLoading(msg)
    case StateList:
        return i.handleList(msg)
    }
    return i, nil
}

func (i *Intent) View() string {
    if i.screen != nil {
        return i.screen.View()
    }
    return ""
}
```

**State transitions:**
```
Loading → List (data loaded)
Loading → Error (load failed)
List → Detail (item selected)
Detail → List (back pressed)
List → Done (quit)
```

**Naming conventions:**
```
browsetimeline   - Browse/list workflow
captureevent     - Create/capture workflow  
editsummary      - Edit/modify workflow
managesettings   - Settings/config workflow
reviewfeedback   - Review/approval workflow
```

**Registration (wire into app):**
```go
// In app router or intent registry
intents.Register("browsetimeline", func(deps *Dependencies) tea.Model {
    return browsetimeline.New(deps.TimelineService)
})
```

## Anti-patterns to avoid

- ❌ Business logic in the intent (delegate to service layer)
- ❌ Direct repository access from intent (use service layer)
- ❌ Giant switch statements (extract state handlers to methods)
- ❌ Shared mutable state between intents (each is independent)
- ❌ Skipping the test file (intent state transitions are critical to test)

## Related skills

- `create-screen` - Screen components that intents display
- `bubble-tea-expert` - Bubble Tea framework patterns
- `architecture` - Layer boundaries intents must respect
- `bdd-workflow` - TDD for intent state machines
- `service-layer` - Business logic intents delegate to
