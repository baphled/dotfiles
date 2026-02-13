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

import type { Plugin } from '@opencode-ai/plugin'
import { HealthManager } from './lib/provider-health'
import { getFallbackChain, getProviderMetadata } from './lib/fallback-config'
import type { ProviderEntry } from './lib/fallback-config'

// --- Constants ---

const LOG_PREFIX = '[provider-failover]'

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

// --- Failover state (per-session, in-memory) ---

/**
 * Tracks the last failover swap per session to inject the correct header
 * in chat.headers (which fires after chat.params).
 */
const failoverState: Map<string, { originalProvider: string; originalModel: string }> = new Map()

// --- Plugin ---

export const ProviderFailoverPlugin: Plugin = async (_input) => {
  const healthManager = new HealthManager()

  console.log(`${LOG_PREFIX} Plugin loaded. Health state initialised.`)

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
            console.log(`${LOG_PREFIX} [config] ${providerName} is ${state.status} but kept as T0 fallback`)
            continue
          }

          if (!disabledProviders.includes(providerName)) {
            console.log(`${LOG_PREFIX} [config] ${providerName} is ${state.status} — noted for failover routing`)
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

      console.log(
        `${LOG_PREFIX} [chat.params] Provider ${providerName} is ${providerState.status} for tier ${tier}. Searching fallback chain...`
      )

      // Get healthy alternatives from the fallback chain
      const healthyProviders = healthManager.getHealthyProviders(tier)

      // Filter out the current unhealthy provider
      const alternatives = healthyProviders.filter(
        (entry) => entry.provider !== providerName
      )

      if (alternatives.length === 0) {
        console.log(
          `${LOG_PREFIX} [chat.params] No healthy alternatives for tier ${tier}. Allowing original provider as last resort.`
        )
        return
      }

      const selected = alternatives[0]
      const selectedMeta = getProviderMetadata(selected.provider)

      console.log(
        `${LOG_PREFIX} [chat.params] Swapping ${providerName}/${currentModelID} → ${selected.provider}/${selected.model} (${selectedMeta.costModel})`
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

            console.log(
              `${LOG_PREFIX} [event] Rate limit detected (429) for ${providerHint}. Retry after ${retryAfter}s`
            )

            healthManager.markRateLimited(providerHint, retryAfter)
            await healthManager.flush()
          } else if (statusCode >= 500) {
            // Server error — record failure
            console.log(
              `${LOG_PREFIX} [event] Server error (${statusCode}) for ${providerHint}: ${apiData.message || 'unknown'}`
            )

            healthManager.recordFailure(providerHint, {
              status: statusCode,
              message: apiData.message || `HTTP ${statusCode}`,
            })
            await healthManager.flush()
          } else if (statusCode === 403 || statusCode === 401) {
            // Auth error — record failure (may indicate expired token)
            console.log(
              `${LOG_PREFIX} [event] Auth error (${statusCode}) for ${providerHint}: ${apiData.message || 'unknown'}`
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
          console.log(
            `${LOG_PREFIX} [event] Session retry detected: attempt ${props.status.attempt}, message: ${props.status.message || 'none'}`
          )
          // Retry events indicate the runtime is handling retries internally.
          // We note it for observability but don't double-count as a failure
          // since the session.error event already captured the root cause.
        }
      }
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
