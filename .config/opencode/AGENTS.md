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
   - Write commit message to `tmp/commit.txt`
   - Run: `make ai-commit FILE=tmp/commit.txt`
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

| Provider                     | Auth                   | Billing                                 | Preferred For                  |
| ---------------------------- | ---------------------- | --------------------------------------- | ------------------------------ |
| **OpenCode Zen** (preferred) | Built-in               | Free                                    | All Tier 1 + Tier 2 work       |
| **GitHub Copilot**           | `/connect` device flow | Subscription ($10/mo Pro, 300 requests) | Tier 2 + Tier 3                |
| **Anthropic** (fallback)     | API key                | Per-token                               | Tier 3 (Opus), overflow, batch |

### Three-Tier System

| Tier                 | When                                                      | Anthropic Model              | Copilot Model             | OpenCode Zen                                        |
| -------------------- | --------------------------------------------------------- | ---------------------------- | ------------------------- | --------------------------------------------------- |
| **T1 (Lightweight)** | Trivial, quick, exploration, parallel search              | `anthropic/claude-haiku-4-5` | `copilot/gpt-5-mini`      | `opencode/gpt-5-nano`, `opencode/minimax-m2.5-free` |
| **T2 (Balanced)**    | Implementation, debugging, testing, writing — **DEFAULT** | `anthropic/claude-sonnet-4`  | `copilot/gpt-5`           | `opencode/big-pickle`, `opencode/kimi-k2.5-free`    |
| **T3 (Premium)**     | Architecture, ultrabrain, artistry, novel problems        | `anthropic/claude-opus-4-6`  | `copilot/claude-opus-4.6` | —                                                   |

### Category → Tier Mapping

| Category                                            | Tier | Default Provider |
| --------------------------------------------------- | ---- | ---------------- |
| trivial, quick, unspecified-low                     | T1   | Copilot          |
| deep, visual-engineering, writing, unspecified-high | T2   | Copilot          |
| ultrabrain, artistry                                | T3   | Anthropic (Opus) |

### Agent Type → Tier

| Agent | Tier | Reasoning |
|-------|------|-----------|
| explore, librarian | T1 | Search/gather — cheap and fast |
| build, general | T2 | Execution — needs balanced capability |
| oracle | T3 | Complex reasoning — needs premium |

### Provider Selection Rules

1. **Default: OpenCode Zen** — Use free models for T1 and T2 work first
2. **GitHub Copilot for T2/T3** — Subscription-based, use for balanced and premium work
3. **Anthropic for T3** — Direct API for premium Claude Opus work
4. **Overflow** — If OpenCode Zen rate limited, fall back to Copilot; if Copilot exhausted, fall back to Anthropic
5. **Cross-provider fallback** — If one provider is down, try same-tier model from other
6. **Automatic failover on rate limit** — If primary provider returns 429 or 503, immediately switch to next healthy provider in same tier
7. **Tier degradation** — If all providers in current tier are unhealthy, degrade to next lower tier (T3→T2→T1→T0)
8. **Ollama local fallback** — Ollama serves as T0 last-resort fallback, always available when other providers are exhausted

### Provider Failover

When a provider becomes rate-limited or unhealthy, the system automatically switches to the next available provider in the fallback chain for that tier. This ensures uninterrupted service without manual intervention.

#### Fallback Chains by Tier

| Tier   | Primary                 | Secondary          | Tertiary                             | Fallback |
| ------ | ----------------------- | ------------------ | ------------------------------------ | -------- |
| **T1** | OpenCode gpt-5-nano     | Copilot gpt-5-mini | Anthropic Haiku                      | T0       |
| **T2** | OpenCode big-pickle     | Copilot gpt-5      | Anthropic Sonnet                     | T0       |
| **T3** | Copilot claude-opus-4.6 | Anthropic Opus     | OpenCode big-pickle (T2 degradation) | T0       |
| **T0** | Ollama llama3.2:1b      | Ollama phi4        | —                                    | None     |

**Note:** Local Ollama models (T0) are lightweight and fast but do NOT support tools/MCP. Use cloud providers when tools are required.

#### Health State Tracking

The system tracks rate-limited providers with expiry timestamps. When a provider hits a rate limit (detected via `session.status` retry events), it is marked with an ISO expiry timestamp. Expired entries are automatically cleared.

Health state persists to `~/.cache/opencode/provider-health.json` and survives session restarts.

### Delegation Examples

```typescript
// Tier 1 — exploration (Copilot preferred)
task(subagent_type="explore", model="copilot/gpt-5-mini", run_in_background=true)
task(subagent_type="librarian", model="copilot/gpt-5-mini", run_in_background=true)

// Tier 2 — implementation (Copilot preferred)
task(category="deep", model="copilot/gpt-5", load_skills=["clean-code"])
task(category="visual-engineering", model="copilot/claude-sonnet-4", load_skills=["frontend-ui-ux"])

// Tier 3 — complex reasoning (Anthropic for Opus)
task(category="ultrabrain", model="anthropic/claude-opus-4-6", load_skills=["architecture"])

// Tier 3 — reasoning via Copilot (o3-mini available on Pro)
task(category="artistry", model="copilot/claude-opus-4.6", load_skills=["design-patterns"])

// Parallel pattern: 3×T1 + 1×T2
task(subagent_type="explore", model="copilot/gpt-5-mini", run_in_background=true)  // T1
task(subagent_type="explore", model="copilot/gpt-5-mini", run_in_background=true)  // T1
task(subagent_type="librarian", model="copilot/gpt-5-mini", run_in_background=true) // T1
task(category="deep", model="copilot/gpt-5", run_in_background=false)               // T2
```

### Copilot Pro Constraints

- **Available:** GPT-5-mini (T1), GPT-5 (T2), Claude Sonnet 4 (T2), Claude Opus 4.6 (T3)
- **NOT available:** —
- **Monthly limit:** 300 premium requests — track usage
- **When exhausted:** Fall back to Anthropic direct API

### Toast Notifications

The provider-failover plugin displays toast notifications for important events:

- **Info toasts** (3s): Plugin loaded, missing provider/model info (guard conditions), session retries
- **Warning toasts** (5s): Unhealthy providers, fallback chain searches, no alternatives available
- **Warning toasts** (8s): Provider swap notifications — longer duration to read swap details
- **Error toasts** (8s): Rate limits (429), server errors (5xx), authentication errors (401/403)

Notifications use OpenCode's TUI toast API and are fire-and-forget to prevent blocking plugin initialization.

### Provider Health Monitoring

Monitor and manage provider health using the `provider-health` tool:

**Check full health summary:**
```
provider-health
```

**Check specific provider:**
```
provider-health --provider=copilot
```

**Check fallback chain for tier:**
```
provider-health --tier=T1
```

**Reset health state:**
```
provider-health --reset
```

**Health state file location:** `~/.cache/opencode/provider-health.json`

The health state file tracks rate-limited providers with ISO expiry timestamps. Use `jq` to query the file directly:

```bash
# View all rate-limited providers
jq '.rateLimits' ~/.cache/opencode/provider-health.json

# Check if a specific provider/model is rate-limited
jq '.rateLimits["opencode/kimi-k2.5-free"]' ~/.cache/opencode/provider-health.json
```

### Red Flags

- ❌ Using T1 (Haiku/GPT-5-mini) for code generation or architecture
- ❌ Using T3 (Opus 4.6) for trivial tasks or finding references
- ❌ Using T2 (Sonnet 4) for simple typos or parallel exploration
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

## VHS Ecosystem (ON-DEMAND)

VHS demo generation is **ON-DEMAND** and optional. It is never mandatory for task completion, nor should any task be refused due to the absence of a VHS demo.

### Directory Structure
- `demos/vhs/`: Root directory for all VHS infrastructure.
- `demos/vhs/features/`: Feature-specific terminal recordings.
- `demos/vhs/scripts/`: Automation and regression test scripts.

### Tape Categories
1.  **Auto-generated**: Created via `vhs-director` agent or automation scripts (e.g., golden tests).
2.  **Hand-crafted**: Manually authored tapes for specific showcase or documentation purposes.

### Makefile Targets
- `make vhs-feature FEATURE=name`: Generate all tapes for a specific feature.
- `make vhs-features-all`: Generate all feature tapes in the repository.
- `make vhs-golden-compare`: Run visual regression tests against golden baselines.
- `make vhs-golden-update`: Update golden baselines with current output.

### VHS Commands
Use the `/vhs` command to interact with the ecosystem:
- `/vhs demo <feature>`: Record a new demo for the specified feature.
- `/vhs check`: Verify VHS installation and configuration.
- `/vhs test`: Run visual regression tests.

### VHS Specialized Support
- **VHS Skill**: Managed at `~/.config/opencode/skills/vhs/`.
- **VHS Agent**: The `vhs-director` agent at `~/.config/opencode/agents/vhs-director.md` orchestrates demo generation.

---

## Three Pillars (MANDATORY)

1. **Always-Active Discipline** - pre-action, memory-keeper, search first
2. **Parallel Execution** - Independent tasks in single message
3. **Progressive Disclosure** - Load only what's needed

**No exceptions.**

---

## User Communication Preferences (MANDATORY)

**Style:** Direct, plain, no sycophancy

- Assume competence. Do not validate, cushion, or emotionally frame responses.
- No excessive agreement ("That's a great question!", "I love that idea!").
- No over-apologising.
- No verbose intros/outros.
- Disagree plainly when needed—no softening ("I see your point, but...").
- Get to the point immediately.
- Use concise formatting (bullets, code blocks) over prose.
- If asked to do something, just do it. Do not narrate the steps unless asked.

This user is AuDHD and a systems thinker. They want information efficiently delivered, not packaged with performative helpfulness.
