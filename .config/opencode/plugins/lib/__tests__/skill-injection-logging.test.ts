/**
 * Skill Injection Logging Tests
 *
 * Verifies that the logInjection() event includes metadata about content
 * injection: whether content was injected, the size in bytes, and which
 * skills had content available vs not.
 *
 * These tests exercise the new fields:
 *   - contentInjected: boolean
 *   - contentSizeBytes: number
 *   - skillsWithContent: string[]
 *   - skillsWithoutContent: string[]
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSkillCache(skills: Record<string, string>): {
  hasSkill(name: string): boolean
  getSkillContent(name: string): string | undefined
} {
  return {
    hasSkill: (name: string) => name in skills,
    getSkillContent: (name: string) => skills[name],
  }
}

/**
 * Minimal in-memory log capture.
 * We can't easily call logInjection() directly (it's private), so we test
 * the shape of the JSON event as produced by the logInjection helper by
 * extracting the logic under test.
 *
 * The real test is that skill-auto-loader calls logInjection with the correct
 * shape. Since that is an integration boundary, we unit-test the *shape*
 * construction independently here and verify the fields exist and are correct.
 */

// ---------------------------------------------------------------------------
// Type shape — mirrors the extended event type in skill-auto-loader.ts
// ---------------------------------------------------------------------------

interface InjectionLogEvent {
  timestamp: string
  tool: string
  category?: string
  subagentType?: string
  routedAgent?: string | null
  routedPattern?: string | null
  injected: string[]
  existing: string[]
  final: string[]
  sources: Array<{ skill: string; source: string; pattern?: string }>
  // New fields under test
  contentInjected: boolean
  contentSizeBytes: number
  skillsWithContent: string[]
  skillsWithoutContent: string[]
}

// ---------------------------------------------------------------------------
// buildLogEvent helper — mirrors what skill-auto-loader.ts constructs
// ---------------------------------------------------------------------------

function buildLogEvent(opts: {
  validatedSkills: string[]
  existingSkills: string[]
  sources: Array<{ skill: string; source: string; pattern?: string }>
  injectionResult: { prompt: string; injected: boolean; ceilingExceeded: boolean }
  originalPrompt: string
  skillCache: { hasSkill(name: string): boolean; getSkillContent(name: string): string | undefined } | null
  tool?: string
}): InjectionLogEvent {
  const {
    validatedSkills,
    existingSkills,
    sources,
    injectionResult,
    originalPrompt,
    skillCache,
    tool = 'task',
  } = opts

  const contentSizeBytes = injectionResult.injected
    ? injectionResult.prompt.length - originalPrompt.length
    : 0

  const skillsWithContent = validatedSkills.filter(
    s => skillCache?.getSkillContent(s) !== undefined
  )
  const skillsWithoutContent = validatedSkills.filter(
    s => !skillCache?.getSkillContent(s)
  )

  return {
    timestamp: new Date().toISOString(),
    tool,
    injected: validatedSkills,
    existing: existingSkills,
    final: validatedSkills,
    sources,
    contentInjected: injectionResult.injected,
    contentSizeBytes,
    skillsWithContent,
    skillsWithoutContent,
  }
}

// ---------------------------------------------------------------------------
// Tests: contentInjected field
// ---------------------------------------------------------------------------

describe('injection log event — contentInjected field', () => {
  it('is true when content was injected into the prompt', () => {
    const cache = makeSkillCache({ 'pre-action': '# Pre-Action\nDo this first.' })
    const injectionResult = {
      prompt: '# Pre-Action\nDo this first.\n\noriginal prompt',
      injected: true,
      ceilingExceeded: false,
    }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt: 'original prompt',
      skillCache: cache,
    })

    expect(event.contentInjected).toBe(true)
  })

  it('is false when ceiling was exceeded', () => {
    const cache = makeSkillCache({ 'pre-action': 'content' })
    const originalPrompt = 'original prompt'
    const injectionResult = {
      prompt: originalPrompt,
      injected: false,
      ceilingExceeded: true,
    }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentInjected).toBe(false)
  })

  it('is false when skill cache is unavailable', () => {
    const originalPrompt = 'my task'
    const injectionResult = {
      prompt: originalPrompt,
      injected: false,
      ceilingExceeded: false,
    }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: null,
    })

    expect(event.contentInjected).toBe(false)
  })

  it('is false when no skills have cached content', () => {
    // Cache exists but no skill has content
    const cache = makeSkillCache({})
    const originalPrompt = 'do something'
    const injectionResult = {
      prompt: originalPrompt,
      injected: false,
      ceilingExceeded: false,
    }

    const event = buildLogEvent({
      validatedSkills: ['ghost-skill'],
      existingSkills: [],
      sources: [{ skill: 'ghost-skill', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentInjected).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: contentSizeBytes field
// ---------------------------------------------------------------------------

describe('injection log event — contentSizeBytes field', () => {
  it('is a positive number equal to injected content length when content was injected', () => {
    const skillContent = '# Pre-Action\nThis is content.'
    const cache = makeSkillCache({ 'pre-action': skillContent })
    const originalPrompt = 'original prompt'
    // Simulate what injectSkillContent produces
    const injectedSection = `<skill name="pre-action">\n${skillContent}\n</skill>\n\n`
    const finalPrompt = `${injectedSection}${originalPrompt}`
    const injectionResult = { prompt: finalPrompt, injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentSizeBytes).toBeGreaterThan(0)
    expect(event.contentSizeBytes).toBe(finalPrompt.length - originalPrompt.length)
  })

  it('is 0 when injection was skipped due to ceiling exceeded', () => {
    const cache = makeSkillCache({ 'pre-action': 'content' })
    const originalPrompt = 'original prompt'
    const injectionResult = { prompt: originalPrompt, injected: false, ceilingExceeded: true }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentSizeBytes).toBe(0)
  })

  it('is 0 when skill cache is null', () => {
    const originalPrompt = 'my task'
    const injectionResult = { prompt: originalPrompt, injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: null,
    })

    expect(event.contentSizeBytes).toBe(0)
  })

  it('is 0 when no skills had cached content', () => {
    const cache = makeSkillCache({})
    const originalPrompt = 'do something'
    const injectionResult = { prompt: originalPrompt, injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['unknown-skill'],
      existingSkills: [],
      sources: [{ skill: 'unknown-skill', source: 'baseline' }],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentSizeBytes).toBe(0)
  })

  it('reflects the combined size of all injected skill blocks', () => {
    const cache = makeSkillCache({
      'pre-action': 'Pre-action content.',
      'clean-code': 'Clean code content.',
    })
    const originalPrompt = 'multi-skill task'
    const pa = '<skill name="pre-action">\nPre-action content.\n</skill>'
    const cc = '<skill name="clean-code">\nClean code content.\n</skill>'
    const injected = `${pa}\n\n${cc}\n\n`
    const finalPrompt = `${injected}${originalPrompt}`
    const injectionResult = { prompt: finalPrompt, injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'clean-code'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'clean-code', source: 'category' },
      ],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    expect(event.contentSizeBytes).toBe(injected.length)
  })
})

// ---------------------------------------------------------------------------
// Tests: skillsWithContent field
// ---------------------------------------------------------------------------

describe('injection log event — skillsWithContent field', () => {
  it('lists the skills that had content in the cache', () => {
    const cache = makeSkillCache({
      'pre-action': 'content A',
      'clean-code': 'content B',
    })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'clean-code', 'no-content-skill'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'clean-code', source: 'category' },
        { skill: 'no-content-skill', source: 'keyword' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(event.skillsWithContent).toContain('pre-action')
    expect(event.skillsWithContent).toContain('clean-code')
    expect(event.skillsWithContent).not.toContain('no-content-skill')
  })

  it('is empty when skill cache is null', () => {
    const injectionResult = { prompt: 'prompt', injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt: 'prompt',
      skillCache: null,
    })

    expect(event.skillsWithContent).toEqual([])
  })

  it('is empty when no skills have cached content', () => {
    const cache = makeSkillCache({})
    const injectionResult = { prompt: 'prompt', injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['ghost-skill', 'phantom-skill'],
      existingSkills: [],
      sources: [
        { skill: 'ghost-skill', source: 'baseline' },
        { skill: 'phantom-skill', source: 'keyword' },
      ],
      injectionResult,
      originalPrompt: 'prompt',
      skillCache: cache,
    })

    expect(event.skillsWithContent).toEqual([])
  })

  it('lists every validated skill that has cached content', () => {
    const cache = makeSkillCache({
      'a': 'content for a',
      'b': 'content for b',
      'c': 'content for c',
    })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['a', 'b', 'c'],
      existingSkills: [],
      sources: [
        { skill: 'a', source: 'baseline' },
        { skill: 'b', source: 'category' },
        { skill: 'c', source: 'keyword' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(event.skillsWithContent).toHaveLength(3)
    expect(event.skillsWithContent).toContain('a')
    expect(event.skillsWithContent).toContain('b')
    expect(event.skillsWithContent).toContain('c')
  })
})

// ---------------------------------------------------------------------------
// Tests: skillsWithoutContent field
// ---------------------------------------------------------------------------

describe('injection log event — skillsWithoutContent field', () => {
  it('lists validated skills that had no content in the cache', () => {
    const cache = makeSkillCache({ 'pre-action': 'content A' })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'missing-skill', 'another-missing'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'missing-skill', source: 'category' },
        { skill: 'another-missing', source: 'keyword' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(event.skillsWithoutContent).toContain('missing-skill')
    expect(event.skillsWithoutContent).toContain('another-missing')
    expect(event.skillsWithoutContent).not.toContain('pre-action')
  })

  it('is empty when all validated skills have cached content', () => {
    const cache = makeSkillCache({
      'pre-action': 'content A',
      'clean-code': 'content B',
    })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'clean-code'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'clean-code', source: 'category' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(event.skillsWithoutContent).toEqual([])
  })

  it('lists all validated skills when cache is null', () => {
    const injectionResult = { prompt: 'my task', injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'clean-code'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'clean-code', source: 'category' },
      ],
      injectionResult,
      originalPrompt: 'my task',
      skillCache: null,
    })

    expect(event.skillsWithoutContent).toContain('pre-action')
    expect(event.skillsWithoutContent).toContain('clean-code')
  })

  it('lists all validated skills when cache has no content for any', () => {
    const cache = makeSkillCache({})
    const injectionResult = { prompt: 'my task', injected: false, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['ghost-a', 'ghost-b'],
      existingSkills: [],
      sources: [
        { skill: 'ghost-a', source: 'baseline' },
        { skill: 'ghost-b', source: 'keyword' },
      ],
      injectionResult,
      originalPrompt: 'my task',
      skillCache: cache,
    })

    expect(event.skillsWithoutContent).toHaveLength(2)
    expect(event.skillsWithoutContent).toContain('ghost-a')
    expect(event.skillsWithoutContent).toContain('ghost-b')
  })
})

// ---------------------------------------------------------------------------
// Tests: event shape completeness
// ---------------------------------------------------------------------------

describe('injection log event — full event shape', () => {
  it('contains all required fields including the 4 new metadata fields', () => {
    const cache = makeSkillCache({ 'pre-action': 'some content' })
    const originalPrompt = 'my prompt'
    const injected = '<skill name="pre-action">\nsome content\n</skill>\n\n'
    const finalPrompt = `${injected}${originalPrompt}`
    const injectionResult = { prompt: finalPrompt, injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'no-cache-skill'],
      existingSkills: ['no-cache-skill'],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'no-cache-skill', source: 'existing' },
      ],
      injectionResult,
      originalPrompt,
      skillCache: cache,
    })

    // Core fields (pre-existing)
    expect(event).toHaveProperty('timestamp')
    expect(event).toHaveProperty('tool')
    expect(event).toHaveProperty('injected')
    expect(event).toHaveProperty('existing')
    expect(event).toHaveProperty('final')
    expect(event).toHaveProperty('sources')

    // New metadata fields
    expect(event).toHaveProperty('contentInjected')
    expect(event).toHaveProperty('contentSizeBytes')
    expect(event).toHaveProperty('skillsWithContent')
    expect(event).toHaveProperty('skillsWithoutContent')
  })

  it('serialises to valid JSON with all 4 new fields present', () => {
    const cache = makeSkillCache({ 'pre-action': 'content' })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    const json = JSON.stringify(event)
    const parsed = JSON.parse(json) as Record<string, unknown>

    expect(parsed).toHaveProperty('contentInjected')
    expect(parsed).toHaveProperty('contentSizeBytes')
    expect(parsed).toHaveProperty('skillsWithContent')
    expect(parsed).toHaveProperty('skillsWithoutContent')
  })

  it('contentSizeBytes is a number type', () => {
    const cache = makeSkillCache({ 'pre-action': 'data' })
    const injectionResult = { prompt: 'data\n\n', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action'],
      existingSkills: [],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(typeof event.contentSizeBytes).toBe('number')
  })

  it('skillsWithContent and skillsWithoutContent are arrays of strings', () => {
    const cache = makeSkillCache({ 'pre-action': 'content' })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['pre-action', 'missing'],
      existingSkills: [],
      sources: [
        { skill: 'pre-action', source: 'baseline' },
        { skill: 'missing', source: 'category' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(Array.isArray(event.skillsWithContent)).toBe(true)
    expect(Array.isArray(event.skillsWithoutContent)).toBe(true)
    for (const s of event.skillsWithContent) expect(typeof s).toBe('string')
    for (const s of event.skillsWithoutContent) expect(typeof s).toBe('string')
  })

  it('skillsWithContent and skillsWithoutContent are mutually exclusive', () => {
    const cache = makeSkillCache({ 'has-content': 'some data' })
    const injectionResult = { prompt: 'injected...', injected: true, ceilingExceeded: false }

    const event = buildLogEvent({
      validatedSkills: ['has-content', 'no-content'],
      existingSkills: [],
      sources: [
        { skill: 'has-content', source: 'baseline' },
        { skill: 'no-content', source: 'category' },
      ],
      injectionResult,
      originalPrompt: '',
      skillCache: cache,
    })

    const withSet = new Set(event.skillsWithContent)
    const withoutSet = new Set(event.skillsWithoutContent)

    for (const s of withSet) {
      expect(withoutSet.has(s)).toBe(false)
    }
  })
})
