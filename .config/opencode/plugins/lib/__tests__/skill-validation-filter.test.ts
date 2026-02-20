/**
 * Tests for skill existence validation — filterSkillsAgainstCache.
 *
 * These tests verify that the plugin filters out skills that don't have
 * a corresponding SKILL.md file, warns for each removed skill, and
 * preserves valid skills in the final result.
 *
 * The SkillContentCache is injected as a dependency, so no module mocking
 * is required. A simple stub implementing the HasSkillCache interface is
 * created inline for each test.
 */

import { filterSkillsAgainstCache } from '../skill-validation-filter'

/** Minimal stub implementing the HasSkillCache interface */
function makeCache(existingSkills: string[]) {
  return {
    hasSkill: (name: string) => existingSkills.includes(name),
  }
}

describe('filterSkillsAgainstCache — valid skills preserved', () => {
  it('returns all skills unchanged when all exist in the cache', () => {
    const cache = makeCache(['pre-action', 'memory-keeper', 'clean-code'])

    const result = filterSkillsAgainstCache(
      ['pre-action', 'memory-keeper', 'clean-code'],
      cache
    )

    expect(result.filtered).toEqual(['pre-action', 'memory-keeper', 'clean-code'])
  })

  it('preserves order of valid skills', () => {
    const cache = makeCache(['golang', 'clean-code', 'pre-action'])

    const result = filterSkillsAgainstCache(
      ['golang', 'clean-code', 'pre-action'],
      cache
    )

    expect(result.filtered).toEqual(['golang', 'clean-code', 'pre-action'])
  })

  it('returns empty arrays when input is empty', () => {
    const cache = makeCache([])

    const result = filterSkillsAgainstCache([], cache)

    expect(result.filtered).toEqual([])
    expect(result.removed).toEqual([])
  })
})

describe('filterSkillsAgainstCache — non-existent skills removed', () => {
  it('removes a skill that does not exist in the cache', () => {
    const cache = makeCache(['pre-action'])

    const result = filterSkillsAgainstCache(
      ['pre-action', 'nonexistent-skill'],
      cache
    )

    expect(result.filtered).toContain('pre-action')
    expect(result.filtered).not.toContain('nonexistent-skill')
  })

  it('records removed skills in the returned removed array', () => {
    const cache = makeCache(['pre-action'])

    const result = filterSkillsAgainstCache(
      ['pre-action', 'ghost-skill'],
      cache
    )

    expect(result.removed).toContain('ghost-skill')
    expect(result.removed).not.toContain('pre-action')
  })

  it('removes multiple non-existent skills', () => {
    const cache = makeCache([])

    const result = filterSkillsAgainstCache(
      ['fake-a', 'fake-b', 'fake-c'],
      cache
    )

    expect(result.filtered).toEqual([])
    expect(result.removed).toEqual(['fake-a', 'fake-b', 'fake-c'])
  })

  it('preserves valid skills while removing invalid ones in mixed input', () => {
    const cache = makeCache(['pre-action', 'clean-code'])

    const result = filterSkillsAgainstCache(
      ['pre-action', 'fake-skill', 'clean-code', 'another-fake'],
      cache
    )

    expect(result.filtered).toEqual(['pre-action', 'clean-code'])
    expect(result.removed).toEqual(['fake-skill', 'another-fake'])
  })
})

describe('filterSkillsAgainstCache — warnings logged for removed skills', () => {
  it('calls console.warn for each removed skill', () => {
    const warnCalls: unknown[][] = []
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => { warnCalls.push(args) })
    const cache = makeCache(['pre-action'])

    filterSkillsAgainstCache(
      ['pre-action', 'missing-skill'],
      cache
    )

    // Exactly one warn was produced by this call
    expect(warnCalls).toHaveLength(1)
    expect(warnCalls[0][0]).toContain('missing-skill')

    warnSpy.mockRestore()
  })

  it('includes the skill name in the warning message', () => {
    const warnCalls: unknown[][] = []
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => { warnCalls.push(args) })
    const cache = makeCache([])

    filterSkillsAgainstCache(['ghost-skill'], cache)

    expect(warnCalls.some(call => String(call[0]).includes('ghost-skill'))).toBe(true)

    warnSpy.mockRestore()
  })

  it('includes [SkillAutoLoader] prefix in the warning', () => {
    const warnCalls: unknown[][] = []
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => { warnCalls.push(args) })
    const cache = makeCache([])

    filterSkillsAgainstCache(['no-such-skill'], cache)

    expect(warnCalls.some(call => String(call[0]).includes('[SkillAutoLoader]'))).toBe(true)

    warnSpy.mockRestore()
  })

  it('logs one warning per removed skill when multiple are missing', () => {
    const warnCalls: unknown[][] = []
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => { warnCalls.push(args) })
    const cache = makeCache([])

    filterSkillsAgainstCache(['fake-a', 'fake-b', 'fake-c'], cache)

    expect(warnCalls).toHaveLength(3)

    warnSpy.mockRestore()
  })

  it('does not call console.warn when all skills are valid', () => {
    const warnCalls: unknown[][] = []
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => { warnCalls.push(args) })
    const cache = makeCache(['pre-action', 'memory-keeper'])

    filterSkillsAgainstCache(['pre-action', 'memory-keeper'], cache)

    expect(warnCalls).toHaveLength(0)

    warnSpy.mockRestore()
  })
})

describe('filterSkillsAgainstCache — graceful cache handling', () => {
  it('returns all skills unfiltered when cache is null', () => {
    const result = filterSkillsAgainstCache(
      ['pre-action', 'memory-keeper'],
      null
    )

    expect(result.filtered).toEqual(['pre-action', 'memory-keeper'])
    expect(result.removed).toEqual([])
  })

  it('returns all skills unfiltered when cache is undefined', () => {
    const result = filterSkillsAgainstCache(
      ['pre-action', 'memory-keeper'],
      undefined
    )

    expect(result.filtered).toEqual(['pre-action', 'memory-keeper'])
    expect(result.removed).toEqual([])
  })

  it('logs a debug message when validation is skipped due to missing cache', () => {
    const debugCalls: unknown[][] = []
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation((...args) => { debugCalls.push(args) })

    filterSkillsAgainstCache(['pre-action'], undefined)

    expect(debugCalls.some(call => String(call[0]).includes('[SkillAutoLoader]'))).toBe(true)

    debugSpy.mockRestore()
  })
})
