/** Provider Failover Plugin — rate-limit tracking and alternative suggestions */
import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { HealthManager } from './lib/provider-health'
import { getFallbackChain, getEstimatedTaskCost, getProviderMetadata } from './lib/fallback-config'
import { existsSync, unlinkSync } from 'fs'

const DEFAULT_RETRY_AFTER_SECONDS = 60
const FAILOVER_LOG_FILE = '/home/baphled/.config/opencode/failover.log'


/** Models removed from the opencode service (Feb 2026). Binary v1.2.10 still references them. */
const REMOVED_MODELS = new Set([
  'kimi-k2.5-free',
  'glm-5-free',
  'glm-4.6',
  'kimi-k2-thinking',
  'minimax-m2.5-free',
])
const MODEL_TIER_MAP: Record<string, string> = {
  'gpt-5-nano': 'T1', 'minimax-m2.5-free': 'T1', 'gpt-5-mini': 'T1',
  'claude-haiku-4.5': 'T1', 'gemini-3-flash-preview': 'T1',
  'big-pickle': 'T2', 'gpt-5': 'T2', 'gpt-4.1': 'T2',
  'claude-sonnet-4-0': 'T2', 'claude-sonnet-4.5': 'T2', 'grok-code-fast-1': 'T2',
  'gemini-3-pro-preview': 'T2', 'gemini-2.5-pro': 'T2',
  'claude-opus-4.5': 'T3', 'claude-opus-4.6': 'T3', 'claude-opus-41': 'T3',
  'gpt-5.1': 'T3', 'gpt-5.2': 'T3', 'gpt-5.1-codex': 'T3',
  'gpt-5.1-codex-mini': 'T3', 'gpt-5.1-codex-max': 'T3', 'gpt-5.2-codex': 'T3',
  'kimi-k2.5-free': 'T2', 'glm-5-free': 'T1', 'kimi-k2-thinking': 'T2', 'glm-4.6': 'T1',
}

/** Map agent names to their model tier for proactive routing */
const AGENT_TIER_MAP: Record<string, string> = {
  // T1 — lightweight exploration agents
  'explore': 'T1',
  'librarian': 'T1',

  // T2 — implementation/build agents
  'sisyphus-junior': 'T2',
  'Senior-Engineer': 'T2',
  'QA-Engineer': 'T2',
  'Writer': 'T2',
  'DevOps': 'T2',
  'VHS-Director': 'T2',
  'Embedded-Engineer': 'T2',
  'Knowledge Base Curator': 'T2',
  'Model-Evaluator': 'T2',
  'Code-Reviewer': 'T2',
  'Editor': 'T2',
  'Researcher': 'T2',
  'Data-Analyst': 'T2',
  'Nix-Expert': 'T2',
  'Linux-Expert': 'T2',
  'SysOp': 'T2',

  // T3 — high-reasoning agents
  'oracle': 'T3',
  'metis': 'T3',
  'momus': 'T3',
}

/** Base names of orchestrator agents (lowercase). Used for display-name-aware matching. */
const ORCHESTRATOR_BASE_NAMES = new Set(['sisyphus', 'hephaestus', 'atlas', 'tech-lead'])

/**
 * Check whether an agent is an orchestrator.
 * Handles display names like "Atlas (Plan Executor)" by extracting the
 * first token before any space or parenthesis.
 */
function isOrchestratorByName(agentName: string): boolean {
  // Exact match first (e.g. config key 'Tech-Lead' as-is)
  if (ORCHESTRATOR_BASE_NAMES.has(agentName.toLowerCase())) return true
  // Extract base token: "Atlas (Plan Executor)" -> "atlas"
  const baseToken = agentName.toLowerCase().split(/[\s(]/)[0]
  // Guard: "sisyphus-junior" contains "sisyphus" but is NOT an orchestrator
  if (baseToken.includes('-')) return false
  return ORCHESTRATOR_BASE_NAMES.has(baseToken)
}

function resolveModelTier(modelId: string): string {
  if (MODEL_TIER_MAP[modelId]) return MODEL_TIER_MAP[modelId]
  for (const [pattern, tier] of Object.entries(MODEL_TIER_MAP)) {
    if (modelId.includes(pattern)) return tier
  }
  return 'T2'
}

function extractProviderName(providerID: string): string {
  const lower = providerID.toLowerCase()
  if (lower === 'opencode' || lower.includes('opencode')) return 'opencode'
  if (lower === 'github-copilot' || lower.includes('copilot') || lower.includes('github')) return 'github-copilot'
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
  if (lower.includes('ollama-cloud') || lower.includes('ollama.com')) return 'ollama-cloud'
  if (lower.includes('ollama') || lower.includes('localhost') || lower.includes('local')) return 'ollama'
  return lower
}

function inferProviderFromModel(modelID: string | undefined): string | null {
  if (!modelID) return null
  const lower = modelID.toLowerCase()
  if (lower.includes('kimi') || lower.includes('moonshot')) return 'opencode'
  if (lower.includes('big-pickle') || lower.includes('minimax')) return 'opencode'
  if (lower === 'gpt-5-nano') return 'opencode'
  if (lower.includes('gpt-5') || lower.includes('gpt-4') || lower.includes('codex')) return 'github-copilot'
  if (lower.includes('claude') || lower.includes('gemini') || lower.includes('grok')) return 'github-copilot'
  if (lower.includes('anthropic')) return 'anthropic'
  if (lower.includes('llama') || lower.includes('phi')) return 'ollama'
  return null
}

function debugLog(message: string): void {
  try {
    const fs = require('fs')
    fs.appendFileSync(FAILOVER_LOG_FILE, `[${new Date().toISOString()}] ${message}\n`)
  } catch { /* ignore */ }
}

type ToastVariant = 'info' | 'success' | 'warning' | 'error'
function createNotifier(client: PluginInput['client']) {
  return (message: string, variant: ToastVariant = 'info', duration = 5000): void => {
    client.tui.showToast({ body: { title: 'Provider Failover', message, variant, duration } }).catch(() => {})
  }
}

const lastModelBySession: Map<string, { provider: string; model: string }> = new Map()

/** Clear all thinking-related keys from provider options when switching to a non-thinking model */
function clearThinkingOptions(options: Record<string, any>): void {
  delete options['thinking']
  delete options['effort']
  delete options['thinking_budget']
  delete options['thinkingConfig']
  delete options['thinkingLevel']
}

/** Returns true for Claude models that support extended thinking */
function modelSupportsThinking(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return lower.includes('claude-opus') || lower.includes('claude-sonnet')
}

const ProviderFailoverPlugin: Plugin = async (_input) => {
  const healthManager = new HealthManager()
  const notify = createNotifier(_input.client)
  await notify('Plugin loaded. Health state initialised.', 'info', 3000)

  return {
    'chat.params': async (input, output) => {
      // 1. Early returns
      if (!input.model?.id) return
      if (REMOVED_MODELS.has(input.model.id)) {
        debugLog(`REMOVED MODEL: ${input.model.id} — no longer exists on opencode service. Skipping hook.`)
        return
      }

      // 2. Extract current provider and tier info
      let currentProviderID = (input.provider as any)?.id ?? input.provider?.info?.id
      if (!currentProviderID) {
        currentProviderID = inferProviderFromModel(input.model.id) || input.model.id.split('/')[0] || input.model.id
      }
      const providerName = extractProviderName(currentProviderID)
      const modelTier = resolveModelTier(input.model.id)
      const healthKey = `${providerName}/${input.model.id}`

      // 3. Determine agent identity
      const agentName = (input.agent as any)?.name as string | undefined
      const isOrchestratorAgent = agentName ? isOrchestratorByName(agentName) : true
      // If no agent name, treat as orchestrator (parent session) — do not proactively switch

      // 4. Subagent proactive routing
      if (!isOrchestratorAgent && agentName) {
        const agentTier = AGENT_TIER_MAP[agentName] || 'T2'

        if (healthManager.isRateLimited(healthKey)) {
          const alternatives = healthManager.getHealthyAlternatives(agentTier)
          if (alternatives.length > 0) {
            const pick = alternatives[0]
            const newKey = `${pick.provider}/${pick.model}`
            debugLog(`SWITCH: agent=${agentName} tier=${agentTier} ${healthKey} -> ${newKey}`)
            input.model.id = pick.model
            input.provider = { id: pick.provider, info: { id: pick.provider } } as any
            if (!modelSupportsThinking(pick.model)) {
              clearThinkingOptions(output.options)
            }
            await notify(`🔄 ${agentName} (${agentTier}): switched to ${newKey} (rate limited: ${healthKey})`, 'warning', 6000)
          } else {
            debugLog(`RATE LIMITED: agent=${agentName} ${healthKey} — no healthy alternatives for tier ${agentTier}`)
          }
        }

        // Always log and record usage for the model actually being used
        const finalProvider = (input.provider as any)?.id ?? providerName
        const finalModel = input.model.id
        const previousModel = lastModelBySession.get(input.sessionID)
        const isNewOrChanged = !previousModel || previousModel.provider !== finalProvider || previousModel.model !== finalModel
        if (isNewOrChanged) {
          debugLog(`MODEL: session=${input.sessionID} agent=${agentName} using ${finalProvider}/${finalModel} (${agentTier})`)
        }
        lastModelBySession.set(input.sessionID, { provider: finalProvider, model: finalModel })
        healthManager.recordUsage(finalProvider)
        healthManager.flush().catch(() => {})
        return
      }

      // 5. Orchestrator / parent session — no proactive switching
      // Just log model usage and record it
      if (healthManager.isRateLimited(healthKey)) {
        const expiry = healthManager.getRateLimitExpiry(healthKey)
        const expiryText = expiry ? ` until ${new Date(expiry).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''
        await notify(`⚠️ ${healthKey} rate limited${expiryText}`, 'warning', 8000)
      }

      const previousModel = lastModelBySession.get(input.sessionID)
      const isNewOrChanged = !previousModel || previousModel.provider !== providerName || previousModel.model !== input.model.id
      if (isNewOrChanged) {
        debugLog(`MODEL: session=${input.sessionID} agent=${agentName || 'orchestrator'} using ${providerName}/${input.model.id} (${modelTier})`)
      }
      lastModelBySession.set(input.sessionID, { provider: providerName, model: input.model.id })
      healthManager.recordUsage(providerName)
      healthManager.flush().catch(() => {})
    },

    event: async ({ event }) => {
      if (event.type !== 'session.status') return
      const props = event.properties as {
        sessionID: string
        status: { type: string; attempt?: number; message?: string; next?: number }
      }
      if (props.status.type !== 'retry') return
      const message = (props.status.message || '').toLowerCase()
      const isRateLimit = message.includes('rate limit') || message.includes('too many requests') || message.includes('429')
      if (!isRateLimit) {
        debugLog(`RETRY (non-rate-limit): session=${props.sessionID}, attempt=${props.status.attempt}`)
        return
      }
      const sessionInfo = lastModelBySession.get(props.sessionID)
      if (!sessionInfo) {
        debugLog(`RATE LIMIT detected but no session info for ${props.sessionID}`)
        return
      }
      const healthKey = `${sessionInfo.provider}/${sessionInfo.model}`
      let retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS
      if (props.status.next) {
        retryAfterSeconds = Math.max(1, Math.ceil((props.status.next - Date.now()) / 1000))
      }
      debugLog(`RATE LIMIT: ${healthKey}, retryAfter=${retryAfterSeconds}s`)
      healthManager.markRateLimited(healthKey, retryAfterSeconds)
      await healthManager.flush()
      const tier = resolveModelTier(sessionInfo.model)
      const alternatives = healthManager.getHealthyAlternatives(tier, healthKey)
      const altText = alternatives.length > 0
        ? ` Switch to ${alternatives[0].provider}/${alternatives[0].model}`
        : ' No healthy alternatives available'
      await notify(`🚫 ${healthKey} rate limited (attempt ${props.status.attempt}).${altText}`, 'error', 8000)
    },

    tool: {
      'provider-health': tool({
        description: 'Display provider health status and failover chain information. Use recommend=true with tier to get the best available model before delegating to an agent.',
        args: {
          tier: tool.schema.string().optional().describe('Show fallback chain for specific tier (T0, T1, T2, T3)'),
          reset: tool.schema.boolean().optional().describe('Clear health state file and reset'),
          recommend: tool.schema.boolean().optional().describe('Return the first healthy provider/model for the given tier. Requires tier parameter. Use BEFORE delegating to check rate limits and capacity.'),
          estimated_requests: tool.schema.number().optional().describe('Estimated number of requests the task will need. Used with recommend to skip providers without enough remaining capacity. Defaults to tier estimate if omitted.'),
        },
        execute: async (args) => {
          if (args.reset) {
            const healthFile = `${process.env.HOME}/.cache/opencode/provider-health.json`
            if (existsSync(healthFile)) {
              try { unlinkSync(healthFile); return '✅ Health state reset.' }
              catch (err) { return `❌ Reset failed: ${err instanceof Error ? err.message : String(err)}` }
            }
            return '✅ Health state already clean.'
          }
          if (args.recommend) {
            if (!args.tier) return '❌ `recommend` requires a `tier` parameter (T0, T1, T2, T3).'
            const tierKey = args.tier.toUpperCase()
            const chain = getFallbackChain(tierKey)
            if (chain.length === 0) return `❌ Unknown tier: ${args.tier}`
            const estimatedCost = args.estimated_requests ?? getEstimatedTaskCost(tierKey)
            const healthy = healthManager.getHealthyAlternatives(tierKey)
            const skippedForCapacity: Array<{ provider: string; model: string; remaining: number }> = []
            let pick: typeof healthy[0] | null = null
            for (const candidate of healthy) {
              const remaining = healthManager.getRemainingCapacity(candidate.provider)
              if (remaining !== null && remaining < estimatedCost) {
                skippedForCapacity.push({ provider: candidate.provider, model: candidate.model, remaining })
                continue
              }
              pick = candidate
              break
            }
            if (pick) {
              const remaining = healthManager.getRemainingCapacity(pick.provider)
              const capacityNote = remaining !== null ? ` [${remaining} requests remaining]` : ''
              const altCount = healthy.length - skippedForCapacity.length - 1
              let result = `✅ **${pick.provider}/${pick.model}** (${tierKey})${capacityNote}`
              if (altCount > 0) result += ` — ${altCount} more alternative(s) available`
              if (skippedForCapacity.length > 0) {
                const skippedNames = skippedForCapacity.map(s => `${s.provider}/${s.model} (${s.remaining} left)`).join(', ')
                result += `\n⚠️ Skipped (insufficient capacity for ~${estimatedCost} requests): ${skippedNames}`
              }
              return result
            }
            if (skippedForCapacity.length > 0) {
              const best = skippedForCapacity.sort((a, b) => b.remaining - a.remaining)[0]
              return `⚠️ No provider in ${tierKey} has enough capacity for ~${estimatedCost} requests. ` +
                `Best available: **${best.provider}/${best.model}** with ${best.remaining} remaining. ` +
                `Consider a lower tier or wait for limits to reset.`
            }
            const status = healthManager.getAllStatus()
            const limitedEntries = chain
              .map(e => ({ ...e, key: `${e.provider}/${e.model}` }))
              .filter(e => status[e.key]?.rateLimitedUntil)
            if (limitedEntries.length > 0) {
              const soonest = limitedEntries
                .map(e => ({ ...e, expiry: new Date(status[e.key].rateLimitedUntil!).getTime() }))
                .sort((a, b) => a.expiry - b.expiry)[0]
              const expiryTime = new Date(soonest.expiry).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              return `⚠️ All ${tierKey} models rate limited. Soonest available: **${soonest.provider}/${soonest.model}** at ${expiryTime}`
            }
            return `⚠️ No healthy models available for ${tierKey}.`
          }
          if (args.tier) {
            const chain = getFallbackChain(args.tier.toUpperCase())
            if (chain.length === 0) return `Unknown tier: ${args.tier}`
            let output = `## Fallback Chain: ${args.tier.toUpperCase()}\n\n| # | Provider | Model | Rate Limited | Capacity |\n|---|----------|-------|--------------|-----------|\n`
            const status = healthManager.getAllStatus()
            for (let i = 0; i < chain.length; i++) {
              const e = chain[i]
              const key = `${e.provider}/${e.model}`
              const rl = status[key]?.rateLimitedUntil
              const remaining = healthManager.getRemainingCapacity(e.provider)
              const meta = getProviderMetadata(e.provider)
              const capacityText = remaining !== null
                ? `${remaining}/${meta.rateLimit.threshold} ${meta.rateLimit.type === 'monthly' ? 'monthly' : '/min'}`
                : '∞'
              output += `| ${i + 1} | ${e.provider} | ${e.model} | ${rl ? `Until ${rl}` : '✅'} | ${capacityText} |\n`
            }
            return output
          }
          const status = healthManager.getAllStatus()
          if (Object.keys(status).length === 0) return '✅ No providers are currently rate limited.'
          let output = '## Rate Limited Providers\n\n| Provider/Model | Until |\n|----------------|-------|\n'
          for (const [key, val] of Object.entries(status)) {
            output += `| ${key} | ${val.rateLimitedUntil} |\n`
          }
          return output
        },
      }),
    },
  }
}

export default ProviderFailoverPlugin
