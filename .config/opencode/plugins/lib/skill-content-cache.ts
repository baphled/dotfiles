/**
 * Skill Content Cache
 *
 * Reads all `skills/{name}/SKILL.md` files at init time, strips YAML frontmatter,
 * and caches the content for fast lookup. Designed as the foundation for
 * deterministic skill content injection into agent prompts.
 */

import { existsSync, readFileSync, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { join } from 'path'

type WarnFn = (message: string) => void

const DEFAULT_SKILLS_DIR = `${process.env.HOME}/.config/opencode/skills`

export class SkillContentCache {
  private cache: Map<string, string> = new Map()
  private initialized: boolean = false

  constructor(private skillsDir: string = DEFAULT_SKILLS_DIR, private onWarn: WarnFn = () => {}) {}

  /**
   * Initialize the cache by reading all SKILL.md files under each skill subdirectory.
   * Must be called before getSkillContent(). Idempotent: subsequent calls are no-ops.
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      if (!existsSync(this.skillsDir)) {
        this.onWarn(`[SkillContentCache] Skills directory not found: ${this.skillsDir}`)
        this.initialized = true
        return
      }

      const entries = await readdir(this.skillsDir)

      for (const entry of entries) {
        const entryPath = join(this.skillsDir, entry)

        // Only process directories
        try {
          const stat = statSync(entryPath)
          if (!stat.isDirectory()) continue
        } catch (err) {
          this.onWarn(`[SkillContentCache] Failed to stat ${entry}: ${err instanceof Error ? err.message : String(err)}`)
          continue
        }

        const skillFilePath = join(entryPath, 'SKILL.md')

        if (!existsSync(skillFilePath)) {
          // Directory exists but has no SKILL.md — silently skip
          continue
        }

        try {
          const rawContent = readFileSync(skillFilePath, 'utf-8')
          const body = this.stripFrontmatter(rawContent)
          this.cache.set(entry, body)
        } catch (err) {
          this.onWarn(`[SkillContentCache] Failed to read ${entry}/SKILL.md: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } catch (err) {
      this.onWarn(`[SkillContentCache] Failed to read skills directory: ${err instanceof Error ? err.message : String(err)}`)
    }

    this.initialized = true
  }

  /**
   * Strip YAML frontmatter delimited by `---` from markdown content.
   * Returns the body content after the closing `---` delimiter.
   * If no frontmatter is present, returns the content unchanged.
   */
  private stripFrontmatter(content: string): string {
    if (!content.startsWith('---')) {
      return content
    }

    // Find the closing `---` delimiter (search from position 3 to skip the opening)
    const closingIndex = content.indexOf('---', 3)
    if (closingIndex === -1) {
      // Malformed frontmatter — return as-is
      return content
    }

    // Return everything after the closing `---\n`
    const afterDelimiter = content.slice(closingIndex + 3)

    // Trim leading newline(s) from the body
    return afterDelimiter.replace(/^\n+/, '')
  }

  /**
   * Get the markdown body content for a skill by name.
   * Returns undefined if the skill is not found or cache is not initialised.
   */
  getSkillContent(name: string): string | undefined {
    return this.cache.get(name)
  }

  /**
   * Check whether a skill exists in the cache.
   */
  hasSkill(name: string): boolean {
    return this.cache.has(name)
  }

  /**
   * Get the names of all loaded skills.
   */
  getAllSkillNames(): string[] {
    return Array.from(this.cache.keys())
  }
}
