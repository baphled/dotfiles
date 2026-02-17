/**
 * Skill Selector Algorithm
 * 
 * Three-tier context-aware skill selection for task() calls.
 * Tier 1: Baseline skills (always injected)
 * Tier 2: Category/Agent mapping
 * Tier 3: Keyword pattern matching from prompt
 */

export interface AgentPattern {
  pattern: string
  agent: string
  priority: number
}

export interface SkillAutoLoaderConfig {
  baseline_skills: string[]
  max_auto_skills: number
  skip_on_session_continue: boolean
  category_mappings: Record<string, string[]>
  subagent_mappings: Record<string, string[]>
  keyword_patterns: Array<{ pattern: string; skills: string[]; priority: number }>
  agent_patterns?: AgentPattern[]
}

export interface AgentRoutingResult {
  agent: string | null
  matched_pattern: string | null
  priority: number
}

export interface SkillSelectionInput {
  category?: string
  subagentType?: string
  prompt?: string
  existingSkills: string[]
  sessionId?: string
  agentDefaultSkills?: string[]
}

export interface SkillSource {
  skill: string
  source: 'baseline' | 'category' | 'agent-default' | 'keyword'
  pattern?: string
}

export interface SkillSelectionResult {
  skills: string[]
  sources: SkillSource[]
}

/**
 * Select skills based on input context using three-tier algorithm.
 * 
 * @param input - Context including category, prompt, existing skills, etc.
 * @param config - Skill auto-loader configuration
 * @returns Selected skills and their sources
 */
export function selectSkills(input: SkillSelectionInput, config: SkillAutoLoaderConfig): SkillSelectionResult {
  const sources: SkillSource[] = []
  const autoSkillsSet = new Set<string>()

  // Edge case: session continuation - skip if configured
  if (input.sessionId && config.skip_on_session_continue) {
    return { skills: [], sources: [] }
  }

  // === Tier 1: Baseline skills (always included) ===
  for (const skill of config.baseline_skills) {
    if (!autoSkillsSet.has(skill)) {
      autoSkillsSet.add(skill)
      sources.push({ skill, source: 'baseline' })
    }
  }

  // === Tier 2: Category/Agent mapping ===
  if (input.category && config.category_mappings[input.category]) {
    for (const skill of config.category_mappings[input.category]) {
      if (!autoSkillsSet.has(skill)) {
        autoSkillsSet.add(skill)
        sources.push({ skill, source: 'category' })
      }
    }
  }

  if (input.subagentType && config.subagent_mappings[input.subagentType]) {
    for (const skill of config.subagent_mappings[input.subagentType]) {
      if (!autoSkillsSet.has(skill)) {
        autoSkillsSet.add(skill)
        sources.push({ skill, source: 'category' })
      }
    }
  }

  if (input.agentDefaultSkills) {
    for (const skill of input.agentDefaultSkills) {
      if (!autoSkillsSet.has(skill)) {
        autoSkillsSet.add(skill)
        sources.push({ skill, source: 'agent-default' })
      }
    }
  }

  // === Tier 3: Keyword pattern matching ===
  const prompt = input.prompt || ''
  
  if (prompt.trim().length > 0) {
    // Collect all keyword matches with their priorities
    const keywordMatches: Array<{ skill: string; priority: number; pattern: string }> = []

    for (const kp of config.keyword_patterns) {
      try {
        // Use regex search (match) instead of test to avoid state issues
        const regex = new RegExp(kp.pattern, 'i')
        if (regex.test(prompt)) {
          for (const skill of kp.skills) {
            keywordMatches.push({ skill, priority: kp.priority, pattern: kp.pattern })
          }
        }
        // Reset regex state
        regex.lastIndex = 0
      } catch {
        // Invalid regex pattern - skip
        continue
      }
    }

    // Sort by priority (highest first)
    keywordMatches.sort((a, b) => b.priority - a.priority)

    // Add keyword matches (deduplicated), respecting max_auto_skills AFTER all tiers collected
    for (const match of keywordMatches) {
      if (!autoSkillsSet.has(match.skill)) {
        autoSkillsSet.add(match.skill)
        sources.push({ skill: match.skill, source: 'keyword', pattern: match.pattern })
      }
    }
  }

  // === Apply max_auto_skills cap to category + keyword skills (not baseline) ===
  // Baseline skills are always included; category + keyword are capped
  const baselineSkills: string[] = []
  const categoryAndKeywordSkills: string[] = []
  
  for (const source of sources) {
    if (source.source === 'baseline') {
      baselineSkills.push(source.skill)
    } else {
      categoryAndKeywordSkills.push(source.skill)
    }
  }

  // Keep baseline + capped category/keyword
  const finalAutoSkills = new Set<string>(baselineSkills)
  for (const skill of categoryAndKeywordSkills) {
    if ((finalAutoSkills.size - baselineSkills.length) >= config.max_auto_skills) break
    finalAutoSkills.add(skill)
  }

  // Rebuild sources array with capped skills
  const finalSources = sources.filter(s => finalAutoSkills.has(s.skill))

  // === Merge with existing skills ===
  const allSkills = new Set<string>(input.existingSkills)
  for (const skill of finalAutoSkills) {
    allSkills.add(skill)
  }

  return {
    skills: Array.from(allSkills),
    sources: finalSources
  }
}

/**
 * Select an agent based on prompt pattern matching.
 * 
 * Matches the prompt against configured agent_patterns using regex,
 * returning the highest-priority match. Returns null values when no
 * pattern matches.
 * 
 * @param prompt - The user prompt to match against patterns
 * @param config - Skill auto-loader configuration containing agent_patterns
 * @returns The matched agent with pattern info, or nulls if no match
 */
export function selectAgent(prompt: string, config: SkillAutoLoaderConfig): AgentRoutingResult {
  const nullResult: AgentRoutingResult = { agent: null, matched_pattern: null, priority: 0 }

  if (!config.agent_patterns || config.agent_patterns.length === 0) {
    return nullResult
  }

  if (!prompt || prompt.trim().length === 0) {
    return nullResult
  }

  // Collect all matches with their priorities
  const matches: Array<{ agent: string; pattern: string; priority: number }> = []

  for (const ap of config.agent_patterns) {
    try {
      const regex = new RegExp(ap.pattern, 'i')
      if (regex.test(prompt)) {
        matches.push({ agent: ap.agent, pattern: ap.pattern, priority: ap.priority })
      }
      regex.lastIndex = 0
    } catch {
      // Invalid regex pattern — skip
      continue
    }
  }

  if (matches.length === 0) {
    return nullResult
  }

  // Sort by priority (highest first) and return the top match
  matches.sort((a, b) => b.priority - a.priority)
  const best = matches[0]

  return {
    agent: best.agent,
    matched_pattern: best.pattern,
    priority: best.priority
  }
}
