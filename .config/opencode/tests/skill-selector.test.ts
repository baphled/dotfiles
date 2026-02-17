/**
 * Tests for Skill Selector Algorithm
 */

import { describe, test, expect } from 'bun:test'
import { selectSkills, selectAgent, type SkillAutoLoaderConfig, type SkillSelectionInput } from '../plugins/lib/skill-selector'

// Test config fixture
const testConfig: SkillAutoLoaderConfig = {
  baseline_skills: ['pre-action', 'memory-keeper'],
  max_auto_skills: 3,
  skip_on_session_continue: true,
  category_mappings: {
    'deep': ['clean-code', 'error-handling'],
    'visual-engineering': ['frontend-ui-ux', 'accessibility'],
    'quick': ['clean-code']
  },
  subagent_mappings: {
    'oracle': ['critical-thinking', 'architecture']
  },
  keyword_patterns: [
    { pattern: 'security|vulnerabilit', skills: ['security'], priority: 9 },
    { pattern: 'test|spec', skills: ['ginkgo-gomega'], priority: 8 },
    { pattern: 'refactor', skills: ['refactor', 'clean-code'], priority: 7 },
    { pattern: 'database|db', skills: ['db-operations'], priority: 6 }
  ]
}

describe('selectSkills', () => {
  test('baseline skills always present', () => {
    const input: SkillSelectionInput = {
      category: 'quick',
      existingSkills: [],
      prompt: ''
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toContain('pre-action')
    expect(result.skills).toContain('memory-keeper')
    expect(result.sources.some(s => s.skill === 'pre-action' && s.source === 'baseline')).toBe(true)
  })

  test('category mapping adds domain skills', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: ''
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toContain('clean-code')
    expect(result.skills).toContain('error-handling')
    expect(result.sources.some(s => s.skill === 'clean-code' && s.source === 'category')).toBe(true)
  })

  test('keyword analysis detects domain from prompt', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: 'Audit the authentication code for security vulnerabilities'
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toContain('security')
    expect(result.sources.some(s => s.skill === 'security' && s.source === 'keyword')).toBe(true)
  })

  test('deduplication prevents duplicates', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: ['clean-code'],
      prompt: 'Refactor with clean code patterns'
    }
    const result = selectSkills(input, testConfig)
    
    const cleanCodeCount = result.skills.filter(s => s === 'clean-code').length
    expect(cleanCodeCount).toBe(1)
  })

  test('max skills cap enforced', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: 'Security audit test database refactor' // matches 4 keyword patterns
    }
    const result = selectSkills(input, testConfig)
    
    // max_auto_skills = 3, but we also have baseline_skills (2) + category (2) + keywords (4)
    // Should be capped at 3 total auto skills
    const autoSkills = result.skills.filter(s => 
      s === 'pre-action' || s === 'memory-keeper' || 
      s === 'clean-code' || s === 'error-handling' ||
      s === 'security' || s === 'ginkgo-gomega' || s === 'refactor' || s === 'db-operations'
    )
    expect(autoSkills.length).toBeLessThanOrEqual(5) // baseline(2) + max(3)
  })

  test('session continuation skips injection when configured', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: 'Continue refactoring',
      sessionId: 'ses_abc123'
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toHaveLength(0)
  })

  test('empty prompt skips keyword analysis', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: ''
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.sources.some(s => s.source === 'keyword')).toBe(false)
  })

  test('merge with existing skills', () => {
    const input: SkillSelectionInput = {
      category: 'quick',
      existingSkills: ['playwright', 'custom-skill'],
      prompt: ''
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toContain('playwright')
    expect(result.skills).toContain('custom-skill')
    expect(result.skills).toContain('pre-action')
  })

  test('subagent mapping works', () => {
    const input: SkillSelectionInput = {
      subagentType: 'oracle',
      existingSkills: [],
      prompt: ''
    }
    const result = selectSkills(input, testConfig)
    
    expect(result.skills).toContain('critical-thinking')
    expect(result.skills).toContain('architecture')
  })

  test('agent default skills included', () => {
    const input: SkillSelectionInput = {
      category: 'deep',
      existingSkills: [],
      prompt: '',
      agentDefaultSkills: ['custom-skill', 'another-skill']
    }
    const result = selectSkills(input, testConfig)
    
    // custom-skill should be included, another-skill may be capped
    expect(result.skills).toContain('custom-skill')
    // Check that at least one agent-default skill is present
    expect(result.sources.some(s => s.source === 'agent-default')).toBe(true)
  })
})

// ============================================================
// selectAgent Tests
// ============================================================

// Config with agent_patterns for selectAgent tests
const agentRoutingConfig: SkillAutoLoaderConfig = {
  ...testConfig,
  agent_patterns: [
    { pattern: 'security|vulnerabilit|CVE', agent: 'Security-Auditor', priority: 10 },
    { pattern: 'architect|design.*system|DDD', agent: 'Architect', priority: 9 },
    { pattern: 'review|PR|pull.request', agent: 'Code-Reviewer', priority: 8 },
    { pattern: 'test|spec|BDD|TDD', agent: 'Test-Engineer', priority: 7 },
    { pattern: 'refactor|clean.up|technical.debt', agent: 'Refactorer', priority: 6 },
    { pattern: '.*', agent: 'Senior-Engineer', priority: 1 }
  ]
}

describe('selectAgent', () => {
  test('highest priority wins when multiple patterns match', () => {
    // "security test" matches both Security-Auditor (10) and Test-Engineer (7) and Senior-Engineer (1)
    const result = selectAgent('Run a security test on the auth module', agentRoutingConfig)

    expect(result.agent).toBe('Security-Auditor')
    expect(result.priority).toBe(10)
    expect(result.matched_pattern).toBe('security|vulnerabilit|CVE')
  })

  test('returns null result when no patterns configured', () => {
    const configWithoutPatterns: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: []
    }
    const result = selectAgent('Some prompt', configWithoutPatterns)

    expect(result.agent).toBeNull()
    expect(result.matched_pattern).toBeNull()
    expect(result.priority).toBe(0)
  })

  test('returns null result when agent_patterns is undefined', () => {
    const configNoPatterns: SkillAutoLoaderConfig = {
      ...testConfig
      // agent_patterns not set
    }
    const result = selectAgent('Some prompt', configNoPatterns)

    expect(result.agent).toBeNull()
    expect(result.matched_pattern).toBeNull()
    expect(result.priority).toBe(0)
  })

  test('returns null result for empty prompt', () => {
    const result = selectAgent('', agentRoutingConfig)

    expect(result.agent).toBeNull()
    expect(result.matched_pattern).toBeNull()
    expect(result.priority).toBe(0)
  })

  test('returns null result for whitespace-only prompt', () => {
    const result = selectAgent('   \t\n  ', agentRoutingConfig)

    expect(result.agent).toBeNull()
    expect(result.matched_pattern).toBeNull()
    expect(result.priority).toBe(0)
  })

  test('case-insensitive regex matching', () => {
    // "SECURITY" should match "security|vulnerabilit|CVE" with 'i' flag
    const result = selectAgent('SECURITY audit needed', agentRoutingConfig)

    expect(result.agent).toBe('Security-Auditor')
    expect(result.priority).toBe(10)
  })

  test('case-insensitive matching works for mixed case', () => {
    const result = selectAgent('Run a Refactor on the service layer', agentRoutingConfig)

    expect(result.agent).toBe('Refactorer')
    expect(result.priority).toBe(6)
  })

  test('matches specific agent when only one pattern hits', () => {
    // "architect the new system" matches Architect (9) + Senior-Engineer (1)
    const result = selectAgent('architect the new payment system', agentRoutingConfig)

    expect(result.agent).toBe('Architect')
    expect(result.priority).toBe(9)
  })

  test('skips invalid regex patterns gracefully', () => {
    const configWithBadRegex: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: [
        { pattern: '[invalid(regex', agent: 'Bad-Agent', priority: 10 },
        { pattern: 'valid', agent: 'Good-Agent', priority: 5 }
      ]
    }
    const result = selectAgent('This is a valid prompt', configWithBadRegex)

    expect(result.agent).toBe('Good-Agent')
    expect(result.priority).toBe(5)
  })

  test('returns correct matched_pattern for the winning match', () => {
    const result = selectAgent('Please review this PR', agentRoutingConfig)

    expect(result.agent).toBe('Code-Reviewer')
    expect(result.matched_pattern).toBe('review|PR|pull.request')
    expect(result.priority).toBe(8)
  })
})

// ============================================================
// Senior-Engineer Catch-All Tests
// ============================================================

describe('Senior-Engineer catch-all', () => {
  test('matches Senior-Engineer when no higher-priority agent matches', () => {
    // Config with only Senior-Engineer catch-all and a specific agent
    const catchAllConfig: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: [
        { pattern: 'security', agent: 'Security-Auditor', priority: 10 },
        { pattern: '.*', agent: 'Senior-Engineer', priority: 1 }
      ]
    }

    // Prompt that doesn't match "security"
    const result = selectAgent('Help me fix a typo in the README', catchAllConfig)

    expect(result.agent).toBe('Senior-Engineer')
    expect(result.priority).toBe(1)
  })

  test('catch-all is superseded by higher-priority match', () => {
    const catchAllConfig: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: [
        { pattern: 'security', agent: 'Security-Auditor', priority: 10 },
        { pattern: '.*', agent: 'Senior-Engineer', priority: 1 }
      ]
    }

    const result = selectAgent('Check for security vulnerabilities', catchAllConfig)

    expect(result.agent).toBe('Security-Auditor')
    expect(result.priority).toBe(10)
  })

  test('catch-all does not match empty prompt', () => {
    const catchAllConfig: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: [
        { pattern: '.*', agent: 'Senior-Engineer', priority: 1 }
      ]
    }

    const result = selectAgent('', catchAllConfig)

    expect(result.agent).toBeNull()
  })

  test('catch-all with multiple specific agents — only fires as last resort', () => {
    // Carefully chosen to NOT match: security|vulnerabilit|CVE, architect|design.*system|DDD,
    // review|PR|pull.request, test|spec|BDD|TDD, refactor|clean.up|technical.debt
    const result = selectAgent('Add a new logging handler to the email module', agentRoutingConfig)

    // Only the .* catch-all matches
    expect(result.agent).toBe('Senior-Engineer')
    expect(result.priority).toBe(1)
  })
})

// ============================================================
// Agent Routing Integration Tests
// ============================================================

describe('agent routing integration', () => {
  // Simulates the plugin's routing logic
  const GENERIC_AGENTS = new Set<string | undefined>([undefined, 'sisyphus-junior'])

  function simulateRouting(
    prompt: string,
    subagentType: string | undefined,
    config: SkillAutoLoaderConfig
  ): { finalAgent: string | undefined; wasRouted: boolean } {
    if (GENERIC_AGENTS.has(subagentType)) {
      const routingResult = selectAgent(prompt, config)
      if (routingResult.agent) {
        return { finalAgent: routingResult.agent, wasRouted: true }
      }
    }
    return { finalAgent: subagentType, wasRouted: false }
  }

  test('generic agent (undefined) gets routed based on prompt', () => {
    const result = simulateRouting(
      'Review this pull request for issues',
      undefined,
      agentRoutingConfig
    )

    expect(result.wasRouted).toBe(true)
    expect(result.finalAgent).toBe('Code-Reviewer')
  })

  test('generic agent (sisyphus-junior) gets routed based on prompt', () => {
    const result = simulateRouting(
      'Architect a new microservice',
      'sisyphus-junior',
      agentRoutingConfig
    )

    expect(result.wasRouted).toBe(true)
    expect(result.finalAgent).toBe('Architect')
  })

  test('explicit agent is NOT routed — preserved as-is', () => {
    const result = simulateRouting(
      'Review this pull request for security issues',
      'oracle',
      agentRoutingConfig
    )

    // Even though prompt matches Security-Auditor and Code-Reviewer,
    // oracle is explicit and should be preserved
    expect(result.wasRouted).toBe(false)
    expect(result.finalAgent).toBe('oracle')
  })

  test('explicit agent explore is NOT routed', () => {
    const result = simulateRouting(
      'Find all security vulnerabilities',
      'explore',
      agentRoutingConfig
    )

    expect(result.wasRouted).toBe(false)
    expect(result.finalAgent).toBe('explore')
  })

  test('generic agent with no matching prompt falls through', () => {
    const configNoMatch: SkillAutoLoaderConfig = {
      ...testConfig,
      agent_patterns: [
        { pattern: 'xyzzy_impossible_pattern', agent: 'Never-Matches', priority: 10 }
      ]
    }
    const result = simulateRouting(
      'Normal development task',
      undefined,
      configNoMatch
    )

    expect(result.wasRouted).toBe(false)
    expect(result.finalAgent).toBeUndefined()
  })

  test('generic agent with empty prompt is not routed', () => {
    const result = simulateRouting('', undefined, agentRoutingConfig)

    expect(result.wasRouted).toBe(false)
    expect(result.finalAgent).toBeUndefined()
  })

  test('routing picks highest-priority agent for multi-match prompts', () => {
    // "security test review" matches Security-Auditor (10), Test-Engineer (7), Code-Reviewer (8)
    const result = simulateRouting(
      'Do a security test review',
      'sisyphus-junior',
      agentRoutingConfig
    )

    expect(result.wasRouted).toBe(true)
    expect(result.finalAgent).toBe('Security-Auditor')
  })
})
