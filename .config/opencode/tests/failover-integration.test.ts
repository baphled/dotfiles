/**
 * Failover Integration Tests
 *
 * Tests the full failover pipeline: mock provider → health manager → routing decisions.
 * All 7 integration scenarios from the plan are covered.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { HealthManager, type HealthData } from '../plugins/lib/provider-health'
import { getFallbackChain } from '../plugins/lib/fallback-config'
import { createMockServer } from './mock-provider-server'

// --- Test helpers ---

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`
const BACKUP_FILE = `${HEALTH_FILE}.integration-backup`

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

/**
 * Simulate an HTTP call to the mock server and update health manager accordingly.
 * Returns the response status code.
 */
async function simulateProviderCall(
  provider: string,
  serverUrl: string,
  healthManager: HealthManager
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mock-model',
        messages: [{ role: 'user', content: 'test' }],
      }),
    })

    const latencyMs = Date.now() - startTime
    const body = await response.text()
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    if (response.status === 200) {
      healthManager.recordSuccess(provider, latencyMs)
    } else if (response.status === 429) {
      const retryAfter = parseInt(headers['retry-after'] || '60', 10)
      healthManager.markRateLimited(provider, retryAfter)
      healthManager.recordFailure(provider, {
        status: 429,
        message: 'Rate limit exceeded',
      })
    } else {
      healthManager.recordFailure(provider, {
        status: response.status,
        message: `HTTP ${response.status}`,
      })
    }

    return { status: response.status, headers, body }
  } catch (error) {
    healthManager.recordFailure(provider, {
      status: 0,
      message: error instanceof Error ? error.message : 'Connection failed',
    })
    return { status: 0, headers: {}, body: '' }
  }
}

/**
 * Determine which provider to route to based on health state.
 * Mirrors the logic in provider-failover.ts chat.params hook.
 */
function routeRequest(
  requestedProvider: string,
  tier: string,
  healthManager: HealthManager
): { provider: string; model: string; wasSwapped: boolean } {
  const state = healthManager.getProviderState(requestedProvider)

  // Check effective health: rate_limited with expired expiry is NOT rate_limited
  let effectivelyUnhealthy = false
  if (state.status === 'down') {
    effectivelyUnhealthy = true
  } else if (state.status === 'rate_limited') {
    // Check if rate limit has expired
    if (state.rateLimitUntil) {
      const expiry = new Date(state.rateLimitUntil).getTime()
      effectivelyUnhealthy = expiry > Date.now()
    }
  }

  if (!effectivelyUnhealthy) {
    const chain = getFallbackChain(tier)
    const entry = chain.find((e) => e.provider === requestedProvider)
    return {
      provider: requestedProvider,
      model: entry?.model || 'unknown',
      wasSwapped: false,
    }
  }

  // Provider unhealthy — find alternative
  const healthyProviders = healthManager.getHealthyProviders(tier)
  const alternatives = healthyProviders.filter((e) => e.provider !== requestedProvider)

  if (alternatives.length === 0) {
    // No alternatives — use original as last resort
    const chain = getFallbackChain(tier)
    const entry = chain.find((e) => e.provider === requestedProvider)
    return {
      provider: requestedProvider,
      model: entry?.model || 'unknown',
      wasSwapped: false,
    }
  }

  return {
    provider: alternatives[0].provider,
    model: alternatives[0].model,
    wasSwapped: true,
  }
}

// --- Integration Tests ---

describe('Failover Integration', () => {
  let mockServer: ReturnType<typeof createMockServer>

  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
    // Create mock server on random port
    mockServer = createMockServer({ status: 200 })
  })

  afterEach(() => {
    mockServer.stop()
    restoreHealthFile()
  })

  // Scenario 1: Healthy provider → request succeeds
  test('Scenario 1: Healthy provider request succeeds and health updates', async () => {
    const hm = new HealthManager()
    const serverUrl = `http://localhost:${mockServer.getPort()}`

    // Simulate successful call
    const result = await simulateProviderCall('copilot', serverUrl, hm)
    await hm.flush()

    // Verify response
    expect(result.status).toBe(200)
    expect(result.body).toContain('chat.completion')

    // Verify health state updated
    const state = hm.getProviderState('copilot')
    expect(state.status).toBe('healthy')
    expect(state.requestCount).toBe(1)
    expect(state.failureCount).toBe(0)
    expect(state.successRate).toBe(1.0)
    expect(state.latencyP95).toBeGreaterThanOrEqual(0)

    // Verify persistence
    const data = readHealthFile()
    expect(data.providers.copilot).toBeDefined()
    expect(data.providers.copilot.status).toBe('healthy')
  })

  // Scenario 2: Provider returns 429 → health manager marks rate_limited
  test('Scenario 2: Provider 429 triggers rate_limited status', async () => {
    const hm = new HealthManager()

    // Reconfigure mock to return 429
    mockServer.updateConfig({ status: 429, retryAfterSeconds: 30 })
    const serverUrl = `http://localhost:${mockServer.getPort()}`

    const result = await simulateProviderCall('copilot', serverUrl, hm)
    await hm.flush()

    // Verify 429 response handled
    expect(result.status).toBe(429)
    expect(result.headers['retry-after']).toBe('30')

    // Verify health state
    const state = hm.getProviderState('copilot')
    expect(state.status).toBe('rate_limited')
    expect(state.rateLimitUntil).toBeDefined()

    const expiry = new Date(state.rateLimitUntil!).getTime()
    const now = Date.now()
    // Should expire roughly 30 seconds from now
    expect(expiry).toBeGreaterThan(now + 25000)
    expect(expiry).toBeLessThan(now + 35000)

    // Verify persisted
    const data = readHealthFile()
    expect(data.providers.copilot.status).toBe('rate_limited')
  })

  // Scenario 3: After marking rate_limited → next request routes to fallback
  test('Scenario 3: Rate-limited provider routes to fallback', async () => {
    const hm = new HealthManager()
    const serverUrl = `http://localhost:${mockServer.getPort()}`

    // First: mark copilot as rate_limited via a 429
    mockServer.updateConfig({ status: 429, retryAfterSeconds: 60 })
    await simulateProviderCall('copilot', serverUrl, hm)

    // Verify copilot is rate_limited
    expect(hm.getProviderState('copilot').status).toBe('rate_limited')

    // Now route a T1 request that would normally go to copilot
    const routing = routeRequest('copilot', 'T1', hm)

    // Should be swapped to anthropic (next in T1 chain)
    expect(routing.wasSwapped).toBe(true)
    expect(routing.provider).toBe('anthropic')
    expect(routing.model).toBe('claude-haiku-4-5')

    // Reconfigure mock to 200 and simulate the fallback call
    mockServer.updateConfig({ status: 200 })
    const fallbackResult = await simulateProviderCall(routing.provider, serverUrl, hm)
    await hm.flush()

    expect(fallbackResult.status).toBe(200)
    expect(hm.getProviderState('anthropic').status).toBe('healthy')
  })

  // Scenario 4: All providers in tier down → degrades to lower tier
  test('Scenario 4: All providers in tier down degrades to lower tier', async () => {
    const hm = new HealthManager()

    // Mark ALL T3 providers as down (5 failures each)
    for (let i = 0; i < 5; i++) {
      hm.recordFailure('anthropic', { status: 500, message: 'Server error' })
      hm.recordFailure('copilot', { status: 500, message: 'Server error' })
      hm.recordFailure('ollama-cloud', { status: 500, message: 'Server error' })
    }

    // T3 chain: anthropic → copilot → ollama-cloud → T2-degradation
    // All three are down, so should degrade to T2
    const t3Healthy = hm.getHealthyProviders('T3')
    const t3Providers = t3Healthy.map((p) => p.provider)

    // Anthropic, copilot, and ollama-cloud should not be in healthy list
    expect(t3Providers).not.toContain('anthropic')
    expect(t3Providers).not.toContain('copilot')
    expect(t3Providers).not.toContain('ollama-cloud')
    
    // Should contain T2 providers via degradation
    expect(t3Providers).toContain('ollama')

    // Routing should swap to ollama (from T2 chain)
    const routing = routeRequest('anthropic', 'T3', hm)
    expect(routing.wasSwapped).toBe(true)
    expect(routing.provider).toBe('ollama')
  })

  // Scenario 5: Rate limit expires → provider reinstated
  test('Scenario 5: Rate limit expiry reinstates provider', async () => {
    const hm = new HealthManager()

    // Mark copilot rate limited with 0 second expiry (already expired)
    hm.markRateLimited('copilot', 0)

    // Immediately after, the rate limit should be expired
    // getHealthyProviders should include copilot
    const healthy = hm.getHealthyProviders('T1')
    const providers = healthy.map((p) => p.provider)
    expect(providers).toContain('copilot')

    // Routing should NOT swap away from copilot
    const routing = routeRequest('copilot', 'T1', hm)
    expect(routing.wasSwapped).toBe(false)
    expect(routing.provider).toBe('copilot')

    // Verify the mock server works for the reinstated provider
    mockServer.updateConfig({ status: 200 })
    const serverUrl = `http://localhost:${mockServer.getPort()}`
    const result = await simulateProviderCall('copilot', serverUrl, hm)
    await hm.flush()

    expect(result.status).toBe(200)
    expect(hm.getProviderState('copilot').status).toBe('healthy')
  })

  // Scenario 6: Circuit breaker opens after 5 failures → provider marked down
  test('Scenario 6: Circuit breaker marks provider down after 5 failures', async () => {
    const hm = new HealthManager()

    // Configure mock to return 503 (service unavailable)
    mockServer.updateConfig({ status: 503 })
    const serverUrl = `http://localhost:${mockServer.getPort()}`

    // Simulate 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      await simulateProviderCall('copilot', serverUrl, hm)
    }
    await hm.flush()

    // Verify circuit breaker tripped
    const state = hm.getProviderState('copilot')
    expect(state.status).toBe('down')
    expect(state.failureCount).toBe(5)
    expect(state.lastError).toBeDefined()
    expect(state.lastError!.status).toBe(503)

    // Provider excluded from healthy list
    const healthy = hm.getHealthyProviders('T1')
    const providers = healthy.map((p) => p.provider)
    expect(providers).not.toContain('copilot')

    // Routing should swap to anthropic
    const routing = routeRequest('copilot', 'T1', hm)
    expect(routing.wasSwapped).toBe(true)
    expect(routing.provider).toBe('anthropic')

    // Verify persisted state
    const data = readHealthFile()
    expect(data.providers.copilot.status).toBe('down')
  })

  // Scenario 7: Health state persists → restart reads previous state
  test('Scenario 7: Health state persists across restart', async () => {
    // Phase 1: Create health state with copilot rate-limited
    const hm1 = new HealthManager()
    hm1.markRateLimited('copilot', 300) // 5 minutes
    hm1.recordSuccess('anthropic', 150)
    await hm1.flush()

    // Verify file exists with expected state
    const fileData = readHealthFile()
    expect(fileData.providers.copilot.status).toBe('rate_limited')
    expect(fileData.providers.anthropic.status).toBe('healthy')

    // Phase 2: Simulate "restart" — create new HealthManager (reads from disk)
    const hm2 = new HealthManager()

    // Copilot should still be rate_limited (5 min not expired)
    const copilotState = hm2.getProviderState('copilot')
    expect(copilotState.rateLimitUntil).toBeDefined()

    // The status was set to 'rate_limited' in the file, and lastChecked is recent
    // so it's NOT stale — the health manager should respect the persisted state
    const healthy = hm2.getHealthyProviders('T1')
    const providers = healthy.map((p) => p.provider)
    expect(providers).not.toContain('copilot')
    expect(providers).toContain('anthropic')

    // Routing should swap copilot to anthropic
    const routing = routeRequest('copilot', 'T1', hm2)
    expect(routing.wasSwapped).toBe(true)
    expect(routing.provider).toBe('anthropic')
  })
})

describe('Mock Provider Server', () => {
  test('returns configurable 200 response', async () => {
    const server = createMockServer({ status: 200 })
    const url = `http://localhost:${server.getPort()}`

    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    expect(resp.status).toBe(200)
    const body = await resp.json()
    expect(body.object).toBe('chat.completion')

    server.stop()
  })

  test('returns 429 with Retry-After header', async () => {
    const server = createMockServer({ status: 429, retryAfterSeconds: 30 })
    const url = `http://localhost:${server.getPort()}`

    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    expect(resp.status).toBe(429)
    expect(resp.headers.get('retry-after')).toBe('30')

    const body = await resp.json()
    expect(body.error.type).toBe('rate_limit_error')

    server.stop()
  })

  test('returns 503 service unavailable', async () => {
    const server = createMockServer({ status: 503 })
    const url = `http://localhost:${server.getPort()}`

    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    expect(resp.status).toBe(503)

    const body = await resp.json()
    expect(body.error.type).toBe('service_unavailable')

    server.stop()
  })

  test('supports delay simulation', async () => {
    const server = createMockServer({ status: 200, delayMs: 100 })
    const url = `http://localhost:${server.getPort()}`

    const start = Date.now()
    await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(90) // Allow slight timing variance

    server.stop()
  })

  test('supports dynamic reconfiguration', async () => {
    const server = createMockServer({ status: 200 })
    const url = `http://localhost:${server.getPort()}`

    // Initially 200
    let resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })
    expect(resp.status).toBe(200)

    // Reconfigure to 500
    await fetch(`${url}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 500 }),
    })

    // Now 500
    resp = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })
    expect(resp.status).toBe(500)

    server.stop()
  })

  test('health endpoint returns server config', async () => {
    const server = createMockServer({ status: 429, retryAfterSeconds: 45 })
    const url = `http://localhost:${server.getPort()}`

    const resp = await fetch(`${url}/health`)
    expect(resp.status).toBe(200)

    const body = await resp.json()
    expect(body.status).toBe('ok')
    expect(body.config.status).toBe(429)
    expect(body.config.retryAfterSeconds).toBe(45)

    server.stop()
  })
})
