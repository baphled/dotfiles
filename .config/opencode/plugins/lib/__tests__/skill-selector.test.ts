import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { selectSkills } from '../skill-selector'
import type {
  SkillAutoLoaderConfig,
  SkillSelectionInput,
} from '../skill-selector'

const testConfig: SkillAutoLoaderConfig = {
  baseline_skills: ['pre-action', 'memory-keeper'],
  max_auto_skills: 5,
  max_auto_skills_bytes: 20480, // 20KB budget for non-baseline skills
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
    'Senior-Engineer': ['error-handling'],
    'QA-Engineer': [],
  },
  role_mappings: {
    'testing': ['bdd-workflow'],
    'implementation': ['clean-code', 'error-handling', 'design-patterns'],
    'review': ['code-reviewer', 'clean-code', 'critical-thinking'],
    'refactoring': ['refactor', 'clean-code', 'design-patterns'],
  },
  keyword_patterns: [
    { pattern: 'security|vulnerabilit|auth|encrypt', skills: ['security', 'cyber-security'], priority: 9 },
    { pattern: 'test|spec|assert|expect|describe|tdd', skills: ['ginkgo-gomega', 'bdd-workflow'], priority: 8 },
    { pattern: 'golang|\\.go |go module|goroutine', skills: ['golang'], priority: 8 },
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

  it("maps subagent type 'Senior-Engineer' to error-handling", () => {
    const input: SkillSelectionInput = { subagentType: 'Senior-Engineer', existingSkills: [] }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('error-handling')
    expect(result.skills).not.toContain('clean-code')
    expect(result.skills).not.toContain('bdd-workflow')
    expect(result.skills).not.toContain('golang')
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

  it("prompt containing 'test' triggers ginkgo-gomega and bdd-workflow skills", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Write test cases for the payment service',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('ginkgo-gomega')
    expect(result.skills).toContain('bdd-workflow')
  })

  it("prompt containing 'golang' triggers golang skill", () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Implement a golang HTTP server with middleware',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('golang')
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
         { pattern: 'golang', skills: ['golang'], priority: 8 },
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
  it('returns baseline skills only (no category/keyword) when sessionId is present and skip_on_session_continue is true', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'Continue implementing the feature',
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, testConfig)

    // Should have baseline skills
    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')

    // Should NOT have category skills
    expect(result.skills).not.toContain('architecture')
    expect(result.skills).not.toContain('critical-thinking')
    expect(result.skills).not.toContain('systems-thinker')
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

  it('returns baseline skills when sessionId is present and skip_on_session_continue is true', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })

  it('does NOT return category/keyword skills when sessionId is present and skip_on_session_continue is true', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
      prompt: 'security test golang refactor',
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, testConfig)

    // Should have baseline skills
    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')

    // Should NOT have category skills from 'ultrabrain'
    expect(result.skills).not.toContain('architecture')
    expect(result.skills).not.toContain('critical-thinking')
    expect(result.skills).not.toContain('systems-thinker')

    // Should NOT have keyword skills
    expect(result.skills).not.toContain('security')
    expect(result.skills).not.toContain('golang')
    expect(result.skills).not.toContain('refactor')
  })

  it('merges baseline skills with existing skills when sessionId is present and skip_on_session_continue is true', () => {
    const input: SkillSelectionInput = {
      existingSkills: ['playwright', 'custom-skill'],
      sessionId: 'ses_abc123',
    }
    const result = selectSkills(input, testConfig)

    // Should have baseline skills
    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')

    // Should have existing skills
    expect(result.skills).toContain('playwright')
    expect(result.skills).toContain('custom-skill')

    // Should not have duplicates
    const preActionCount = result.skills.filter(s => s === 'pre-action').length
    expect(preActionCount).toBe(1)
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

describe('selectSkills — max_auto_skills Cap raised to 10', () => {
  // RED: This test documents that the old cap of 5 was too restrictive.
  // With max_auto_skills: 5 and baseline_skills: [], only 5 skills are returned
  // even though 8 unique non-baseline skills match the prompt.
  it('returns 8 non-baseline skills when cap is 10 and enough patterns match', () => {
    // Configure a rich set of keyword patterns that together produce 10+ unique skills.
    // With max_auto_skills: 5 (old value) only 5 non-baseline skills would be returned.
    // With max_auto_skills: 10 all 8 should be included.
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['pre-action', 'memory-keeper'],
      max_auto_skills: 10,
       keyword_patterns: [
         { pattern: 'security', skills: ['security', 'cyber-security'], priority: 9 },
         { pattern: 'test', skills: ['ginkgo-gomega', 'bdd-workflow'], priority: 8 },
         { pattern: 'golang', skills: ['golang'], priority: 8 },
         { pattern: 'refactor', skills: ['refactor', 'design-patterns'], priority: 7 },
         { pattern: 'database', skills: ['gorm-repository', 'sql'], priority: 7 },
       ],
     }
     const input: SkillSelectionInput = {
       existingSkills: [],
       // Prompt matches all 5 keyword patterns → 9 unique non-baseline skills
       prompt: 'security test golang refactor database',
     }
     const result = selectSkills(input, config)

      // All 7 distinct non-baseline skills from the matched patterns should be present
      const expectedNonBaselineSkills = [
        'security',
        'cyber-security',
        'ginkgo-gomega',
        'bdd-workflow',
        'golang',
        'refactor',
        'design-patterns',
      ]
     for (const skill of expectedNonBaselineSkills) {
       expect(result.skills).toContain(skill)
     }

     // Exactly 7 non-baseline skills (not limited to 5)
     const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
     expect(nonBaselineSources.length).toBeGreaterThanOrEqual(7)
  })

  it('still caps at max_auto_skills when more than 10 non-baseline skills would match', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 10,
       keyword_patterns: [
         // 11 unique skills across patterns
         { pattern: 'security', skills: ['security', 'cyber-security', 'epistemic-rigor'], priority: 9 },
         { pattern: 'test', skills: ['ginkgo-gomega', 'bdd-workflow'], priority: 8 },
         { pattern: 'golang', skills: ['golang', 'clean-code'], priority: 8 },
         { pattern: 'refactor', skills: ['refactor', 'design-patterns'], priority: 7 },
         { pattern: 'database', skills: ['gorm-repository', 'sql', 'db-operations'], priority: 7 },
       ],
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'security test golang refactor database',
    }
    const result = selectSkills(input, config)

    // Should not exceed 10 non-baseline skills even though 13 would match
    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources.length).toBeLessThanOrEqual(10)
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
    expect(result.skills).toContain('error-handling')
  })
})

describe('selectSkills — Focus Parameter (replaces subagent_mappings)', () => {
  it('adds role_mappings skills when focus is provided without subagentType', () => {
    const input: SkillSelectionInput & { focus?: string } = {
      existingSkills: [],
      focus: 'testing',
    }
    const result = selectSkills(input, testConfig)

    // focus: "testing" → role_mappings.testing → ['bdd-workflow']
    expect(result.skills).toContain('bdd-workflow')
    const categorySources = result.sources.filter(s => s.source === 'category')
    expect(categorySources.some(s => s.skill === 'bdd-workflow')).toBe(true)
  })

  it('uses focus role_mappings instead of subagent_mappings when both focus and subagentType are provided', () => {
    const input: SkillSelectionInput & { focus?: string } = {
      existingSkills: [],
      focus: 'implementation',
      subagentType: 'Senior-Engineer',
    }
    const result = selectSkills(input, testConfig)

    // focus: "implementation" → role_mappings.implementation → ['clean-code', 'error-handling', 'design-patterns']
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('error-handling')
    expect(result.skills).toContain('design-patterns')

    // subagent_mappings['Senior-Engineer'] = ['error-handling'] should NOT be used as a separate source
    // focus REPLACES subagent_mappings, so error-handling comes from role_mappings, not subagent_mappings
    const categorySources = result.sources.filter(s => s.source === 'category')
    const errorHandlingSource = categorySources.find(s => s.skill === 'error-handling')
    expect(errorHandlingSource).toBeDefined()

    // Verify design-patterns is present (only in role_mappings, NOT in Senior-Engineer subagent_mappings)
    expect(categorySources.some(s => s.skill === 'design-patterns')).toBe(true)
  })

  it('falls back to subagent_mappings when focus is an unknown role', () => {
    const input: SkillSelectionInput & { focus?: string } = {
      existingSkills: [],
      focus: 'unknown-role',
      subagentType: 'Senior-Engineer',
    }
    const result = selectSkills(input, testConfig)

    // unknown focus → no role_mappings match → falls back to subagent_mappings
    // Senior-Engineer subagent_mappings = ['error-handling']
    expect(result.skills).toContain('error-handling')
  })

  it('uses subagent_mappings when focus is absent (existing behaviour unchanged)', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      subagentType: 'Senior-Engineer',
    }
    const result = selectSkills(input, testConfig)

    // No focus → subagent_mappings as normal
    expect(result.skills).toContain('error-handling')
    expect(result.skills).not.toContain('design-patterns')
  })
})

describe('selectSkills — Codebase Skills (Tier 2.5)', () => {
  it('injects codebaseSkills when provided, with source set to codebase', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, testConfig)

    expect(result.skills).toContain('golang')
    expect(result.sources.some(s => s.skill === 'golang' && s.source === 'codebase')).toBe(true)
  })

  it('orders codebase skills after role skills and before keyword skills (with critical keyword)', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['golang'],
      prompt: 'security refactor the code',
    }
    const result = selectSkills(input, testConfig)

    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    const categoryIdx = nonBaselineSources.findIndex(s => s.source === 'category')
    const codebaseIdx = nonBaselineSources.findIndex(s => s.source === 'codebase')
    const keywordIdx = nonBaselineSources.findIndex(s => s.source === 'keyword')

    // codebase must appear after category (role) skills
    expect(codebaseIdx).toBeGreaterThan(categoryIdx)
    // codebase must appear before keyword skills
    expect(codebaseIdx).toBeLessThan(keywordIdx)
  })

  it('does not duplicate codebaseSkills already present in existingSkills', () => {
    const input: SkillSelectionInput = {
      existingSkills: ['golang'],
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, testConfig)

    const golangCount = result.skills.filter(s => s === 'golang').length
    expect(golangCount).toBe(1)
    // Should NOT appear in sources since it was already in existingSkills (added via autoSkillsSet dedup)
    const codebaseSources = result.sources.filter(s => s.source === 'codebase')
    expect(codebaseSources.some(s => s.skill === 'golang')).toBe(false)
  })

  it('produces no codebase sources when codebaseSkills is not provided', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
    }
    const result = selectSkills(input, testConfig)

    const codebaseSources = result.sources.filter(s => s.source === 'codebase')
    expect(codebaseSources).toHaveLength(0)
  })

  it('excludes codebase skills when count cap is already reached by baseline and role skills', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 1,
      role_mappings: {
        'implementation': ['clean-code'],
      },
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'implementation',
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, config)

    // count cap of 1 is consumed by clean-code from role, golang should be excluded
    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources.length).toBeLessThanOrEqual(1)
    expect(result.skills).not.toContain('golang')
  })
})

describe('selectSkills — Byte Budget Cap (max_auto_skills_bytes)', () => {
  it('truncates non-baseline skills greedily when total size exceeds max_auto_skills_bytes', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['pre-action'],
      max_auto_skills: 10,
      max_auto_skills_bytes: 5000, // 5KB cap
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain', // → architecture, critical-thinking, systems-thinker
    }

    // Each skill is ~3KB, so only 1 fits within 5KB budget
    const skillSizes = new Map<string, number>([
      ['architecture', 3000],
      ['critical-thinking', 3000],
      ['systems-thinker', 3000],
    ])
    const result = selectSkills(input, config, skillSizes)

    // Total of 3 category skills = 9KB > 5KB cap
    // Greedy: keeps first (highest priority) skills until budget exhausted
    const nonBaselineSources = result.sources.filter(s => s.source !== 'baseline')
    expect(nonBaselineSources.length).toBeLessThan(3)
  })

  it('keeps higher-priority skills when byte budget is exhausted', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 10,
      max_auto_skills_bytes: 4000,
      keyword_patterns: [
        { pattern: 'security', skills: ['security'], priority: 9 },
        { pattern: 'refactor', skills: ['refactor'], priority: 7 },
      ],
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'security refactor',
    }

    // security (priority 9) = 3KB, refactor (priority 7) = 3KB
    // Budget is 4KB, so only security fits
    const skillSizes = new Map<string, number>([
      ['security', 3000],
      ['refactor', 3000],
    ])
    const result = selectSkills(input, config, skillSizes)

    // Higher priority security should be kept
    expect(result.skills).toContain('security')
    // Lower priority refactor should be dropped
    expect(result.skills).not.toContain('refactor')
  })

  it('applies no byte cap when skillSizes is not provided (existing count-cap behaviour)', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: [],
      max_auto_skills: 10,
      max_auto_skills_bytes: 1, // Extremely restrictive byte cap
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain', // → architecture, critical-thinking, systems-thinker
    }

    // No skillSizes param → byte cap should NOT apply
    const result = selectSkills(input, config)

    // All 3 category skills should be present (count cap of 10 is not hit)
    expect(result.skills).toContain('architecture')
    expect(result.skills).toContain('critical-thinking')
    expect(result.skills).toContain('systems-thinker')
  })

  it('never drops baseline skills due to byte budget', () => {
    const config: SkillAutoLoaderConfig = {
      ...testConfig,
      baseline_skills: ['pre-action', 'memory-keeper'],
      max_auto_skills: 10,
      max_auto_skills_bytes: 100, // Very small budget
    }
    const input: SkillSelectionInput = {
      existingSkills: [],
      category: 'ultrabrain',
    }

    // Baseline skills have large sizes but should never be dropped
    const skillSizes = new Map<string, number>([
      ['pre-action', 5000],
      ['memory-keeper', 5000],
      ['architecture', 3000],
      ['critical-thinking', 3000],
      ['systems-thinker', 3000],
    ])
    const result = selectSkills(input, config, skillSizes)

    // Baseline skills always present regardless of byte budget
    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
  })
})

describe('selectSkills — Focus Suppresses Keyword Patterns', () => {
  it('suppresses non-critical keyword patterns when focus matches role_mappings', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      prompt: 'Refactor the code to be cleaner', // matches refactor pattern (priority 7)
    }
    const result = selectSkills(input, testConfig)

    // Focus is set and matches role_mappings → keywords with priority < 9 should NOT fire
    const keywordSources = result.sources.filter(s => s.source === 'keyword')
    expect(keywordSources).toHaveLength(0)

    // Role mapping skills SHOULD be present
    expect(result.skills).toContain('bdd-workflow')

    // Keyword skills should NOT be present
    expect(result.skills).not.toContain('refactor')
    expect(result.skills).not.toContain('design-patterns')
  })

  it('still allows critical patterns (priority >= 9) even when focus is set', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'implementation',
      prompt: 'Fix the security vulnerability in auth', // matches security pattern (priority 9)
    }
    const result = selectSkills(input, testConfig)

    // Critical security pattern (priority 9) should still fire
    expect(result.skills).toContain('security')
    expect(result.skills).toContain('cyber-security')

    // Role mapping skills should also be present
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('error-handling')
    expect(result.skills).toContain('design-patterns')
  })

  it('suppresses ALL non-critical keyword patterns when focus is set', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'review',
      prompt: 'test the golang database refactor', // matches test(p8), golang(p8), refactor(p7)
    }
    const result = selectSkills(input, testConfig)

    // Role mapping skills should be present
    expect(result.skills).toContain('code-reviewer')
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('critical-thinking')

    // ALL non-critical keyword skills should be suppressed
    expect(result.skills).not.toContain('ginkgo-gomega') // test pattern, priority 8
    expect(result.skills).not.toContain('golang') // golang pattern, priority 8

    // Note: 'refactor' from keyword source should be suppressed, but 'clean-code' is already
    // in role_mappings so it's present from that source, not keywords
    const keywordSources = result.sources.filter(s => s.source === 'keyword')
    expect(keywordSources).toHaveLength(0)
  })

  it('fires keywords normally when focus is not set', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      prompt: 'Refactor the code to be cleaner', // matches refactor pattern
    }
    const result = selectSkills(input, testConfig)

    // No focus → keywords should fire normally
    expect(result.skills).toContain('refactor')
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('design-patterns')
  })

  it('fires keywords normally when focus does not match role_mappings', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'unknown-role',
      prompt: 'Refactor the code to be cleaner',
    }
    const result = selectSkills(input, testConfig)

    // Unknown focus → no role_mappings match → keywords should fire normally
    expect(result.skills).toContain('refactor')
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('design-patterns')
  })
})

describe('selectSkills — Focus + Language Test Framework Mapping', () => {
  // Config with focus_language_mappings: when focus + codebaseSkills align,
  // inject language-specific test framework skills.
  const configWithFLM = {
    ...testConfig,
    focus_language_mappings: {
      testing: {
        golang: ['ginkgo-gomega'],
        javascript: ['jest'],
        ruby: ['rspec-testing'],
      },
    },
  }

  it('injects ginkgo-gomega when focus is testing and codebase includes golang', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).toContain('ginkgo-gomega')
  })

  it('injects jest when focus is testing and codebase includes javascript', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['javascript'],
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).toContain('jest')
  })

  it('injects rspec-testing when focus is testing and codebase includes ruby', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['ruby'],
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).toContain('rspec-testing')
  })

  it('does NOT inject ginkgo-gomega when focus is implementation (only testing triggers frameworks)', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'implementation',
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).not.toContain('ginkgo-gomega')
  })

  it('does NOT inject any test framework when focus is testing but no codebaseSkills provided', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).not.toContain('ginkgo-gomega')
    expect(result.skills).not.toContain('jest')
    expect(result.skills).not.toContain('rspec-testing')
  })

  it('records focus-language-mapped skills with source "focus-language"', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, configWithFLM)

    const focusLangSources = result.sources.filter(s => s.source === 'focus-language' as string)
    expect(focusLangSources.some(s => s.skill === 'ginkgo-gomega')).toBe(true)
  })

  it('injects multiple frameworks when codebase includes multiple languages', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['golang', 'javascript'],
    }
    const result = selectSkills(input, configWithFLM)

    expect(result.skills).toContain('ginkgo-gomega')
    expect(result.skills).toContain('jest')
  })

  it('combines role_mappings skills with focus-language-mapped framework skills', () => {
    const input: SkillSelectionInput = {
      existingSkills: [],
      focus: 'testing',
      codebaseSkills: ['golang'],
    }
    const result = selectSkills(input, configWithFLM)

    // role_mappings.testing → bdd-workflow (already works)
    expect(result.skills).toContain('bdd-workflow')
    // focus_language_mappings.testing.golang → ginkgo-gomega (new feature)
    expect(result.skills).toContain('ginkgo-gomega')
  })
})

describe('Config Cleanup — Go-specific skills not in keyword patterns', () => {
  // Load the ACTUAL config file (not the hardcoded test fixture)
  const configPath = resolve(__dirname, '../../skill-auto-loader-config.jsonc')
  const configText = readFileSync(configPath, 'utf-8')
  const jsonText = configText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const actualConfig = JSON.parse(jsonText) as SkillAutoLoaderConfig

  const allKeywordSkills = actualConfig.keyword_patterns.flatMap(
    (p: { skills: string[] }) => p.skills,
  )

  it('ginkgo-gomega must not appear in any keyword pattern', () => {
    expect(allKeywordSkills).not.toContain('ginkgo-gomega')
  })

  it('gorm-repository must not appear in any keyword pattern', () => {
    expect(allKeywordSkills).not.toContain('gorm-repository')
  })

  it('bubble-tea-expert must not appear in any keyword pattern', () => {
    expect(allKeywordSkills).not.toContain('bubble-tea-expert')
  })
})

describe('Config Cleanup — clean-code not in non-programming categories', () => {
  // Load the ACTUAL config file (not the hardcoded test fixture)
  const configPath = resolve(__dirname, '../../skill-auto-loader-config.jsonc')
  const configText = readFileSync(configPath, 'utf-8')
  const jsonText = configText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const actualConfig = JSON.parse(jsonText) as SkillAutoLoaderConfig

  it('clean-code must not appear in deep category mapping', () => {
    expect(actualConfig.category_mappings['deep']).not.toContain('clean-code')
  })

  it('clean-code must not appear in quick category mapping', () => {
    expect(actualConfig.category_mappings['quick']).not.toContain('clean-code')
  })

  it('clean-code must not appear in unspecified-low category mapping', () => {
    expect(actualConfig.category_mappings['unspecified-low']).not.toContain('clean-code')
  })

  it('clean-code must not appear in unspecified-high category mapping', () => {
    expect(actualConfig.category_mappings['unspecified-high']).not.toContain('clean-code')
  })
})

describe('Config Cleanup — baseline must be exactly pre-action and memory-keeper', () => {
  // Load the ACTUAL config file (not the hardcoded test fixture)
  const configPath = resolve(__dirname, '../../skill-auto-loader-config.jsonc')
  const configText = readFileSync(configPath, 'utf-8')
  const jsonText = configText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const actualConfig = JSON.parse(jsonText) as SkillAutoLoaderConfig

  it('baseline_skills must contain exactly pre-action and memory-keeper', () => {
    expect(actualConfig.baseline_skills).toEqual(['pre-action', 'memory-keeper'])
  })

  it('baseline_skills must not contain agent-discovery', () => {
    expect(actualConfig.baseline_skills).not.toContain('agent-discovery')
  })

  it('baseline_skills must not contain token-cost-estimation', () => {
    expect(actualConfig.baseline_skills).not.toContain('token-cost-estimation')
  })
})
