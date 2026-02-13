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
