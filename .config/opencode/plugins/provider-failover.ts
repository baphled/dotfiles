/**
 * Provider Failover Routing Plugin
 *
 * Automatically routes LLM requests to healthy providers based on tier,
 * health state, and rate limit status. Captures error events to update
 * provider health and swaps to fallback providers on unhealthy detection.
 *
 * Hooks:
 *  - config: reads health state on startup, disables unhealthy providers
 *  - chat.params: checks provider health before each LLM call, swaps if unhealthy
 *  - chat.headers: injects X-Failover-Original-Provider header on swap
 *  - event: captures session.error events for rate limit / failure detection
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import { HealthManager } from './lib/provider-health'
import { getFallbackChain, getProviderMetadata } from './lib/fallback-config'
import { existsSync, unlinkSync } from 'fs'

// --- Constants ---

/**
 * Default Retry-After duration (seconds) when header is missing from 429 response
 */
const DEFAULT_RETRY_AFTER_SECONDS = 60

/**
 * Known tier mappings from model ID patterns to tiers.
 * Used to determine which fallback chain to use when a provider is unhealthy.
 */
const MODEL_TIER_MAP: Record<string, string> = {
  // T1 (Lightweight)
  'gpt-4o-mini': 'T1',
  'claude-haiku-4-5': 'T1',
  'granite4-tools': 'T1',

  // T2 (Balanced)
  'gpt-4o': 'T2',
  'claude-sonnet-4-5': 'T2',
  'qwen2.5:7b-instruct': 'T2',

  // T3 (Premium)
  'claude-opus-4-5': 'T3',
  'o3-mini': 'T3',

  // T0 (Last Resort) models are already mapped above in T1/T2
  // granite4-tools → T1, qwen2.5:7b-instruct → T2
  // When used as T0 fallback, the fallback-config chain handles routing
}

/**
 * Resolve the tier for a given model ID.
 * Falls back to T2 if model is not recognised.
 */
function resolveModelTier(modelId: string): string {
  // Check exact match first
  if (MODEL_TIER_MAP[modelId]) {
    return MODEL_TIER_MAP[modelId]
  }

  // Check partial match (model ID may include provider prefix)
  for (const [pattern, tier] of Object.entries(MODEL_TIER_MAP)) {
    if (modelId.includes(pattern)) {
      return tier
    }
  }

  // Default to T2 (balanced) if unknown
  return 'T2'
}

/**
 * Extract provider name from a provider ID.
 * Provider IDs may be in format "copilot", "anthropic", "ollama", etc.
 */
function extractProviderName(providerID: string): string {
  // Normalise common provider ID variations
  const lower = providerID.toLowerCase()
  if (lower.includes('copilot') || lower.includes('github')) return 'copilot'
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
  if (lower.includes('ollama') || lower.includes('local')) return 'ollama'
  return lower
}

/**
 * Parse Retry-After header value to seconds.
 * Supports both delta-seconds and HTTP-date formats.
 */
function parseRetryAfter(value: string | undefined): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS

  // Try numeric (delta-seconds)
  const numeric = parseInt(value, 10)
  if (!isNaN(numeric) && numeric > 0) return numeric

  // Try HTTP-date
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    const deltaMs = date.getTime() - Date.now()
    return Math.max(1, Math.ceil(deltaMs / 1000))
  }

  return DEFAULT_RETRY_AFTER_SECONDS
}

/**
 * Return emoji for provider status
 */
function statusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅'
    case 'degraded':
      return '⚠️'
    case 'rate_limited':
      return '🚫'
    case 'down':
      return '❌'
    case 'unknown':
      return '⚪'
    default:
      return '❓'
  }
}

// --- Failover state (per-session, in-memory) ---

/**
 * Tracks the last failover swap per session to inject the correct header
 * in chat.headers (which fires after chat.params).
 */
const failoverState: Map<string, { originalProvider: string; originalModel: string }> = new Map()

// --- Toast notification helper ---

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

/**
 * Create a notification function bound to the plugin client.
 * Uses OpenCode's TUI toast API (same as oh-my-opencode).
 * Falls back silently if the toast API is unavailable.
 */
function createNotifier(client: PluginInput['client']) {
  return (message: string, variant: ToastVariant = 'info', duration = 5000): void => {
    client.tui.showToast({
      body: {
        title: 'Provider Failover',
        message,
        variant,
        duration,
      },
    }).catch(() => {
      // Toast API unavailable or TUI not ready — swallow silently
    })
  }
}

// --- Plugin ---

export const ProviderFailoverPlugin: Plugin = async (_input) => {
  const healthManager = new HealthManager()
  const notify = createNotifier(_input.client)

  await notify('Plugin loaded. Health state initialised.', 'info', 3000)

  return {
    /**
     * config hook: Read health state on startup and adjust provider config.
     * Disables providers that are currently rate_limited or down.
     */
    config: async (config) => {
      const disabledProviders = config.disabled_providers || []

      // Check each known provider's health
      for (const providerName of ['copilot', 'anthropic', 'ollama']) {
        const state = healthManager.getProviderState(providerName)

        if (state.status === 'rate_limited' || state.status === 'down') {
          // Don't disable ollama — it's our last resort
          if (providerName === 'ollama') {
            await notify(`${providerName} is ${state.status} but kept as T0 fallback`, 'warning')
            continue
          }

          if (!disabledProviders.includes(providerName)) {
            await notify(`${providerName} is ${state.status} — noted for failover routing`, 'warning')
          }
        }
      }

      // Persist any expired rate limits that were cleared during HealthManager init
      await healthManager.flush()
    },

    /**
     * chat.params hook: Check provider health before each LLM call.
     * If the selected provider is unhealthy, swap to the next healthy
     * provider in the same tier's fallback chain.
     *
     * NOTE: We cannot change `input.model` or `input.provider` directly
     * as they are read-only input. We use `output.options` to signal
     * the desired model/provider override to the runtime.
     */
    'chat.params': async (input, output) => {
      // Guard: provider may not be available in all contexts
      if (!input.provider?.info?.id) {
        await notify('No provider info available — skipping failover check', 'info', 3000)
        return
      }

      // Guard: model may not be available in all contexts
      if (!input.model?.id) {
        await notify('No model info available — skipping failover check', 'info', 3000)
        return
      }

      const currentProviderID = input.provider.info.id
      const currentModelID = input.model.id
      const providerName = extractProviderName(currentProviderID)
      const tier = resolveModelTier(currentModelID)

      // Clear any previous failover state for this session
      failoverState.delete(input.sessionID)

      // Check if current provider is healthy
      const providerState = healthManager.getProviderState(providerName)
      const isHealthy = providerState.status !== 'rate_limited' && providerState.status !== 'down'

      if (isHealthy) {
        // Provider is healthy — no swap needed
        return
      }

      await notify(
        `${providerName} is ${providerState.status} for tier ${tier} — searching fallback chain…`,
        'warning'
      )

      // Get healthy alternatives from the fallback chain
      const healthyProviders = healthManager.getHealthyProviders(tier)

      // Filter out the current unhealthy provider
      const alternatives = healthyProviders.filter(
        (entry) => entry.provider !== providerName
      )

      if (alternatives.length === 0) {
        await notify(
          `No healthy alternatives for tier ${tier} — using original provider as last resort`,
          'warning'
        )
        return
      }

      const selected = alternatives[0]
      const selectedMeta = getProviderMetadata(selected.provider)

      await notify(
        `Swapping ${providerName}/${currentModelID} → ${selected.provider}/${selected.model} (${selectedMeta.costModel})`,
        'warning',
        8000
      )

      // Store failover state for the headers hook
      failoverState.set(input.sessionID, {
        originalProvider: providerName,
        originalModel: currentModelID,
      })

      // Signal the swap via output options
      // The runtime reads these to override the provider/model selection
      output.options = {
        ...output.options,
        'x-failover-provider': selected.provider,
        'x-failover-model': selected.model,
        'x-failover-tier': selected.tier,
        'x-failover-reason': providerState.status,
      }
    },

    /**
     * chat.headers hook: Inject X-Failover-Original-Provider header
     * when a provider swap has occurred in chat.params.
     */
    'chat.headers': async (input, output) => {
      const swap = failoverState.get(input.sessionID)

      if (swap) {
        output.headers['X-Failover-Original-Provider'] = swap.originalProvider
        output.headers['X-Failover-Original-Model'] = swap.originalModel
        output.headers['X-Failover-Timestamp'] = new Date().toISOString()

        // Clean up — one-shot per request
        failoverState.delete(input.sessionID)
      }
    },

    /**
     * event hook: Capture error events to update provider health state.
     *
     * Key events:
     *  - session.error with ApiError (statusCode 429) → markRateLimited
     *  - session.error with ApiError (statusCode 5xx) → recordFailure
     *  - session.error with other errors → recordFailure
     */
    event: async ({ event }) => {
      // Handle session.error events
      if (event.type === 'session.error') {
        const props = event.properties as {
          sessionID?: string
          error?: {
            name: string
            data?: {
              statusCode?: number
              isRetryable?: boolean
              responseHeaders?: Record<string, string>
              message?: string
            }
          }
        }

        if (!props.error) return

        // Determine which provider caused the error
        // We try to extract from the error metadata or use session context
        // For now, we use the error data to identify API errors
        if (props.error.name === 'APIError' && props.error.data) {
          const apiData = props.error.data
          const statusCode = apiData.statusCode || 0

          // Try to extract provider from response headers or metadata
          // The provider ID isn't directly in the error, but we can infer
          // from the error pattern or use the most recent request context
          const providerHint = extractProviderFromError(apiData)

          if (statusCode === 429) {
            // Rate limited — mark provider and set retry-after
            const retryAfter = parseRetryAfter(apiData.responseHeaders?.['retry-after'])

            await notify(
              `Rate limit (429) detected for ${providerHint} — retry after ${retryAfter}s`,
              'error',
              8000
            )

            healthManager.markRateLimited(providerHint, retryAfter)
            await healthManager.flush()
          } else if (statusCode >= 500) {
            // Server error — record failure
            await notify(
              `Server error (${statusCode}) for ${providerHint}: ${apiData.message || 'unknown'}`,
              'error',
              8000
            )

            healthManager.recordFailure(providerHint, {
              status: statusCode,
              message: apiData.message || `HTTP ${statusCode}`,
            })
            await healthManager.flush()
          } else if (statusCode === 403 || statusCode === 401) {
            // Auth error — record failure (may indicate expired token)
            await notify(
              `Auth error (${statusCode}) for ${providerHint}: ${apiData.message || 'unknown'}`,
              'error',
              8000
            )

            healthManager.recordFailure(providerHint, {
              status: statusCode,
              message: apiData.message || `HTTP ${statusCode}`,
            })
            await healthManager.flush()
          }
        }
      }

      // Handle session.status with retry information
      if (event.type === 'session.status') {
        const props = event.properties as {
          sessionID: string
          status: { type: string; attempt?: number; message?: string; next?: number }
        }

        if (props.status.type === 'retry') {
          await notify(
            `Session retry: attempt ${props.status.attempt} — ${props.status.message || 'retrying'}`,
            'info',
            5000
          )
          // Retry events indicate the runtime is handling retries internally.
          // We note it for observability but don't double-count as a failure
          // since the session.error event already captured the root cause.
        }
      }
    },

    /**
     * tool hook: Register the provider-health custom tool
     * Displays provider health state in markdown table format.
     * Supports filters: --provider, --tier, --reset
     */
    tool: {
      'provider-health': tool({
        description: 'Display provider health status and failover chain information',
        args: {
          provider: z.string().optional().describe('Show health for specific provider (copilot, anthropic, ollama)'),
          tier: z.string().optional().describe('Show fallback chain for specific tier (T0, T1, T2, T3)'),
          reset: z.boolean().optional().describe('Clear health state file and reset to defaults'),
        },
        execute: async (args) => {
          // Handle reset
          if (args.reset) {
            const cacheDir = `${process.env.HOME}/.cache/opencode`
            const healthFile = `${cacheDir}/provider-health.json`

            if (existsSync(healthFile)) {
              try {
                unlinkSync(healthFile)
                return '✅ Health state reset successfully. All providers returned to unknown status.'
              } catch (err) {
                return `❌ Failed to reset health state: ${err instanceof Error ? err.message : String(err)}`
              }
            }

            return '✅ Health state already clean (no file to reset).'
          }

          // Get current health data
          const data = healthManager.getAllHealthData()

          // Handle provider-specific filter
          if (args.provider) {
            const providerName = args.provider.toLowerCase()
            const state = healthManager.getProviderState(providerName)

            if (!state || state.status === 'unknown') {
              return `No health data for provider: ${providerName}`
            }

            const meta = getProviderMetadata(providerName)
            const rateLimitInfo = state.rateLimitUntil
              ? `Rate limited until ${state.rateLimitUntil}`
              : 'Not rate limited'

            return `## Provider Health: ${providerName}

| Metric | Value |
|--------|-------|
| Status | ${state.status} |
| Success Rate | ${(state.successRate * 100).toFixed(1)}% |
| P95 Latency | ${state.latencyP95}ms |
| Requests | ${state.requestCount} |
| Failures | ${state.failureCount} |
| Cost Model | ${meta.costModel} |
| Rate Limit Type | ${meta.rateLimit.type} |
| Rate Limit Status | ${rateLimitInfo} |
| Last Checked | ${state.lastChecked} |
${state.lastError ? `| Last Error | ${state.lastError.status} - ${state.lastError.message} |` : ''}
`
          }

          // Handle tier-specific filter
          if (args.tier) {
            const tierName = args.tier.toUpperCase()
            const chain = getFallbackChain(tierName)

            if (chain.length === 0) {
              return `Unknown tier: ${tierName}`
            }

            let output = `## Fallback Chain: ${tierName}\n\n| Order | Provider | Model | Status | Success Rate |\n|-------|----------|-------|--------|---------------|\n`

            for (let i = 0; i < chain.length; i++) {
              const entry = chain[i]
              const state = healthManager.getProviderState(entry.provider)
              const status = state.status === 'unknown' ? '⚪ unknown' : `${statusEmoji(state.status)} ${state.status}`
              const successRate = `${(state.successRate * 100).toFixed(1)}%`

              output += `| ${i + 1} | ${entry.provider} | ${entry.model} | ${status} | ${successRate} |\n`
            }

            return output
          }

          // Full health summary (all providers)
          const providers = Object.keys(data.providers)

          if (providers.length === 0) {
            return `## Provider Health Summary

No health data collected yet. Providers will appear here after first use.

### Available Providers
- **copilot** (T1/T2)
- **anthropic** (T1/T2/T3)
- **ollama** (T0/T1/T2)
`
          }

          let output = `## Provider Health Summary

Last Updated: ${data.lastUpdated}

| Provider | Status | Success Rate | P95 Latency | Requests | Cost Model |
|----------|--------|--------------|-------------|----------|------------|
`

          for (const providerName of ['copilot', 'anthropic', 'ollama']) {
            const state = data.providers[providerName] || healthManager.getProviderState(providerName)
            const meta = getProviderMetadata(providerName)
            const status = state.status === 'unknown' ? '⚪ unknown' : `${statusEmoji(state.status)} ${state.status}`
            const successRate = `${(state.successRate * 100).toFixed(1)}%`
            const latency = state.latencyP95 > 0 ? `${state.latencyP95}ms` : '—'

            output += `| ${providerName} | ${status} | ${successRate} | ${latency} | ${state.requestCount} | ${meta.costModel} |\n`
          }

          output += `\n### Tier Fallback Chains\n\n`

          for (const tier of ['T1', 'T2', 'T3']) {
            const chain = getFallbackChain(tier)
            const providers = chain.map((e) => `${e.provider}/${e.model}`).join(' → ')
            output += `- **${tier}**: ${providers}\n`
          }

          output += `\n### Usage\n\n`
          output += `- \`provider-health --provider=copilot\` — Show copilot-specific health\n`
          output += `- \`provider-health --tier=T1\` — Show T1 fallback chain with health status\n`
          output += `- \`provider-health --reset\` — Clear health state and start fresh\n`

          return output
        },
      }),
    },
  }
}

/**
 * Attempt to extract provider name from API error data.
 *
 * Since the event doesn't directly include the provider ID,
 * we infer from error message patterns, response headers,
 * or response body content.
 */
function extractProviderFromError(apiData: {
  statusCode?: number
  message?: string
  responseHeaders?: Record<string, string>
  responseBody?: string
}): string {
  const message = (apiData.message || '').toLowerCase()
  const body = (apiData.responseBody || '').toLowerCase()
  const headers = apiData.responseHeaders || {}

  // Check for Anthropic-specific patterns
  if (
    message.includes('anthropic') ||
    body.includes('anthropic') ||
    headers['x-request-id']?.startsWith('req_') || // Anthropic request ID pattern
    message.includes('claude')
  ) {
    return 'anthropic'
  }

  // Check for Copilot/GitHub-specific patterns
  if (
    message.includes('copilot') ||
    message.includes('github') ||
    body.includes('copilot') ||
    headers['x-github-request-id'] !== undefined
  ) {
    return 'copilot'
  }

  // Check for Ollama-specific patterns
  if (
    message.includes('ollama') ||
    message.includes('localhost:11434') ||
    body.includes('ollama')
  ) {
    return 'ollama'
  }

  // Default: if we can't determine, assume the most common cloud provider
  // This is a best-effort heuristic — the health manager handles
  // unknown providers gracefully
  return 'unknown'
}
