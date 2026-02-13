# LLM Provider Failover & Smart Routing

## TL;DR

> **Quick Summary**: Build a hybrid plugin + external health tracker system that automatically switches LLM providers when rate limits are hit, leveraging opencode's plugin API (`config`, `chat.params`, `chat.headers` hooks) for pre-call routing and a sidecar health tracker for state persistence and monitoring.
> 
> **Deliverables**:
> - Provider health tracker plugin (TypeScript, opencode plugin)
> - Health state persistence (`~/.cache/opencode/provider-health.json`)
> - Per-tier fallback chain configuration
> - Provider health monitoring tool (custom opencode tool)
> - Full observability: success rates, latency, availability per provider
> 
> **Estimated Effort**: Medium (5-8 tasks, ~1-2 weeks)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request
Enable automatic switching between LLM providers when rate limits are hit, with smart routing by task complexity tier, full health metrics, and persistent state.

### Interview Summary
**Key Discussions**:
- **Current Setup**: Multiple providers (Copilot + Anthropic + Ollama local), already using T1/T2/T3 tier system documented in AGENTS.md
- **Routing**: Smart routing by task complexity tier (T1 lightweight → T3 premium)
- **Failover**: Immediately switch to next available provider on rate limit detection
- **Architecture**: Two-layer — dispatch (tier routing) + client (rate limit detection)
- **State**: Persist to file/database (survive restarts, multi-instance support)
- **Observability**: Full health metrics (success rates, latency, availability)

**Research Findings**:
- **Plugin API (`@opencode-ai/plugin` v1.1.53)** exposes pre-call hooks:
  - `config` — can mutate provider configuration dynamically
  - `chat.params` — can modify model, provider, options before each LLM call
  - `chat.headers` — can inject custom headers per-request
  - `chat.message` — read-only access to model/provider per session
  - `event` — receives system events (may include errors — needs investigation)
  - `tool` — register custom tools (for health check commands)
- **NO post-call error hooks exist** — cannot intercept 429/503 responses at plugin level
- **Existing plugin**: `plugins/model-context.ts` uses `shell.env` hook — provides the extension pattern
- **Config**: `opencode.json` has `provider` section with Ollama configured; Copilot and Anthropic handled by `oh-my-opencode` and `opencode-anthropic-auth` plugins
- **Ollama local** already configured as potential T0 fallback of last resort

### Metis Review
**Identified Gaps** (addressed):
- **Routing system is documentation-only**: AGENTS.md describes T1/T2/T3 but no code implements it → Plan includes provider registration + dynamic routing as Task 1-2
- **No post-call error hooks**: Plugin API cannot catch 429s directly → Hybrid approach: `event` hook investigation + external health monitoring
- **Unknown `Event` types**: Need to verify if error events include rate limit info → Task 1 includes event type discovery
- **Multi-instance coordination**: Multiple opencode sessions share provider quotas → File-based state with atomic writes addresses this
- **Cascading failure handling**: All providers down simultaneously → Ollama local as T0 last resort, plus graceful degradation
- **Cost explosion on failover**: Copilot is subscription, Anthropic is per-token → Health tracker includes cost alerts

---

## Work Objectives

### Core Objective
Build an opencode plugin that dynamically routes LLM requests to healthy providers based on tier, health state, and rate limit status, with persistent health tracking across sessions.

### Concrete Deliverables
- `plugins/provider-failover.ts` — Main plugin with `config`, `chat.params`, `event` hooks
- `~/.cache/opencode/provider-health.json` — Persisted health state file
- Custom `provider-health` tool — Inspect health status from within opencode
- Updated `opencode.json` — All providers registered with tier/fallback metadata
- AGENTS.md updates — Document failover behaviour and provider chains

### Definition of Done
- [x] Rate limit on any provider triggers immediate failover to same-tier alternative
- [x] Health state persists across session restarts
- [x] Provider health inspectable via custom tool within opencode
- [x] All 3 tiers have defined fallback chains with at least 2 providers each
- [x] Ollama serves as T0 last-resort fallback
- [x] All existing tests pass, plugin loads without errors

### Must Have
- Immediate failover on rate limit detection (no waiting/backoff before trying alternative)
- Per-tier fallback chains (T1→T1 alt, T2→T2 alt, T3→T3 alt → degrade to lower tier)
- Health state persistence to `~/.cache/opencode/provider-health.json`
- Provider health metrics: success rate, latency, last error, rate limit expiry
- Custom tool to inspect provider health from within opencode

### Must NOT Have (Guardrails)
- ❌ Generic provider abstraction framework — build for the 3 known providers only (Copilot, Anthropic, Ollama)
- ❌ Custom metrics dashboard UI — JSON file queryable via `jq` is sufficient
- ❌ Request queuing or async retry mechanisms — synchronous failover only
- ❌ Configuration for providers that don't exist (Azure, OpenAI direct, etc.)
- ❌ Over-engineered circuit breaker state machine — simple "N failures in M minutes → skip" logic
- ❌ Modifications to oh-my-opencode source code — plugin-only approach
- ❌ Changes to the opencode binary or core — plugin hooks only

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.

### Test Decision
- **Infrastructure exists**: YES (Bun runtime for TypeScript, existing plugin pattern)
- **Automated tests**: YES (Tests-after — verify plugin loads and routes correctly)
- **Framework**: Bun test (matches existing TypeScript plugin ecosystem)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Every task includes Agent-Executed QA Scenarios as the PRIMARY verification method.
> The executing agent DIRECTLY verifies the deliverable by running it.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Plugin loading** | Bash (bun run) | Import plugin, verify exports, check hook registration |
| **Health state file** | Bash (jq) | Read JSON, assert fields exist with correct types |
| **Failover behaviour** | Bash (mock server + plugin invocation) | Simulate 429, verify provider switch |
| **Config changes** | Bash (jq + bun) | Parse opencode.json, verify provider entries |
| **Custom tool** | Bash (opencode CLI) | Invoke tool, verify output format |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Investigate event types + provider registration
└── Task 4: Define fallback chain configuration schema

Wave 2 (After Wave 1):
├── Task 2: Build provider health state manager
├── Task 3: Build failover routing plugin
└── Task 5: Create provider-health custom tool

Wave 3 (After Wave 2):
├── Task 6: Integration testing with mock providers
└── Task 7: Update AGENTS.md documentation

Critical Path: Task 1 → Task 2 → Task 3 → Task 6 → Task 7
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | 4 |
| 2 | 1 | 3, 5, 6 | — |
| 3 | 1, 2 | 6 | 5 |
| 4 | None | 2, 3 | 1 |
| 5 | 2 | 6 | 3 |
| 6 | 3, 5 | 7 | — |
| 7 | 6 | None | — |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 4 | T1 explore (event investigation), T1 quick (config schema) |
| 2 | 2, 3, 5 | T2 deep (health manager), T2 deep (plugin), T2 quick (tool) |
| 3 | 6, 7 | T2 deep (integration tests), T1 quick (docs) |

---

## TODOs

- [x] 1. Investigate OpenCode Event Types & Register All Providers

  **What to do**:
  - Import the opencode SDK's `Event` type and document ALL event variants
  - Specifically investigate: Are there error events when LLM calls fail? Do they include HTTP status codes (429, 503)? Do they include provider/model identifiers?
  - Register ALL providers in `opencode.json` with proper configuration:
    - Copilot (via oh-my-opencode — already present)
    - Anthropic (via opencode-anthropic-auth — already present)
    - Ollama local (already configured — verify models)
  - Document the event lifecycle: what fires when, in what order, with what data
  - Create a test plugin that logs all events to `/tmp/opencode-events.log` to capture real event data

  **Must NOT do**:
  - Do NOT modify oh-my-opencode or opencode-anthropic-auth plugins
  - Do NOT add providers that aren't already configured (no Azure, no OpenAI direct)
  - Do NOT implement any failover logic yet — this is pure investigation

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires careful investigation of SDK types and real runtime behaviour testing
  - **Skills**: [`golang`]
    - `golang`: Not directly applicable but the general investigation pattern applies; primary skill here is TypeScript plugin development following existing `model-context.ts` pattern
  - **Skills Evaluated but Omitted**:
    - `architecture`: Not needed — this is investigation, not design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `/home/baphled/.config/opencode/plugins/model-context.ts:1-47` — Existing plugin pattern: how to define a Plugin, export it, use `shell.env` hook. Follow this exact structure for new plugin.

  **API/Type References**:
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:108-220` — Complete `Hooks` interface. Lines 109-111 define `event` hook signature. Lines 136-147 define `chat.params` hook with `model`, `provider` (ProviderContext) access. Lines 5-9 define `ProviderContext` type.
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:1` — Import from `@opencode-ai/sdk` includes `Event`, `Model`, `Provider`, `Config` types. Investigate these SDK types.

  **Configuration References**:
  - `/home/baphled/.config/opencode/opencode.json:19-41` — Current plugin list and provider config. Ollama already registered with GLM and Kimi models.
  - `/home/baphled/.config/opencode/opencode-local-optimized.json:22-93` — Detailed Ollama model config showing full model definition shape (cost, limits, modalities, etc.)
  - `/home/baphled/.config/opencode/package.json:1-5` — Plugin dependency: `@opencode-ai/plugin` v1.1.53

  **WHY Each Reference Matters**:
  - `model-context.ts`: Copy this exact plugin structure — it's the proven working pattern
  - `index.d.ts` Hooks interface: The `event` hook signature tells us what data we get; `chat.params` is the pre-call interception point
  - `opencode.json`: Shows how providers are registered; new providers must follow this shape
  - `opencode-local-optimized.json`: Shows the full model definition with cost/limits fields — needed when registering models with health metadata

  **Acceptance Criteria**:

  - [ ] Event investigation document created at `/tmp/opencode-event-types.md` listing all `Event` variants with their fields
  - [ ] Test plugin at `plugins/event-logger.ts` that logs all events to `/tmp/opencode-events.log`
  - [ ] `opencode.json` provider section verified — all 3 providers accessible (Copilot via oh-my-opencode, Anthropic via auth plugin, Ollama via direct config)
  - [ ] Answer documented: "Can we detect rate limit errors via the `event` hook?" YES/NO with evidence

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plugin compiles and exports correctly
    Tool: Bash (bun)
    Preconditions: Node modules installed in /home/baphled/.config/opencode
    Steps:
      1. bun build plugins/event-logger.ts --outdir /tmp/test-build
      2. Assert: exit code 0
      3. Assert: /tmp/test-build/event-logger.js exists
      4. Assert: file contains "event" string (hook registration)
    Expected Result: Plugin compiles without errors
    Evidence: Build output captured

  Scenario: Event logger captures events during a session
    Tool: Bash
    Preconditions: event-logger.ts plugin registered in opencode.json
    Steps:
      1. Start opencode with event-logger plugin enabled
      2. Trigger a simple LLM call (e.g., echo "hello" | opencode)
      3. Wait 10s for events
      4. cat /tmp/opencode-events.log
      5. Assert: Log file is non-empty
      6. Assert: Log contains at least one event JSON entry
    Expected Result: Events captured with structure documented
    Evidence: /tmp/opencode-events.log content

  Scenario: All providers are accessible
    Tool: Bash (jq)
    Preconditions: opencode.json updated
    Steps:
      1. jq '.provider' /home/baphled/.config/opencode/opencode.json
      2. Assert: "ollama" key exists
      3. jq '.plugin' /home/baphled/.config/opencode/opencode.json
      4. Assert: array contains "oh-my-opencode" (Copilot provider)
      5. Assert: array contains entry matching "opencode-anthropic-auth" (Anthropic provider)
    Expected Result: All 3 provider paths confirmed
    Evidence: jq output captured
  ```

  **Commit**: YES
  - Message: `feat(plugins): add event logger for provider failover investigation`
  - Files: `plugins/event-logger.ts`
  - Pre-commit: `bun build plugins/event-logger.ts --outdir /tmp/test-build`

---

- [x] 2. Build Provider Health State Manager

  **What to do**:
  - Create `plugins/lib/provider-health.ts` — a shared module for health state management
  - Implement `ProviderHealthState` type with per-provider metrics:
    - `status`: "healthy" | "degraded" | "rate_limited" | "down"
    - `successRate`: rolling window (last 50 requests)
    - `latencyP95`: in milliseconds
    - `lastError`: timestamp + message + HTTP status
    - `rateLimitUntil`: ISO timestamp when rate limit expires (null if not limited)
    - `requestCount`: total requests in current window
    - `failureCount`: failures in current window
    - `lastChecked`: ISO timestamp
  - Implement health state persistence:
    - Write to `~/.cache/opencode/provider-health.json` on every state change
    - Read on startup (with staleness check — data older than 2 hours treated as unknown)
    - Atomic writes (write to temp file, then rename) for multi-instance safety
  - Implement tier-aware fallback chain resolution:
    - Given a tier (T1/T2/T3), return ordered list of healthy providers
    - Respect the fallback chain from Task 4's configuration
    - Skip providers marked as `rate_limited` (until `rateLimitUntil` expires)
    - Skip providers marked as `down`
  - Implement simple circuit breaker: 3 failures in 5 minutes → mark as `degraded`; 5 failures → `down`

  **Must NOT do**:
  - Do NOT use SQLite or any database — JSON file only
  - Do NOT implement a full state machine circuit breaker — keep it simple (threshold-based)
  - Do NOT add request queuing or async retry mechanisms
  - Do NOT track per-model health — only per-provider

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core module requiring careful design of state management, persistence, and concurrency safety
  - **Skills**: [`javascript`, `clean-code`, `error-handling`]
    - `javascript`: TypeScript/Bun development for the health state module
    - `clean-code`: SOLID principles for the health manager interface
    - `error-handling`: Robust error handling for file I/O, JSON parsing, stale state

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Task 1 findings about Event types)
  - **Blocks**: Tasks 3, 5, 6
  - **Blocked By**: Task 1 (need to know if events provide error data), Task 4 (fallback chain config)

  **References**:

  **Pattern References**:
  - `/home/baphled/.config/opencode/plugins/model-context.ts:4-6` — Cache directory pattern (`~/.cache/opencode/`). Follow this for health state file location.
  - `/home/baphled/.config/opencode/plugins/model-context.ts:16-27` — File reading pattern with `existsSync` + `readFileSync` + `try/catch` for malformed data. Follow this for health state reading.

  **API/Type References**:
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:5-9` — `ProviderContext` type: `source`, `info` (Provider), `options`. The health manager needs to track state per `info.id` or equivalent.

  **Configuration References**:
  - `/home/baphled/.config/opencode/opencode-local-optimized.json:26-54` — Model definition shape with `cost`, `limit` fields. Health manager should understand cost implications of failover.

  **WHY Each Reference Matters**:
  - `model-context.ts` cache pattern: Establishes the canonical way to read/write cache files in this codebase
  - `ProviderContext`: The health manager must key state by provider identity — this type defines the shape
  - Model definitions: Cost fields help the health manager warn about expensive failovers (Copilot free → Anthropic paid)

  **Acceptance Criteria**:

  - [ ] `plugins/lib/provider-health.ts` exports: `ProviderHealthState`, `HealthManager`
  - [ ] `HealthManager.getHealthyProviders(tier: string)` returns ordered provider list
  - [ ] `HealthManager.recordSuccess(provider: string, latencyMs: number)` updates metrics
  - [ ] `HealthManager.recordFailure(provider: string, error: { status: number, message: string })` updates metrics
  - [ ] `HealthManager.markRateLimited(provider: string, retryAfterSeconds: number)` sets rate limit expiry
  - [ ] Health state persists to `~/.cache/opencode/provider-health.json`
  - [ ] Atomic writes: uses write-to-temp + rename pattern
  - [ ] Stale data (>2 hours old) treated as "unknown" status on read
  - [ ] Circuit breaker: 3 failures in 5 min → "degraded", 5 failures → "down"

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Health state file created on first write
    Tool: Bash (bun + jq)
    Preconditions: No existing health state file
    Steps:
      1. rm -f ~/.cache/opencode/provider-health.json
      2. bun run -e "import { HealthManager } from './plugins/lib/provider-health'; const hm = new HealthManager(); hm.recordSuccess('copilot', 250); await hm.flush();"
      3. Assert: ~/.cache/opencode/provider-health.json exists
      4. jq '.providers.copilot.status' ~/.cache/opencode/provider-health.json
      5. Assert: Output is "healthy"
      6. jq '.providers.copilot.latencyP95' ~/.cache/opencode/provider-health.json
      7. Assert: Output is 250
    Expected Result: Health file created with correct initial state
    Evidence: jq output captured

  Scenario: Rate limit marks provider and returns alternative
    Tool: Bash (bun + jq)
    Preconditions: Health state file exists with copilot as healthy
    Steps:
      1. bun run -e "import { HealthManager } from './plugins/lib/provider-health'; const hm = new HealthManager(); hm.markRateLimited('copilot', 60); await hm.flush(); console.log(JSON.stringify(hm.getHealthyProviders('T1')));"
      2. Assert: Output array does NOT contain "copilot"
      3. Assert: Output array contains at least one alternative provider
      4. jq '.providers.copilot.status' ~/.cache/opencode/provider-health.json
      5. Assert: Output is "rate_limited"
      6. jq '.providers.copilot.rateLimitUntil' ~/.cache/opencode/provider-health.json
      7. Assert: Output is a future ISO timestamp (~60 seconds from now)
    Expected Result: Rate-limited provider excluded from healthy list
    Evidence: Provider list and health state captured

  Scenario: Circuit breaker triggers after repeated failures
    Tool: Bash (bun + jq)
    Preconditions: Fresh health state
    Steps:
      1. bun run -e "
         import { HealthManager } from './plugins/lib/provider-health';
         const hm = new HealthManager();
         for (let i = 0; i < 5; i++) { hm.recordFailure('anthropic', { status: 500, message: 'Internal error' }); }
         await hm.flush();
         console.log(JSON.stringify(hm.getHealthyProviders('T3')));"
      2. jq '.providers.anthropic.status' ~/.cache/opencode/provider-health.json
      3. Assert: Output is "down"
      4. Assert: Provider list from step 1 does NOT contain "anthropic"
    Expected Result: Provider marked as down after 5 failures
    Evidence: Health state and provider list captured

  Scenario: Stale health data treated as unknown
    Tool: Bash (bun + jq)
    Preconditions: Health state file exists
    Steps:
      1. Create health file with lastChecked 3 hours ago:
         echo '{"providers":{"copilot":{"status":"down","lastChecked":"2025-01-01T00:00:00Z"}}}' > ~/.cache/opencode/provider-health.json
      2. bun run -e "import { HealthManager } from './plugins/lib/provider-health'; const hm = new HealthManager(); console.log(JSON.stringify(hm.getHealthyProviders('T1')));"
      3. Assert: Output array contains "copilot" (stale "down" status ignored)
    Expected Result: Stale data does not prevent provider from being selected
    Evidence: Provider list output captured
  ```

  **Commit**: YES
  - Message: `feat(plugins): add provider health state manager with persistence`
  - Files: `plugins/lib/provider-health.ts`
  - Pre-commit: `bun build plugins/lib/provider-health.ts --outdir /tmp/test-build`

---

- [x] 3. Build Failover Routing Plugin

  **What to do**:
  - Create `plugins/provider-failover.ts` — the main failover plugin
  - Implement `config` hook:
    - On startup, read health state from `provider-health.json`
    - Dynamically adjust provider configuration based on health (disable rate-limited providers)
  - Implement `chat.params` hook:
    - Before each LLM call, check health state for the selected provider
    - If selected provider is unhealthy, swap to next healthy provider in same tier
    - Log the swap decision for observability
  - Implement `chat.headers` hook:
    - Inject `X-Failover-Original-Provider` header when a swap occurs (for debugging)
  - Implement `event` hook (based on Task 1 findings):
    - If events include error data: capture rate limit signals (429 status, `Retry-After` header)
    - Call `HealthManager.recordFailure()` or `HealthManager.markRateLimited()` accordingly
    - If events do NOT include error data: skip this hook (health updates come from external monitoring only)
  - Implement fallback chain logic:
    - T1: Copilot GPT-4o-mini → Anthropic Haiku → Ollama local
    - T2: Copilot GPT-4o → Anthropic Sonnet → Copilot Claude Sonnet → Ollama local
    - T3: Anthropic Opus → Copilot o3-mini → degrade to T2
    - T0 (last resort): Ollama local models (always available)
  - Register plugin in `opencode.json`

  **Must NOT do**:
  - Do NOT modify oh-my-opencode or opencode-anthropic-auth
  - Do NOT implement request retry (just swap provider for the NEXT request)
  - Do NOT queue failed requests for later retry
  - Do NOT add providers beyond Copilot, Anthropic, Ollama

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core plugin requiring careful hook integration and state coordination
  - **Skills**: [`javascript`, `clean-code`, `architecture`]
    - `javascript`: TypeScript plugin development with multiple hook implementations
    - `clean-code`: Well-structured plugin with clear separation of concerns
    - `architecture`: Correct hook composition and state flow design

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 2)
  - **Parallel Group**: Wave 2 (can run alongside Task 5 once Task 2 is done)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `/home/baphled/.config/opencode/plugins/model-context.ts:1-47` — Complete working plugin. Follow exact structure: import Plugin type, export const, return hooks object.
  - `/home/baphled/.config/opencode/plugins/model-context.ts:8-44` — Hook implementation pattern: async function receiving (input, output), mutating output.

  **API/Type References**:
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:108-220` — Full Hooks interface. Key hooks:
    - Lines 112: `config` hook — mutate Config
    - Lines 136-147: `chat.params` hook — access model/provider, mutate temperature/options
    - Lines 148-156: `chat.headers` hook — inject custom headers
    - Lines 109-111: `event` hook — capture system events
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:5-9` — `ProviderContext` with `source`, `info`, `options`
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:10-17` — `PluginInput` with `client`, `project`, `directory`

  **Configuration References**:
  - `/home/baphled/.config/opencode/opencode.json:19-22` — Plugin registration array. New plugin must be added here.
  - `/home/baphled/.config/opencode/AGENTS.md:122-151` — Tier system and provider selection rules. Fallback chains must match these documented rules.

  **WHY Each Reference Matters**:
  - `model-context.ts`: The ONLY working plugin in this codebase — must follow its exact patterns
  - Hooks interface: Defines the exact signatures for each hook — parameters determine what we can read and modify
  - `ProviderContext`: Tells us how to identify which provider is being used in `chat.params`
  - AGENTS.md tier rules: Fallback chains must align with documented provider preferences

  **Acceptance Criteria**:

  - [ ] `plugins/provider-failover.ts` exports `ProviderFailoverPlugin: Plugin`
  - [ ] Plugin registered in `opencode.json` plugin array
  - [ ] `config` hook reads health state on startup
  - [ ] `chat.params` hook checks provider health before each LLM call
  - [ ] `chat.params` swaps to healthy alternative when selected provider is unhealthy
  - [ ] `chat.headers` injects `X-Failover-Original-Provider` header on swap
  - [ ] `event` hook captures error events (if available per Task 1 findings)
  - [ ] Fallback chains: T1 has 3 providers, T2 has 4 providers, T3 has 3 providers (with T2 degradation)
  - [ ] Plugin loads without errors alongside existing plugins

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plugin loads and registers all hooks
    Tool: Bash (bun)
    Preconditions: Plugin file exists, dependencies installed
    Steps:
      1. bun run -e "import { ProviderFailoverPlugin } from './plugins/provider-failover'; const hooks = await ProviderFailoverPlugin({ client: null, project: null, directory: '.', worktree: '.', serverUrl: new URL('http://localhost'), $: null }); console.log(Object.keys(hooks).join(','));"
      2. Assert: Output contains "config"
      3. Assert: Output contains "chat.params"
      4. Assert: Output contains "chat.headers"
      5. Assert: Output contains "event" (if Task 1 confirmed error events)
    Expected Result: All expected hooks registered
    Evidence: Hook list output captured

  Scenario: chat.params swaps provider when current is rate-limited
    Tool: Bash (bun)
    Preconditions: Health state file has copilot marked as rate_limited
    Steps:
      1. Write health state: copilot = rate_limited, anthropic = healthy
      2. Invoke chat.params hook with provider = copilot, tier = T1
      3. Assert: Output options modified to route to anthropic
      4. Assert: Console log shows swap decision
    Expected Result: Request routed to healthy alternative
    Evidence: Hook output and log captured

  Scenario: Fallback degrades T3 to T2 when all T3 providers down
    Tool: Bash (bun)
    Preconditions: Health state has all T3 providers (anthropic, o3-mini) marked as down
    Steps:
      1. Write health state: anthropic = down, copilot = healthy
      2. Call getHealthyProviders("T3")
      3. Assert: Returns T2-tier providers as degraded fallback
      4. Assert: Includes copilot/gpt-4o or copilot/claude-sonnet
    Expected Result: Graceful degradation from T3 to T2
    Evidence: Provider list output captured

  Scenario: Plugin coexists with existing plugins
    Tool: Bash (jq + bun)
    Preconditions: opencode.json has all plugins registered
    Steps:
      1. jq '.plugin' /home/baphled/.config/opencode/opencode.json
      2. Assert: Array contains "opencode-anthropic-auth"
      3. Assert: Array contains "oh-my-opencode"
      4. Assert: Array contains local path or name for provider-failover
      5. bun build plugins/provider-failover.ts --outdir /tmp/test-build
      6. Assert: exit code 0
    Expected Result: All plugins registered, no conflicts
    Evidence: Plugin array and build output captured
  ```

  **Commit**: YES
  - Message: `feat(plugins): add provider failover routing with tier-aware fallback chains`
  - Files: `plugins/provider-failover.ts`, `opencode.json`
  - Pre-commit: `bun build plugins/provider-failover.ts --outdir /tmp/test-build`

---

- [x] 4. Define Fallback Chain Configuration Schema

  **What to do**:
  - Create `plugins/lib/fallback-config.ts` — configuration for provider fallback chains
  - Define tier-to-provider mappings based on AGENTS.md:
    ```
    T1 (Lightweight): copilot/gpt-4o-mini → anthropic/claude-haiku-4-5 → ollama/granite4-tools
    T2 (Balanced): copilot/gpt-4o → anthropic/claude-sonnet-4-5 → copilot/claude-sonnet-4-5 → ollama/qwen2.5:7b-instruct
    T3 (Premium): anthropic/claude-opus-4-5 → copilot/o3-mini → [degrade to T2 chain]
    T0 (Last Resort): ollama/granite4-tools → ollama/qwen2.5:7b-instruct
    ```
  - Define provider metadata:
    - `costModel`: "subscription" | "per-token" | "free"
    - `rateLimit.type`: "monthly" (Copilot 300/mo) | "per-minute" (Anthropic) | "none" (Ollama)
    - `rateLimit.threshold`: when to consider "approaching limit"
  - Export `getFallbackChain(tier: string): ProviderEntry[]`
  - Export `getProviderMetadata(provider: string): ProviderMetadata`

  **Must NOT do**:
  - Do NOT make this a dynamic config file users edit — hardcode for the 3 known providers
  - Do NOT add providers that aren't configured (no Azure, no OpenAI direct)
  - Do NOT build a configuration UI

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward type definitions and static configuration — no complex logic
  - **Skills**: [`javascript`, `clean-code`]
    - `javascript`: TypeScript type definitions
    - `clean-code`: Clear, well-typed configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/home/baphled/.config/opencode/AGENTS.md:122-128` — Three-tier system definition with Anthropic and Copilot model mappings per tier
  - `/home/baphled/.config/opencode/AGENTS.md:130-136` — Category → Tier mapping (trivial→T1, deep→T2, ultrabrain→T3)
  - `/home/baphled/.config/opencode/AGENTS.md:146-151` — Provider selection rules: Copilot default for T1/T2, Anthropic for T3, overflow rules

  **Configuration References**:
  - `/home/baphled/.config/opencode/opencode.json:23-41` — Ollama provider config with model names (glm-4.7:cloud, kimi-k2.5:cloud)
  - `/home/baphled/.config/opencode/opencode-local-optimized.json:26-83` — Detailed model definitions with cost/limit fields (granite4-tools, qwen2.5:7b-instruct)
  - `/home/baphled/.config/opencode/AGENTS.md:177-183` — Copilot Pro constraints: available models, 300 request limit, fallback rules

  **WHY Each Reference Matters**:
  - AGENTS.md tiers: The fallback chains MUST match these documented rules exactly
  - Ollama config: Shows which local models are available as T0 fallback
  - Copilot constraints: 300 monthly limit means Copilot failover needs different circuit breaker timing than Anthropic's per-minute limits

  **Acceptance Criteria**:

  - [ ] `plugins/lib/fallback-config.ts` exports `getFallbackChain` and `getProviderMetadata`
  - [ ] T1 chain has 3 entries: copilot → anthropic → ollama
  - [ ] T2 chain has 4 entries: copilot → anthropic → copilot-alt → ollama
  - [ ] T3 chain has 3 entries: anthropic → copilot → [T2 degradation]
  - [ ] T0 chain has 2 entries: both ollama local models
  - [ ] Provider metadata includes costModel and rateLimit config
  - [ ] Copilot metadata: costModel="subscription", rateLimit.type="monthly", rateLimit.threshold=270 (of 300)
  - [ ] Anthropic metadata: costModel="per-token", rateLimit.type="per-minute"
  - [ ] Ollama metadata: costModel="free", rateLimit.type="none"

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Fallback chains return correct providers in order
    Tool: Bash (bun)
    Preconditions: Module compiles
    Steps:
      1. bun run -e "import { getFallbackChain } from './plugins/lib/fallback-config'; console.log(JSON.stringify(getFallbackChain('T1')));"
      2. Assert: First element provider is "copilot"
      3. Assert: Second element provider is "anthropic"
      4. Assert: Third element provider is "ollama"
      5. Repeat for T2 (4 entries) and T3 (3 entries with degradation)
    Expected Result: All tiers return correct ordered chains
    Evidence: JSON output captured

  Scenario: Provider metadata includes rate limit config
    Tool: Bash (bun)
    Preconditions: Module compiles
    Steps:
      1. bun run -e "import { getProviderMetadata } from './plugins/lib/fallback-config'; console.log(JSON.stringify(getProviderMetadata('copilot')));"
      2. Assert: costModel is "subscription"
      3. Assert: rateLimit.type is "monthly"
      4. Assert: rateLimit.threshold is 270
    Expected Result: Metadata correct for all providers
    Evidence: JSON output captured
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(plugins): add tier-based fallback chain configuration`
  - Files: `plugins/lib/fallback-config.ts`
  - Pre-commit: `bun build plugins/lib/fallback-config.ts --outdir /tmp/test-build`

---

- [x] 5. Create Provider Health Custom Tool

  **What to do**:
  - Add a custom tool `provider-health` to the failover plugin using the `tool` hook
  - Tool should display current health state in human-readable format:
    - Per-provider: status, success rate, latency, last error, rate limit expiry
    - Per-tier: available providers (ordered), degradation status
    - Overall: system health summary
  - Tool should accept optional arguments:
    - `provider` — show health for specific provider only
    - `tier` — show fallback chain for specific tier
    - `reset` — clear health state and start fresh
  - Format output as markdown table for readability in opencode sessions

  **Must NOT do**:
  - Do NOT build a web dashboard or TUI for health display
  - Do NOT add complex filtering or querying capabilities
  - Do NOT make the tool interactive — single invocation, single response

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward tool wrapping existing HealthManager methods
  - **Skills**: [`javascript`]
    - `javascript`: TypeScript tool definition using opencode's `tool()` helper

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (alongside Task 3)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2 (needs HealthManager)

  **References**:

  **API/Type References**:
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/tool.d.ts:1-47` — Complete tool definition API. Uses Zod for args schema, returns string. `tool()` function and `ToolContext` type.
  - `/home/baphled/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:113-115` — `tool` hook in Hooks interface: `tool?: { [key: string]: ToolDefinition }`

  **WHY Each Reference Matters**:
  - `tool.d.ts`: Defines exactly how to create custom tools — Zod schema for args, execute function returns string
  - Hooks `tool` property: Shows how tools are registered — key-value map in the hooks object

  **Acceptance Criteria**:

  - [ ] Tool registered as `provider-health` in the failover plugin's hooks
  - [ ] `provider-health` with no args returns full health summary as markdown table
  - [ ] `provider-health --provider=copilot` returns copilot-specific health
  - [ ] `provider-health --tier=T1` returns T1 fallback chain with health status
  - [ ] `provider-health --reset` clears health state file and confirms reset
  - [ ] Output is readable markdown with tables

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Tool returns health summary
    Tool: Bash (bun)
    Preconditions: Health state file exists with data for all providers
    Steps:
      1. Populate health state with known data (copilot: healthy, anthropic: degraded, ollama: healthy)
      2. Import and execute tool with no args
      3. Assert: Output contains "copilot" with "healthy"
      4. Assert: Output contains "anthropic" with "degraded"
      5. Assert: Output contains markdown table formatting ("|")
    Expected Result: Formatted health summary returned
    Evidence: Tool output captured

  Scenario: Tool resets health state
    Tool: Bash (bun + jq)
    Preconditions: Health state file exists
    Steps:
      1. Populate health state with copilot marked as "down"
      2. Execute tool with reset=true
      3. Assert: Tool output confirms "Health state reset"
      4. jq '.providers.copilot.status' ~/.cache/opencode/provider-health.json
      5. Assert: Output is "healthy" or file is empty/reset
    Expected Result: Health state cleared
    Evidence: Tool output and health file captured
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(plugins): add provider-health inspection tool`
  - Files: `plugins/provider-failover.ts` (tool added to same plugin)
  - Pre-commit: `bun build plugins/provider-failover.ts --outdir /tmp/test-build`

---

- [x] 6. Integration Testing with Mock Provider

  **What to do**:
  - Create `tests/mock-provider-server.ts` — a simple HTTP server simulating LLM provider responses:
    - `/v1/chat/completions` endpoint
    - Configurable responses: 200 (success), 429 (rate limited with `Retry-After`), 503 (overloaded), timeout
    - Accept `--status=N`, `--delay=Ms`, `--port=N` flags
  - Create `tests/failover-integration.test.ts` — integration tests:
    - Test 1: Healthy provider → request succeeds, health updated
    - Test 2: Provider returns 429 → health manager marks rate_limited
    - Test 3: After marking rate_limited → next request routes to fallback
    - Test 4: All providers in tier down → degrades to lower tier
    - Test 5: Rate limit expires → provider reinstated
    - Test 6: Circuit breaker opens after 5 failures → provider marked down
    - Test 7: Health state persists → restart reads previous state
  - Create `tests/health-state.test.ts` — unit tests for HealthManager:
    - State transitions: healthy → degraded → down → healthy
    - Atomic file writes (concurrent writes don't corrupt)
    - Stale data handling
    - Fallback chain resolution

  **Must NOT do**:
  - Do NOT test against live provider APIs — mock server only
  - Do NOT test oh-my-opencode integration (out of scope)
  - Do NOT test the opencode binary directly — test plugin functions in isolation

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Comprehensive test suite requiring mock server setup and multi-scenario coverage
  - **Skills**: [`javascript`, `clean-code`]
    - `javascript`: Bun test framework, mock HTTP server implementation
    - `clean-code`: Well-structured test organisation with clear arrange-act-assert

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential — needs Tasks 3, 5 complete)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `/home/baphled/.config/opencode/plugins/model-context.ts:16-27` — File I/O pattern used in existing plugin — tests should verify same patterns

  **API/Type References**:
  - All types from `plugins/lib/provider-health.ts` (Task 2 output)
  - All types from `plugins/lib/fallback-config.ts` (Task 4 output)
  - `plugins/provider-failover.ts` hook functions (Task 3 output)

  **WHY Each Reference Matters**:
  - Health manager API: Tests must exercise the full API surface
  - Fallback config: Tests verify correct chain resolution
  - Plugin hooks: Integration tests invoke hooks directly with mock data

  **Acceptance Criteria**:

  - [ ] Mock provider server starts on configurable port, returns configurable status codes
  - [ ] `bun test tests/health-state.test.ts` → all tests pass
  - [ ] `bun test tests/failover-integration.test.ts` → all tests pass
  - [ ] Test coverage: all 7 integration scenarios pass
  - [ ] Mock server supports: 200, 429 (with Retry-After), 503, timeout simulation

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Mock provider server responds with configurable status
    Tool: Bash (bun + curl)
    Preconditions: None
    Steps:
      1. bun run tests/mock-provider-server.ts --status=429 --port=9999 &
      2. Sleep 2s (wait for server start)
      3. curl -s -w "\n%{http_code}" http://localhost:9999/v1/chat/completions
      4. Assert: HTTP status is 429
      5. Assert: Response includes Retry-After header
      6. Kill background server
    Expected Result: Mock server returns configured status
    Evidence: curl output captured

  Scenario: Full test suite passes
    Tool: Bash (bun test)
    Preconditions: All plugin code from Tasks 2-5 exists
    Steps:
      1. bun test tests/health-state.test.ts
      2. Assert: exit code 0
      3. Assert: Output shows all tests passed
      4. bun test tests/failover-integration.test.ts
      5. Assert: exit code 0
      6. Assert: Output shows all 7 integration scenarios passed
    Expected Result: All tests green
    Evidence: Test output captured

  Scenario: Failover integration test - rate limit triggers provider switch
    Tool: Bash (bun)
    Preconditions: Mock server running
    Steps:
      1. Start mock on port 9999 returning 429
      2. Run integration test scenario 2 + 3
      3. Assert: After 429, health state shows copilot as rate_limited
      4. Assert: Next request routes to anthropic (fallback)
      5. jq '.providers.copilot.status' ~/.cache/opencode/provider-health.json
      6. Assert: "rate_limited"
    Expected Result: Rate limit detection and failover verified
    Evidence: Health state and test output captured
  ```

  **Commit**: YES
  - Message: `test(plugins): add integration tests for provider failover with mock server`
  - Files: `tests/mock-provider-server.ts`, `tests/failover-integration.test.ts`, `tests/health-state.test.ts`
  - Pre-commit: `bun test tests/`

---

- [x] 7. Update AGENTS.md Documentation

  **What to do**:
  - Update the "Model Routing" section of AGENTS.md to document failover behaviour:
    - Add "Provider Failover" subsection
    - Document fallback chains per tier
    - Document health state file location and format
    - Document the `provider-health` tool usage
    - Document circuit breaker thresholds
  - Update "Provider Selection Rules" to include failover rules:
    - Rule 5: "If primary provider is rate-limited, automatically switch to next in fallback chain"
    - Rule 6: "If all providers in tier are unhealthy, degrade to next lower tier"
    - Rule 7: "Ollama local is always-available T0 fallback"
  - Add "Provider Health Monitoring" subsection:
    - How to check health: `provider-health` tool
    - How to reset health: `provider-health --reset`
    - Health state file: `~/.cache/opencode/provider-health.json`
    - Metrics tracked: status, success rate, latency, rate limit expiry

  **Must NOT do**:
  - Do NOT rewrite existing AGENTS.md sections — only ADD to them
  - Do NOT change existing tier definitions or provider mappings
  - Do NOT document implementation details (internal APIs, file formats) — only user-facing behaviour

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation update — straightforward markdown editing
  - **Skills**: [`documentation-writing`]
    - `documentation-writing`: Clear, structured technical documentation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after integration tests confirm everything works)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `/home/baphled/.config/opencode/AGENTS.md:111-202` — Entire "Model Routing (MANDATORY)" section. New content must match this documentation style: tables, rules, examples.

  **WHY Each Reference Matters**:
  - AGENTS.md routing section: Must match existing formatting, table style, and rule numbering. New rules appended, not rewritten.

  **Acceptance Criteria**:

  - [ ] "Provider Failover" subsection added to AGENTS.md Model Routing section
  - [ ] Fallback chains documented in table format matching existing style
  - [ ] Provider Selection Rules expanded with rules 5, 6, 7
  - [ ] "Provider Health Monitoring" subsection added
  - [ ] `provider-health` tool usage documented with examples
  - [ ] Health state file location documented

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AGENTS.md contains new failover documentation
    Tool: Bash (grep)
    Preconditions: AGENTS.md updated
    Steps:
      1. grep -c "Provider Failover" /home/baphled/.config/opencode/AGENTS.md
      2. Assert: Count >= 1
      3. grep -c "provider-health" /home/baphled/.config/opencode/AGENTS.md
      4. Assert: Count >= 2 (section title + usage example)
      5. grep -c "Ollama local" /home/baphled/.config/opencode/AGENTS.md
      6. Assert: Count >= 1 (T0 fallback documentation)
      7. grep "Rule 5\|Rule 6\|Rule 7" /home/baphled/.config/opencode/AGENTS.md
      8. Assert: All three rules present
    Expected Result: All new documentation sections present
    Evidence: grep output captured

  Scenario: Existing AGENTS.md content preserved
    Tool: Bash (grep)
    Preconditions: AGENTS.md updated
    Steps:
      1. grep -c "Three-Tier System" /home/baphled/.config/opencode/AGENTS.md
      2. Assert: Count >= 1 (existing section preserved)
      3. grep -c "Copilot Pro Constraints" /home/baphled/.config/opencode/AGENTS.md
      4. Assert: Count >= 1 (existing section preserved)
      5. grep -c "make ai-commit" /home/baphled/.config/opencode/AGENTS.md
      6. Assert: Count >= 1 (commit rules preserved)
    Expected Result: No existing content removed or modified
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `docs(agents): document provider failover behaviour and health monitoring`
  - Files: `AGENTS.md`
  - Pre-commit: `grep "Provider Failover" AGENTS.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(plugins): add event logger for provider failover investigation` | `plugins/event-logger.ts` | `bun build` |
| 2 | `feat(plugins): add provider health state manager with persistence` | `plugins/lib/provider-health.ts` | `bun build` |
| 3 | `feat(plugins): add provider failover routing with tier-aware fallback chains` | `plugins/provider-failover.ts`, `opencode.json` | `bun build` |
| 4 | `feat(plugins): add tier-based fallback chain configuration` | `plugins/lib/fallback-config.ts` | `bun build` |
| 5 | `feat(plugins): add provider-health inspection tool` | `plugins/provider-failover.ts` | `bun build` |
| 6 | `test(plugins): add integration tests for provider failover with mock server` | `tests/*.ts` | `bun test` |
| 7 | `docs(agents): document provider failover behaviour and health monitoring` | `AGENTS.md` | `grep` |

---

## Success Criteria

### Verification Commands
```bash
# All plugin code compiles
bun build plugins/provider-failover.ts --outdir /tmp/test-build  # Expected: exit 0

# All tests pass
bun test tests/  # Expected: all tests pass

# Health state file exists after first run
jq '.' ~/.cache/opencode/provider-health.json  # Expected: valid JSON with providers object

# Fallback chain works for each tier
bun run -e "import { getFallbackChain } from './plugins/lib/fallback-config'; console.log(getFallbackChain('T1').length);"  # Expected: 3
bun run -e "import { getFallbackChain } from './plugins/lib/fallback-config'; console.log(getFallbackChain('T2').length);"  # Expected: 4
bun run -e "import { getFallbackChain } from './plugins/lib/fallback-config'; console.log(getFallbackChain('T3').length);"  # Expected: 3

# AGENTS.md updated
grep -c "Provider Failover" AGENTS.md  # Expected: >= 1
```

### Final Checklist
- [x] All "Must Have" present (failover, persistence, health tool, fallback chains, T0 fallback)
- [x] All "Must NOT Have" absent (no generic framework, no dashboard, no queuing, no extra providers)
- [x] All tests pass (`bun test tests/`)
- [x] Plugin loads alongside existing plugins without errors
- [x] AGENTS.md updated with failover documentation
- [x] Health state file created and queryable via jq
