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

    it("includes 'clean-code' and 'error-handling' from the deep category mapping", () => {
      const input: SkillSelectionInput = { category: 'deep', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toContain('clean-code')
      expect(result.skills).toContain('error-handling')
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

    it('includes the skills defined in the Senior-Engineer subagent_mapping', () => {
      const input: SkillSelectionInput = { subagentType: 'Senior-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      const expectedSkills = realConfig.subagent_mappings['Senior-Engineer']
      for (const skill of expectedSkills) {
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

    it('includes the skills defined in the QA-Engineer subagent_mapping', () => {
      const input: SkillSelectionInput = { subagentType: 'QA-Engineer', existingSkills: [] }
      const result = selectSkills(input, realConfig)

      const expectedSkills = realConfig.subagent_mappings['QA-Engineer']
      for (const skill of expectedSkills) {
        expect(result.skills).toContain(skill)
      }
    })
  })

  describe("prompt containing 'security audit for golang app'", () => {
    it('includes security skills triggered by the security keyword pattern', () => {
      const input: SkillSelectionInput = {
        existingSkills: [],
        prompt: 'security audit for golang app',
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toContain('security')
      expect(result.skills).toContain('cyber-security')
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

    it('records security skills with source set to keyword', () => {
      const input: SkillSelectionInput = {
        existingSkills: [],
        prompt: 'security audit for golang app',
      }
      const result = selectSkills(input, realConfig)

      expect(result.sources.some(s => s.skill === 'security' && s.source === 'keyword')).toBe(true)
    })
  })

  describe("category 'writing' with prompt containing 'document the api'", () => {
    it('includes the writing category mapping skills', () => {
      const input: SkillSelectionInput = {
        category: 'writing',
        existingSkills: [],
        prompt: 'document the api',
      }
      const result = selectSkills(input, realConfig)

      const writingSkills = realConfig.category_mappings['writing']
      for (const skill of writingSkills) {
        expect(result.skills).toContain(skill)
      }
    })

    it('includes documentation-writing from the keyword pattern match on the prompt', () => {
      const input: SkillSelectionInput = {
        category: 'writing',
        existingSkills: [],
        prompt: 'document the api',
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toContain('documentation-writing')
    })
  })

  describe('session continuation', () => {
    it('returns baseline skills when session_id is provided and skip_on_session_continue is true', () => {
      const input: SkillSelectionInput = {
        category: 'deep',
        existingSkills: [],
        prompt: 'Continue implementing the feature',
        sessionId: 'ses_abc123',
      }
      const result = selectSkills(input, realConfig)

      expect(result.skills).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.skills).toContain(skill)
      }
    })

    it('returns baseline sources when session_id is provided and skip_on_session_continue is true', () => {
      const input: SkillSelectionInput = {
        category: 'deep',
        existingSkills: [],
        sessionId: 'ses_abc123',
      }
      const result = selectSkills(input, realConfig)

      expect(result.sources).toHaveLength(BASELINE.length)
      for (const skill of BASELINE) {
        expect(result.sources.some(s => s.skill === skill && s.source === 'baseline')).toBe(true)
      }
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
      expect(result.skills).toContain('pre-action')
    })
  })

  describe('deduplication', () => {
    it('produces no duplicate when an existing skill overlaps with a baseline skill', () => {
      const input: SkillSelectionInput = {
        existingSkills: ['pre-action'],
      }
      const result = selectSkills(input, realConfig)

      const count = result.skills.filter(s => s === 'pre-action').length
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
