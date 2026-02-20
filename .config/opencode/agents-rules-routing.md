# OpenCode Agent System - Model Routing

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

1. **Health check FIRST** — Before every delegation, call `provider-health(tier=X, recommend=true)` to get the best available model. This prevents wasted round trips to rate-limited providers.
2. **Default: Copilot** — Use for all T1 and T2 work (subscription absorbs cost)
3. **Anthropic for T3** — Opus not available on Copilot Pro (needs Pro+)
4. **Overflow** — If Copilot 300 requests exhausted, fall back to Anthropic direct
5. **Cross-provider fallback** — If one provider is down, try same-tier model from other

### Pre-Delegation Health Check (MANDATORY)

Before EVERY delegation, check if the intended tier has a healthy model with enough capacity:

```typescript
// Basic: check health and get recommended model
provider-health(tier="T2", recommend=true)
// Returns: ✅ **opencode/big-pickle** (T2) [250 requests remaining] — 4 more alternative(s)

// With cost estimate: specify expected request count for capacity check
provider-health(tier="T2", recommend=true, estimated_requests=15)
// Returns: ✅ **opencode/big-pickle** (T2) [250 requests remaining]
// Or:      ⚠️ Skipped (insufficient capacity for ~15 requests): github-copilot/gpt-5 (3 left)
// Or:      ⚠️ No provider in T2 has enough capacity for ~15 requests.

// If ✅ → use the recommended provider/model for delegation
// If ⚠️ (capacity) → use a lower tier, smaller task, or wait for limits to reset
// If ⚠️ (rate limited) → wait, use a different tier, or inform the user
```

**Tier cost defaults** (used when `estimated_requests` is omitted):
- T0: 1 request (local model)
- T1: 3 requests (explore/librarian)
- T2: 10 requests (implementation/build)
- T3: 5 requests (oracle/complex reasoning)

**Capacity display**: Use `provider-health(tier="T2")` to see the full fallback chain with remaining capacity per provider.

### Delegation Examples

```typescript
// Step 1: Check health FIRST
provider-health(tier="T1", recommend=true)
// Step 2: Use the recommended model

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
