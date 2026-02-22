# OpenCode Agent System - Core Rules

## Phase 0: Automatic Task Classification (MANDATORY - RUNS BEFORE EVERYTHING)

**CRITICAL: This gate executes BEFORE any tool call, file read, or code generation.**

Every user message MUST be classified before acting. If classification is skipped, the session is in violation.

### Classification Algorithm

```
1. PARSE request for complexity signals
2. IF any of these are true → COMPLEX:
   - Multiple files/modules/packages mentioned or implied
   - "write/create/build/implement" + "app/project/feature"
   - Tests required (explicit or implied by project conventions)
   - Architecture/design decisions needed
   - Multiple domains (e.g., Go + CLI + tests)
   - Estimated >50 lines of code
3. IF COMPLEX → DELEGATE (no user permission needed)
4. IF SIMPLE → work directly
```

### SIMPLE (work directly)
- Single file edit with known location
- Typo fix, rename, small config change
- Direct answer from existing context
- Reading/exploring code (no changes)

### COMPLEX (discovery)
- **skill-discovery** (skills): "Add tests" → load ginkgo-gomega, bdd-workflow
- **agent-discovery** (agents): "Write a Go app" → delegate to Senior-Engineer
- "Create a CLI" → load bubble-tea-expert, ui-design skills
- "Build an API" → load api-design, golang skills
- "Refactor module X" → load refactor, clean-code skills
- Any task touching 2+ files → delegate via agent-discovery

### Specialist Agent Routing Table

**MANDATORY:** When delegating, use `subagent_type=` to route to the correct specialist. Fuzzy matching via agent-discovery is the fallback only when no specialist fits with ≥70% confidence.

| Task Domain | `subagent_type=` |
|-------------|-----------------|
| Software engineering, implementation, new features, refactoring | `Senior-Engineer` |
| Testing strategy, test writing, coverage, edge cases | `QA-Engineer` |
| Code review, PR feedback, change request response | `Code-Reviewer` |
| Security audits, vulnerability assessment, auth, encryption | `Security-Engineer` |
| Architecture decisions, RFCs, trade-off analysis, design review | `Tech-Lead` |
| CI/CD, infrastructure, containers, deployment, IaC | `DevOps` |
| Documentation, READMEs, API docs, tutorials, blog posts | `Writer` |
| Data exploration, log analysis, metrics, reporting | `Data-Analyst` |
| Firmware, microcontrollers, RTOS, Arduino, ESP | `Embedded-Engineer` |
| Nix, NixOS, flakes, reproducible builds | `Nix-Expert` |
| Linux administration, configuration, troubleshooting | `Linux-Expert` |
| Monitoring, incident response, runtime operations | `SysOp` |
| Terminal recordings, demos, VHS tape generation | `VHS-Director` |
| Obsidian vault, skill docs, knowledge base sync | `Knowledge Base Curator` |
| LLM evaluation, model compatibility testing | `Model-Evaluator` |

**Fallback:** No specialist matches → use generic category (`quick`, `deep`, `writing`, `ultrabrain`) with `sisyphus-junior`.

### Delegation Execution (automatic)

1. **skill-discovery**: Identify keywords → select skills from keyword_patterns
2. **agent-discovery**: Match agent from specialist definitions (~/.config/opencode/agents/*.md)
3. Determine tier: T1 (search), T2 (implementation), T3 (architecture)
4. Identify parallelisable subtasks → fire concurrently
5. EXECUTE delegation — do NOT ask user for permission

```

### Anti-Patterns (VIOLATIONS)

❌ User says "Write a Go app" → you start writing files directly
❌ User says "Add feature X" → you ask "Should I delegate this?"
❌ Multi-step task → you work sequentially instead of parallelising
❌ Complex task → you skip classification and jump to tool calls

### DEFAULT BIAS: DELEGATE AUTOMATICALLY

When uncertain whether a task is SIMPLE or COMPLEX, classify as COMPLEX and delegate.
This rule overrides: personal familiarity, assumption direct work is faster, user phrasing making it sound simple.

---

## Change Request Verification (MANDATORY)

When addressing change requests, comments, or review feedback:

### Verification Workflow
1. **Identify** - Locate each specific request/comment
2. **Understand** - What exactly is being asked? (not assumptions)
3. **Verify** - Read the actual code to confirm change was made
4. **Document** - Show evidence that change was applied
5. **Report** - Summarize all addressed requests with line references

### Evidence Requirements
For each change request, you MUST provide:
- **File location** - `file_path:line_number` format
- **Before state** - What was there originally
- **After state** - What is there now
- **Verification** - Proof the change exists in current code
- **Status** - ADDRESSED, FALSE POSITIVE, or REJECTED (with reason)

### Handling Different Request Types

**Real Issues** (actual code/docs that need changes):
- Make the change
- Verify in code (use Read tool)
- Document with exact line references
- Mark as ADDRESSED

**False Positives** (requests for non-existent files/code):
- Verify file/code doesn't exist
- Document why it's not applicable
- Mark as FALSE POSITIVE
- Include reason (e.g., "File not in this branch")

**Rejected Requests** (working as intended):
- Verify the code works correctly
- Explain why change is NOT needed
- Document the verification
- Mark as REJECTED + reason
- Example: "Tests work correctly - verifies behavior is intentional"

### Format for Reporting
```
## Change Request Summary

### Real Issues Fixed (N of total)

**1. [Request Description]**
- File: `path/to/file.go:123`
- Change: [what was modified]
- Evidence: [verification from Read tool]
- Status: ADDRESSED

### False Positives (N of total)

**1. [Request Description]**
- Reason: [why not applicable]
- Status: FALSE POSITIVE

### Rejected Requests (N of total)

**1. [Request Description]**
- Why: [explanation]
- Status: REJECTED
```

### Skills Integration
- Use **Read tool** to verify changes in actual code
- Use **memory-keeper** to document verification process
- Use **pre-action** framework when uncertain about a request

---

## Three Pillars (MANDATORY)

1. **Always-Active Discipline** - pre-action, memory-keeper, search first
2. **Parallel Execution** - Independent tasks in single message
3. **Progressive Disclosure** - Load only what's needed

**No exceptions.**
