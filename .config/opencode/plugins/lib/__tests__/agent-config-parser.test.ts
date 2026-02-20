import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { AgentConfigCache } from '../agent-config-parser'

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-config-parser-'))
}

function writeAgentFile(dir: string, filename: string, content: string): void {
  fs.writeFileSync(path.join(dir, filename), content, 'utf-8')
}

const STANDARD_FRONTMATTER = `---
description: A capable engineer
default_skills:
  - pre-action
  - clean-code
---

# Body content
`

const INLINE_ARRAY_FRONTMATTER = `---
description: Inline skills agent
default_skills: [pre-action, bdd-workflow, critical-thinking]
---
`

const NO_FRONTMATTER = `# Just a heading

Some content without frontmatter.
`

const UNCLOSED_FRONTMATTER = `---
description: Missing closing delimiter
default_skills:
  - orphan-skill
`

const EMPTY_SKILLS_FRONTMATTER = `---
description: Agent with no skills
default_skills:
---
`

describe('AgentConfigCache', () => {
  describe('frontmatter parsing', () => {
    let tempDir: string
    let cache: AgentConfigCache

    beforeEach(() => {
      tempDir = makeTempDir()
      cache = new AgentConfigCache(tempDir)
    })

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('parses standard YAML frontmatter with --- delimiters', async () => {
      writeAgentFile(tempDir, 'my-agent.md', STANDARD_FRONTMATTER)

      await cache.init()

      const config = cache.getAgentConfig('my-agent')
      expect(config).toBeDefined()
      expect(config?.name).toBe('my-agent')
    })

    it('extracts the description field correctly', async () => {
      writeAgentFile(tempDir, 'my-agent.md', STANDARD_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('my-agent')?.description).toBe('A capable engineer')
    })

    it('extracts default_skills as a list using dash-item format', async () => {
      writeAgentFile(tempDir, 'my-agent.md', STANDARD_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('my-agent')?.defaultSkills).toEqual(['pre-action', 'clean-code'])
    })

    it('extracts default_skills from inline array format [item1, item2]', async () => {
      writeAgentFile(tempDir, 'inline-agent.md', INLINE_ARRAY_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('inline-agent')?.defaultSkills).toEqual([
        'pre-action',
        'bdd-workflow',
        'critical-thinking',
      ])
    })

    it('returns null config for files without frontmatter', async () => {
      writeAgentFile(tempDir, 'no-front.md', NO_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('no-front')).toBeUndefined()
    })

    it('returns null config for files with unclosed frontmatter', async () => {
      writeAgentFile(tempDir, 'unclosed.md', UNCLOSED_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('unclosed')).toBeUndefined()
    })

    it('handles empty default_skills gracefully', async () => {
      writeAgentFile(tempDir, 'empty-skills.md', EMPTY_SKILLS_FRONTMATTER)

      await cache.init()

      const config = cache.getAgentConfig('empty-skills')
      expect(config).toBeDefined()
      expect(config?.defaultSkills).toEqual([])
    })
  })

  describe('cache initialisation', () => {
    let tempDir: string
    let cache: AgentConfigCache

    beforeEach(() => {
      tempDir = makeTempDir()
      cache = new AgentConfigCache(tempDir)
    })

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('reads all .md files from the agents directory on init', async () => {
      writeAgentFile(tempDir, 'alpha.md', STANDARD_FRONTMATTER)
      writeAgentFile(tempDir, 'beta.md', INLINE_ARRAY_FRONTMATTER)

      await cache.init()

      const all = cache.getAllAgents()
      expect(all).toHaveLength(2)
    })

    it('skips non-.md files', async () => {
      writeAgentFile(tempDir, 'agent.md', STANDARD_FRONTMATTER)
      writeAgentFile(tempDir, 'readme.txt', 'should be ignored')
      writeAgentFile(tempDir, 'config.json', '{}')

      await cache.init()

      const all = cache.getAllAgents()
      expect(all).toHaveLength(1)
    })

    it('uses filename without .md extension as the agent key', async () => {
      writeAgentFile(tempDir, 'Senior-Engineer.md', STANDARD_FRONTMATTER)

      await cache.init()

      expect(cache.getAgentConfig('Senior-Engineer')).toBeDefined()
      expect(cache.getAgentConfig('Senior-Engineer.md')).toBeUndefined()
    })

    it('handles non-existent agents directory gracefully without crashing', async () => {
      const nonExistentCache = new AgentConfigCache('/tmp/this-directory-does-not-exist-ever')

      await expect(nonExistentCache.init()).resolves.toBeUndefined()
      expect(nonExistentCache.getAllAgents()).toEqual([])
    })

    it('emits a warning when the agents directory does not exist', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const nonExistentCache = new AgentConfigCache('/tmp/this-directory-does-not-exist-ever')

      await nonExistentCache.init()

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))
      warnSpy.mockRestore()
    })

    it('is idempotent — multiple init() calls only read files once', async () => {
      writeAgentFile(tempDir, 'agent.md', STANDARD_FRONTMATTER)
      const readdirSpy = jest.spyOn(fs.promises, 'readdir')

      await cache.init()
      await cache.init()
      await cache.init()

      expect(readdirSpy).toHaveBeenCalledTimes(1)
      readdirSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    let tempDir: string
    let cache: AgentConfigCache

    beforeEach(() => {
      tempDir = makeTempDir()
      cache = new AgentConfigCache(tempDir)
    })

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('warns and continues when an individual agent file cannot be read', async () => {
      writeAgentFile(tempDir, 'good.md', STANDARD_FRONTMATTER)
      const badPath = path.join(tempDir, 'bad.md')
      fs.writeFileSync(badPath, STANDARD_FRONTMATTER)
      fs.chmodSync(badPath, 0o000)

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      await cache.init()

      fs.chmodSync(badPath, 0o644)
      expect(cache.getAgentConfig('good')).toBeDefined()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'))
      warnSpy.mockRestore()
    })

    it('warns when the readdir call itself fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const readdirSpy = jest.spyOn(fs.promises, 'readdir').mockRejectedValueOnce(new Error('EIO'))

      await cache.init()

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to read agents directory'))
      expect(cache.getAllAgents()).toEqual([])
      warnSpy.mockRestore()
      readdirSpy.mockRestore()
    })

    it('returns empty string description when description field is absent', async () => {
      const noDescFrontmatter = `---
default_skills:
  - pre-action
---
`
      writeAgentFile(tempDir, 'nodesc.md', noDescFrontmatter)

      await cache.init()

      expect(cache.getAgentConfig('nodesc')?.description).toBe('')
    })

    it('stops collecting array items when a non-list line is encountered', async () => {
      const mixedFrontmatter = `---
description: Mixed agent
default_skills:
  - first-skill
  - second-skill
other_field: stops-here
  - not-a-skill
---
`
      writeAgentFile(tempDir, 'mixed.md', mixedFrontmatter)

      await cache.init()

      expect(cache.getAgentConfig('mixed')?.defaultSkills).toEqual(['first-skill', 'second-skill'])
    })

    it('skips blank lines within an array block and continues collecting items', async () => {
      const blankLineFrontmatter = `---
description: Agent with gaps
default_skills:
  - first-skill

  - second-skill
---
`
      writeAgentFile(tempDir, 'gaps.md', blankLineFrontmatter)

      await cache.init()

      expect(cache.getAgentConfig('gaps')?.defaultSkills).toEqual(['first-skill', 'second-skill'])
    })
  })

  describe('agent config retrieval', () => {
    let tempDir: string
    let cache: AgentConfigCache

    beforeEach(async () => {
      tempDir = makeTempDir()
      cache = new AgentConfigCache(tempDir)

      writeAgentFile(
        tempDir,
        'Senior-Engineer.md',
        `---
description: Senior software engineer
default_skills:
  - pre-action
  - memory-keeper
  - clean-code
  - bdd-workflow
  - agent-discovery
---
`,
      )
      writeAgentFile(
        tempDir,
        'QA-Engineer.md',
        `---
description: Quality assurance expert
default_skills:
  - pre-action
  - bdd-workflow
  - critical-thinking
  - agent-discovery
---
`,
      )

      await cache.init()
    })

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('returns correct config for Senior-Engineer including all default_skills', () => {
      const config = cache.getAgentConfig('Senior-Engineer')

      expect(config).toBeDefined()
      expect(config?.name).toBe('Senior-Engineer')
      expect(config?.defaultSkills).toEqual([
        'pre-action',
        'memory-keeper',
        'clean-code',
        'bdd-workflow',
        'agent-discovery',
      ])
    })

    it('returns correct config for QA-Engineer including all default_skills', () => {
      const config = cache.getAgentConfig('QA-Engineer')

      expect(config).toBeDefined()
      expect(config?.name).toBe('QA-Engineer')
      expect(config?.defaultSkills).toEqual([
        'pre-action',
        'bdd-workflow',
        'critical-thinking',
        'agent-discovery',
      ])
    })

    it('returns undefined for a non-existent agent name', () => {
      expect(cache.getAgentConfig('nonexistent')).toBeUndefined()
      expect(cache.getAgentConfig('')).toBeUndefined()
    })

    it('getAllAgents() returns all cached agents', () => {
      const all = cache.getAllAgents()

      expect(all).toHaveLength(2)
      const names = all.map((a) => a.name).sort()
      expect(names).toEqual(['QA-Engineer', 'Senior-Engineer'])
    })
  })

  describe('integration with real agent files', () => {
    const realAgentsDir = `${process.env.HOME}/.config/opencode/agents`
    let cache: AgentConfigCache

    beforeAll(async () => {
      cache = new AgentConfigCache(realAgentsDir)
      await cache.init()
    })

    it('loads agents from the real agents directory', () => {
      expect(cache.getAllAgents().length).toBeGreaterThan(0)
    })

    it('parses Senior-Engineer with correct default_skills', () => {
      const config = cache.getAgentConfig('Senior-Engineer')

      expect(config).toBeDefined()
      expect(config?.defaultSkills).toEqual([
        'pre-action',
        'memory-keeper',
        'clean-code',
        'bdd-workflow',
        'agent-discovery',
        'skill-discovery',
      ])
    })

    it('parses QA-Engineer with correct default_skills', () => {
      const config = cache.getAgentConfig('QA-Engineer')

      expect(config).toBeDefined()
      expect(config?.defaultSkills).toEqual([
        'pre-action',
        'bdd-workflow',
        'critical-thinking',
        'agent-discovery',
        'memory-keeper',
        'skill-discovery',
      ])
    })

    it('Senior-Engineer has a non-empty description', () => {
      const config = cache.getAgentConfig('Senior-Engineer')

      expect(config?.description).toBeTruthy()
    })

    it('QA-Engineer has a non-empty description', () => {
      const config = cache.getAgentConfig('QA-Engineer')

      expect(config?.description).toBeTruthy()
    })
  })
})
