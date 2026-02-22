/**
 * Usage Tracking & Capacity Tests
 *
 * Tests for provider usage counters, capacity checks, period resets,
 * and capacity-aware model recommendation.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { HealthManager, type UsageRecord } from '../plugins/lib/provider-health'
import { getEstimatedTaskCost, getFallbackChain } from '../plugins/lib/fallback-config'

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`
const BACKUP_FILE = `${HEALTH_FILE}.usage-backup`

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

describe('Usage Tracking', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  describe('recordUsage', () => {
    test('creates usage record on first call', () => {
      const hm = new HealthManager()
      hm.recordUsage('github-copilot')

      const usage = hm.getUsage('github-copilot')
      expect(usage).not.toBeNull()
      expect(usage!.requestCount).toBe(1)
      expect(usage!.periodType).toBe('monthly')
    })

    test('increments counter on subsequent calls', () => {
      const hm = new HealthManager()
      hm.recordUsage('github-copilot')
      hm.recordUsage('github-copilot')
      hm.recordUsage('github-copilot')

      const usage = hm.getUsage('github-copilot')
      expect(usage!.requestCount).toBe(3)
    })

    test('tracks per-minute providers correctly', () => {
      const hm = new HealthManager()
      hm.recordUsage('opencode')

      const usage = hm.getUsage('opencode')
      expect(usage).not.toBeNull()
      expect(usage!.periodType).toBe('per-minute')
      expect(usage!.requestCount).toBe(1)
    })

    test('does not track providers with no limits', () => {
      const hm = new HealthManager()
      hm.recordUsage('ollama')

      const usage = hm.getUsage('ollama')
      expect(usage).toBeNull()
    })

    test('persists usage to disk', async () => {
      const hm = new HealthManager()
      hm.recordUsage('github-copilot')
      hm.recordUsage('github-copilot')
      await hm.flush()

      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const data = JSON.parse(raw)
      expect(data.usage['github-copilot']).toBeDefined()
      expect(data.usage['github-copilot'].requestCount).toBe(2)
    })

    test('loads existing usage from disk', async () => {
      const hm1 = new HealthManager()
      for (let i = 0; i < 10; i++) {
        hm1.recordUsage('github-copilot')
      }
      await hm1.flush()

      const hm2 = new HealthManager()
      const usage = hm2.getUsage('github-copilot')
      expect(usage!.requestCount).toBe(10)
    })
  })

  describe('getRemainingCapacity', () => {
    test('returns full threshold when no usage recorded', () => {
      const hm = new HealthManager()
      const remaining = hm.getRemainingCapacity('github-copilot')
      expect(remaining).toBe(270)
    })

    test('returns reduced capacity after usage', () => {
      const hm = new HealthManager()
      for (let i = 0; i < 50; i++) {
        hm.recordUsage('github-copilot')
      }

      const remaining = hm.getRemainingCapacity('github-copilot')
      expect(remaining).toBe(220)
    })

    test('returns 0 when threshold exceeded', () => {
      const hm = new HealthManager()
      for (let i = 0; i < 280; i++) {
        hm.recordUsage('github-copilot')
      }

      const remaining = hm.getRemainingCapacity('github-copilot')
      expect(remaining).toBe(0)
    })

    test('returns null for providers with no limits', () => {
      const hm = new HealthManager()
      const remaining = hm.getRemainingCapacity('ollama')
      expect(remaining).toBeNull()
    })

    test('returns per-minute capacity for opencode', () => {
      const hm = new HealthManager()
      const remaining = hm.getRemainingCapacity('opencode')
      expect(remaining).toBe(60)
    })
  })

  describe('hasCapacityForTask', () => {
    test('returns true when plenty of capacity', () => {
      const hm = new HealthManager()
      expect(hm.hasCapacityForTask('github-copilot', 10)).toBe(true)
    })

    test('returns false when insufficient capacity', () => {
      const hm = new HealthManager()
      for (let i = 0; i < 265; i++) {
        hm.recordUsage('github-copilot')
      }

      expect(hm.hasCapacityForTask('github-copilot', 10)).toBe(false)
      expect(hm.hasCapacityForTask('github-copilot', 5)).toBe(true)
    })

    test('returns true for unlimited providers', () => {
      const hm = new HealthManager()
      expect(hm.hasCapacityForTask('ollama', 1000)).toBe(true)
    })

    test('returns true when exactly enough capacity', () => {
      const hm = new HealthManager()
      for (let i = 0; i < 260; i++) {
        hm.recordUsage('github-copilot')
      }

      expect(hm.hasCapacityForTask('github-copilot', 10)).toBe(true)
      expect(hm.hasCapacityForTask('github-copilot', 11)).toBe(false)
    })
  })

  describe('period reset', () => {
    test('monthly usage resets after period expires', async () => {
      const hm = new HealthManager()
      for (let i = 0; i < 100; i++) {
        hm.recordUsage('github-copilot')
      }
      await hm.flush()

      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const data = JSON.parse(raw)
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
      data.usage['github-copilot'].periodStart = thirtyOneDaysAgo
      writeFileSync(HEALTH_FILE, JSON.stringify(data), 'utf-8')

      const hm2 = new HealthManager()
      const remaining = hm2.getRemainingCapacity('github-copilot')
      expect(remaining).toBe(270)

      hm2.recordUsage('github-copilot')
      const usage = hm2.getUsage('github-copilot')
      expect(usage!.requestCount).toBe(1)
    })

    test('per-minute usage resets after period expires', async () => {
      const hm = new HealthManager()
      for (let i = 0; i < 50; i++) {
        hm.recordUsage('opencode')
      }
      await hm.flush()

      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const data = JSON.parse(raw)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      data.usage['opencode'].periodStart = twoMinutesAgo
      writeFileSync(HEALTH_FILE, JSON.stringify(data), 'utf-8')

      const hm2 = new HealthManager()
      const remaining = hm2.getRemainingCapacity('opencode')
      expect(remaining).toBe(60)
    })
  })
})

describe('Tier Cost Estimates', () => {
  test('T0 has lowest cost', () => {
    expect(getEstimatedTaskCost('T0')).toBe(1)
  })

  test('T1 is lightweight', () => {
    expect(getEstimatedTaskCost('T1')).toBe(3)
  })

  test('T2 is the most expensive', () => {
    expect(getEstimatedTaskCost('T2')).toBe(10)
  })

  test('T3 is moderate', () => {
    expect(getEstimatedTaskCost('T3')).toBe(5)
  })

  test('unknown tier defaults to T2 cost', () => {
    expect(getEstimatedTaskCost('T99')).toBe(10)
  })
})

describe('Capacity-Aware Recommendation', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  test('recommends first model when all have capacity', () => {
    const hm = new HealthManager()
    const chain = getFallbackChain('T2')
    const healthy = hm.getHealthyAlternatives('T2')
    const estimatedCost = getEstimatedTaskCost('T2')

    const pick = healthy.find(c => hm.hasCapacityForTask(c.provider, estimatedCost))
    expect(pick).toBeDefined()
    expect(pick!.provider).toBe(chain[0].provider)
  })

  test('skips provider near monthly limit', () => {
    const hm = new HealthManager()
    for (let i = 0; i < 268; i++) {
      hm.recordUsage('github-copilot')
    }

    const healthy = hm.getHealthyAlternatives('T2')
    const estimatedCost = getEstimatedTaskCost('T2')

    const pick = healthy.find(c => hm.hasCapacityForTask(c.provider, estimatedCost))
    expect(pick).toBeDefined()
    expect(pick!.provider).not.toBe('github-copilot')
  })

  test('picks provider with enough capacity even if not first', () => {
    const hm = new HealthManager()
    for (let i = 0; i < 268; i++) {
      hm.recordUsage('github-copilot')
    }

    const healthy = hm.getHealthyAlternatives('T2')
    const estimatedCost = getEstimatedTaskCost('T2')

    let pick: (typeof healthy)[0] | null = null
    for (const candidate of healthy) {
      if (hm.hasCapacityForTask(candidate.provider, estimatedCost)) {
        pick = candidate
        break
      }
    }

    expect(pick).not.toBeNull()
    expect(pick!.provider).not.toBe('github-copilot')
  })

  test('allows small task on nearly-exhausted provider', () => {
    const hm = new HealthManager()
    for (let i = 0; i < 268; i++) {
      hm.recordUsage('github-copilot')
    }

    expect(hm.hasCapacityForTask('github-copilot', 1)).toBe(true)
    expect(hm.hasCapacityForTask('github-copilot', 2)).toBe(true)
    expect(hm.hasCapacityForTask('github-copilot', 3)).toBe(false)
  })
})
