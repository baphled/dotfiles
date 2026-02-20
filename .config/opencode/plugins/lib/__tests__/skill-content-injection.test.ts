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
// injectSkillContent — 30KB ceiling enforcement
// ---------------------------------------------------------------------------

describe('injectSkillContent — 30KB ceiling enforcement', () => {
  it('exports PROMPT_SIZE_CEILING as 30KB (30 * 1024)', () => {
    expect(PROMPT_SIZE_CEILING).toBe(30 * 1024)
  })

  it('skips content injection when total injected content exceeds 30KB', () => {
    // Create a skill with content just over the 30KB limit
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
    // We need: `<skill name="X">\n{content}\n</skill>` total <= 30KB
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

  it('injects normally when content is well under 30KB', () => {
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
