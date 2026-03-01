# Orchestrator Compliance Verification System

## Overview

This system verifies that orchestrators (sisyphus, hephaestus, atlas, Tech-Lead) follow the **100% Delegation Rule**. It analyses session transcripts, detects violations, and generates compliance reports.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE VERIFICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────────┐  │
│  │   Session    │───▶│   Analyser    │───▶│    Reporter     │  │
│  │  Transcript  │    │               │    │                 │  │
│  └──────────────┘    └───────────────┘    └─────────────────┘  │
│         │                    │                     │            │
│         │                    ▼                     ▼            │
│         │           ┌───────────────┐    ┌─────────────────┐   │
│         │           │  Tool Call    │    │   Formatted     │   │
│         │           │  Classifier   │    │   Report        │   │
│         │           └───────────────┘    └─────────────────┘   │
│         │                    │                                  │
│         ▼                    ▼                                  │
│  ┌──────────────┐    ┌───────────────┐                         │
│  │  Anti-Pattern│    │  Bash Command │                         │
│  │  Detector    │    │  Analyser     │                         │
│  └──────────────┘    └───────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Compliance Checker (`plugins/lib/compliance-checker.ts`)

The core analysis module that:
- Classifies tool calls as COMPLIANT, VIOLATION, or WARNING
- Analyses bash commands for permitted vs forbidden patterns
- Detects anti-patterns like "Quick Fix Trap" and "Investigation Overreach"
- Generates recommendations based on violations
- Produces formatted compliance reports

### 2. BDD Feature Spec (`specs/orchestrator-compliance.feature`)

Gherkin specification documenting all compliance scenarios:
- Tool whitelist compliance (delegation, memory, system, verification tools)
- Tool blacklist violations (framework-blocked, investigation, LSP overreach)
- Delegation pattern violations (bypass, static skill injection)
- Anti-pattern detection (quick fix trap, investigation overreach)
- Compliance reporting requirements

### 3. Test Suite (`tests/compliance-checker.test.ts`)

Comprehensive BDD-style tests covering:
- Orchestrator identification
- Tool whitelist compliance
- Tool blacklist violations
- Bash command analysis
- Anti-pattern detection
- Session analysis
- Report generation
- Edge cases

### 4. CLI Tool (`scripts/check-orchestrator-compliance.ts`)

Command-line interface for running compliance checks:
- Analyse sessions from stdin
- JSON or formatted text output
- Integration with MCP session tools

## Tool Classification

### Whitelisted Tools (Orchestrators MAY use)

| Category | Tools | Purpose |
|----------|-------|---------|
| **Delegation** | `task()`, `mcp_call_omo_agent` | Spawn subagent work |
| **Memory** | `mcp_memory_*`, `mcp_vault-rag_query_vault` | Knowledge graph access |
| **System** | `mcp_provider-health`, `mcp_skill`, `mcp_todowrite`, `mcp_background_*` | Coordination |
| **Verify** | `mcp_bash` (binary only), `mcp_lsp_diagnostics` | Pass/fail checks |

### Blacklisted Tools (Orchestrators MUST NOT use)

| Category | Tools | Violation Type |
|----------|-------|----------------|
| **Framework-blocked** | `mcp_edit`, `mcp_write` | `framework-blocked` |
| **Investigation** | `mcp_read`, `mcp_glob`, `mcp_grep`, `mcp_ast_grep_*` | `investigation-overreach` |
| **LSP** | `mcp_lsp_goto_definition`, `mcp_lsp_find_references`, etc. | `lsp-overreach` |
| **Bash Investigation** | `cat`, `grep`, `git log`, `find`, `ls -la`, etc. | `bash-investigation` |
| **Bash Modification** | `sed`, `awk`, `mv`, `cp`, `rm`, etc. | `bash-modification` |

### Permitted Bash Commands

Only these bash commands are allowed for orchestrators:
- `make build`
- `make test`
- `make lint`
- `make check-compliance`
- `git status`

## Violation Types

| Type | Description | Suggested Action |
|------|-------------|------------------|
| `framework-blocked` | Edit/write tools blocked by permission gates | Delegate to worker agent |
| `investigation-overreach` | Read/glob/grep used without delegation | Delegate to explore agent |
| `bash-investigation` | Bash used for reading/searching files | Delegate to explore agent |
| `bash-modification` | Bash used for modifying files | Delegate to worker agent |
| `delegation-bypass` | File modified without prior task() call | Delegate implementation |
| `static-skill-injection` | Non-empty load_skills in task() | Use load_skills=[] |
| `lsp-overreach` | LSP tools (except diagnostics) used | Delegate to explore agent |

## Anti-Pattern Detection

### Quick Fix Trap

Detected when orchestrator says things like:
- "just a typo"
- "only one line"
- "quick fix"
- "simple change"
- "too simple to delegate"

And then uses a blacklisted tool.

### Investigation Overreach

Detected when orchestrator says things like:
- "let me check"
- "let me look at"
- "I need to understand"
- "let me see what"

And then uses investigation tools (read, glob, grep).

## Usage

### Programmatic (Recommended)

```typescript
import {
  analyseSession,
  formatReport,
  type SessionMessage,
} from './plugins/lib/compliance-checker'

// Prepare messages
const messages: SessionMessage[] = [
  { role: 'user', content: 'Fix the bug', timestamp: '...' },
  { role: 'assistant', content: '[tool: task]', timestamp: '...' },
]

// Analyse session
const report = analyseSession('session-123', 'sisyphus', messages)

// Output report
console.log(formatReport(report))

// Check for violations
if (report.overallStatus === 'VIOLATION') {
  console.error('Compliance violations detected!')
  process.exit(1)
}
```

### CLI (Stdin Mode)

```bash
# From session transcript file
cat session.txt | bun run scripts/check-orchestrator-compliance.ts --stdin

# Get JSON output
cat session.txt | bun run scripts/check-orchestrator-compliance.ts --stdin --json

# Show help
bun run scripts/check-orchestrator-compliance.ts --help
```

### Integration with MCP Session Tools

```typescript
// Within OpenCode agent context

// 1. List recent sessions
const sessions = await mcp_session_list({ limit: 10 })

// 2. Read a specific session
const transcript = await mcp_session_read({ session_id: 'ses_xxx' })

// 3. Analyse (implementation would parse transcript)
// Note: The compliance-checker module needs session transcript parsing
```

## Compliance Report Structure

```typescript
interface ComplianceReport {
  sessionId: string
  agent: string
  timestamp: string
  overallStatus: 'COMPLIANT' | 'VIOLATION' | 'WARNING'
  complianceScore: number      // 0-100%
  totalCalls: number
  compliantCalls: number
  violationCount: number
  warningCount: number
  results: ComplianceResult[]  // Per-tool-call results
  antiPatterns: AntiPattern[]  // Detected anti-patterns
  recommendations: string[]    // Actionable suggestions
}
```

## Report Example

```
═══════════════════════════════════════════════════════════════════
                    ORCHESTRATOR COMPLIANCE REPORT
═══════════════════════════════════════════════════════════════════

Session ID: ses_abc123
Agent: sisyphus
Generated: 2026-02-26T14:00:00Z

─────────────────────────────────────────────────────────────────
                           SUMMARY
─────────────────────────────────────────────────────────────────

Overall Status: ❌ VIOLATION
Compliance Score: 50%

Total Tool Calls: 4
  ✅ Compliant: 2
  ❌ Violations: 2
  ⚠️  Warnings: 0

─────────────────────────────────────────────────────────────────
                        VIOLATION DETAILS
─────────────────────────────────────────────────────────────────

1. ❌ [VIOLATION] mcp_read
   Type: investigation-overreach
   Reason: mcp_read is an investigation tool
   Action: delegate to explore agent

2. ❌ [VIOLATION] mcp_edit
   Type: framework-blocked
   Reason: mcp_edit is blocked by framework permission gates
   Action: delegate to worker agent

─────────────────────────────────────────────────────────────────
                    ANTI-PATTERNS DETECTED
─────────────────────────────────────────────────────────────────

1. 🚨 Quick Fix Trap
   Trigger: "just a typo"
   Led to: mcp_edit

─────────────────────────────────────────────────────────────────
                       RECOMMENDATIONS
─────────────────────────────────────────────────────────────────

1. Framework-blocked tools (edit/write) detected. These should be 
   delegated to worker agents like Senior-Engineer or QA-Engineer.

2. Investigation tools (read/glob/grep) were used directly. 
   Delegate these to the explore agent: 
   task(subagent_type="explore", prompt="...")

═══════════════════════════════════════════════════════════════════
```

## Running Tests

```bash
# Run all compliance checker tests
bun test tests/compliance-checker.test.ts

# Run with verbose output
bun test tests/compliance-checker.test.ts --verbose

# Run specific test suite
bun test tests/compliance-checker.test.ts -t "Tool Blacklist"
```

## Integration Checklist

- [x] Core compliance checker module
- [x] BDD feature specification
- [x] Comprehensive test suite
- [x] CLI tool for manual checks
- [x] Documentation
- [ ] MCP session tool integration (requires session-read parsing)
- [ ] Automated CI/CD integration
- [ ] Makefile target for compliance checks

## Related Files

- `specs/rigid-orchestrator-v1.md` - Original orchestrator specification
- `AGENTS.md` - Golden Rule and tool restrictions
- `oh-my-opencode.jsonc` - Permission gate configuration
