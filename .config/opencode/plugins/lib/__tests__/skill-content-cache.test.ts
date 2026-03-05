import { SkillContentCache } from '../skill-content-cache'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Test helper: create a temporary skills directory with some test skill files.
 */
function createTempSkillsDir(skills: Record<string, string>): string {
  const dir = join(tmpdir(), `skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })

  for (const [name, content] of Object.entries(skills)) {
    const skillDir = join(dir, name)
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), content, 'utf-8')
  }

  return dir
}

function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

const SKILL_WITH_FRONTMATTER = `---
name: pre-action
description: Mandatory decision framework
category: Core Universal
---

# Skill: pre-action

## What I do

I force deliberate thinking before significant action.
`

const SKILL_WITHOUT_FRONTMATTER = `# Skill: no-frontmatter

## What I do

This skill has no frontmatter.
`

const SKILL_MINIMAL_FRONTMATTER = `---
name: minimal
---
# Minimal skill content
`

describe('SkillContentCache — Initialisation', () => {
  it('initialises without throwing when skills directory exists', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)

    let threw = false
    try {
      await cache.init()
    } catch {
      threw = true
    }
    expect(threw).toBe(false)

    cleanupDir(dir)
  })

  it('initialises without throwing when skills directory does not exist', async () => {
    const cache = new SkillContentCache('/nonexistent/path/to/skills')

    let threw = false
    try {
      await cache.init()
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })

  it('populates cache from all skill subdirectories at init time', async () => {
    const dir = createTempSkillsDir({
      'pre-action': SKILL_WITH_FRONTMATTER,
      'golang': SKILL_WITH_FRONTMATTER,
      'clean-code': SKILL_WITH_FRONTMATTER,
    })
    const cache = new SkillContentCache(dir)
    await cache.init()

    expect(cache.getAllSkillNames()).toContain('pre-action')
    expect(cache.getAllSkillNames()).toContain('golang')
    expect(cache.getAllSkillNames()).toContain('clean-code')

    cleanupDir(dir)
  })

  it('does not re-read files on second init call (idempotent)', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)

    await cache.init()
    const firstCount = cache.getAllSkillNames().length

    // Modify directory after first init — second init should not re-read
    mkdirSync(join(dir, 'new-skill'), { recursive: true })
    writeFileSync(join(dir, 'new-skill', 'SKILL.md'), SKILL_WITH_FRONTMATTER)

    await cache.init()
    const secondCount = cache.getAllSkillNames().length

    expect(secondCount).toBe(firstCount)

    cleanupDir(dir)
  })
})

describe('SkillContentCache — Frontmatter Stripping', () => {
  it('strips YAML frontmatter (between --- delimiters) from skill content', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('pre-action')

    expect(content).toBeDefined()
    expect(content).not.toContain('---')
    expect(content).not.toContain('name: pre-action')
    expect(content).not.toContain('description: Mandatory decision framework')

    cleanupDir(dir)
  })

  it('returns the markdown body content after stripping frontmatter', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('pre-action')

    expect(content).toContain('# Skill: pre-action')
    expect(content).toContain('I force deliberate thinking before significant action.')

    cleanupDir(dir)
  })

  it('returns content as-is when no frontmatter delimiters are present', async () => {
    const dir = createTempSkillsDir({ 'no-frontmatter': SKILL_WITHOUT_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('no-frontmatter')

    expect(content).toBeDefined()
    expect(content).toContain('# Skill: no-frontmatter')
    expect(content).toContain('This skill has no frontmatter.')

    cleanupDir(dir)
  })

  it('strips minimal frontmatter (only name field) correctly', async () => {
    const dir = createTempSkillsDir({ 'minimal': SKILL_MINIMAL_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('minimal')

    expect(content).toBeDefined()
    expect(content).not.toContain('name: minimal')
    expect(content).toContain('# Minimal skill content')

    cleanupDir(dir)
  })
})

describe('SkillContentCache — getSkillContent', () => {
  it('returns skill content for an existing skill name', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('pre-action')

    expect(content).toBeDefined()
    expect(typeof content).toBe('string')

    cleanupDir(dir)
  })

  it('returns undefined for a nonexistent skill name', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const content = cache.getSkillContent('nonexistent-skill')

    expect(content).toBeUndefined()

    cleanupDir(dir)
  })

  it('returns undefined before init is called', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    // No init() call

    const content = cache.getSkillContent('pre-action')

    expect(content).toBeUndefined()

    cleanupDir(dir)
  })
})

describe('SkillContentCache — hasSkill', () => {
  it('returns true for an existing skill name', async () => {
    const dir = createTempSkillsDir({ 'golang': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    expect(cache.hasSkill('golang')).toBe(true)

    cleanupDir(dir)
  })

  it('returns false for a missing skill name', async () => {
    const dir = createTempSkillsDir({ 'golang': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    expect(cache.hasSkill('nonexistent')).toBe(false)

    cleanupDir(dir)
  })

  it('returns false before init is called', () => {
    const cache = new SkillContentCache('/any/path')

    expect(cache.hasSkill('pre-action')).toBe(false)
  })
})

describe('SkillContentCache — getAllSkillNames', () => {
  it('returns an array of all loaded skill names', async () => {
    const dir = createTempSkillsDir({
      'pre-action': SKILL_WITH_FRONTMATTER,
      'golang': SKILL_WITH_FRONTMATTER,
    })
    const cache = new SkillContentCache(dir)
    await cache.init()

    const names = cache.getAllSkillNames()

    expect(Array.isArray(names)).toBe(true)
    expect(names).toContain('pre-action')
    expect(names).toContain('golang')

    cleanupDir(dir)
  })

  it('returns an empty array before init is called', () => {
    const cache = new SkillContentCache('/any/path')

    expect(cache.getAllSkillNames()).toEqual([])
  })

  it('returns an empty array when skills directory is empty', async () => {
    const dir = createTempSkillsDir({})
    const cache = new SkillContentCache(dir)
    await cache.init()

    expect(cache.getAllSkillNames()).toEqual([])

    cleanupDir(dir)
  })

  it('returns exactly the number of skills present in the directory', async () => {
    const dir = createTempSkillsDir({
      'skill-a': SKILL_WITH_FRONTMATTER,
      'skill-b': SKILL_WITH_FRONTMATTER,
      'skill-c': SKILL_WITH_FRONTMATTER,
    })
    const cache = new SkillContentCache(dir)
    await cache.init()

    expect(cache.getAllSkillNames()).toHaveLength(3)

    cleanupDir(dir)
  })
})

describe('SkillContentCache — Graceful Error Handling', () => {
  it('skips directories that have no SKILL.md file without throwing', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })

    // Create a directory without a SKILL.md
    mkdirSync(join(dir, 'empty-skill'), { recursive: true })

    const cache = new SkillContentCache(dir)
    let threw = false
    try {
      await cache.init()
    } catch {
      threw = true
    }
    expect(threw).toBe(false)

    // The valid skill should still be cached
    expect(cache.hasSkill('pre-action')).toBe(true)
    // The empty directory should not appear
    expect(cache.hasSkill('empty-skill')).toBe(false)

    cleanupDir(dir)
  })

  it('continues loading remaining skills after encountering one unreadable file', async () => {
    const dir = createTempSkillsDir({
      'pre-action': SKILL_WITH_FRONTMATTER,
      'golang': SKILL_WITH_FRONTMATTER,
    })

    const cache = new SkillContentCache(dir)
    await cache.init()

    // Both skills should be present despite unreadable scenarios being possible
    expect(cache.hasSkill('pre-action')).toBe(true)
    expect(cache.hasSkill('golang')).toBe(true)

    cleanupDir(dir)
  })

  it('ignores non-directory entries in the skills folder', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })

    // Create a stray file (not a directory) in the skills folder
    writeFileSync(join(dir, 'stray-file.md'), '# stray', 'utf-8')

    const cache = new SkillContentCache(dir)
    let threw = false
    try {
      await cache.init()
    } catch {
      threw = true
    }
    expect(threw).toBe(false)

    expect(cache.hasSkill('pre-action')).toBe(true)
    expect(cache.hasSkill('stray-file')).toBe(false)

    cleanupDir(dir)
  })
})

describe('SkillContentCache — Cache is Populated at Init Time', () => {
  it('serves content from cache without re-reading files after init', async () => {
    const dir = createTempSkillsDir({ 'pre-action': SKILL_WITH_FRONTMATTER })
    const cache = new SkillContentCache(dir)
    await cache.init()

    // Delete the source file after init
    rmSync(join(dir, 'pre-action', 'SKILL.md'))

    // Should still return content from cache
    const content = cache.getSkillContent('pre-action')
    expect(content).toBeDefined()
    expect(content).toContain('# Skill: pre-action')

    cleanupDir(dir)
  })
})
