/**
 * Skill Content Injection
 *
 * Provides deterministic skill loading by injecting skill CONTENT directly
 * into `args.prompt` before the agent spawns, instead of relying on agents
 * to call `mcp_skill` at runtime.
 *
 * Injection format:
 *   <skill name="skill-name">
 *   {content}
 *   </skill>
 *
 * Skills are ordered: baseline → category/agent-default → keyword
 * Total injected content is capped at 20KB (PROMPT_SIZE_CEILING).
 */

import type { SkillSource } from './skill-selector'

/** Maximum bytes of injected skill content before falling back to names-only. */
export const PROMPT_SIZE_CEILING = 20 * 1024 // 20KB

/** Interface for skill cache — subset used by injection logic. */
export interface SkillCache {
  hasSkill(name: string): boolean
  getSkillContent(name: string): string | undefined
}

/** Input for skill content injection. */
export interface InjectionInput {
  skills: string[]
  sources: SkillSource[]
  originalPrompt: string | undefined
  skillCache: SkillCache | null
  /**
   * Names of skills that are exempt from the byte budget and always injected.
   * Baseline skills are prepended before the progressive loop runs over
   * remaining skills. If omitted, all skills compete for the 20KB budget.
   */
  baselineSkills?: string[]
}

/** Result of skill content injection attempt. */
export interface InjectionResult {
  /** The final prompt (with injected content, or original if injection skipped). */
  prompt: string
  /** Whether content was actually injected into the prompt. */
  injected: boolean
  /** Whether injection was skipped because content exceeded the 20KB ceiling. */
  ceilingExceeded: boolean
  /** Names of skills that were selected but not injected (for future progressive injection). */
  skillsDropped: string[]
}

/**
 * Source priority ordering for injection.
 * Lower number = injected earlier (higher priority).
 */
const SOURCE_ORDER: Record<string, number> = {
  baseline: 0,
  category: 1,
  'agent-default': 1,
  keyword: 2,
}

/**
 * Order skills by their source for deterministic injection order.
 * Priority: baseline → category/agent-default → keyword.
 * Does NOT mutate the input array.
 */
export function orderSkillsBySource(skills: string[], sources: SkillSource[]): string[] {
  return [...skills].sort((a, b) => {
    const aSource = sources.find(s => s.skill === a)?.source ?? 'keyword'
    const bSource = sources.find(s => s.skill === b)?.source ?? 'keyword'
    const aOrder = SOURCE_ORDER[aSource] ?? 2
    const bOrder = SOURCE_ORDER[bSource] ?? 2
    return aOrder - bOrder
  })
}

/**
 * Build a single skill content block in the standard format:
 *   <skill name="{name}">\n{content}\n</skill>
 */
function buildSkillBlock(name: string, content: string): string {
  return `<skill name="${name}">\n${content}\n</skill>`
}

/**
 * Inject skill content into the prompt.
 *
 * - Skills are ordered: baseline → category/agent-default → keyword
 * - Each skill is wrapped in <skill name="..."> tags
 * - Content is PREPENDED to the original prompt
 * - Baseline skills (listed in `baselineSkills`) are always injected first,
 *   exempt from the byte budget
 * - Non-baseline skills are injected progressively in priority order until
 *   the next skill would push total injected bytes over PROMPT_SIZE_CEILING
 * - Skills that don't fit are tracked in `skillsDropped`
 * - `ceilingExceeded` is true whenever any skills were dropped
 * - If skillCache is null, injection is skipped
 * - If skills array is empty, injection is skipped
 */
export function injectSkillContent(input: InjectionInput): InjectionResult {
  const { skills, sources, originalPrompt, skillCache, baselineSkills = [] } = input
  const original = originalPrompt ?? ''

  // No-op conditions
  if (!skillCache || skills.length === 0) {
    return { prompt: original, injected: false, ceilingExceeded: false, skillsDropped: [] }
  }

  const baselineSet = new Set(baselineSkills)

  // Separate skills into baseline-exempt and budget-constrained groups.
  // Both groups are ordered by source priority.
  const orderedSkills = orderSkillsBySource(skills, sources)
  const baselineOrdered = orderedSkills.filter(s => baselineSet.has(s))
  const nonBaselineOrdered = orderedSkills.filter(s => !baselineSet.has(s))

  // --- Phase 1: Always inject baseline skills (exempt from budget) ---
  const injectedBlocks: string[] = []
  for (const skillName of baselineOrdered) {
    const content = skillCache.getSkillContent(skillName)
    if (content !== undefined) {
      injectedBlocks.push(buildSkillBlock(skillName, content))
    }
  }

  // --- Phase 2: Progressive loop over non-baseline skills ---
  // Baseline bytes reduce the available budget but are never dropped.
  // Total budget = PROMPT_SIZE_CEILING; baseline consumes part of it.
  const skillsDropped: string[] = []

  // Compute bytes already committed by baseline blocks (including separators + trailing newline)
  const baselineContent = injectedBlocks.length > 0
    ? injectedBlocks.join('\n\n') + '\n\n'
    : ''
  let bytesUsed = Buffer.byteLength(baselineContent, 'utf8')

  for (const skillName of nonBaselineOrdered) {
    const content = skillCache.getSkillContent(skillName)
    if (content === undefined) {
      // No cache entry — skip silently (not counted as dropped)
      continue
    }
    const block = buildSkillBlock(skillName, content)
    // Cost: separator before block (if blocks already exist) + block content
    const separator = injectedBlocks.length > 0 ? '\n\n' : ''
    const addition = separator + block
    const additionSize = Buffer.byteLength(addition, 'utf8')

    if (bytesUsed + additionSize > PROMPT_SIZE_CEILING) {
      skillsDropped.push(skillName)
    } else {
      bytesUsed += additionSize
      injectedBlocks.push(block)
    }
  }

  // Nothing was injected at all
  if (injectedBlocks.length === 0) {
    const ceilingExceeded = skillsDropped.length > 0
    return { prompt: original, injected: false, ceilingExceeded, skillsDropped }
  }

  // Assemble final injected content
  const injectedContent = injectedBlocks.join('\n\n') + '\n\n'
  const ceilingExceeded = skillsDropped.length > 0

  // Compose final prompt: injected content prepended, original appended
  const finalPrompt = original
    ? `${injectedContent}${original}`
    : injectedContent.trimEnd()

  return { prompt: finalPrompt, injected: true, ceilingExceeded, skillsDropped }
}
