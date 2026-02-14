/**
 * No Providers Bug Test
 *
 * Reproduces the issue where getHealthyProviders() returns empty array
 * when all providers are unhealthy or unknown.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs'
import { HealthManager } from '../plugins/lib/provider-health'
import { getFallbackChain } from '../plugins/lib/fallback-config'

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const HEALTH_FILE = `${CACHE_DIR}/provider-health.json`
const BACKUP_FILE = `${HEALTH_FILE}.test-backup`

function backupHealthFile(): void {
  if (existsSync(HEALTH_FILE)) {
    const content = require('fs').readFileSync(HEALTH_FILE, 'utf-8')
    writeFileSync(BACKUP_FILE, content, 'utf-8')
  }
}

function restoreHealthFile(): void {
  if (existsSync(BACKUP_FILE)) {
    const content = require('fs').readFileSync(BACKUP_FILE, 'utf-8')
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

describe('No Providers Bug', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  test('should return healthy providers when health file does not exist', () => {
    const hm = new HealthManager()
    const healthy = hm.getHealthyProviders('T1')
    
    // Should return all providers in the chain (unknown = benefit of the doubt)
    const chain = getFallbackChain('T1')
    expect(healthy.length).toBe(chain.length)
    expect(healthy.length).toBeGreaterThan(0)
  })

  test('should return at least one provider even if primary is down', () => {
    const hm = new HealthManager()
    
    // Mark primary provider as down
    hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    
    const healthy = hm.getHealthyProviders('T1')
    
    // Should still have alternatives (Anthropic, Ollama)
    expect(healthy.length).toBeGreaterThan(0)
    expect(healthy.some((e) => e.provider !== 'copilot')).toBe(true)
  })

  test('should return alternatives when filtering out current provider', () => {
    const hm = new HealthManager()
    
    // Mark copilot as rate limited
    hm.markRateLimited('copilot', 60)
    
    const healthy = hm.getHealthyProviders('T1')
    
    // Should have alternatives (Anthropic, Ollama)
    expect(healthy.length).toBeGreaterThan(0)
    
    // Filter out copilot (simulating the plugin's filter)
    const alternatives = healthy.filter((e) => e.provider !== 'copilot')
    
    // Should still have at least one alternative
    expect(alternatives.length).toBeGreaterThan(0)
  })

    test('should handle case where all providers are rate limited', () => {
    const hm = new HealthManager()
    
    // Mark all T1 providers as rate limited
    hm.markRateLimited('copilot', 60)
    hm.markRateLimited('anthropic', 60)
    hm.markRateLimited('ollama-cloud', 60)
    hm.markRateLimited('ollama', 60)
    
    const healthy = hm.getHealthyProviders('T1')
    
    // Should return empty (all are rate limited)
    // This is the bug: we get "no healthy alternatives" notification
    expect(healthy.length).toBe(0)
  })

  test('should prefer unknown status providers over rate limited', () => {
    const hm = new HealthManager()
    
    // Mark copilot as rate limited
    hm.markRateLimited('copilot', 60)
    // Anthropic and Ollama are unknown (no health data)
    
    const healthy = hm.getHealthyProviders('T1')
    
    // Should include unknown providers (benefit of the doubt)
    expect(healthy.length).toBeGreaterThan(0)
    expect(healthy.some((e) => e.provider === 'anthropic')).toBe(true)
    expect(healthy.some((e) => e.provider === 'ollama')).toBe(true)
  })

  test('should not return empty array for T2 when primary is down', () => {
    const hm = new HealthManager()
    
    // Mark copilot as down
    for (let i = 0; i < 5; i++) {
      hm.recordFailure('copilot', { status: 500, message: 'Server error' })
    }
    
    const healthy = hm.getHealthyProviders('T2')
    
    // Should have alternatives (Anthropic, Ollama)
    expect(healthy.length).toBeGreaterThan(0)
    expect(healthy.some((e) => e.provider !== 'copilot')).toBe(true)
  })
})
