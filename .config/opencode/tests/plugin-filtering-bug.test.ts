/**
 * Plugin Filtering Bug Test
 *
 * Tests the scenario where the plugin filters out the current provider
 * and ends up with no alternatives, even though other providers exist.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
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

describe('Plugin Filtering Bug', () => {
  beforeEach(() => {
    backupHealthFile()
    cleanHealthFile()
  })

  afterEach(() => {
    restoreHealthFile()
  })

  test('should have alternatives after filtering current provider', () => {
    const hm = new HealthManager()
    
    // Simulate: Copilot is rate limited (current provider)
    hm.markRateLimited('copilot', 60)
    
    // Get healthy providers for T1
    const healthyProviders = hm.getHealthyProviders('T1')
    
    // Filter out copilot (what the plugin does)
    const alternatives = healthyProviders.filter((e) => e.provider !== 'copilot')
    
    // Should have alternatives
    expect(alternatives.length).toBeGreaterThan(0)
    console.log(`T1 healthy: ${healthyProviders.length}, alternatives: ${alternatives.length}`)
  })

  test('should show all providers in fallback chain', () => {
    const chain = getFallbackChain('T1')
    console.log(`T1 chain: ${chain.map((e) => `${e.provider}/${e.model}`).join(' → ')}`)
    expect(chain.length).toBeGreaterThan(0)
  })

  test('should show what happens when all providers are unknown', () => {
    const hm = new HealthManager()
    
    // No health data recorded - all providers are unknown
    const healthyProviders = hm.getHealthyProviders('T1')
    
    console.log(`T1 healthy (all unknown): ${healthyProviders.length}`)
    console.log(`Providers: ${healthyProviders.map((e) => `${e.provider}/${e.model}`).join(', ')}`)
    
    // Should include all providers (unknown = benefit of the doubt)
    expect(healthyProviders.length).toBeGreaterThan(0)
  })

  test('should show what happens when current provider is the only healthy one', () => {
    const hm = new HealthManager()
    
    // Mark all other providers as down
    for (let i = 0; i < 5; i++) {
      hm.recordFailure('anthropic', { status: 500, message: 'Error' })
      hm.recordFailure('ollama', { status: 500, message: 'Error' })
    }
    
    // Copilot is still unknown (healthy)
    const healthyProviders = hm.getHealthyProviders('T1')
    
    console.log(`T1 healthy (others down): ${healthyProviders.length}`)
    console.log(`Providers: ${healthyProviders.map((e) => `${e.provider}/${e.model}`).join(', ')}`)
    
    // Filter out copilot
    const alternatives = healthyProviders.filter((e) => e.provider !== 'copilot')
    
    console.log(`Alternatives after filtering copilot: ${alternatives.length}`)
    
    // This is the bug: if copilot is the only healthy provider, alternatives is empty
    if (alternatives.length === 0) {
      console.log('BUG: No alternatives available!')
    }
  })

  test('should handle extractProviderName correctly', () => {
    // Simulate what the plugin does
    function extractProviderName(providerID: string): string {
      const lower = providerID.toLowerCase()
      if (lower.includes('copilot') || lower.includes('github')) return 'copilot'
      if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
      if (lower.includes('ollama') || lower.includes('local')) return 'ollama'
      return lower
    }
    
    expect(extractProviderName('copilot')).toBe('copilot')
    expect(extractProviderName('copilot/gpt-4o')).toBe('copilot')
    expect(extractProviderName('anthropic')).toBe('anthropic')
    expect(extractProviderName('anthropic/claude-opus')).toBe('anthropic')
    expect(extractProviderName('ollama')).toBe('ollama')
  })
})
