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
 * Total injected content is capped at 30KB (PROMPT_SIZE_CEILING).
 */

import type { SkillSource } from './skill-selector'

/** Maximum bytes of injected skill content before falling back to names-only. */
export const PROMPT_SIZE_CEILING = 30 * 1024 // 30KB

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
}

/** Result of skill content injection attempt. */
export interface InjectionResult {
  /** The final prompt (with injected content, or original if injection skipped). */
  prompt: string
  /** Whether content was actually injected into the prompt. */
  injected: boolean
  /** Whether injection was skipped because content exceeded the 30KB ceiling. */
  ceilingExceeded: boolean
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
 * - If total injected content exceeds 30KB, injection is skipped entirely
 * - If skillCache is null, injection is skipped
 * - If skills array is empty, injection is skipped
 */
export function injectSkillContent(input: InjectionInput): InjectionResult {
  const { skills, sources, originalPrompt, skillCache } = input
  const original = originalPrompt ?? ''

  // No-op conditions
  if (!skillCache || skills.length === 0) {
    return { prompt: original, injected: false, ceilingExceeded: false }
  }

  // Order skills by source priority
  const orderedSkills = orderSkillsBySource(skills, sources)

  // Build content blocks for skills that have cache entries
  const blocks: string[] = []
  for (const skillName of orderedSkills) {
    const content = skillCache.getSkillContent(skillName)
    if (content !== undefined) {
      blocks.push(buildSkillBlock(skillName, content))
    }
  }

  // Nothing to inject
  if (blocks.length === 0) {
    return { prompt: original, injected: false, ceilingExceeded: false }
  }

  // Join all blocks with double newline separators
  const injectedContent = blocks.join('\n\n') + '\n\n'

  // Enforce 30KB ceiling
  if (injectedContent.length > PROMPT_SIZE_CEILING) {
    return { prompt: original, injected: false, ceilingExceeded: true }
  }

  // Compose final prompt: injected content prepended, original appended
  const finalPrompt = original
    ? `${injectedContent}${original}`
    : injectedContent.trimEnd()

  return { prompt: finalPrompt, injected: true, ceilingExceeded: false }
}
