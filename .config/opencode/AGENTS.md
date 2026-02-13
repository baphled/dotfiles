# OpenCode Agent System - Mandatory Requirements

## Commit Rules (MANDATORY - NO EXCEPTIONS)

**CRITICAL:** All commits MUST follow the hybrid git_master workflow:

### Hybrid Workflow: git_master Planning + make ai-commit Execution

1. **Use git_master skill for PLANNING:**
   - Atomic commit splitting (3+ files → 2+ commits minimum)
   - Style detection from git log history
   - Dependency ordering (utilities → models → services → endpoints)
   - Test pairing (implementation + test in same commit)

2. **For NEW COMMITS:**
   - Write commit message to `/tmp/commit.txt`
   - Run: `make ai-commit FILE=/tmp/commit.txt`
   - This adds `AI-Generated-By: Opencode (Model)` and `Reviewed-By: <name>` trailers
   - NEVER use raw `git commit -m` for new commits

3. **For FIXUP COMMITS:**
   - Use `git commit --fixup=<hash>` directly
   - Fixups get squashed via `git rebase -i --autosquash`, no attribution needed

4. **BEFORE first commit in session:**
   - Run `make check-compliance`
   - Ensure tests pass and coverage ≥ 95%

**Why this is MANDATORY:**
- Ensures proper attribution of AI-generated code (via make ai-commit)
- Maintains audit trail of which AI assisted
- Required for legal and transparency compliance
- Leverages git_master's superior atomic splitting and style detection

**If you use raw `git commit -m` for new commits, you have violated a critical rule.**

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

## Model Routing (MANDATORY)

**All task delegations MUST consider model routing.** Match task complexity to model tier, then select provider.

### Providers

| Provider | Auth | Billing | Preferred For |
|----------|------|---------|---------------|
| **GitHub Copilot** (preferred) | `/connect` device flow | Subscription ($10/mo Pro, 300 requests) | All Tier 1 + Tier 2 work |
| **Anthropic** (fallback) | API key | Per-token | Tier 3 (Opus), overflow, batch |

### Three-Tier System

| Tier | When | Anthropic Model | Copilot Model |
|------|------|-----------------|---------------|
| **T1 (Lightweight)** | Trivial, quick, exploration, parallel search | `anthropic/claude-haiku-4-5` | `copilot/gpt-4o-mini` |
| **T2 (Balanced)** | Implementation, debugging, testing, writing — **DEFAULT** | `anthropic/claude-sonnet-4-5` | `copilot/gpt-4o` |
| **T3 (Premium)** | Architecture, ultrabrain, artistry, novel problems | `anthropic/claude-opus-4-5` | `copilot/o3-mini` |

### Category → Tier Mapping

| Category | Tier | Default Provider |
|----------|------|-----------------|
| trivial, quick, unspecified-low | T1 | Copilot |
| deep, visual-engineering, writing, unspecified-high | T2 | Copilot |
| ultrabrain, artistry | T3 | Anthropic (Opus) |

### Agent Type → Tier

| Agent | Tier | Reasoning |
|-------|------|-----------|
| explore, librarian | T1 | Search/gather — cheap and fast |
| build, general | T2 | Execution — needs balanced capability |
| oracle | T3 | Complex reasoning — needs premium |

### Provider Selection Rules

1. **Default: Copilot** — Use for all T1 and T2 work (subscription absorbs cost)
2. **Anthropic for T3** — Opus not available on Copilot Pro (needs Pro+)
3. **Overflow** — If Copilot 300 requests exhausted, fall back to Anthropic direct
4. **Cross-provider fallback** — If one provider is down, try same-tier model from other

### Delegation Examples

```typescript
// Tier 1 — exploration (Copilot preferred)
task(subagent_type="explore", model="copilot/gpt-4o-mini", run_in_background=true)
task(subagent_type="librarian", model="copilot/gpt-4o-mini", run_in_background=true)

// Tier 2 — implementation (Copilot preferred)
task(category="deep", model="copilot/gpt-4o", load_skills=["clean-code"])
task(category="visual-engineering", model="copilot/claude-sonnet-4-5", load_skills=["frontend-ui-ux"])

// Tier 3 — complex reasoning (Anthropic for Opus)
task(category="ultrabrain", model="anthropic/claude-opus-4-5", load_skills=["architecture"])

// Tier 3 — reasoning via Copilot (o3-mini available on Pro)
task(category="artistry", model="copilot/o3-mini", load_skills=["design-patterns"])

// Parallel pattern: 3×T1 + 1×T2
task(subagent_type="explore", model="copilot/gpt-4o-mini", run_in_background=true)  // T1
task(subagent_type="explore", model="copilot/gpt-4o-mini", run_in_background=true)  // T1
task(subagent_type="librarian", model="copilot/gpt-4o-mini", run_in_background=true) // T1
task(category="deep", model="copilot/gpt-4o", run_in_background=false)               // T2
```

### Copilot Pro Constraints

- **Available:** GPT-4o-mini (T1), GPT-4o (T2), Claude Sonnet (T2), o3-mini (T3)
- **NOT available:** Claude Opus (Pro+), o1 (Pro+)
- **Monthly limit:** 300 premium requests — track usage
- **When exhausted:** Fall back to Anthropic direct API

### Red Flags

- ❌ Using T1 (Haiku/GPT-4o-mini) for code generation or architecture
- ❌ Using T3 (Opus) for trivial tasks or finding references
- ❌ Using T2 (Sonnet) for simple typos or parallel exploration
- ❌ Using Copilot for Opus-class work (not available on Pro)

### Escalation

- **T1 → T2:** Task fails, insufficient reasoning, hallucinations
- **T2 → T3:** Problem too abstract, multiple contradictory solutions, stuck after debugging
- **Cross-provider:** Try equivalent model from other provider if one struggles

### Reference Documents

- Model Routing Strategy — Full strategic framework
- Model Routing Implementation — Implementation roadmap with checkboxes
- Model Selection Guide — Capability comparison
- All in Obsidian vault: `3. Resources/Tech/OpenCode/`

---

## Three Pillars (MANDATORY)

1. **Always-Active Discipline** - pre-action, memory-keeper, search first
2. **Parallel Execution** - Independent tasks in single message
3. **Progressive Disclosure** - Load only what's needed

**No exceptions.**
