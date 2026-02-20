/**
 * Skill Content Injection Tests
 *
 * Tests for the core feature: injecting skill content blocks directly into
 * `args.prompt` in the skill-auto-loader plugin hook.
 *
 * The injection makes skill loading deterministic by embedding the actual
 * skill content rather than relying on agents to call mcp_skill at runtime.
 */
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { injectSkillContent, orderSkillsBySource, PROMPT_SIZE_CEILING } from '../skill-content-injection'
import type { SkillSource } from '../skill-selector'

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

// ---------------------------------------------------------------------------
// orderSkillsBySource
// ---------------------------------------------------------------------------

describe('orderSkillsBySource', () => {
  it('places baseline skills before category skills', () => {
    const skills = ['clean-code', 'pre-action']
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'clean-code', source: 'category' },
    ]

    const ordered = orderSkillsBySource(skills, sources)

    expect(ordered.indexOf('pre-action')).toBeLessThan(ordered.indexOf('clean-code'))
  })

  it('places category skills before keyword skills', () => {
    const skills = ['security', 'clean-code']
    const sources: SkillSource[] = [
      { skill: 'clean-code', source: 'category' },
      { skill: 'security', source: 'keyword' },
    ]

    const ordered = orderSkillsBySource(skills, sources)

    expect(ordered.indexOf('clean-code')).toBeLessThan(ordered.indexOf('security'))
  })

  it('places agent-default skills in the same tier as category skills', () => {
    const skills = ['security', 'golang', 'pre-action']
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'golang', source: 'agent-default' },
      { skill: 'security', source: 'keyword' },
    ]

    const ordered = orderSkillsBySource(skills, sources)

    expect(ordered.indexOf('pre-action')).toBeLessThan(ordered.indexOf('golang'))
    expect(ordered.indexOf('golang')).toBeLessThan(ordered.indexOf('security'))
  })

  it('places baseline → category/agent-default → keyword in that order', () => {
    const skills = ['security', 'golang', 'pre-action', 'memory-keeper', 'clean-code']
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'memory-keeper', source: 'baseline' },
      { skill: 'clean-code', source: 'category' },
      { skill: 'golang', source: 'agent-default' },
      { skill: 'security', source: 'keyword' },
    ]

    const ordered = orderSkillsBySource(skills, sources)

    // Both baselines come first
    const preActionIdx = ordered.indexOf('pre-action')
    const memKeeperIdx = ordered.indexOf('memory-keeper')
    const cleanCodeIdx = ordered.indexOf('clean-code')
    const golangIdx = ordered.indexOf('golang')
    const securityIdx = ordered.indexOf('security')

    expect(preActionIdx).toBeLessThan(cleanCodeIdx)
    expect(memKeeperIdx).toBeLessThan(cleanCodeIdx)
    expect(cleanCodeIdx).toBeLessThan(securityIdx)
    expect(golangIdx).toBeLessThan(securityIdx)
  })

  it('does not mutate the input array', () => {
    const skills = ['keyword-skill', 'baseline-skill']
    const sources: SkillSource[] = [
      { skill: 'baseline-skill', source: 'baseline' },
      { skill: 'keyword-skill', source: 'keyword' },
    ]

    const original = [...skills]
    orderSkillsBySource(skills, sources)

    expect(skills).toEqual(original)
  })

  it('treats unknown source as keyword tier (lowest priority)', () => {
    const skills = ['mystery-skill', 'pre-action']
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      // mystery-skill has no source entry
    ]

    const ordered = orderSkillsBySource(skills, sources)

    expect(ordered.indexOf('pre-action')).toBeLessThan(ordered.indexOf('mystery-skill'))
  })
})

// ---------------------------------------------------------------------------
// injectSkillContent — content blocks
// ---------------------------------------------------------------------------

describe('injectSkillContent — content block format', () => {
  it('wraps each skill in <skill name="..."> tags', () => {
    const cache = makeSkillCache({ 'pre-action': '# Pre-Action\nContent here.' })
    const sources: SkillSource[] = [{ skill: 'pre-action', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['pre-action'],
      sources,
      originalPrompt: 'Do the thing',
      skillCache: cache,
    })

    expect(result.prompt).toContain('<skill name="pre-action">')
    expect(result.prompt).toContain('</skill>')
    expect(result.prompt).toContain('# Pre-Action\nContent here.')
  })

  it('each skill block uses the exact format: <skill name="...">\\n{content}\\n</skill>', () => {
    const cache = makeSkillCache({ 'clean-code': 'Clean code content.' })
    const sources: SkillSource[] = [{ skill: 'clean-code', source: 'category' }]

    const result = injectSkillContent({
      skills: ['clean-code'],
      sources,
      originalPrompt: '',
      skillCache: cache,
    })

    expect(result.prompt).toContain('<skill name="clean-code">\nClean code content.\n</skill>')
  })

  it('injects multiple skill blocks', () => {
    const cache = makeSkillCache({
      'pre-action': 'Pre-action content.',
      'clean-code': 'Clean code content.',
    })
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'clean-code', source: 'category' },
    ]

    const result = injectSkillContent({
      skills: ['pre-action', 'clean-code'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    expect(result.prompt).toContain('<skill name="pre-action">')
    expect(result.prompt).toContain('<skill name="clean-code">')
  })
})

// ---------------------------------------------------------------------------
// injectSkillContent — prompt composition
// ---------------------------------------------------------------------------

describe('injectSkillContent — prompt composition', () => {
  it('prepends skill content before the original prompt', () => {
    const cache = makeSkillCache({ 'pre-action': 'Pre-action content.' })
    const sources: SkillSource[] = [{ skill: 'pre-action', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['pre-action'],
      sources,
      originalPrompt: 'Build the feature',
      skillCache: cache,
    })

    const skillIdx = result.prompt.indexOf('<skill name="pre-action">')
    const promptIdx = result.prompt.indexOf('Build the feature')

    expect(skillIdx).toBeLessThan(promptIdx)
  })

  it('fully preserves the original prompt text after injected content', () => {
    const cache = makeSkillCache({ 'golang': 'Go expertise.' })
    const sources: SkillSource[] = [{ skill: 'golang', source: 'category' }]
    const originalPrompt = 'Implement user registration with Go.'

    const result = injectSkillContent({
      skills: ['golang'],
      sources,
      originalPrompt,
      skillCache: cache,
    })

    expect(result.prompt).toContain(originalPrompt)
  })

  it('handles undefined/empty original prompt by returning only injected content', () => {
    const cache = makeSkillCache({ 'pre-action': 'Pre-action content.' })
    const sources: SkillSource[] = [{ skill: 'pre-action', source: 'baseline' }]

    const resultUndefined = injectSkillContent({
      skills: ['pre-action'],
      sources,
      originalPrompt: undefined,
      skillCache: cache,
    })
    expect(resultUndefined.prompt).toContain('<skill name="pre-action">')
    expect(resultUndefined.prompt).not.toContain('\n\nundefined')

    const resultEmpty = injectSkillContent({
      skills: ['pre-action'],
      sources,
      originalPrompt: '',
      skillCache: cache,
    })
    expect(resultEmpty.prompt).toContain('<skill name="pre-action">')
    // Should not have trailing double newline then nothing
    expect(resultEmpty.prompt.trimEnd()).toBe(resultEmpty.prompt.trimEnd())
  })

  it('injects skills in source order (baseline first, then category, then keyword)', () => {
    const cache = makeSkillCache({
      'pre-action': 'Baseline content.',
      'clean-code': 'Category content.',
      'security': 'Keyword content.',
    })
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'clean-code', source: 'category' },
      { skill: 'security', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['security', 'clean-code', 'pre-action'], // intentionally disordered
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    const preActionIdx = result.prompt.indexOf('<skill name="pre-action">')
    const cleanCodeIdx = result.prompt.indexOf('<skill name="clean-code">')
    const securityIdx = result.prompt.indexOf('<skill name="security">')

    expect(preActionIdx).toBeLessThan(cleanCodeIdx)
    expect(cleanCodeIdx).toBeLessThan(securityIdx)
  })

  it('skips skills where cache returns undefined content', () => {
    const cache = makeSkillCache({
      'pre-action': 'Pre-action content.',
      // 'missing-skill' has no content
    })
    const sources: SkillSource[] = [
      { skill: 'pre-action', source: 'baseline' },
      { skill: 'missing-skill', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['pre-action', 'missing-skill'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    expect(result.prompt).toContain('<skill name="pre-action">')
    expect(result.prompt).not.toContain('<skill name="missing-skill">')
    expect(result.injected).toBe(true)
  })

  it('returns injected=false and original prompt when no skill content is available', () => {
    const cache = makeSkillCache({}) // empty cache
    const sources: SkillSource[] = [{ skill: 'ghost-skill', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['ghost-skill'],
      sources,
      originalPrompt: 'Original task',
      skillCache: cache,
    })

    expect(result.injected).toBe(false)
    expect(result.prompt).toBe('Original task')
  })
})

// ---------------------------------------------------------------------------
// injectSkillContent — 35KB ceiling enforcement
// ---------------------------------------------------------------------------

describe('injectSkillContent — 35KB ceiling enforcement', () => {
  it('exports PROMPT_SIZE_CEILING as 35KB (35 * 1024)', () => {
    expect(PROMPT_SIZE_CEILING).toBe(35 * 1024)
  })

  it('skips content injection when total injected content exceeds 35KB', () => {
    // Create a skill with content just over the 35KB limit
    const largeContent = 'x'.repeat(PROMPT_SIZE_CEILING + 1)
    const cache = makeSkillCache({ 'large-skill': largeContent })
    const sources: SkillSource[] = [{ skill: 'large-skill', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['large-skill'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    expect(result.injected).toBe(false)
    // Original prompt preserved unchanged
    expect(result.prompt).toBe('My task')
    // Ceiling exceeded flag set
    expect(result.ceilingExceeded).toBe(true)
  })

  it('allows injection when total content is exactly at the ceiling', () => {
    // Content size at exactly ceiling (accounting for XML wrapper overhead)
    // We need: `<skill name="X">\n{content}\n</skill>` total <= 35KB
    const wrapperSize = '<skill name="at-limit">\n'.length + '\n</skill>\n\n'.length
    const contentSize = PROMPT_SIZE_CEILING - wrapperSize
    const content = 'y'.repeat(contentSize)
    const cache = makeSkillCache({ 'at-limit': content })
    const sources: SkillSource[] = [{ skill: 'at-limit', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['at-limit'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    expect(result.ceilingExceeded).toBe(false)
    expect(result.injected).toBe(true)
  })

  it('injects normally when content is well under 35KB', () => {
    const cache = makeSkillCache({ 'small-skill': 'Small content.' })
    const sources: SkillSource[] = [{ skill: 'small-skill', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['small-skill'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    expect(result.injected).toBe(true)
    expect(result.ceilingExceeded).toBe(false)
    expect(result.prompt).toContain('<skill name="small-skill">')
  })

  it('returns ceilingExceeded=false when injection succeeds normally', () => {
    const cache = makeSkillCache({ 'pre-action': '# Pre-Action\nShort content.' })
    const sources: SkillSource[] = [{ skill: 'pre-action', source: 'baseline' }]

    const result = injectSkillContent({
      skills: ['pre-action'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    expect(result.ceilingExceeded).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// injectSkillContent — null/missing cache
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// injectSkillContent — progressive injection
// ---------------------------------------------------------------------------

describe('progressive injection', () => {
  /**
   * Helper: build a string of exactly `bytes` bytes (ASCII so 1 byte = 1 char).
   */
  function makeContent(bytes: number): string {
    return 'x'.repeat(bytes)
  }

  /**
   * Helper: return the byte size of a single skill block as built by injection.
   * Format: `<skill name="{name}">\n{content}\n</skill>\n\n`
   */
  function blockSize(name: string, content: string): number {
    return `<skill name="${name}">\n${content}\n</skill>\n\n`.length
  }

  it('5 skills totalling 40KB → first N that fit under 35KB are injected, rest dropped', () => {
    // Each skill is 8KB content — 5 × 8KB = 40KB total (over 35KB ceiling)
    // With block overhead, only the first 4 should fit (≈32KB+) before ceiling
    const skill8KB = makeContent(8 * 1024)
    const cache = makeSkillCache({
      'skill-a': skill8KB,
      'skill-b': skill8KB,
      'skill-c': skill8KB,
      'skill-d': skill8KB,
      'skill-e': skill8KB,
    })
    const sources: SkillSource[] = [
      { skill: 'skill-a', source: 'baseline' },
      { skill: 'skill-b', source: 'category' },
      { skill: 'skill-c', source: 'category' },
      { skill: 'skill-d', source: 'keyword' },
      { skill: 'skill-e', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    // Some skills should have been injected
    expect(result.injected).toBe(true)
    // At least one skill did NOT fit → dropped
    expect(result.skillsDropped.length).toBeGreaterThan(0)
    // Ceiling was exceeded (some skills were dropped)
    expect(result.ceilingExceeded).toBe(true)
    // Dropped skills are NOT in the prompt
    for (const dropped of result.skillsDropped) {
      expect(result.prompt).not.toContain(`<skill name="${dropped}">`)
    }
    // At least one skill IS in the prompt (progressive, not all-or-nothing)
    const injectedSkills = ['skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e'].filter(
      s => !result.skillsDropped.includes(s),
    )
    expect(injectedSkills.length).toBeGreaterThan(0)
    for (const injected of injectedSkills) {
      expect(result.prompt).toContain(`<skill name="${injected}">`)
    }
  })

  it('baseline skills always injected regardless of budget', () => {
    // Baseline skill is small
    const baselineContent = makeContent(1 * 1024) // 1KB
    // Non-baseline skills are large enough that together they exceed the remaining budget
    const largeContent = makeContent(20 * 1024) // 20KB each — two together (40KB) exceed 35KB ceiling
    const cache = makeSkillCache({
      'skill-a': baselineContent,
      'skill-b': largeContent,
      'skill-c': largeContent,
    })
    const sources: SkillSource[] = [
      { skill: 'skill-a', source: 'baseline' },
      { skill: 'skill-b', source: 'keyword' },
      { skill: 'skill-c', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['skill-a', 'skill-b', 'skill-c'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
      baselineSkills: ['skill-a'],
    })

    // Baseline skill MUST be in the prompt
    expect(result.prompt).toContain('<skill name="skill-a">')
    // At least one non-baseline skill was dropped due to budget
    const nonBaselineDropped = result.skillsDropped.filter(s => s !== 'skill-a')
    expect(nonBaselineDropped.length).toBeGreaterThan(0)
  })

  it('when total non-baseline content < 35KB, all skills injected and skillsDropped is empty', () => {
    // 3 skills × 2KB = 6KB total — well under 35KB
    const smallContent = makeContent(2 * 1024)
    const cache = makeSkillCache({
      'skill-a': smallContent,
      'skill-b': smallContent,
      'skill-c': smallContent,
    })
    const sources: SkillSource[] = [
      { skill: 'skill-a', source: 'baseline' },
      { skill: 'skill-b', source: 'category' },
      { skill: 'skill-c', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['skill-a', 'skill-b', 'skill-c'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    expect(result.skillsDropped).toEqual([])
    expect(result.ceilingExceeded).toBe(false)
    expect(result.injected).toBe(true)
    expect(result.prompt).toContain('<skill name="skill-a">')
    expect(result.prompt).toContain('<skill name="skill-b">')
    expect(result.prompt).toContain('<skill name="skill-c">')
  })

  it('when even the first non-baseline skill exceeds remaining budget, only baseline is injected', () => {
    // Baseline fills most of the budget (~34KB), then non-baseline is 2KB — doesn't fit
    const bigBaselineContent = makeContent(34 * 1024)
    const smallNonBaseline = makeContent(2 * 1024)
    const cache = makeSkillCache({
      'baseline-skill': bigBaselineContent,
      'keyword-skill': smallNonBaseline,
    })
    const sources: SkillSource[] = [
      { skill: 'baseline-skill', source: 'baseline' },
      { skill: 'keyword-skill', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['baseline-skill', 'keyword-skill'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
      baselineSkills: ['baseline-skill'],
    })

    // Baseline IS in prompt
    expect(result.prompt).toContain('<skill name="baseline-skill">')
    // Non-baseline was dropped (no room)
    expect(result.prompt).not.toContain('<skill name="keyword-skill">')
    // keyword-skill is in skillsDropped
    expect(result.skillsDropped).toContain('keyword-skill')
  })

  it('injected is true as long as at least baseline content was injected (even when all non-baseline skills are dropped)', () => {
    // Baseline is 1KB (~1064 bytes with block overhead), leaving ~34KB of budget.
    // Each non-baseline skill is 34KB content (~34848 bytes block) — exceeds remaining budget alone.
    const baselineContent = makeContent(1 * 1024)
    const hugeContent = makeContent(34 * 1024) // each alone exceeds what's left after baseline
    const cache = makeSkillCache({
      'baseline-skill': baselineContent,
      'skill-x': hugeContent,
      'skill-y': hugeContent,
    })
    const sources: SkillSource[] = [
      { skill: 'baseline-skill', source: 'baseline' },
      { skill: 'skill-x', source: 'keyword' },
      { skill: 'skill-y', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['baseline-skill', 'skill-x', 'skill-y'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
      baselineSkills: ['baseline-skill'],
    })

    // Injected is true because baseline was included
    expect(result.injected).toBe(true)
    // Both non-baseline skills were dropped
    expect(result.skillsDropped).toContain('skill-x')
    expect(result.skillsDropped).toContain('skill-y')
  })

  it('ceilingExceeded backward compat: true when any skills are dropped', () => {
    // 8KB × 5 = 40KB total — will exceed 35KB ceiling
    const skill8KB = makeContent(8 * 1024)
    const cache = makeSkillCache({
      'skill-a': skill8KB,
      'skill-b': skill8KB,
      'skill-c': skill8KB,
      'skill-d': skill8KB,
      'skill-e': skill8KB,
    })
    const sources: SkillSource[] = [
      { skill: 'skill-a', source: 'baseline' },
      { skill: 'skill-b', source: 'category' },
      { skill: 'skill-c', source: 'category' },
      { skill: 'skill-d', source: 'keyword' },
      { skill: 'skill-e', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e'],
      sources,
      originalPrompt: 'My task',
      skillCache: cache,
    })

    // ceilingExceeded is true whenever skillsDropped is non-empty
    expect(result.skillsDropped.length).toBeGreaterThan(0)
    expect(result.ceilingExceeded).toBe(true)
  })

  it('skillsDropped is populated with the names of skills that did not fit', () => {
    // One small baseline, two large keyword skills that individually exceed the remaining budget
    const smallContent = makeContent(100)
    const largeContent = makeContent(PROMPT_SIZE_CEILING) // alone fills the whole ceiling
    const cache = makeSkillCache({
      'baseline-skill': smallContent,
      'heavy-keyword-1': largeContent,
      'heavy-keyword-2': largeContent,
    })
    const sources: SkillSource[] = [
      { skill: 'baseline-skill',  source: 'baseline' },
      { skill: 'heavy-keyword-1', source: 'keyword' },
      { skill: 'heavy-keyword-2', source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['baseline-skill', 'heavy-keyword-1', 'heavy-keyword-2'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    // Both heavy keywords must appear in skillsDropped
    expect(result.skillsDropped).toContain('heavy-keyword-1')
    expect(result.skillsDropped).toContain('heavy-keyword-2')
    // The baseline skill that was injected must NOT appear in skillsDropped
    expect(result.skillsDropped).not.toContain('baseline-skill')
  })

  it('source-priority ordering: lower-priority non-baseline skills are dropped first when budget exhausted', () => {
    // Baseline: 1KB (always fits)
    // Category: takes ~60% of remaining budget (fits)
    // Keyword:  takes ~60% of remaining budget (doesn't fit — no room after category)
    const baselineContent = makeContent(1 * 1024) // 1KB
    const baselineBlock = blockSize('baseline', baselineContent)
    const remaining = PROMPT_SIZE_CEILING - baselineBlock
    // Category fills 60% of remaining, keyword tries to fill another 60% (overflow)
    const categoryContent = makeContent(Math.floor(remaining * 0.6))
    const keywordContent  = makeContent(Math.floor(remaining * 0.6))

    const cache = makeSkillCache({
      'baseline':     baselineContent,
      'cat-skill':    categoryContent,
      'kw-skill':     keywordContent,
    })
    const sources: SkillSource[] = [
      { skill: 'baseline',  source: 'baseline' },
      { skill: 'cat-skill', source: 'category' },
      { skill: 'kw-skill',  source: 'keyword' },
    ]

    const result = injectSkillContent({
      skills: ['baseline', 'cat-skill', 'kw-skill'],
      sources,
      originalPrompt: 'Task',
      skillCache: cache,
    })

    // Higher-priority (category) should be injected
    expect(result.prompt).toContain('<skill name="cat-skill">')
    // Lower-priority (keyword) should be dropped
    expect(result.skillsDropped).toContain('kw-skill')
    // Category must NOT be in skillsDropped
    expect(result.skillsDropped).not.toContain('cat-skill')
  })
})

// ---------------------------------------------------------------------------
// injectSkillContent — null skill cache
// ---------------------------------------------------------------------------

describe('injectSkillContent — null skill cache', () => {
  it('returns injected=false when skillCache is null', () => {
    const result = injectSkillContent({
      skills: ['pre-action'],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      originalPrompt: 'Task',
      skillCache: null,
    })

    expect(result.injected).toBe(false)
    expect(result.prompt).toBe('Task')
  })

  it('preserves original prompt when skillCache is null', () => {
    const originalPrompt = 'Do something important'

    const result = injectSkillContent({
      skills: ['pre-action'],
      sources: [{ skill: 'pre-action', source: 'baseline' }],
      originalPrompt,
      skillCache: null,
    })

    expect(result.prompt).toBe(originalPrompt)
  })

  it('returns injected=false when skills array is empty', () => {
    const cache = makeSkillCache({ 'pre-action': 'content' })

    const result = injectSkillContent({
      skills: [],
      sources: [],
      originalPrompt: 'Task',
      skillCache: cache,
    })

    expect(result.injected).toBe(false)
    expect(result.prompt).toBe('Task')
  })
})
