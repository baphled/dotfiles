---
name: bubble-tea-testing
description: Testing Bubble Tea TUI applications
category: Testing BDD
---

# Skill: bubble-tea-testing

## What I do

I provide Bubble Tea testing expertise: testing Update logic with simulated messages, verifying View output, testing commands, component integration tests, and using teatest for program-level testing.

## When to use me

- Unit testing Bubble Tea model Update logic
- Verifying View output contains expected content
- Testing tea.Cmd return values and side effects
- Integration testing composed components
- Using teatest for full program simulation

## Core principles

1. **Test Update directly** - Feed messages to Update, assert on returned model
2. **View is pure** - Test View output as string matching
3. **Commands are testable** - Commands return messages; test the message type
4. **Isolate components** - Test child components independently before composition
5. **Golden files for complex views** - Use teatest golden files for visual regression

## Patterns & examples

**Testing Update logic:**
```go
func TestModelUpdate(t *testing.T) {
  g := gomega.NewWithT(t)
  m := initialModel()

  // Simulate pressing "down" key
  updated, cmd := m.Update(tea.KeyMsg{Type: tea.KeyDown})
  result := updated.(model)

  g.Expect(result.cursor).To(gomega.Equal(1))
  g.Expect(cmd).To(gomega.BeNil())
}

func TestQuitOnCtrlC(t *testing.T) {
  g := gomega.NewWithT(t)
  m := initialModel()

  _, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlC})

  // tea.Quit returns a special quit message
  g.Expect(cmd).NotTo(gomega.BeNil())
}
```

**Testing View output:**
```go
func TestViewShowsCursor(t *testing.T) {
  g := gomega.NewWithT(t)
  m := model{
    cursor:  1,
    choices: []string{"Alpha", "Beta", "Gamma"},
    selected: map[int]struct{}{},
  }

  view := m.View()

  g.Expect(view).To(gomega.ContainSubstring("> Beta"))
  g.Expect(view).NotTo(gomega.ContainSubstring("> Alpha"))
}

func TestViewShowsSelectedItems(t *testing.T) {
  g := gomega.NewWithT(t)
  m := model{
    cursor:  0,
    choices: []string{"Alpha", "Beta"},
    selected: map[int]struct{}{0: {}},
  }

  view := m.View()

  g.Expect(view).To(gomega.ContainSubstring("[x] Alpha"))
  g.Expect(view).To(gomega.ContainSubstring("[ ] Beta"))
}
```

**Testing with teatest (program-level):**
```go
func TestFullProgram(t *testing.T) {
  m := initialModel()
  tm := teatest.NewModel(t, m, teatest.WithInitialTermSize(80, 24))

  // Send key sequence
  tm.Send(tea.KeyMsg{Type: tea.KeyDown})
  tm.Send(tea.KeyMsg{Type: tea.KeyEnter})
  tm.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})

  // Wait for program to finish
  tm.WaitFinished(t, teatest.WithFinalTimeout(time.Second))

  // Assert final output
  out := tm.FinalOutput(t)
  if !strings.Contains(string(out), "[x]") {
    t.Error("expected selected item in output")
  }
}
```

**Testing commands that return messages:**
```go
func TestFetchStatusCommand(t *testing.T) {
  g := gomega.NewWithT(t)
  m := initialModel()

  // Trigger the command
  _, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("r")})
  g.Expect(cmd).NotTo(gomega.BeNil())

  // Execute the command and check the message type
  msg := cmd()
  _, isStatus := msg.(statusMsg)
  _, isErr := msg.(errMsg)
  g.Expect(isStatus || isErr).To(gomega.BeTrue())
}
```

## Anti-patterns to avoid

- ❌ Testing via terminal output only (test Update logic directly first)
- ❌ Skipping View tests (rendering bugs are common)
- ❌ Testing Lip Gloss styling in unit tests (test content, not colours)
- ❌ Large integration tests without unit coverage (pyramid: many unit, few integration)
- ❌ Ignoring command return values (commands drive async behaviour)

## Related skills

- `bubble-tea-expert` - Bubble Tea framework patterns being tested
- `ginkgo-gomega` - BDD framework for structuring Bubble Tea tests
- `gomock` - Mocking dependencies in Bubble Tea components
- `golang` - Core Go testing idioms
