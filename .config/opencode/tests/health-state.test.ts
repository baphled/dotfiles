/**
 * Health State Unit Tests
 *
 * Tests for HealthManager state transitions, persistence,
 * circuit breaker logic, fallback chain resolution, and stale data handling.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { HealthManager, type HealthData, type ProviderHealthState } from '../plugins/lib/provider-health'

// --- Test helpers ---

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`
const BACKUP_FILE = `${HEALTH_FILE}.test-backup`

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

function readHealthFile(): HealthData {
  const raw = readFileSync(HEALTH_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeHealthFile(data: HealthData): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
  writeFileSync(HEALTH_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// --- Tests ---

describe('HealthManager', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  describe('initialisation', () => {
    test('creates default state when no health file exists', () => {
      const hm = new HealthManager()
      const data = hm.getAllHealthData()

      expect(data.version).toBe(1)
      expect(data.providers).toEqual({})
      expect(data.lastUpdated).toBeDefined()
    })

    test('loads existing health state from disk', async () => {
      // Pre-populate health file
      const existing: HealthData = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        providers: {
          copilot: {
            status: 'healthy',
            successRate: 0.95,
            latencyP95: 200,
            lastError: null,
            rateLimitUntil: null,
            requestCount: 10,
            failureCount: 0,
            lastChecked: new Date().toISOString(),
            recentRequests: [],
          },
        },
      }
      writeHealthFile(existing)

      const hm = new HealthManager()
      const state = hm.getProviderState('copilot')

      expect(state.successRate).toBe(0.95)
      expect(state.latencyP95).toBe(200)
      expect(state.requestCount).toBe(10)
    })

    test('handles malformed JSON gracefully', () => {
      writeFileSync(HEALTH_FILE, 'this is not json{{{', 'utf-8')

      const hm = new HealthManager()
      const data = hm.getAllHealthData()

      expect(data.version).toBe(1)
      expect(data.providers).toEqual({})
    })

    test('handles missing providers field gracefully', () => {
      writeFileSync(HEALTH_FILE, JSON.stringify({ version: 1, lastUpdated: new Date().toISOString() }), 'utf-8')

      const hm = new HealthManager()
      const data = hm.getAllHealthData()

      expect(data.providers).toEqual({})
    })
  })

  describe('recordSuccess', () => {
    test('creates provider entry on first success', async () => {
      const hm = new HealthManager()
      hm.recordSuccess('copilot', 250)
      await hm.flush()

      expect(existsSync(HEALTH_FILE)).toBe(true)

      const data = readHealthFile()
      expect(data.providers.copilot).toBeDefined()
      expect(data.providers.copilot.requestCount).toBe(1)
      expect(data.providers.copilot.failureCount).toBe(0)
    })

    test('updates success rate after multiple successes', () => {
      const hm = new HealthManager()

      hm.recordSuccess('copilot', 100)
      hm.recordSuccess('copilot', 200)
      hm.recordSuccess('copilot', 300)

      const state = hm.getProviderState('copilot')
      expect(state.successRate).toBe(1.0)
      expect(state.requestCount).toBe(3)
    })

    test('calculates P95 latency correctly', () => {
      const hm = new HealthManager()

      // Add 20 requests with varying latencies
      for (let i = 1; i <= 20; i++) {
        hm.recordSuccess('copilot', i * 10)
      }

      const state = hm.getProviderState('copilot')
      // P95 of [10, 20, ..., 200]: 95th percentile index = ceil(20*0.95)-1 = 18
      // sorted[18] = 190
      expect(state.latencyP95).toBe(190)
    })

    test('transitions status from unknown to healthy', () => {
      const hm = new HealthManager()

      const before = hm.getProviderState('copilot')
      expect(before.status).toBe('unknown')

      hm.recordSuccess('copilot', 100)
      const after = hm.getProviderState('copilot')
      expect(after.status).toBe('healthy')
    })

    test('trims rolling window to 50 entries', () => {
      const hm = new HealthManager()

      for (let i = 0; i < 60; i++) {
        hm.recordSuccess('copilot', 100)
      }

      const state = hm.getProviderState('copilot')
      expect(state.recentRequests.length).toBe(50)
      expect(state.requestCount).toBe(60)
    })
  })

  describe('recordFailure', () => {
    test('records failure with error details', () => {
      const hm = new HealthManager()
      hm.recordFailure('anthropic', { status: 500, message: 'Internal server error' })

      const state = hm.getProviderState('anthropic')
      expect(state.failureCount).toBe(1)
      expect(state.requestCount).toBe(1)
      expect(state.lastError).toBeDefined()
      expect(state.lastError!.status).toBe(500)
      expect(state.lastError!.message).toBe('Internal server error')
    })

    test('updates success rate after failures', () => {
      const hm = new HealthManager()

      hm.recordSuccess('anthropic', 100)
      hm.recordSuccess('anthropic', 100)
      hm.recordFailure('anthropic', { status: 500, message: 'error' })

      const state = hm.getProviderState('anthropic')
      // 2 successes out of 3 total = 0.667
      expect(state.successRate).toBeCloseTo(0.667, 2)
    })
  })

  describe('circuit breaker', () => {
    test('marks provider as degraded after 3 failures', () => {
      const hm = new HealthManager()

      for (let i = 0; i < 3; i++) {
        hm.recordFailure('anthropic', { status: 500, message: 'error' })
      }

      const state = hm.getProviderState('anthropic')
      expect(state.status).toBe('degraded')
    })

    test('marks provider as down after 5 failures', () => {
      const hm = new HealthManager()

      for (let i = 0; i < 5; i++) {
        hm.recordFailure('anthropic', { status: 500, message: 'Internal error' })
      }

      const state = hm.getProviderState('anthropic')
      expect(state.status).toBe('down')
    })

    test('down provider excluded from healthy providers list', () => {
      const hm = new HealthManager()

      // Mark anthropic as down
      for (let i = 0; i < 5; i++) {
        hm.recordFailure('anthropic', { status: 500, message: 'error' })
      }

      const healthy = hm.getHealthyProviders('T1')
      const providers = healthy.map((p) => p.provider)
      expect(providers).not.toContain('anthropic')
    })

    test('recovery: successes after failures restore healthy status', () => {
      const hm = new HealthManager()

      // Cause degradation with 3 failures
      for (let i = 0; i < 3; i++) {
        hm.recordFailure('copilot', { status: 500, message: 'error' })
      }
      expect(hm.getProviderState('copilot').status).toBe('degraded')

      // Add enough successes to push failures outside the rolling window
      // The circuit breaker checks failures in the recent requests array
      // We need to flood with successes so failures are < 3 in the window
      for (let i = 0; i < 50; i++) {
        hm.recordSuccess('copilot', 100)
      }

      const state = hm.getProviderState('copilot')
      expect(state.status).toBe('healthy')
    })
  })

  describe('markRateLimited', () => {
    test('sets rate_limited status with expiry', () => {
      const hm = new HealthManager()
      hm.markRateLimited('copilot', 60)

      const state = hm.getProviderState('copilot')
      expect(state.status).toBe('rate_limited')
      expect(state.rateLimitUntil).toBeDefined()

      const expiry = new Date(state.rateLimitUntil!).getTime()
      const now = Date.now()
      // Should expire roughly 60 seconds from now (allow 5s tolerance)
      expect(expiry).toBeGreaterThan(now + 55000)
      expect(expiry).toBeLessThan(now + 65000)
    })

    test('rate_limited provider excluded from healthy providers', () => {
      const hm = new HealthManager()
      hm.markRateLimited('copilot', 60)

      const healthy = hm.getHealthyProviders('T1')
      const providers = healthy.map((p) => p.provider)
      expect(providers).not.toContain('copilot')
    })

    test('rate limit expiry reinstates provider', () => {
      const hm = new HealthManager()

      // Set rate limit that already expired (0 seconds)
      hm.markRateLimited('copilot', 0)

      // The rateLimitUntil is in the past, so determineStatus should not return rate_limited
      const healthy = hm.getHealthyProviders('T1')
      const providers = healthy.map((p) => p.provider)
      // Copilot should be included since rate limit expired
      // (it has no request history, so status falls through to 'unknown' which is included)
      expect(providers).toContain('copilot')
    })
  })

  describe('state transitions', () => {
    test('healthy -> degraded -> down -> healthy lifecycle', () => {
      const hm = new HealthManager()

      // Start healthy
      hm.recordSuccess('copilot', 100)
      expect(hm.getProviderState('copilot').status).toBe('healthy')

      // Degrade with 3 failures
      for (let i = 0; i < 3; i++) {
        hm.recordFailure('copilot', { status: 500, message: 'error' })
      }
      expect(hm.getProviderState('copilot').status).toBe('degraded')

      // Down with 2 more failures (total 5)
      for (let i = 0; i < 2; i++) {
        hm.recordFailure('copilot', { status: 500, message: 'error' })
      }
      expect(hm.getProviderState('copilot').status).toBe('down')

      // Recover: push enough successes to flush failures out of window
      for (let i = 0; i < 50; i++) {
        hm.recordSuccess('copilot', 100)
      }
      expect(hm.getProviderState('copilot').status).toBe('healthy')
    })
  })

  describe('stale data handling', () => {
    test('stale data (>2hr) treated as unknown and providers are included', () => {
      // Write health file with copilot marked "down" but lastChecked 3 hours ago
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

      const staleData: HealthData = {
        version: 1,
        lastUpdated: threeHoursAgo,
        providers: {
          copilot: {
            status: 'down',
            successRate: 0,
            latencyP95: 0,
            lastError: { timestamp: threeHoursAgo, message: 'timeout', status: 504 },
            rateLimitUntil: null,
            requestCount: 10,
            failureCount: 10,
            lastChecked: threeHoursAgo,
            recentRequests: [],
          },
        },
      }
      writeHealthFile(staleData)

      const hm = new HealthManager()

      // Stale "down" status should be treated as unknown → benefit of the doubt
      const healthy = hm.getHealthyProviders('T1')
      const providers = healthy.map((p) => p.provider)
      expect(providers).toContain('copilot')
    })

    test('fresh data respected: recent down status excludes provider', () => {
      const now = new Date().toISOString()
      const recentFailures = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        success: false,
        latencyMs: 0,
        error: { status: 500, message: 'error' },
      }))

      const freshData: HealthData = {
        version: 1,
        lastUpdated: now,
        providers: {
          copilot: {
            status: 'down',
            successRate: 0,
            latencyP95: 0,
            lastError: { timestamp: now, message: 'error', status: 500 },
            rateLimitUntil: null,
            requestCount: 5,
            failureCount: 5,
            lastChecked: now,
            recentRequests: recentFailures,
          },
        },
      }
      writeHealthFile(freshData)

      const hm = new HealthManager()

      const healthy = hm.getHealthyProviders('T1')
      const providers = healthy.map((p) => p.provider)
      expect(providers).not.toContain('copilot')
    })
  })

  describe('fallback chain resolution', () => {
    test('returns all providers when all are healthy', () => {
      const hm = new HealthManager()

      // All providers unknown (no data) → included
      const healthy = hm.getHealthyProviders('T1')
      expect(healthy.length).toBe(3) // copilot, anthropic, ollama
    })

    test('T1 chain has correct order', () => {
      const hm = new HealthManager()
      const healthy = hm.getHealthyProviders('T1')

      expect(healthy[0].provider).toBe('copilot')
      expect(healthy[0].model).toBe('gpt-4o-mini')
      expect(healthy[1].provider).toBe('anthropic')
      expect(healthy[1].model).toBe('claude-haiku-4-5')
      expect(healthy[2].provider).toBe('ollama')
    })

    test('T2 chain has 3 entries', () => {
      const hm = new HealthManager()
      const healthy = hm.getHealthyProviders('T2')
      expect(healthy.length).toBe(3)
    })

    test('T3 chain degrades to T2 when all T3 providers down', () => {
      const hm = new HealthManager()

      // Mark both T3 providers as down
      for (let i = 0; i < 5; i++) {
        hm.recordFailure('anthropic', { status: 500, message: 'error' })
        hm.recordFailure('copilot', { status: 500, message: 'error' })
      }

      const healthy = hm.getHealthyProviders('T3')
      // anthropic and copilot are down, so T3 chain entries are skipped
      // T2-degradation marker triggers T2 chain, but copilot and anthropic are also down there
      // Only ollama (T0) should remain
      const providers = healthy.map((p) => p.provider)
      expect(providers).toContain('ollama')
      expect(providers).not.toContain('anthropic')
      expect(providers).not.toContain('copilot')
    })

    test('unknown tier returns empty chain', () => {
      const hm = new HealthManager()
      const healthy = hm.getHealthyProviders('T99')
      expect(healthy).toEqual([])
    })
  })

  describe('persistence', () => {
    test('flush writes health state to disk', async () => {
      cleanHealthFile()
      const hm = new HealthManager()
      hm.recordSuccess('copilot', 250)
      await hm.flush()

      expect(existsSync(HEALTH_FILE)).toBe(true)

      const data = readHealthFile()
      expect(data.version).toBe(1)
      expect(data.providers.copilot).toBeDefined()
      expect(data.providers.copilot.status).toBe('healthy')
    })

    test('atomic write creates valid JSON even under rapid writes', async () => {
      const hm = new HealthManager()

      // Rapid successive writes
      for (let i = 0; i < 10; i++) {
        hm.recordSuccess('copilot', 100 + i)
        await hm.flush()
      }

      // File should be valid JSON after all writes
      const data = readHealthFile()
      expect(data.version).toBe(1)
      expect(data.providers.copilot.requestCount).toBe(10)
    })

    test('reset clears all provider data', async () => {
      const hm = new HealthManager()
      hm.recordSuccess('copilot', 100)
      hm.recordSuccess('anthropic', 200)
      await hm.flush()

      hm.reset()
      await hm.flush()

      const data = readHealthFile()
      expect(Object.keys(data.providers)).toEqual([])
    })
  })
})
