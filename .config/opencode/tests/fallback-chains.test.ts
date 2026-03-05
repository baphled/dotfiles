/**
 * Fallback Chain Validation Tests
 *
 * Ensures that tier-based fallback chains contain the correct providers and models.
 * This test suite validates the expected behaviour for provider selection.
 */

import { describe, test, expect } from 'bun:test'
import { getFallbackChain, getProviderMetadata } from '../plugins/lib/fallback-config'

describe('Fallback Chains', () => {
  describe('T0 (Last Resort)', () => {
    test('should contain only Ollama models', () => {
      const chain = getFallbackChain('T0')
      expect(chain.length).toBe(2)
      expect(chain[0].provider).toBe('ollama')
      expect(chain[0].model).toBe('llama3.2:1b')
      expect(chain[1].provider).toBe('ollama')
      expect(chain[1].model).toBe('phi4')
    })

    test('should have no fallback after T0', () => {
      const chain = getFallbackChain('T0')
      chain.forEach((entry) => {
        expect(entry.provider).toBe('ollama')
      })
    })
  })

  describe('T1 (Lightweight)', () => {
    test('should start with Copilot GPT-4o-mini', () => {
      const chain = getFallbackChain('T1')
      expect(chain.length).toBeGreaterThan(0)
      expect(chain[0].provider).toBe('copilot')
      expect(chain[0].model).toBe('gpt-4o-mini')
    })

    test('should have Anthropic Haiku as secondary', () => {
      const chain = getFallbackChain('T1')
      expect(chain.length).toBeGreaterThan(1)
      expect(chain[1].provider).toBe('anthropic')
      expect(chain[1].model).toBe('claude-haiku-4-5')
    })

    test('should fall back to Ollama T0', () => {
      const chain = getFallbackChain('T1')
      const ollamaEntry = chain.find((e) => e.provider === 'ollama')
      expect(ollamaEntry).toBeDefined()
      expect(ollamaEntry?.tier).toBe('T0')
    })

    test('should not contain any Copilot Claude models', () => {
      const chain = getFallbackChain('T1')
      chain.forEach((entry) => {
        if (entry.provider === 'copilot') {
          expect(entry.model).not.toContain('claude')
        }
      })
    })
  })

  describe('T2 (Balanced)', () => {
    test('should start with Copilot GPT-4o', () => {
      const chain = getFallbackChain('T2')
      expect(chain.length).toBeGreaterThan(0)
      expect(chain[0].provider).toBe('copilot')
      expect(chain[0].model).toBe('gpt-4o')
    })

    test('should have Anthropic Sonnet as secondary', () => {
      const chain = getFallbackChain('T2')
      expect(chain.length).toBeGreaterThan(1)
      expect(chain[1].provider).toBe('anthropic')
      expect(chain[1].model).toBe('claude-sonnet-4-5')
    })

    test('should not have Copilot with Claude models', () => {
      const chain = getFallbackChain('T2')
      chain.forEach((entry) => {
        if (entry.provider === 'copilot') {
          expect(entry.model).not.toContain('claude')
          expect(['gpt-4o', 'gpt-4o-mini', 'o3-mini']).toContain(entry.model)
        }
      })
    })

    test('should fall back to Ollama T0', () => {
      const chain = getFallbackChain('T2')
      const ollamaEntry = chain.find((e) => e.provider === 'ollama')
      expect(ollamaEntry).toBeDefined()
      expect(ollamaEntry?.tier).toBe('T0')
    })

    test('should have at least 2 cloud providers before T0 fallback', () => {
      const chain = getFallbackChain('T2')
      const cloudProviders = chain.filter((e) => e.provider !== 'ollama')
      expect(cloudProviders.length).toBeGreaterThanOrEqual(2)
      // Should have both Copilot and Anthropic
      expect(cloudProviders.some((e) => e.provider === 'copilot')).toBe(true)
      expect(cloudProviders.some((e) => e.provider === 'anthropic')).toBe(true)
    })
  })

  describe('T3 (Premium)', () => {
    test('should start with Anthropic Opus', () => {
      const chain = getFallbackChain('T3')
      expect(chain.length).toBeGreaterThan(0)
      expect(chain[0].provider).toBe('anthropic')
      expect(chain[0].model).toBe('claude-opus-4-5')
    })

    test('should have Copilot o3-mini as secondary', () => {
      const chain = getFallbackChain('T3')
      expect(chain.length).toBeGreaterThan(1)
      expect(chain[1].provider).toBe('copilot')
      expect(chain[1].model).toBe('o3-mini')
    })

    test('should degrade to T2 after exhausting T3 options', () => {
      const chain = getFallbackChain('T3')
      const degradationEntry = chain.find((e) => e.tier === 'T2')
      expect(degradationEntry).toBeDefined()
    })

    test('should not contain any Copilot Claude models', () => {
      const chain = getFallbackChain('T3')
      chain.forEach((entry) => {
        if (entry.provider === 'copilot') {
          expect(entry.model).not.toContain('claude')
        }
      })
    })
  })

  describe('Provider Metadata', () => {
    test('Copilot should have subscription cost model', () => {
      const meta = getProviderMetadata('copilot')
      expect(meta.costModel).toBe('subscription')
      expect(meta.rateLimit.type).toBe('monthly')
    })

    test('Anthropic should have per-token cost model', () => {
      const meta = getProviderMetadata('anthropic')
      expect(meta.costModel).toBe('per-token')
      expect(meta.rateLimit.type).toBe('per-minute')
    })

    test('Ollama should be free with no rate limit', () => {
      const meta = getProviderMetadata('ollama')
      expect(meta.costModel).toBe('free')
      expect(meta.rateLimit.type).toBe('none')
    })
  })

  describe('Chain Consistency', () => {
    test('all entries should have valid provider names', () => {
      const validProviders = ['copilot', 'anthropic', 'ollama', 'ollama-cloud', 'T2-degradation']
      for (const tier of ['T0', 'T1', 'T2', 'T3']) {
        const chain = getFallbackChain(tier)
        chain.forEach((entry) => {
          expect(validProviders).toContain(entry.provider)
        })
      }
    })

    test('all entries should have valid tier names', () => {
      const validTiers = ['T0', 'T1', 'T2', 'T3']
      for (const tier of validTiers) {
        const chain = getFallbackChain(tier)
        chain.forEach((entry) => {
          expect(validTiers).toContain(entry.tier)
        })
      }
    })

    test('should not have duplicate consecutive providers in same tier', () => {
      for (const tier of ['T0', 'T1', 'T2', 'T3']) {
        const chain = getFallbackChain(tier)
        for (let i = 0; i < chain.length - 1; i++) {
          // Allow same provider if models are different
          if (chain[i].provider === chain[i + 1].provider) {
            expect(chain[i].model).not.toBe(chain[i + 1].model)
          }
        }
      }
    })
  })
})
