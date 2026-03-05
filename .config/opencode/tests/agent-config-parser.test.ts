/**
 * Tests for Agent Config Parser
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { AgentConfigCache } from '../plugins/lib/agent-config-parser'
import { existsSync } from 'fs'

const AGENTS_DIR = `${process.env.HOME}/.config/opencode/agents`

describe('AgentConfigCache', () => {
  let cache: AgentConfigCache

  beforeAll(async () => {
    cache = new AgentConfigCache(AGENTS_DIR)
    await cache.init()
  })

  test('parses all agent files', () => {
    const agents = cache.getAllAgents()
    expect(agents.length).toBeGreaterThanOrEqual(13)
  })

  test('extracts Senior-Engineer correctly', () => {
    const config = cache.getAgentConfig('Senior-Engineer')
    expect(config).toBeDefined()
    expect(config?.name).toBe('Senior-Engineer')
    expect(config?.defaultSkills).toContain('pre-action')
  })

  test('handles spaces in filename', () => {
    const config = cache.getAgentConfig('Knowledge Base Curator')
    expect(config).toBeDefined()
    expect(config?.name).toBe('Knowledge Base Curator')
    // Should have many skills
    expect(config?.defaultSkills.length).toBeGreaterThan(5)
  })

  test('returns undefined for nonexistent agent', () => {
    const config = cache.getAgentConfig('NonExistentAgent')
    expect(config).toBeUndefined()
  })

  test('caches after init (no file I/O on getAgentConfig)', async () => {
    // First call
    const config1 = cache.getAgentConfig('Senior-Engineer')
    // Second call should use cache
    const config2 = cache.getAgentConfig('Senior-Engineer')
    expect(config1).toEqual(config2)
  })
})
