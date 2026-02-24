/**
 * Provider Health State Manager
 *
 * Tracks rate-limited providers, their expiry times, and usage counters.
 * Usage tracking enables capacity-aware model selection — providers near
 * their limits are skipped unless the task fits within remaining budget.
 *
 * Persists to ~/.cache/opencode/provider-health.json using atomic writes.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { getFallbackChain, getProviderMetadata, type ProviderEntry } from './fallback-config'

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`

export interface UsageRecord {
  requestCount: number
  periodStart: string
  periodType: 'monthly' | 'per-minute'
  lastRequest: string
}

interface HealthData {
  version: 1
  lastUpdated: string
  rateLimits: Record<string, string>
  usage: Record<string, UsageRecord>
}

export class HealthManager {
  private data: HealthData

  constructor() {
    this.data = this.loadFromDisk()
    this.clearExpired()
    this.atomicWriteSync()  // persist cleaned state immediately — don't leave stale entries on disk
  }

  /**
   * Mark a provider/model as rate-limited until the given expiry time
   */
  markRateLimited(key: string, retryAfterSeconds: number): void {
    const expiry = new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
    this.data.rateLimits[key] = expiry
    this.data.lastUpdated = new Date().toISOString()
  }

  /**
   * Check if a provider/model is currently rate-limited
   */
  isRateLimited(key: string): boolean {
    const expiry = this.data.rateLimits[key]
    if (!expiry) return false
    return new Date(expiry).getTime() > Date.now()
  }

  /**
   * Get the rate-limit expiry timestamp for a provider/model, or null if not rate-limited
   */
  getRateLimitExpiry(key: string): string | null {
    const expiry = this.data.rateLimits[key]
    if (!expiry) return null
    if (new Date(expiry).getTime() <= Date.now()) {
      delete this.data.rateLimits[key]
      return null
    }
    return expiry
  }

  /**
   * Get ordered list of healthy (non-rate-limited) providers for a given tier
   */
  getHealthyAlternatives(tier: string, excludeKey?: string): ProviderEntry[] {
    const chain = getFallbackChain(tier)
    const healthy: ProviderEntry[] = []

    for (const entry of chain) {
      // Handle T2-degradation marker: recurse into T2 chain
      if (entry.provider === 'T2-degradation') {
        const t2Healthy = this.getHealthyAlternatives('T2', excludeKey)
        healthy.push(...t2Healthy)
        continue
      }

      const key = `${entry.provider}/${entry.model}`

      // Skip excluded key and rate-limited entries
      if (excludeKey && key === excludeKey) continue
      if (this.isRateLimited(key)) continue

      healthy.push(entry)
    }

    return healthy
  }

  /**
   * Record a request against a provider's usage counter.
   * Automatically resets the counter when the tracking period has elapsed.
   */
  recordUsage(provider: string): void {
    const meta = getProviderMetadata(provider)
    if (meta.rateLimit.type === 'none') return

    const now = new Date()
    const existing = this.data.usage[provider]

    if (existing && !this.isPeriodExpired(existing, meta.rateLimit.resetIntervalMs)) {
      existing.requestCount++
      existing.lastRequest = now.toISOString()
    } else {
      this.data.usage[provider] = {
        requestCount: 1,
        periodStart: now.toISOString(),
        periodType: meta.rateLimit.type,
        lastRequest: now.toISOString(),
      }
    }

    this.data.lastUpdated = now.toISOString()
  }

  /**
   * Get remaining request capacity for a provider within its current period.
   * Returns null for providers with no limits (e.g. Ollama).
   */
  getRemainingCapacity(provider: string): number | null {
    const meta = getProviderMetadata(provider)
    if (meta.rateLimit.type === 'none' || !meta.rateLimit.threshold) return null

    const record = this.data.usage[provider]
    if (!record) return meta.rateLimit.threshold

    if (this.isPeriodExpired(record, meta.rateLimit.resetIntervalMs)) {
      return meta.rateLimit.threshold
    }

    return Math.max(0, meta.rateLimit.threshold - record.requestCount)
  }

  /**
   * Check whether a provider has enough remaining capacity for an estimated task cost.
   * Returns true for providers with no limits.
   */
  hasCapacityForTask(provider: string, estimatedRequests: number): boolean {
    const remaining = this.getRemainingCapacity(provider)
    if (remaining === null) return true
    return remaining >= estimatedRequests
  }

  /**
   * Get the usage record for a provider, or null if none tracked.
   */
  getUsage(provider: string): UsageRecord | null {
    return this.data.usage[provider] || null
  }

  /**
   * Check whether a usage tracking period has elapsed.
   */
  private isPeriodExpired(record: UsageRecord, resetIntervalMs?: number): boolean {
    if (!resetIntervalMs) return false
    const periodStart = new Date(record.periodStart).getTime()
    return Date.now() >= periodStart + resetIntervalMs
  }

  /**
   * Get all tracked providers and their rate-limit status
   */
  getAllStatus(): Record<string, { rateLimitedUntil: string | null }> {
    const result: Record<string, { rateLimitedUntil: string | null }> = {}

    for (const [key, expiry] of Object.entries(this.data.rateLimits)) {
      if (new Date(expiry).getTime() > Date.now()) {
        result[key] = { rateLimitedUntil: expiry }
      }
    }

    return result
  }

  /**
   * Persist health state to disk using atomic write (temp + rename)
   */
  async flush(): Promise<void> {
    this.clearExpired()
    this.atomicWriteSync()
  }

  /**
   * Remove expired rate-limit entries
   */
  private clearExpired(): void {
    const now = Date.now()
    for (const [key, expiry] of Object.entries(this.data.rateLimits)) {
      if (new Date(expiry).getTime() <= now) {
        delete this.data.rateLimits[key]
      }
    }
  }

  /**
   * Load health data from disk, or return default if missing/invalid
   */
  private loadFromDisk(): HealthData {
    if (!existsSync(HEALTH_FILE)) {
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        rateLimits: {},
        usage: {},
      }
    }

    try {
      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<HealthData>

      if (!parsed.rateLimits || typeof parsed.rateLimits !== 'object') {
        return {
          version: 1,
          lastUpdated: new Date().toISOString(),
          rateLimits: {},
          usage: {},
        }
      }

      return {
        version: 1,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        rateLimits: parsed.rateLimits,
        usage: parsed.usage && typeof parsed.usage === 'object' ? parsed.usage : {},
      }
    } catch {
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        rateLimits: {},
        usage: {},
      }
    }
  }

  /**
   * Atomic write: write to temp file then rename
   */
  private atomicWriteSync(): void {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    const tempFile = `${HEALTH_FILE}.${process.pid}.tmp`
    const json = JSON.stringify(this.data, null, 2)

    try {
      writeFileSync(tempFile, json, 'utf-8')
      renameSync(tempFile, HEALTH_FILE)
    } catch (err) {
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
