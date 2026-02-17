/**
 * Provider Health State Manager (Simplified)
 *
 * Tracks rate-limited providers and their expiry times.
 * Persists to ~/.cache/opencode/provider-health.json using atomic writes.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { getFallbackChain, type ProviderEntry } from './fallback-config'

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`

interface HealthData {
  version: 1
  lastUpdated: string
  rateLimits: Record<string, string> // key → ISO expiry timestamp
}

export class HealthManager {
  private data: HealthData

  constructor() {
    this.data = this.loadFromDisk()
    this.clearExpired()
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
      }
    }

    try {
      const raw = readFileSync(HEALTH_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as HealthData

      if (!parsed.rateLimits || typeof parsed.rateLimits !== 'object') {
        return {
          version: 1,
          lastUpdated: new Date().toISOString(),
          rateLimits: {},
        }
      }

      return parsed
    } catch {
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        rateLimits: {},
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
