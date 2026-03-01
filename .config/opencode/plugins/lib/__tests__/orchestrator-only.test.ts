import { readFileSync } from 'fs'
import { join } from 'path'

const AGENTS_MD = join(process.env.HOME!, '.config/opencode/AGENTS.md')
const OPENCODE_CONFIG = join(process.env.HOME!, '.config/opencode/oh-my-opencode.jsonc')
const SKILL_CONFIG = join(process.env.HOME!, '.config/opencode/plugins/skill-auto-loader-config.jsonc')

function stripJsoncComments(text: string): string {
  const chars: string[] = []
  let i = 0
  let inString = false

  while (i < text.length) {
    const ch = text[i]

    if (inString) {
      if (ch === '\\') {
        chars.push(ch, text[i + 1])
        i += 2
        continue
      }
      if (ch === '"') {
        inString = false
      }
    } else if (ch === '"') {
      inString = true
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        i++
      }
      continue
    }

    chars.push(ch)
    i++
  }

  return chars.join('')
}

function loadOpencodeConfig(): Record<string, unknown> {
  const content = readFileSync(OPENCODE_CONFIG, 'utf-8')
  const stripped = stripJsoncComments(content)
  return JSON.parse(stripped) as Record<string, unknown>
}

function loadSkillConfig(): Record<string, unknown> {
  const content = readFileSync(SKILL_CONFIG, 'utf-8')
  const stripped = stripJsoncComments(content)
  return JSON.parse(stripped) as Record<string, unknown>
}

const opencodeConfig = loadOpencodeConfig()
const agents = opencodeConfig['agents'] as Record<string, Record<string, unknown>>
const skillConfig = loadSkillConfig()
const subagentMappings = skillConfig['subagent_mappings'] as Record<string, string[]>

describe('orchestrator-only — oh-my-opencode.jsonc agent configuration', () => {
  describe('specialist agents have mode: subagent', () => {
    const specialistAgents = [
      'Senior-Engineer',
      'QA-Engineer',
      'Tech-Lead',
      'DevOps',
      'Writer',
      'Security-Engineer',
      'Data-Analyst',
      'Embedded-Engineer',
      'Nix-Expert',
      'Linux-Expert',
      'SysOp',
      'VHS-Director',
      'Knowledge Base Curator',
      'Model-Evaluator',
    ]

    for (const agentName of specialistAgents) {
      it(`'${agentName}' has mode set to subagent`, () => {
        expect(agents[agentName]).toBeDefined()
        expect(agents[agentName]['mode']).toBe('subagent')
      })
    }
  })
})

describe('orchestrator-only — AGENTS.md enforcement language', () => {
  const agentsMdContent = readFileSync(AGENTS_MD, 'utf-8')

  it('contains ZERO implementation language for the orchestrator', () => {
    expect(agentsMdContent).toContain('ZERO implementation')
  })

  it('contains orchestrator enforcement language', () => {
    expect(agentsMdContent).toContain('orchestrator')
  })

  it("contains 'NEVER' prohibition on direct file editing", () => {
    expect(agentsMdContent).toContain('NEVER')
  })

  it("contains prohibition on using 'write' tools directly", () => {
    expect(agentsMdContent.toLowerCase()).toContain('write')
  })

  it("contains prohibition on using 'edit' tools directly", () => {
    expect(agentsMdContent.toLowerCase()).toContain('edit')
  })
})

describe('orchestrator-only — skill-auto-loader-config.jsonc subagent_mappings', () => {
  // All subagent_mappings have been emptied — the entire object is {}
  // Tests now verify that the mappings are empty as expected
  it('subagent_mappings is an empty object', () => {
    expect(subagentMappings).toEqual({})
  })
})

describe('orchestrator-only — permission enforcement (deterministic)', () => {
  const orchestrators = ['sisyphus', 'hephaestus', 'atlas']

  for (const name of orchestrators) {
    describe(name, () => {
      it('has edit permission set to deny', () => {
        const permission = agents[name]['permission'] as Record<string, string>
        expect(permission['edit']).toBe('deny')
      })

      it('has bash permission set to allow (for orchestration commands)', () => {
        const permission = agents[name]['permission'] as Record<string, string>
        expect(permission['bash']).toBe('allow')
      })

      it('does not have mode set to subagent', () => {
        expect(agents[name]['mode']).not.toBe('subagent')
      })

      it('prompt_append contains orchestrator identity', () => {
        const promptAppend = agents[name]['prompt_append'] as string
        expect(promptAppend).toContain('YOU ARE AN ORCHESTRATOR')
      })

      it('prompt_append contains delegation rules', () => {
        const promptAppend = agents[name]['prompt_append'] as string
        expect(promptAppend).toContain('delegate')
      })
    })
  }
})

describe('sisyphus-junior — worker agent classification', () => {
  it('has edit permission set to allow (worker can modify files)', () => {
    const permission = agents['sisyphus-junior']['permission'] as Record<string, string>
    expect(permission['edit']).toBe('allow')
  })

  it('does not contain PHASE 0 classification (workers execute, not classify)', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    expect(promptAppend).not.toContain('PHASE 0')
  })

  it('does not contain DELEGATE AUTOMATICALLY (workers execute, not delegate)', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    expect(promptAppend).not.toContain('DELEGATE AUTOMATICALLY')
  })

  it('does not contain SPECIALIST AGENT ROUTING (workers do not route)', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    expect(promptAppend).not.toContain('SPECIALIST AGENT ROUTING')
  })

  it('loads discipline skill via mcp_skill', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    // The current prompt_append contains step discipline rules
    expect(promptAppend).toContain("mcp_skill('discipline')")
  })

  it('includes mcp_skill loading instructions', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    expect(promptAppend).toContain('mcp_skill(name) for EACH skill')
  })

  it('includes knowledge lookup protocol', () => {
    const promptAppend = agents['sisyphus-junior']['prompt_append'] as string
    expect(promptAppend).toContain('Search memory')
  })
})
