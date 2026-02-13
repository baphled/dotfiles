/**
 * Provider Health State Manager
 *
 * Tracks per-provider health metrics with rolling window,
 * circuit breaker thresholds, and atomic file persistence.
 *
 * Health state persists to ~/.cache/opencode/provider-health.json
 * using write-to-temp + rename for multi-instance safety.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { getFallbackChain, type ProviderEntry } from './fallback-config'

// --- Constants ---

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`

/** Rolling window size for request metrics */
const ROLLING_WINDOW_SIZE = 50

/** Stale data threshold: 2 hours in milliseconds */
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000

/** Circuit breaker: failure window (5 minutes) */
const CIRCUIT_BREAKER_WINDOW_MS = 5 * 60 * 1000

/** Circuit breaker: failures for "degraded" status */
const DEGRADED_THRESHOLD = 3

/** Circuit breaker: failures for "down" status */
const DOWN_THRESHOLD = 5

// --- Types ---

export type ProviderStatus = 'healthy' | 'degraded' | 'rate_limited' | 'down' | 'unknown'

/**
 * A single request record in the rolling window
 */
export interface RequestRecord {
  timestamp: string
  success: boolean
  latencyMs: number
  error?: { status: number; message: string }
}

/**
 * Per-provider health state
 */
export interface ProviderHealthState {
  status: ProviderStatus
  successRate: number
  latencyP95: number
  lastError: { timestamp: string; message: string; status: number } | null
  rateLimitUntil: string | null
  requestCount: number
  failureCount: number
  lastChecked: string
  recentRequests: RequestRecord[]
}

/**
 * Persisted health data shape
 */
export interface HealthData {
  version: 1
  lastUpdated: string
  providers: Record<string, ProviderHealthState>
}

// --- Helper functions ---

function createDefaultState(): ProviderHealthState {
  return {
    status: 'unknown',
    successRate: 1.0,
    latencyP95: 0,
    lastError: null,
    rateLimitUntil: null,
    requestCount: 0,
    failureCount: 0,
    lastChecked: new Date().toISOString(),
    recentRequests: [],
  }
}

function createDefaultHealthData(): HealthData {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    providers: {},
  }
}

/**
 * Calculate P95 latency from a sorted array of latency values
 */
function calculateP95(latencies: number[]): number {
  if (latencies.length === 0) return 0
  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Count failures within the circuit breaker time window
 */
function countRecentFailures(requests: RequestRecord[]): number {
  const cutoff = new Date(Date.now() - CIRCUIT_BREAKER_WINDOW_MS).toISOString()
  return requests.filter((r) => !r.success && r.timestamp >= cutoff).length
}

/**
 * Determine provider status based on metrics
 */
function determineStatus(state: ProviderHealthState): ProviderStatus {
  // Rate limited takes precedence
  if (state.rateLimitUntil) {
    const expiry = new Date(state.rateLimitUntil).getTime()
    if (expiry > Date.now()) {
      return 'rate_limited'
    }
    // Rate limit expired — fall through to circuit breaker check
  }

  const recentFailures = countRecentFailures(state.recentRequests)

  if (recentFailures >= DOWN_THRESHOLD) return 'down'
  if (recentFailures >= DEGRADED_THRESHOLD) return 'degraded'

  // No requests yet
  if (state.requestCount === 0) return 'unknown'

  return 'healthy'
}

/**
 * Check if provider state data is stale (>2 hours old)
 */
function isStale(state: ProviderHealthState): boolean {
  const lastChecked = new Date(state.lastChecked).getTime()
  return Date.now() - lastChecked > STALE_THRESHOLD_MS
}

// --- HealthManager class ---

export class HealthManager {
  private data: HealthData

  constructor() {
    this.data = this.loadFromDisk()
  }

  /**
   * Get ordered list of healthy providers for a given tier.
   * Skips rate_limited and down providers.
   * Stale data (>2hr) treated as "unknown" (included — benefit of the doubt).
   * Handles T3→T2 degradation via marker entry.
   */
  getHealthyProviders(tier: string): ProviderEntry[] {
    const chain = getFallbackChain(tier)
    const healthy: ProviderEntry[] = []

    for (const entry of chain) {
      // Handle T2-degradation marker: recurse into T2 chain
      if (entry.provider === 'T2-degradation') {
        const t2Healthy = this.getHealthyProviders('T2')
        healthy.push(...t2Healthy)
        continue
      }

      const state = this.getProviderState(entry.provider)

      // Stale data → treat as unknown → include (benefit of the doubt)
      if (isStale(state)) {
        healthy.push(entry)
        continue
      }

      const effectiveStatus = determineStatus(state)

      // Skip rate_limited (until expiry) and down providers
      if (effectiveStatus === 'rate_limited' || effectiveStatus === 'down') {
        continue
      }

      healthy.push(entry)
    }

    return healthy
  }

  /**
   * Record a successful request for a provider
   */
  recordSuccess(provider: string, latencyMs: number): void {
    const state = this.ensureProvider(provider)

    const record: RequestRecord = {
      timestamp: new Date().toISOString(),
      success: true,
      latencyMs,
    }

    state.recentRequests.push(record)

    // Trim rolling window
    if (state.recentRequests.length > ROLLING_WINDOW_SIZE) {
      state.recentRequests = state.recentRequests.slice(-ROLLING_WINDOW_SIZE)
    }

    state.requestCount++
    this.recalculateMetrics(state)
    state.lastChecked = new Date().toISOString()
    state.status = determineStatus(state)

    this.data.lastUpdated = new Date().toISOString()
  }

  /**
   * Record a failed request for a provider
   */
  recordFailure(provider: string, error: { status: number; message: string }): void {
    const state = this.ensureProvider(provider)

    const record: RequestRecord = {
      timestamp: new Date().toISOString(),
      success: false,
      latencyMs: 0,
      error,
    }

    state.recentRequests.push(record)

    // Trim rolling window
    if (state.recentRequests.length > ROLLING_WINDOW_SIZE) {
      state.recentRequests = state.recentRequests.slice(-ROLLING_WINDOW_SIZE)
    }

    state.requestCount++
    state.failureCount++
    state.lastError = {
      timestamp: new Date().toISOString(),
      message: error.message,
      status: error.status,
    }

    this.recalculateMetrics(state)
    state.lastChecked = new Date().toISOString()
    state.status = determineStatus(state)

    this.data.lastUpdated = new Date().toISOString()
  }

  /**
   * Mark a provider as rate limited with a retry-after duration
   */
  markRateLimited(provider: string, retryAfterSeconds: number): void {
    const state = this.ensureProvider(provider)

    const expiry = new Date(Date.now() + retryAfterSeconds * 1000)
    state.rateLimitUntil = expiry.toISOString()
    state.lastChecked = new Date().toISOString()
    state.status = 'rate_limited'

    this.data.lastUpdated = new Date().toISOString()
  }

  /**
   * Get the health state for a specific provider.
   * Returns default "unknown" state if provider not tracked.
   */
  getProviderState(provider: string): ProviderHealthState {
    return this.data.providers[provider] || createDefaultState()
  }

  /**
   * Get the full health data (all providers)
   */
  getAllHealthData(): HealthData {
    return this.data
  }

  /**
   * Reset all health state to defaults
   */
  reset(): void {
    this.data = createDefaultHealthData()
  }

  /**
   * Persist health state to disk using atomic write (temp + rename).
   * Safe for concurrent multi-instance access.
   */
  async flush(): Promise<void> {
    this.atomicWriteSync()
  }

  // --- Private methods ---

  /**
   * Load health data from disk. Handles missing file,
   * malformed JSON, and stale data gracefully.
   */
  private loadFromDisk(): HealthData {
    if (!existsSync(HEALTH_FILE)) {
      return createDefaultHealthData()
    }

    try {
      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as HealthData

      // Validate basic structure
      if (!parsed.providers || typeof parsed.providers !== 'object') {
        return createDefaultHealthData()
      }

      // Mark stale providers as unknown
      for (const [, state] of Object.entries(parsed.providers)) {
        if (isStale(state)) {
          state.status = 'unknown'
        }
      }

      return parsed
    } catch {
      // Malformed JSON or read error — start fresh
      return createDefaultHealthData()
    }
  }

  /**
   * Ensure a provider entry exists in the health data.
   * Returns the existing or newly created state.
   */
  private ensureProvider(provider: string): ProviderHealthState {
    if (!this.data.providers[provider]) {
      this.data.providers[provider] = createDefaultState()
    }
    return this.data.providers[provider]
  }

  /**
   * Recalculate success rate and P95 latency from the rolling window
   */
  private recalculateMetrics(state: ProviderHealthState): void {
    const requests = state.recentRequests
    if (requests.length === 0) {
      state.successRate = 1.0
      state.latencyP95 = 0
      return
    }

    const successes = requests.filter((r) => r.success).length
    state.successRate = Number((successes / requests.length).toFixed(3))

    const latencies = requests.filter((r) => r.success && r.latencyMs > 0).map((r) => r.latencyMs)
    state.latencyP95 = calculateP95(latencies)
  }

  /**
   * Atomic write: write to temp file then rename.
   * Ensures no partial reads from concurrent instances.
   */
  private atomicWriteSync(): void {
    // Ensure cache directory exists
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    const tempFile = `${HEALTH_FILE}.${process.pid}.tmp`
    const json = JSON.stringify(this.data, null, 2)

    try {
      writeFileSync(tempFile, json, 'utf-8')
      renameSync(tempFile, HEALTH_FILE)
    } catch (err) {
      // Best-effort cleanup of temp file on failure
      try {
        if (existsSync(tempFile)) {
          const { unlinkSync } = require('fs')
          unlinkSync(tempFile)
        }
      } catch {
        // Ignore cleanup errors
      }
      throw err
    }
  }
}
