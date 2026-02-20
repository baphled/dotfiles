import { selectSkills } from '../skill-selector'
import type {
  SkillAutoLoaderConfig,
  SkillSelectionInput,
} from '../skill-selector'

const testConfig: SkillAutoLoaderConfig = {
  baseline_skills: ['pre-action', 'memory-keeper'],
  max_auto_skills: 5,
  skip_on_session_continue: true,
  category_mappings: {
    'visual-engineering': ['frontend-ui-ux', 'accessibility', 'clean-code'],
    'ultrabrain': ['architecture', 'critical-thinking', 'systems-thinker'],
    'deep': ['clean-code', 'error-handling'],
    'quick': ['clean-code'],
    'writing': ['british-english', 'documentation-writing'],
  },
  subagent_mappings: {
    'explore': [],
    'librarian': [],
    'oracle': ['critical-thinking', 'architecture', 'systems-thinker'],
    'sisyphus-junior': [],
    'Senior-Engineer': ['clean-code', 'tdd-workflow', 'error-handling', 'golang'],
    'QA-Engineer': ['bdd-workflow', 'ginkgo-gomega', 'godog', 'tdd-workflow'],
  },
  keyword_patterns: [
    { pattern: 'security|vulnerabilit|auth|encrypt', skills: ['security', 'cyber-security'], priority: 9 },
    { pattern: 'test|spec|assert|expect|describe|tdd', skills: ['ginkgo-gomega', 'bdd-workflow', 'tdd-workflow'], priority: 8 },
    { pattern: 'golang|\\.go |go module|goroutine', skills: ['golang', 'go-expert'], priority: 8 },
    { pattern: 'refactor|clean|simplif', skills: ['refactor', 'clean-code', 'design-patterns'], priority: 7 },
  ],
}

describe('selectSkills — Tier 1: Baseline Skills', () => {
  it('injects baseline skills from config into every result', () => {
    const input: SkillSelectionInput = { existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })

  it('records baseline skills in sources with source set to baseline', () => {
    const input: SkillSelectionInput = { existingSkills: [] }
    const result = selectSkills(input, testConfig)

    const baselineSources = result.sources.filter(s => s.source === 'baseline')
    const baselineSkillNames = baselineSources.map(s => s.skill)

    expect(baselineSkillNames).toContain('pre-action')
    expect(baselineSkillNames).toContain('memory-keeper')
  })

  it('produces no baseline skills when baseline_skills array is empty', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
    }
    const input: SkillSelectionInput = { existingSkills: [] }
    const result = selectSkills(input, config)

    const baselineSources = result.sources.filter(s => s.source === 'baseline')
    expect(baselineSources).toHaveLength(0)
  })
})

describe('selectSkills — Tier 2: Category Mappings', () => {
  it("maps category 'visual-engineering' to frontend-ui-ux, accessibility, and clean-code", () => {
    const input: SkillSelectionInput = { category: 'visual-engineering', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('frontend-ui-ux')
    expect(result.skills).toContain('accessibility')
    expect(result.skills).toContain('clean-code')
  })

  it("maps category 'ultrabrain' to architecture, critical-thinking, and systems-thinker", () => {
    const input: SkillSelectionInput = { category: 'ultrabrain', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('architecture')
    expect(result.skills).toContain('critical-thinking')
    expect(result.skills).toContain('systems-thinker')
  })

  it("maps category 'writing' to british-english and documentation-writing", () => {
    const input: SkillSelectionInput = { category: 'writing', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('british-english')
    expect(result.skills).toContain('documentation-writing')
  })

  it("maps category 'quick' to clean-code only", () => {
    const input: SkillSelectionInput = { category: 'quick', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('clean-code')
  })

  it('adds no category skills for an unknown category', () => {
    const input: SkillSelectionInput = { category: 'nonexistent-category', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    const categorySources = result.sources.filter(s => s.source === 'category')
    expect(categorySources).toHaveLength(0)
  })
})

describe('selectSkills — Tier 2: Subagent Mappings', () => {
  it("maps subagent type 'oracle' to critical-thinking, architecture, and systems-thinker", () => {
    const input: SkillSelectionInput = { subagentType: 'oracle', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('critical-thinking')
    expect(result.skills).toContain('architecture')
    expect(result.skills).toContain('systems-thinker')
  })

  it("maps subagent type 'explore' to an empty skill set", () => {
    const input: SkillSelectionInput = { subagentType: 'explore', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    const categorySources = result.sources.filter(s => s.source === 'category')
    expect(categorySources).toHaveLength(0)
  })

  it("maps subagent type 'Senior-Engineer' to clean-code, tdd-workflow, error-handling, and golang", () => {
    const input: SkillSelectionInput = { subagentType: 'Senior-Engineer', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('tdd-workflow')
    expect(result.skills).toContain('error-handling')
    expect(result.skills).toContain('golang')
  })

  it('includes agent default skills in the result with source set to agent-default', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      agentDefaultSkills: ['custom-domain-skill', 'another-skill'],
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('custom-domain-skill')
    const agentDefaultSources = result.sources.filter(s => s.source === 'agent-default')
    expect(agentDefaultSources.some(s => s.skill === 'custom-domain-skill')).toBe(true)
  })
})

describe('selectSkills — Tier 3: Keyword Pattern Matching', () => {
  it("prompt containing 'security' triggers security and cyber-security skills", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Audit the authentication flow for security vulnerabilities',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('security')
    expect(result.skills).toContain('cyber-security')
    expect(result.sources.some(s => s.skill === 'security' && s.source === 'keyword')).toBe(true)
  })

  it("prompt containing 'test' triggers ginkgo-gomega, bdd-workflow, and tdd-workflow skills", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Write test cases for the payment service',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('ginkgo-gomega')
    expect(result.skills).toContain('bdd-workflow')
    expect(result.skills).toContain('tdd-workflow')
  })

  it("prompt containing 'golang' triggers golang and go-expert skills", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Implement a golang HTTP server with middleware',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('golang')
    expect(result.skills).toContain('go-expert')
  })

  it("prompt containing 'refactor' triggers refactor, clean-code, and design-patterns skills", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Refactor the legacy order processing module',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('refactor')
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('design-patterns')
  })

  it('combines skills from multiple matching keyword patterns', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Refactor the golang security auth module',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('security')
    expect(result.skills).toContain('golang')
    expect(result.skills).toContain('refactor')
  })

  it('respects max_auto_skills cap when many patterns match, keeping higher-priority skills', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 2,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'security test golang refactor',
    }
    const result = selectSkills(input, config)

    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources.length).toBeLessThanOrEqual(2)

    const keywordSources = result.sources.filter(s => s.source === 'keyword')
    if (keywordSources.length > 0) {
      expect(result.skills).toContain('security')
    }
  })

  it('produces no keyword skills when prompt is empty', () => {
    const input: SkillSelectionInput = { existingSkills: [], prompt: '' }
    const result = selectSkills(input, testConfig)

    const keywordSources = result.sources.filter(s => s.source === 'keyword')
    expect(keywordSources).toHaveLength(0)
  })

  it('skips invalid regex patterns gracefully without throwing', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      keyword_patterns: [
        { pattern: '[invalid(regex', skills: ['should-not-appear'], priority: 10 },
        { pattern: 'golang', skills: ['golang', 'go-expert'], priority: 8 },
      ],
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Write a golang service',
    }

    expect(() => selectSkills(input, config)).not.toThrow()

    const result = selectSkills(input, config)
    expect(result.skills).not.toContain('should-not-appear')
    expect(result.skills).toContain('golang')
  })
})

describe('selectSkills — Session Continuation', () => {
  it('returns empty result when sessionId is present and skip_on_session_continue is true', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'Continue implementing the feature',
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toHaveLength(0)
    expect(result.sources).toHaveLength(0)
  })

  it('still injects skills when sessionId is present but skip_on_session_continue is false', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      skip_on_session_continue: false,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, config)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })

  it('injects skills normally when no sessionId is provided', () => {
    const input: SkillSelectionInput = { existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })
})

describe('selectSkills — Deduplication and Existing Skills', () => {
  it('preserves existing skills in the final result', () => {
    const input: SkillSelectionInput = {
      existingSkills: ['playwright', 'custom-skill'],
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('playwright')
    expect(result.skills).toContain('custom-skill')
  })

  it('does not produce duplicates when existing skills overlap with baseline skills', () => {
    const input: SkillSelectionInput = {
      existingSkills: ['pre-action'],
    }
    const result = selectSkills(input, testConfig)

    const preActionCount = result.skills.filter(s => s === 'pre-action').length
    expect(preActionCount).toBe(1)
  })

  it('does not produce duplicates when category skills overlap with baseline skills', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['clean-code'],
      category_mappings: {
        'quick': ['clean-code'],
      },
    }
    const input: SkillSelectionInput = { existingSkills: [], category: 'quick' }
    const result = selectSkills(input, config)

    const cleanCodeCount = result.skills.filter(s => s === 'clean-code').length
    expect(cleanCodeCount).toBe(1)
  })

  it('does not produce duplicates when keyword skills overlap with category skills', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'quick',
      prompt: 'Refactor and clean up this module',
    }
    const result = selectSkills(input, testConfig)

    const cleanCodeCount = result.skills.filter(s => s === 'clean-code').length
    expect(cleanCodeCount).toBe(1)
  })
})

describe('selectSkills — max_auto_skills Cap', () => {
  it('excludes baseline skills from the max_auto_skills count', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      max_auto_skills: 0,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'Audit security vulnerabilities',
    }
    const result = selectSkills(input, config)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })

  it('includes only baseline skills when max_auto_skills is zero', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      max_auto_skills: 0,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'Do a security test in golang',
    }
    const result = selectSkills(input, config)

    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources).toHaveLength(0)
  })

  it('caps category and keyword skills at max_auto_skills', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 2,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'security test golang refactor',
    }
    const result = selectSkills(input, config)

    expect(result.skills.length).toBeLessThanOrEqual(2)
  })

  it('allows baseline skills beyond the cap', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['pre-action', 'memory-keeper', 'skill-discovery'],
      max_auto_skills: 1,
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
    }
    const result = selectSkills(input, config)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
    expect(result.skills).toContain('skill-discovery')

    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources.length).toBeLessThanOrEqual(1)
  })
})

describe('selectSkills — All Three Tiers Combined', () => {
  it('merges baseline, category, and keyword skills into a single deduplicated result', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'security audit for the golang service',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')

    expect(result.skills).toContain('architecture')
    expect(result.skills).toContain('critical-thinking')

    expect(result.skills).toContain('security')
  })

  it('correctly labels each skill with its originating tier in sources', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'test the security of this auth module',
    }
    const result = selectSkills(input, testConfig)

    const baselineSources = result.sources.filter(s => s.source === 'baseline')
    expect(baselineSources.length).toBeGreaterThan(0)

    const categorySources = result.sources.filter(s => s.source === 'category')
    expect(categorySources.length).toBeGreaterThan(0)

    const keywordSources = result.sources.filter(s => s.source === 'keyword')
    expect(keywordSources.length).toBeGreaterThan(0)
  })

  it('deduplicates skills that appear in multiple tiers', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['critical-thinking'],
      category_mappings: {
        'ultrabrain': ['critical-thinking', 'architecture'],
      },
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
    }
    const result = selectSkills(input, config)

    const criticalThinkingCount = result.skills.filter(s => s === 'critical-thinking').length
    expect(criticalThinkingCount).toBe(1)
  })

  it('combines subagent skills with category and keyword skills', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'deep',
      subagentType: 'Senior-Engineer',
      prompt: 'Refactor the golang module',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('tdd-workflow')
  })
})
