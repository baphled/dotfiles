import { readFileSync } from 'fs'
import { join } from 'path'
import { selectSkills } from '../skill-selector'
import type { SkillAutoLoaderConfig, SkillSelectionInput } from '../skill-selector'

const CONFIG_FILE = join(process.env.HOME!, '.config/opencode/plugins/skill-auto-loader-config.jsonc')

function loadRealConfig(): SkillAutoLoaderConfig {
  const content = readFileSync(CONFIG_FILE, 'utf-8')
  const stripped = content.replace(/\/\/.*$/gm, '')
  return JSON.parse(stripped) as SkillAutoLoaderConfig
}

const realConfig = loadRealConfig()
const BASELINE = realConfig.baseline_skills

describe('skill-auto-loader — real config integration', () => {
  describe("category 'deep'", () => {
    it('includes all baseline skills', () => {
      const input: SkillSelectionInput = { category: 'deep', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('returns only baseline skills when deep category mapping is empty', () => {
      const input: SkillSelectionInput = { category: 'deep', existingSkills: [] }
      const result = selectSkills(input, realConfig)
      // With empty category_mappings, only baseline skills should be returned
      expect(result.skills).toHaveLength(BASELINE.length)
    })
  })

  describe("subagent_type 'Senior-Engineer'", () => {
    it('includes all baseline skills', () => {
      const input: SkillSelectionInput = { subagentType: 'Senior-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('returns only baseline skills when Senior-Engineer subagent_mapping is empty', () => {
      const input: SkillSelectionInput = { subagentType: 'Senior-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      // With empty subagent_mappings, only baseline skills should be returned
      expect(result.skills).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })
  })

  describe("subagent_type 'QA-Engineer'", () => {
    it('includes all baseline skills', () => {
      const input: SkillSelectionInput = { subagentType: 'QA-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('returns only baseline skills when QA-Engineer subagent_mapping is empty', () => {
      const input: SkillSelectionInput = { subagentType: 'QA-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      // With empty subagent_mappings, only baseline skills should be returned
      expect(result.skills).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })
  })

  describe("prompt containing 'security audit for golang app'", () => {
    it('returns only baseline skills when keyword_patterns is empty', () => {
      const input: SkillSelectionInput = {
        existingSkills: [],
        prompt: 'security audit for golang app',
      }
      const result = selectSkills(input, realConfig)

      // With empty keyword_patterns, no keyword skills should be injected
      expect(result.skills).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('golang is NOT triggered by keyword pattern (language skills come from codebase detection)', () => {
      const input: SkillSelectionInput = {
        existingSkills: [],
        prompt: 'security audit for golang app',
      }
      const result = selectSkills(input, realConfig)

      // golang should NOT come from keywords - language skills come from codebase detection
      const golangFromKeyword = result.sources.find(s => s.skill === 'golang' && s.source === 'keyword')
      expect(golangFromKeyword).toBeUndefined()
    })

    it('records no keyword sources when keyword_patterns is empty', () => {
      const input: SkillSelectionInput = {
        existingSkills: [],
        prompt: 'security audit for golang app',
      }
      const result = selectSkills(input, realConfig)

      const keywordSources = result.sources.filter(s => s.source === 'keyword')
      expect(keywordSources).toHaveLength(0)
    })
  })

  describe("category 'writing' with prompt containing 'document the api'", () => {
    it('returns only baseline skills when writing category mapping is empty', () => {
      const input: SkillSelectionInput = {
        category: 'writing',
        existingSkills: [],
        prompt: 'document the api',
      }
      const result = selectSkills(input, realConfig)

      // With empty category_mappings and keyword_patterns, only baseline skills returned
      expect(result.skills).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('does not include documentation-writing since keyword_patterns is empty', () => {
      const input: SkillSelectionInput = {
        category: 'writing',
        existingSkills: [],
        prompt: 'document the api',
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).not.toContain('documentation-writing')
    })
  })

  describe('session continuation', () => {
    it('returns only existing skills when session_id is provided and skip_on_session_continue is true', () => {
      const input: SkillSelectionInput = {
        category: 'deep',
        existingSkills: [],
        prompt: 'Continue implementing the feature',
        sessionId: 'ses_abc123',
      }
      const result = selectSkills(input, realConfig)

      // Implementation returns only existingSkills during session continuation
      expect(result.skills).toHaveLength(0)
      expect(result.sources).toHaveLength(0)
    })

    it('returns empty sources when session_id is provided and skip_on_session_continue is true', () => {
      const input: SkillSelectionInput = {
        category: 'deep',
        existingSkills: [],
        sessionId: 'ses_abc123',
      }
      const result = selectSkills(input, realConfig)

      expect(result.sources).toHaveLength(0)
    })
  })

  describe('existing load_skills preservation', () => {
    it('preserves explicitly provided skills that are not in the auto-selected set', () => {
      const input: SkillSelectionInput = {
        category: 'quick',
        existingSkills: ['playwright', 'custom-skill'],
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toContain('playwright')
      expect(result.skills).toContain('custom-skill')
    })

    it('preserves existing skills alongside auto-injected baseline skills', () => {
      const input: SkillSelectionInput = {
        existingSkills: ['custom-skill'],
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toContain('custom-skill')
      expect(result.skills).toContain('skill-discovery')
    })
  })

  describe('deduplication', () => {
    it('produces no duplicate when an existing skill overlaps with a baseline skill', () => {
      const input: SkillSelectionInput = {
        existingSkills: ['skill-discovery'],
      }
      const result = selectSkills(input, realConfig)

      const count = result.skills.filter(s => s === 'skill-discovery').length
      expect(count).toBe(1)
    })

    it('produces no duplicate when category skill overlaps with baseline skill', () => {
      const configWithOverlap: SkillAutoLoaderConfig = {
        ...realConfig,
        baseline_skills: ['clean-code'],
        category_mappings: {
          ...realConfig.category_mappings,
          'quick': ['clean-code'],
        },
      }
      const input: SkillSelectionInput = { category: 'quick', existingSkills: [] }
      const result = selectSkills(input, configWithOverlap)

      const count = result.skills.filter(s => s === 'clean-code').length
      expect(count).toBe(1)
    })

    it('produces no duplicate when keyword skill overlaps with an existing skill', () => {
      const input: SkillSelectionInput = {
        existingSkills: ['security'],
        prompt: 'security audit',
      }
      const result = selectSkills(input, realConfig)

      const count = result.skills.filter(s => s === 'security').length
      expect(count).toBe(1)
    })

    it('produces no duplicates across all three tiers in a combined scenario', () => {
      const input: SkillSelectionInput = {
        category: 'deep',
        subagentType: 'Senior-Engineer',
        existingSkills: ['clean-code'],
        prompt: 'Refactor the golang security module',
      }
      const result = selectSkills(input, realConfig)

      const seen = new Set<string>()
      for (const skill of result.skills) {
        expect(seen.has(skill)).toBe(false)
        seen.add(skill)
      }
    })
  })
})
