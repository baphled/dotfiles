/**
 * Fallback Chain Configuration Schema
 * 
 * Defines tier-to-provider mappings and provider metadata for LLM failover routing.
 * Hardcoded for the 3 known providers: Copilot, Anthropic, Ollama.
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
      // Local Ollama - use without tools/MCP (unreliable)
      {
        provider: 'ollama',
        model: 'granite4-tools',
        tier: 'T0',
        supportsTools: false,
      },
      {
        provider: 'ollama',
        model: 'qwen2.5:7b-instruct',
        tier: 'T0',
        supportsTools: false,
      },
    ],
    T1: [
      {
        provider: 'copilot',
        model: 'gpt-4o-mini',
        tier: 'T1',
      },
      {
        provider: 'anthropic',
        model: 'claude-haiku-4-5',
        tier: 'T1',
      },
      // Ollama Cloud - for when cloud is needed but local unavailable
      {
        provider: 'ollama-cloud',
        model: 'gemma3',
        tier: 'T1',
      },
      {
        provider: 'ollama',
        model: 'granite4-tools',
        tier: 'T0',
        supportsTools: false,
      },
    ],
    T2: [
      {
        provider: 'copilot',
        model: 'gpt-4o',
        tier: 'T2',
      },
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        tier: 'T2',
      },
      // Ollama Cloud - for when cloud is needed but local unavailable
      {
        provider: 'ollama-cloud',
        model: 'llama3.3',
        tier: 'T2',
      },
      {
        provider: 'ollama',
        model: 'qwen2.5:7b-instruct',
        tier: 'T0',
        supportsTools: false,
      },
    ],
    T3: [
      {
        provider: 'anthropic',
        model: 'claude-opus-4-5',
        tier: 'T3',
      },
      {
        provider: 'copilot',
        model: 'o3-mini',
        tier: 'T3',
      },
      // Ollama Cloud as T3 fallback
      {
        provider: 'ollama-cloud',
        model: 'llama3.3',
        tier: 'T3',
      },
      // Degrade to T2 chain on T3 exhaustion (marker entry)
      {
        provider: 'T2-degradation',
        model: 'fallback-to-T2',
        tier: 'T2',
      },
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
    copilot: {
      provider: 'copilot',
      costModel: 'subscription',
      rateLimit: {
        type: 'monthly',
        threshold: 270,
        resetIntervalMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      description: 'GitHub Copilot (subscription-based, 300 requests/month)',
    },
    anthropic: {
      provider: 'anthropic',
      costModel: 'per-token',
      rateLimit: {
        type: 'per-minute',
        threshold: 50, // Conservative estimate
        resetIntervalMs: 60 * 1000, // 1 minute
      },
      description: 'Anthropic API (per-token billing)',
    },
    ollama: {
      provider: 'ollama',
      costModel: 'free',
      rateLimit: {
        type: 'none',
      },
      description: 'Ollama local (free, always available, no tools/MCP)',
      supportsTools: false,
    },
    'ollama-cloud': {
      provider: 'ollama-cloud',
      costModel: 'per-token',
      rateLimit: {
        type: 'per-minute',
        threshold: 100, // Ollama Cloud rate limits
        resetIntervalMs: 60 * 1000, // 1 minute
      },
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
