/**
 * Fallback Chain Configuration Schema
 * 
 * Defines tier-to-provider mappings for: OpenCode Zen, GitHub Copilot, Anthropic, Ollama.
 */

/**
 * A single entry in a fallback chain
 */
export interface ProviderEntry {
  provider: string;
  model: string;
  tier: string;
  /** Whether this provider supports tools/MCP. Local Ollama does not. */
  supportsTools?: boolean;
}

/**
 * Rate limit configuration for a provider
 */
export interface RateLimitConfig {
  type: 'monthly' | 'per-minute' | 'none';
  threshold?: number;
  resetIntervalMs?: number;
}

/**
 * Cost model for a provider
 */
export type CostModel = 'subscription' | 'per-token' | 'free';

/**
 * Metadata about a provider
 */
export interface ProviderMetadata {
  provider: string;
  costModel: CostModel;
  rateLimit: RateLimitConfig;
  description: string;
  /** Whether this provider supports tools/MCP. Local Ollama does not. */
  supportsTools?: boolean;
}

/**
 * Tier configuration mapping
 */
export interface TierConfig {
  tier: string;
  chain: ProviderEntry[];
}

/**
 * Get the fallback chain for a given tier
 * 
 * @param tier - T0, T1, T2, or T3
 * @returns Ordered list of providers to try in sequence
 */
export function getFallbackChain(tier: string): ProviderEntry[] {
  const chains: Record<string, ProviderEntry[]> = {
    T0: [
      { provider: 'ollama', model: 'llama3.2:1b', tier: 'T0', supportsTools: false },
      { provider: 'ollama', model: 'phi4', tier: 'T0', supportsTools: false },
    ],
    T1: [
      { provider: 'opencode', model: 'gpt-5-nano', tier: 'T1' },
      { provider: 'github-copilot', model: 'gpt-5-mini', tier: 'T1' },
      { provider: 'github-copilot', model: 'claude-haiku-4.5', tier: 'T1' },
      { provider: 'anthropic', model: 'claude-haiku-4-5', tier: 'T1' },
      { provider: 'github-copilot', model: 'gemini-3-flash-preview', tier: 'T1' },
      { provider: 'ollama-cloud', model: 'llama3.1-8b', tier: 'T1' },
      { provider: 'ollama', model: 'phi4', tier: 'T0', supportsTools: false },
    ],
    T2: [
      { provider: 'github-copilot', model: 'claude-sonnet-4-0', tier: 'T2' },
      { provider: 'github-copilot', model: 'gpt-5', tier: 'T2' },
      { provider: 'github-copilot', model: 'claude-sonnet-4.5', tier: 'T2' },
      { provider: 'anthropic', model: 'claude-sonnet-4-5', tier: 'T2' },
      { provider: 'anthropic', model: 'claude-sonnet-4-0', tier: 'T2' },
      { provider: 'github-copilot', model: 'gpt-4.1', tier: 'T2' },
      { provider: 'opencode', model: 'big-pickle', tier: 'T2' },
      { provider: 'github-copilot', model: 'gemini-2.5-pro', tier: 'T2' },
      { provider: 'github-copilot', model: 'grok-code-fast-1', tier: 'T2' },
      { provider: 'github-copilot', model: 'gemini-3-pro-preview', tier: 'T2' },
      { provider: 'ollama-cloud', model: 'llama3.2-13b', tier: 'T2' },
      { provider: 'ollama', model: 'llama3.2:1b', tier: 'T0', supportsTools: false }
    ],
    T3: [
      { provider: 'github-copilot', model: 'claude-opus-4.6', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.2', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.2-codex', tier: 'T3' },
      { provider: 'github-copilot', model: 'claude-opus-4.5', tier: 'T3' },
      { provider: 'github-copilot', model: 'claude-opus-41', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.1', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.1-codex', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.1-codex-mini', tier: 'T3' },
      { provider: 'github-copilot', model: 'gpt-5.1-codex-max', tier: 'T3' },
      { provider: 'ollama-cloud', model: 'llama3.1-70b', tier: 'T3' },
      { provider: 'anthropic', model: 'claude-opus-4-6', tier: 'T3' },
    ],
  };

  return chains[tier] || [];
}

/**
 * Get metadata for a provider
 * 
 * @param provider - Provider name (copilot, anthropic, ollama)
 * @returns Provider metadata including cost model and rate limit config
 */
export function getProviderMetadata(provider: string): ProviderMetadata {
  const metadata: Record<string, ProviderMetadata> = {
    'opencode': {
      provider: 'opencode',
      costModel: 'free',
      rateLimit: { type: 'per-minute', threshold: 60, resetIntervalMs: 60 * 1000 },
      description: 'OpenCode Zen (Big Pickle, GPT-5 Nano — Kimi/GLM/MiniMax removed Feb 2026)',
      supportsTools: true,
    },
    'github-copilot': {
      provider: 'github-copilot',
      costModel: 'subscription',
      rateLimit: { type: 'monthly', threshold: 300, resetIntervalMs: 30 * 24 * 60 * 60 * 1000 },
      description: 'GitHub Copilot (subscription-based, 300 requests/month)',
      supportsTools: true,
    },
    anthropic: {
      provider: 'anthropic',
      costModel: 'per-token',
      rateLimit: { type: 'per-minute', threshold: 50, resetIntervalMs: 60 * 1000 },
      description: 'Anthropic API (per-token billing)',
      supportsTools: true,
    },
    ollama: {
      provider: 'ollama',
      costModel: 'free',
      rateLimit: { type: 'none' },
      description: 'Ollama local (free, always available, no tools/MCP)',
      supportsTools: false,
    },
    'ollama-cloud': {
      provider: 'ollama-cloud',
      costModel: 'per-token',
      rateLimit: { type: 'per-minute', threshold: 100, resetIntervalMs: 60 * 1000 },
      description: 'Ollama Cloud (cloud-hosted models via ollama.com API)',
      supportsTools: true,
    },
  };

  return (
    metadata[provider] || {
      provider,
      costModel: 'free',
      rateLimit: { type: 'none' },
      description: 'Unknown provider',
    }
  );
}

/**
 * Estimated request cost per tier.
 *
 * These are conservative defaults. The orchestrator can override
 * with a specific estimate when calling provider-health(recommend=true).
 *
 * T0: Local model, single request
 * T1: Explore/librarian — lightweight search, 1-3 requests
 * T2: Implementation/build — multiple tool calls, iterations, 5-15 requests
 * T3: Oracle/ultrabrain — complex reasoning, fewer but heavier, 3-10 requests
 */
const TIER_COST_ESTIMATES: Record<string, number> = {
  T0: 1,
  T1: 3,
  T2: 10,
  T3: 5,
};

/**
 * Get the estimated request cost for a task in a given tier.
 *
 * @param tier - T0, T1, T2, or T3
 * @returns Estimated number of requests the task will consume
 */
export function getEstimatedTaskCost(tier: string): number {
  return TIER_COST_ESTIMATES[tier] ?? TIER_COST_ESTIMATES['T2'];
}

/**
 * Get all tier configurations
 * 
 * @returns Array of all tier configurations
 */
export function getAllTierConfigs(): TierConfig[] {
  return ['T0', 'T1', 'T2', 'T3'].map((tier) => ({
    tier,
    chain: getFallbackChain(tier),
  }));
}
