/**
 * Recommend Model Tests
 *
 * Tests the recommend mode of provider-health tool logic:
 * given a tier, return the first healthy provider/model for delegation.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { HealthManager } from '../plugins/lib/provider-health'
import { getFallbackChain } from '../plugins/lib/fallback-config'

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`
const BACKUP_FILE = `${HEALTH_FILE}.recommend-backup`

function backupHealthFile(): void {
  if (existsSync(HEALTH_FILE)) {
    const content = readFileSync(HEALTH_FILE, 'utf-8')
    writeFileSync(BACKUP_FILE, content, 'utf-8')
  }
}

function restoreHealthFile(): void {
  if (existsSync(BACKUP_FILE)) {
    const content = readFileSync(BACKUP_FILE, 'utf-8')
    writeFileSync(HEALTH_FILE, content, 'utf-8')
    unlinkSync(BACKUP_FILE)
  } else if (existsSync(HEALTH_FILE)) {
    unlinkSync(HEALTH_FILE)
  }
}

function cleanHealthFile(): void {
  if (existsSync(HEALTH_FILE)) {
    unlinkSync(HEALTH_FILE)
  }
}

/**
 * Mirrors the recommend logic from provider-failover.ts tool.
 * Returns the formatted recommendation string.
 */
function getRecommendation(healthManager: HealthManager, tier: string): string {
  const tierKey = tier.toUpperCase()
  const chain = getFallbackChain(tierKey)
  if (chain.length === 0) return `❌ Unknown tier: ${tier}`

  const healthy = healthManager.getHealthyAlternatives(tierKey)
  if (healthy.length > 0) {
    const pick = healthy[0]
    return `✅ **${pick.provider}/${pick.model}** (${tierKey})` +
      (healthy.length > 1 ? ` — ${healthy.length - 1} more alternative(s) available` : '')
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

describe('Recommend Model', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  describe('no rate limits', () => {
    test('returns first model in chain when all healthy', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')

      const result = getRecommendation(hm, 'T1')

      expect(result).toContain('✅')
      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
      expect(result).toContain('(T1)')
    })

    test('returns first model for T2 when all healthy', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T2')

      const result = getRecommendation(hm, 'T2')

      expect(result).toContain('✅')
      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
    })

    test('returns first model for T3 when all healthy', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T3')

      const result = getRecommendation(hm, 'T3')

      expect(result).toContain('✅')
      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
    })

    test('shows alternative count when multiple models available', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T2')

      const result = getRecommendation(hm, 'T2')

      expect(result).toContain('alternative(s) available')
    })
  })

  describe('with rate limits', () => {
    test('skips rate-limited first model and returns next healthy', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')
      const firstKey = `${chain[0].provider}/${chain[0].model}`

      hm.markRateLimited(firstKey, 60)

      const result = getRecommendation(hm, 'T1')

      expect(result).toContain('✅')
      expect(result).not.toContain(firstKey)
      expect(result).toContain(`${chain[1].provider}/${chain[1].model}`)
    })

    test('skips multiple rate-limited models', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T2')
      const firstKey = `${chain[0].provider}/${chain[0].model}`
      const secondKey = `${chain[1].provider}/${chain[1].model}`

      hm.markRateLimited(firstKey, 60)
      hm.markRateLimited(secondKey, 60)

      const result = getRecommendation(hm, 'T2')

      expect(result).toContain('✅')
      expect(result).not.toContain(firstKey)
      expect(result).not.toContain(secondKey)
      expect(result).toContain(`${chain[2].provider}/${chain[2].model}`)
    })

    test('returns warning when all models in tier are rate limited', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')

      for (const entry of chain) {
        const key = `${entry.provider}/${entry.model}`
        hm.markRateLimited(key, 300)
      }

      const result = getRecommendation(hm, 'T1')

      expect(result).toContain('⚠️')
      expect(result).toContain('All T1 models rate limited')
      expect(result).toContain('Soonest available')
    })

    test('soonest-to-expire model is recommended when all rate limited', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')

      for (let i = 0; i < chain.length; i++) {
        const key = `${chain[i].provider}/${chain[i].model}`
        hm.markRateLimited(key, (i + 1) * 60)
      }

      const result = getRecommendation(hm, 'T1')

      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
    })

    test('expired rate limit is treated as healthy', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')
      const firstKey = `${chain[0].provider}/${chain[0].model}`

      hm.markRateLimited(firstKey, 0)

      const result = getRecommendation(hm, 'T1')

      expect(result).toContain('✅')
      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
    })
  })

  describe('edge cases', () => {
    test('returns error for unknown tier', () => {
      const hm = new HealthManager()

      const result = getRecommendation(hm, 'T99')

      expect(result).toContain('❌')
      expect(result).toContain('Unknown tier')
    })

    test('handles case-insensitive tier input', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T1')

      const result = getRecommendation(hm, 't1')

      expect(result).toContain('✅')
      expect(result).toContain(`${chain[0].provider}/${chain[0].model}`)
    })

    test('T0 recommendation returns ollama model', () => {
      const hm = new HealthManager()
      const chain = getFallbackChain('T0')

      const result = getRecommendation(hm, 'T0')

      expect(result).toContain('✅')
      expect(result).toContain('ollama')
      expect(result).toContain(chain[0].model)
    })
  })
})
