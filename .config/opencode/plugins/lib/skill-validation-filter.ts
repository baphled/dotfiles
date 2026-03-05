/**
 * Skill Validation Filter
 *
 * Filters a list of skill names against a SkillContentCache instance,
 * removing any skill that does not have a corresponding SKILL.md file.
 * A warning is logged for each removed skill.
 *
 * Designed to work with the SkillContentCache interface from Task 4.
 * If the cache is not available (null/undefined), all skills are returned
 * unchanged and a debug message is logged.
 */

type WarnFn = (message: string) => void

/** Minimal interface required for validation — matches SkillContentCache */
interface HasSkillCache {
  hasSkill(name: string): boolean
}

export interface FilterResult {
  /** Skills that passed validation (have a SKILL.md file) */
  filtered: string[]
  /** Skills removed because they had no SKILL.md file */
  removed: string[]
}

/**
 * Filter skills against a SkillContentCache, removing any that don't exist.
 *
 * @param skills - Array of skill names to validate
 * @param cache  - A SkillContentCache instance (or null/undefined to skip validation)
 * @returns FilterResult containing the filtered skills and removed skills
 */
export function filterSkillsAgainstCache(
  skills: string[],
  cache: HasSkillCache | null | undefined,
  onWarn?: WarnFn
): FilterResult {
  if (!cache) {
    onWarn?.('[SkillAutoLoader] Skill cache not available, skipping existence validation')
    return { filtered: [...skills], removed: [] }
  }

  const filtered: string[] = []
  const removed: string[] = []

  for (const skill of skills) {
    if (cache.hasSkill(skill)) {
      filtered.push(skill)
    } else {
      onWarn?.(`[SkillAutoLoader] Skill '${skill}' not found, skipping`)
      removed.push(skill)
    }
  }

  return { filtered, removed }
}
