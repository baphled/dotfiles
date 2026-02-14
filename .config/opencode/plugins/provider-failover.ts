/**
 * Provider Failover Routing Plugin
 *
 * Monitors provider health and warns users when their selected model is
 * rate-limited or down. Cannot automatically swap models (OpenCode plugin API
 * limitation) but provides actionable notifications suggesting alternatives.
 *
 * Hooks:
 *  - config: reads health state on startup, reports unhealthy providers
 *  - chat.params: pre-flight health check — warns if model is rate limited,
 *    suggests healthy alternative from the tier's fallback chain
 *  - event: captures session.error (non-retryable) and session.status (retry)
 *    events to update provider health state
 *
 * Architecture note: OpenCode swallows 429 errors internally (retries in
 * processor.ts). Rate limits are detected via session.status retry events,
 * NOT session.error. The chat.params hook cannot change the model — input.model
 * is read-only and output only supports temperature/topP/topK/options.
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
  'gpt-5-nano': 'T1',
  'minimax-m2.5-free': 'T1',
  'gpt-5-mini': 'T1',
  'claude-haiku-4.5': 'T1',
  'gemini-3-flash-preview': 'T1',
  // T2 (Balanced)
  'big-pickle': 'T2',
  'kimi-k2.5-free': 'T2',
  'gpt-5': 'T2',
  'gpt-4.1': 'T2',
  'claude-sonnet-4': 'T2',
  'claude-sonnet-4.5': 'T2',
  'grok-code-fast-1': 'T2',
  'gemini-3-pro-preview': 'T2',
  'gemini-2.5-pro': 'T2',
  // T3 (Premium)
  'claude-opus-4.5': 'T3',
  'claude-opus-4.6': 'T3',
  'claude-opus-41': 'T3',
  'gpt-5.1': 'T3',
  'gpt-5.2': 'T3',
  'gpt-5.1-codex': 'T3',
  'gpt-5.1-codex-mini': 'T3',
  'gpt-5.1-codex-max': 'T3',
  'gpt-5.2-codex': 'T3',
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
  const lower = providerID.toLowerCase()
  if (lower === 'opencode' || lower.includes('opencode')) return 'opencode'
  if (lower === 'github-copilot' || lower.includes('copilot') || lower.includes('github')) return 'github-copilot'
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
  if (lower.includes('ollama-cloud') || lower.includes('ollama.com')) return 'ollama-cloud'
  if (lower.includes('ollama') || lower.includes('localhost') || lower.includes('local')) return 'ollama'
  return lower
}

/**
 * Infer provider name from model ID when provider.info.id is unavailable.
 * This handles cases like Kimi (OpenCode Zen) where provider.info.id is missing
 * but model.id is available.
 */
function inferProviderFromModel(modelID: string | undefined): string | null {
  if (!modelID) return null
  const lower = modelID.toLowerCase()
  // OpenCode Zen models
  if (lower.includes('kimi') || lower.includes('moonshot')) return 'opencode'
  if (lower.includes('big-pickle')) return 'opencode'
  if (lower.includes('minimax')) return 'opencode'
  if (lower === 'gpt-5-nano') return 'opencode'
  // GitHub Copilot models
  if (lower.includes('gpt-5') || lower.includes('gpt-4') || lower.includes('codex')) return 'github-copilot'
  if (lower.includes('claude')) return 'github-copilot'
  if (lower.includes('gemini')) return 'github-copilot'
  if (lower.includes('grok')) return 'github-copilot'
  // Direct Anthropic
  if (lower.includes('anthropic')) return 'anthropic'
  // Ollama
  if (lower.includes('llama') || lower.includes('phi')) return 'ollama'
  return null
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

// --- Session tracking state (in-memory) ---

/**
 * Tracks the last model used per provider for error reporting.
 * Used to include model info in rate limit notifications.
 */
const lastModelByProvider: Map<string, string> = new Map()

/**
 * Tracks the last provider+model used per session for session.status
 * event correlation. When a retry event fires, we look up which
 * provider+model the session was using to mark it rate limited.
 */
const lastModelBySession: Map<string, { provider: string; model: string }> = new Map()

// --- Debug Logger ---
const FAILOVER_LOG_FILE = '/home/baphled/.config/opencode/failover.log'

function debugLog(message: string): void {
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] ${message}\n`
  try {
    const fs = require('fs')
    fs.appendFileSync(FAILOVER_LOG_FILE, entry)
  } catch {
    // Silently ignore logging failures
  }
}

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
      for (const providerName of ['opencode', 'github-copilot', 'anthropic', 'ollama', 'ollama-cloud']) {
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
     * chat.params hook: Pre-flight health check before each LLM call.
     *
     * If the selected provider+model is rate limited or down, shows a
     * warning notification suggesting the best healthy alternative.
     *
     * NOTE: Cannot change the model — input.model is read-only and
     * output only supports temperature/topP/topK/options. We can only
     * warn the user to manually switch.
     */
    'chat.params': async (input, _output) => {
      // Guard: model is required for tier resolution
      if (!input.model?.id) {
        notify('No model info - skipping failover', 'warning', 3000)
        return
      }

      // Get provider ID — runtime shape has provider.id directly,
      // but TypeScript types declare provider.info.id. Try both paths.
      let currentProviderID = (input.provider as any)?.id ?? input.provider?.info?.id

      if (!currentProviderID) {
        const inferredProvider = inferProviderFromModel(input.model.id)
        if (inferredProvider) {
          currentProviderID = inferredProvider
        } else {
          currentProviderID = input.model.id.split('/')[0] || input.model.id
        }
      }

      const currentModelID = input.model.id
      const providerName = extractProviderName(currentProviderID)
      const tier = resolveModelTier(currentModelID)
      const healthKey = `${providerName}/${currentModelID}`

      // Track the last model used per provider and per session
      lastModelByProvider.set(providerName, currentModelID)
      lastModelBySession.set(input.sessionID, { provider: providerName, model: currentModelID })

      // Check if current provider+model is healthy
      const providerState = healthManager.getProviderState(healthKey)
      debugLog(`HEALTH CHECK: ${healthKey} -> status=${providerState.status}, rateLimitUntil=${providerState.rateLimitUntil || 'none'}`)
      const isHealthy = providerState.status !== 'rate_limited' && providerState.status !== 'down'

      if (isHealthy) {
        // Provider is healthy — no action needed
        debugLog(`HEALTH CHECK: ${healthKey} is healthy, no action needed`)
        return
      }

      // Model is unhealthy — find alternative and warn user
      debugLog(`HEALTH CHECK: ${healthKey} is ${providerState.status}, searching fallbacks for warning...`)

      // Build expiry info for notification
      let expiryInfo = ''
      if (providerState.rateLimitUntil) {
        const expiry = new Date(providerState.rateLimitUntil)
        expiryInfo = ` until ${expiry.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      }

      // Get healthy alternatives from the fallback chain
      const healthyProviders = healthManager.getHealthyProviders(tier)
      const alternatives = healthyProviders.filter(
        (entry) => `${entry.provider}/${entry.model}` !== healthKey
      )

      debugLog(`FALLBACK: tier=${tier}, alternatives=${alternatives.length}, providers=${alternatives.map(p => `${p.provider}/${p.model}`).join(', ')}`)

      if (alternatives.length > 0) {
        const best = alternatives[0]
        await notify(
          `⚠️ ${healthKey} is rate limited${expiryInfo}. Switch to ${best.provider}/${best.model} for immediate response.`,
          'warning',
          8000
        )
      } else {
        await notify(
          `⚠️ ${healthKey} is rate limited${expiryInfo}. No healthy alternatives available for tier ${tier}.`,
          'error',
          8000
        )
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
      // Log ALL events to understand what we receive
      debugLog(`EVENT: type=${event.type} props=${JSON.stringify(event.properties).substring(0, 500)}`)

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
             const modelUsed = lastModelByProvider.get(providerHint) || 'unknown'
             const healthKey = `${providerHint}/${modelUsed}`

             await notify(
               `Rate limit (429) for ${providerHint}/${modelUsed} — retry after ${retryAfter}s`,
               'error',
               8000
             )
             debugLog(`RATE LIMIT: ${healthKey} marked rate_limited for ${retryAfter}s`)

             healthManager.markRateLimited(healthKey, retryAfter)
             await healthManager.flush()
           } else if (statusCode >= 500) {
             // Server error — record failure
             const modelUsed = lastModelByProvider.get(providerHint) || 'unknown'
             const healthKey = `${providerHint}/${modelUsed}`
             await notify(
               `Server error (${statusCode}) for ${providerHint}/${modelUsed}: ${apiData.message || 'unknown'}`,
               'error',
               8000
             )

             healthManager.recordFailure(healthKey, {
               status: statusCode,
               message: apiData.message || `HTTP ${statusCode}`,
             })
             await healthManager.flush()
           } else if (statusCode === 403 || statusCode === 401) {
             // Auth error — record failure (may indicate expired token)
             const modelUsed = lastModelByProvider.get(providerHint) || 'unknown'
             const healthKey = `${providerHint}/${modelUsed}`
             await notify(
               `Auth error (${statusCode}) for ${providerHint}/${modelUsed}: ${apiData.message || 'unknown'}`,
               'error',
               8000
             )

             healthManager.recordFailure(healthKey, {
               status: statusCode,
               message: apiData.message || `HTTP ${statusCode}`,
             })
             await healthManager.flush()
          }
        } else {
          // Debug: log non-API errors to understand what's happening
          const errorName = props.error?.name || 'unknown'
          const errorData = props.error?.data
          const statusCode = errorData?.statusCode || 0
          const providerHint = extractProviderFromError(errorData || {})
          
          notify(
            `Error: ${errorName} (${statusCode}) from ${providerHint}`,
            'info',
            3000
          )
        }
      }

      // Handle session.status with retry information
      // CRITICAL: This is the PRIMARY rate limit detection path.
      // OpenCode swallows 429s internally (retries in processor.ts).
      // session.error NEVER fires for rate limits — only session.status
      // with type="retry" and message containing rate limit keywords.
      if (event.type === 'session.status') {
        const props = event.properties as {
          sessionID: string
          status: { type: string; attempt?: number; message?: string; next?: number }
        }

        if (props.status.type === 'retry') {
          const message = (props.status.message || '').toLowerCase()
          const isRateLimit = message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('429')

          if (isRateLimit) {
            // Look up which provider+model this session was using
            const sessionInfo = lastModelBySession.get(props.sessionID)
            const providerName = sessionInfo?.provider || 'unknown'
            const modelName = sessionInfo?.model || 'unknown'
            const healthKey = `${providerName}/${modelName}`

            // Calculate retry-after from the next timestamp
            let retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS
            if (props.status.next) {
              retryAfterSeconds = Math.max(1, Math.ceil((props.status.next - Date.now()) / 1000))
            }

            debugLog(`RATE LIMIT DETECTED via session.status: ${healthKey}, retryAfter=${retryAfterSeconds}s, attempt=${props.status.attempt}`)

            // Mark the provider+model as rate limited
            healthManager.markRateLimited(healthKey, retryAfterSeconds)
            await healthManager.flush()

            // Find alternatives to suggest
            const tier = resolveModelTier(modelName)
            const healthyProviders = healthManager.getHealthyProviders(tier)
            const alternatives = healthyProviders.filter(
              (entry) => `${entry.provider}/${entry.model}` !== healthKey
            )

            const altText = alternatives.length > 0
              ? ` Switch to ${alternatives[0].provider}/${alternatives[0].model}`
              : ' No healthy alternatives available'

            await notify(
              `🚫 ${providerName}/${modelName} rate limited (attempt ${props.status.attempt}).${altText}`,
              'error',
              8000
            )
          } else {
            // Non-rate-limit retry (e.g., overloaded, network error)
            debugLog(`RETRY (non-rate-limit): session=${props.sessionID}, attempt=${props.status.attempt}, message=${props.status.message}`)
            await notify(
              `Session retry: attempt ${props.status.attempt} — ${props.status.message || 'retrying'}`,
              'info',
              5000
            )
          }
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
- **opencode** (T1/T2 — OpenCode Zen free models)
- **github-copilot** (T1/T2/T3 — subscription)
- **anthropic** (T2/T3 — per-token)
- **ollama** (T0 — local fallback)
`
          }

          let output = `## Provider Health Summary

Last Updated: ${data.lastUpdated}

| Provider | Status | Success Rate | P95 Latency | Requests | Cost Model |
|----------|--------|--------------|-------------|----------|------------|
`

          for (const providerName of ['opencode', 'github-copilot', 'anthropic', 'ollama', 'ollama-cloud']) {
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
          output += `- \`provider-health --provider=github-copilot\` — Show GitHub Copilot health\n`
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

  // Check for OpenCode Zen patterns
  if (
    message.includes('opencode') ||
    message.includes('kimi') || message.includes('moonshot') ||
    message.includes('big-pickle') || message.includes('minimax') ||
    body.includes('opencode')
  ) {
    return 'opencode'
  }

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
    return 'github-copilot'
  }

  // Check for Ollama Cloud patterns (before local ollama)
  if (
    message.includes('ollama.com') ||
    body.includes('ollama.com') ||
    headers['x-ollama-request-id'] !== undefined
  ) {
    return 'ollama-cloud'
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
