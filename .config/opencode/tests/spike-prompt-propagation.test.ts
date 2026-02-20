/**
 * Spike: Validate prompt modification propagation
 *
 * GOAL: Prove that modifying `output.args.prompt` in a plugin's
 * `tool.execute.before` hook persists on the args object after
 * the hook returns. This validates JS object mutation semantics
 * for the skill content injection approach.
 *
 * Pattern reference: plugins/skill-auto-loader.ts:125-168
 *   - args is accessed as `output.args as Record<string, unknown>`
 *   - args.load_skills is mutated directly and it works
 *   - We need to confirm args.prompt mutation works identically
 */
import { describe, it, expect } from 'bun:test'

/**
 * Simulates the plugin hook signature for tool.execute.before.
 * The hook receives an output object with args as Record<string, unknown>.
 */
type MockOutput = {
  args: Record<string, unknown>
}

/**
 * Simulates what the plugin hook does: cast args, mutate prompt.
 * Mirrors the pattern at skill-auto-loader.ts:125-126, 168.
 */
function simulateHookPromptMutation(output: MockOutput, contentToPrepend: string): void {
  const args = output.args as Record<string, unknown>
  const existingPrompt = (args.prompt as string | undefined) ?? ''
  args.prompt = `${contentToPrepend}\n\n${existingPrompt}`
}

/**
 * Simulates existing load_skills mutation (already proven to work).
 * Used as a control/comparison test.
 */
function simulateHookLoadSkillsMutation(output: MockOutput, skills: string[]): void {
  const args = output.args as Record<string, unknown>
  args.load_skills = skills
}

describe('Spike: prompt modification propagation via plugin hook', () => {
  describe('args.prompt mutation (the thing we need to prove)', () => {
    it('persists prompt modification on the args object after hook returns', () => {
      const output: MockOutput = {
        args: {
          prompt: 'Original user prompt',
          category: 'deep',
        },
      }

      simulateHookPromptMutation(output, 'SKILL_CONTENT_MARKER')

      expect(output.args.prompt).toContain('SKILL_CONTENT_MARKER')
    })

    it('preserves original prompt content when content is prepended', () => {
      const originalPrompt = 'Implement the user registration feature'
      const output: MockOutput = {
        args: {
          prompt: originalPrompt,
          category: 'deep',
        },
      }

      simulateHookPromptMutation(output, '# Skill: golang\nGo expertise content here')

      const resultPrompt = output.args.prompt as string
      expect(resultPrompt).toContain(originalPrompt)
      expect(resultPrompt).toContain('# Skill: golang')
      expect(resultPrompt.indexOf('# Skill: golang')).toBeLessThan(
        resultPrompt.indexOf(originalPrompt),
      )
    })

    it('handles undefined prompt gracefully (sets new content)', () => {
      const output: MockOutput = {
        args: {
          category: 'quick',
          // no prompt key at all
        },
      }

      simulateHookPromptMutation(output, 'INJECTED_SKILL_CONTENT')

      expect(output.args.prompt).toContain('INJECTED_SKILL_CONTENT')
    })

    it('handles empty string prompt', () => {
      const output: MockOutput = {
        args: {
          prompt: '',
        },
      }

      simulateHookPromptMutation(output, 'SKILL_CONTENT')

      expect(output.args.prompt).toContain('SKILL_CONTENT')
    })

    it('does not affect other args properties', () => {
      const output: MockOutput = {
        args: {
          prompt: 'Original prompt',
          category: 'deep',
          subagent_type: 'Senior-Engineer',
          load_skills: ['clean-code'],
        },
      }

      simulateHookPromptMutation(output, 'INJECTED')

      expect(output.args.category).toBe('deep')
      expect(output.args.subagent_type).toBe('Senior-Engineer')
      expect(output.args.load_skills).toEqual(['clean-code'])
    })
  })

  describe('args.load_skills mutation (control — known to work)', () => {
    it('persists load_skills modification on the args object', () => {
      const output: MockOutput = {
        args: {
          prompt: 'Do something',
          load_skills: ['existing-skill'],
        },
      }

      simulateHookLoadSkillsMutation(output, ['existing-skill', 'auto-injected'])

      expect(output.args.load_skills).toEqual(['existing-skill', 'auto-injected'])
    })
  })

  describe('both mutations together (real-world scenario)', () => {
    it('prompt and load_skills mutations both persist on same args object', () => {
      const output: MockOutput = {
        args: {
          prompt: 'Build the authentication module',
          category: 'deep',
          load_skills: ['clean-code'],
        },
      }

      // Simulate what the enhanced plugin would do:
      // 1. Inject skills into load_skills
      simulateHookLoadSkillsMutation(output, ['clean-code', 'security', 'golang'])
      // 2. Inject skill content into prompt
      simulateHookPromptMutation(output, '# Skill: security\nSecurity best practices...')

      // Both mutations persist
      expect(output.args.load_skills).toEqual(['clean-code', 'security', 'golang'])
      const resultPrompt = output.args.prompt as string
      expect(resultPrompt).toContain('# Skill: security')
      expect(resultPrompt).toContain('Build the authentication module')
    })
  })
})
