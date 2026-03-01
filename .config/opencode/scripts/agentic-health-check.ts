/**
 * Agentic Flow Health Check
 *
 * Validates the agentic flow system is correctly configured across five domains:
 *   A. Agent Permissions
 *   B. Skill Auto-Loader
 *   C. Agent Routing
 *   D. Model Routing
 *   E. Compliance Rules
 *
 * Run: bun run scripts/agentic-health-check.ts
 * Exit code: 0 if all pass, 1 if any fail
 */

const BASE_DIR = `${process.env.HOME}/.config/opencode`

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

interface CheckResult {
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string[]
}

function stripJsonComments(text: string): string {
  let result = ''
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      result += ch
      escape = false
      continue
    }

    if (inString) {
      result += ch
      if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') {
      inString = true
      result += ch
      continue
    }

    if (ch === '/' && text[i + 1] === '/') {
      const eol = text.indexOf('\n', i)
      if (eol === -1) break
      i = eol - 1
      continue
    }

    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      if (end === -1) break
      i = end + 1
      continue
    }

    result += ch
  }

  return result
}

async function readJsonc(path: string): Promise<unknown> {
  const file = Bun.file(path)
  const text = await file.text()
  return JSON.parse(stripJsonComments(text))
}

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists()
}

async function readTextFile(path: string): Promise<string> {
  return Bun.file(path).text()
}

function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const result: Record<string, unknown> = {}
  const lines = match[1].split('\n')
  let currentKey = ''
  let currentList: string[] | null = null

  for (const line of lines) {
    if (line.match(/^\s+-\s+/)) {
      if (currentList !== null) {
        currentList.push(line.replace(/^\s+-\s+/, '').trim())
      }
      continue
    }

    if (currentList !== null) {
      result[currentKey] = currentList
      currentList = null
    }

    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()
      if (value === '') {
        currentList = []
      } else {
        result[currentKey] = value
      }
    }
  }

  if (currentList !== null) {
    result[currentKey] = currentList
  }

  return result
}

async function checkAgentPermissions(): Promise<CheckResult> {
  const configPath = `${BASE_DIR}/oh-my-opencode.jsonc`

  if (!(await fileExists(configPath))) {
    return { status: 'fail', message: 'oh-my-opencode.jsonc not found' }
  }

  const config = (await readJsonc(configPath)) as Record<string, unknown>
  const agents = config.agents as Record<string, Record<string, unknown>> | undefined

  if (!agents) {
    return { status: 'fail', message: 'No agents section in oh-my-opencode.jsonc' }
  }

  const orchestrators = ['sisyphus', 'hephaestus', 'atlas', 'Tech-Lead']
  const workers = [
    'sisyphus-junior', 'Senior-Engineer', 'QA-Engineer', 'Writer', 'DevOps',
    'VHS-Director', 'Embedded-Engineer', 'Knowledge Base Curator', 'Model-Evaluator',
    'oracle', 'Code-Reviewer',
  ]
  const readOnlyDenyEdit = ['Security-Engineer', 'Data-Analyst', 'Nix-Expert', 'Linux-Expert', 'SysOp']

  const issues: string[] = []
  let correctCount = 0
  let totalChecked = 0

  for (const name of orchestrators) {
    const agentConfig = agents[name]
    if (!agentConfig) {
      issues.push(`${name}: not defined in config`)
      totalChecked++
      continue
    }

    const perm = agentConfig.permission as Record<string, string> | undefined
    const editPerm = perm?.edit

    totalChecked++
    if (editPerm !== 'deny') {
      issues.push(`${name}: orchestrator should have edit:"deny", got "${editPerm ?? 'undefined'}"`)
    } else {
      correctCount++
    }
  }

  for (const name of workers) {
    const agentConfig = agents[name]
    if (!agentConfig) continue

    const perm = agentConfig.permission as Record<string, string> | undefined
    const editPerm = perm?.edit

    totalChecked++
    if (editPerm !== 'allow') {
      issues.push(`${name}: worker should have edit:"allow", got "${editPerm ?? 'undefined'}"`)
    } else {
      correctCount++
    }
  }

  for (const name of readOnlyDenyEdit) {
    const agentConfig = agents[name]
    if (!agentConfig) {
      issues.push(`${name}: read-only agent not defined in config`)
      totalChecked++
      continue
    }

    const perm = agentConfig.permission as Record<string, string> | undefined
    const editPerm = perm?.edit

    totalChecked++
    if (editPerm !== 'deny') {
      issues.push(`${name}: read-only agent should have edit:"deny", got "${editPerm ?? 'undefined'}"`)
    } else {
      correctCount++
    }
  }

  const builtInAgents = new Set([
    'sisyphus', 'sisyphus-junior', 'hephaestus', 'atlas',
    'oracle', 'librarian', 'explore', 'metis', 'momus', 'multimodal-looker',
  ])
  const agentsWithoutMode: string[] = []
  const subagentNames = [...workers, ...readOnlyDenyEdit, 'Tech-Lead']
  for (const name of subagentNames) {
    if (builtInAgents.has(name)) continue
    const agentConfig = agents[name]
    if (!agentConfig) continue
    if (!agentConfig.mode) {
      agentsWithoutMode.push(name)
    }
  }

  if (agentsWithoutMode.length > 0) {
    issues.push(`Missing mode field: ${agentsWithoutMode.join(', ')}`)
  }

  if (issues.length === 0) {
    return { status: 'pass', message: `${correctCount}/${totalChecked} agents correct` }
  }

  return {
    status: 'fail',
    message: `${correctCount}/${totalChecked} agents correct, ${issues.length} issue(s)`,
    details: issues,
  }
}

async function checkSkillAutoLoader(): Promise<CheckResult> {
  const configPath = `${BASE_DIR}/plugins/skill-auto-loader-config.jsonc`

  if (!(await fileExists(configPath))) {
    return { status: 'fail', message: 'skill-auto-loader-config.jsonc not found' }
  }

  const config = (await readJsonc(configPath)) as Record<string, unknown>
  const issues: string[] = []
  const warnings: string[] = []
  const info: string[] = []

  const baselineSkills = config.baseline_skills as string[] | undefined
  if (!baselineSkills || baselineSkills.length === 0) {
    issues.push('baseline_skills is empty or missing')
  }

  const expectedCategories = [
    'quick', 'deep', 'ultrabrain', 'visual-engineering',
    'writing', 'unspecified-low', 'unspecified-high', 'artistry',
  ]
  const categoryMappings = config.category_mappings as Record<string, unknown> | undefined

  if (categoryMappings && typeof categoryMappings === 'object') {
    const definedCategories = Object.keys(categoryMappings)
    const missingCategories = expectedCategories.filter(c => !definedCategories.includes(c))

    if (missingCategories.length > 0) {
      if (definedCategories.length === 0) {
        info.push('category_mappings: empty by design (agents use skill-discovery + skill() tool for dynamic loading)')
      } else {
        for (const cat of missingCategories) {
          warnings.push(`missing category mapping for '${cat}'`)
        }
      }
    }
  } else {
    issues.push('category_mappings is missing')
  }

  const keywordPatterns = config.keyword_patterns as Array<Record<string, unknown>> | undefined
  if (keywordPatterns && Array.isArray(keywordPatterns)) {
    for (const kp of keywordPatterns) {
      const pattern = kp.pattern as string | undefined
      if (!pattern) continue
      try {
        new RegExp(pattern, 'i')
      } catch {
        issues.push(`Invalid regex in keyword_patterns: "${pattern}"`)
      }
    }
    if (keywordPatterns.length === 0) {
      info.push('keyword_patterns: empty by design (dynamic loading via skill-discovery)')
    }
  }

  const agentPatterns = config.agent_patterns as Array<Record<string, unknown>> | undefined
  if (agentPatterns && Array.isArray(agentPatterns)) {
    if (agentPatterns.length > 0) {
      for (const ap of agentPatterns) {
        if (typeof ap.priority !== 'number') {
          issues.push(`agent_pattern for "${ap.agent}" missing priority`)
        }
      }
    } else {
      info.push('agent_patterns: empty by design (dynamic routing via agent-discovery)')
    }
  }

  const maxAutoSkills = config.max_auto_skills as number | undefined
  if (maxAutoSkills === undefined || maxAutoSkills <= 0 || maxAutoSkills > 10) {
    issues.push(`max_auto_skills is ${maxAutoSkills ?? 'undefined'} (expected > 0 and <= 10)`)
  }

  if (issues.length > 0) {
    return { status: 'fail', message: `${issues.length} issue(s)`, details: [...issues, ...warnings] }
  }

  if (warnings.length > 0) {
    return { status: 'warn', message: `${warnings.length} warning(s)`, details: [...warnings, ...info] }
  }

  if (info.length > 0) {
    return { status: 'pass', message: `all checks passed (${info.length} dynamic loading note${info.length > 1 ? 's' : ''})`, details: info }
  }

  return { status: 'pass', message: 'all checks passed' }
}

async function checkAgentRouting(): Promise<CheckResult> {
  const agentsDir = `${BASE_DIR}/agents`
  const configPath = `${BASE_DIR}/plugins/skill-auto-loader-config.jsonc`

  const issues: string[] = []
  const warnings: string[] = []

  let agentFiles: string[] = []
  try {
    const glob = new Bun.Glob('*.md')
    for await (const file of glob.scan({ cwd: agentsDir })) {
      agentFiles.push(file)
    }
  } catch {
    return { status: 'fail', message: 'agents/ directory not found or unreadable' }
  }

  if (agentFiles.length === 0) {
    return { status: 'fail', message: 'No agent .md files found in agents/' }
  }

  const agentNames: string[] = []
  const agentsMissingFrontmatter: string[] = []
  const agentsMissingDescription: string[] = []
  const agentsMissingMode: string[] = []
  const agentsMissingDefaultSkills: string[] = []

  for (const file of agentFiles) {
    const name = file.replace(/\.md$/, '')
    agentNames.push(name)

    const content = await readTextFile(`${agentsDir}/${file}`)
    const frontmatter = extractFrontmatter(content)

    if (!frontmatter) {
      agentsMissingFrontmatter.push(name)
      continue
    }

    if (!frontmatter.description) agentsMissingDescription.push(name)
    if (!frontmatter.mode) agentsMissingMode.push(name)
    if (!frontmatter.default_skills) agentsMissingDefaultSkills.push(name)
  }

  if (agentsMissingFrontmatter.length > 0) {
    issues.push(`Missing frontmatter: ${agentsMissingFrontmatter.join(', ')}`)
  }
  if (agentsMissingDescription.length > 0) {
    issues.push(`Missing description: ${agentsMissingDescription.join(', ')}`)
  }
  if (agentsMissingMode.length > 0) {
    issues.push(`Missing mode: ${agentsMissingMode.join(', ')}`)
  }
  if (agentsMissingDefaultSkills.length > 0) {
    warnings.push(`Missing default_skills: ${agentsMissingDefaultSkills.join(', ')}`)
  }

  if (await fileExists(configPath)) {
    const config = (await readJsonc(configPath)) as Record<string, unknown>
    const agentPatterns = config.agent_patterns as Array<{ agent: string }> | undefined

    if (agentPatterns && agentPatterns.length > 0) {
      const patternsAgentNames = agentPatterns.map(ap => ap.agent)

      const unroutedAgents = agentNames.filter(name => !patternsAgentNames.includes(name))
      if (unroutedAgents.length > 0) {
        warnings.push(`Agents without routing pattern: ${unroutedAgents.join(', ')}`)
      }

      const orphanedPatterns = patternsAgentNames.filter(name => !agentNames.includes(name))
      if (orphanedPatterns.length > 0) {
        issues.push(`Orphaned patterns (no .md file): ${orphanedPatterns.join(', ')}`)
      }
    }
  }

  const routableCount = agentFiles.length - agentsMissingFrontmatter.length

  if (issues.length > 0) {
    return {
      status: 'fail',
      message: `${routableCount}/${agentFiles.length} agents routable, ${issues.length} issue(s)`,
      details: [...issues, ...warnings],
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'warn',
      message: `${routableCount}/${agentFiles.length} agents routable, ${warnings.length} warning(s)`,
      details: warnings,
    }
  }

  return { status: 'pass', message: `${routableCount}/${agentFiles.length} agents routable` }
}

async function checkModelRouting(): Promise<CheckResult> {
  const configPath = `${BASE_DIR}/oh-my-opencode.jsonc`
  const failoverPath = `${BASE_DIR}/plugins/provider-failover.ts`
  const healthCachePath = `${process.env.HOME}/.cache/opencode/provider-health.json`

  const issues: string[] = []
  const warnings: string[] = []

  if (!(await fileExists(failoverPath))) {
    return { status: 'fail', message: 'provider-failover.ts not found' }
  }

  const failoverSource = await readTextFile(failoverPath)

  const agentTierMap = extractAgentTierMap(failoverSource)
  if (Object.keys(agentTierMap).length === 0) {
    issues.push('Could not extract AGENT_TIER_MAP from provider-failover.ts')
  }

  const fallbackConfigPath = `${BASE_DIR}/plugins/lib/fallback-config.ts`
  if (await fileExists(fallbackConfigPath)) {
    const fallbackSource = await readTextFile(fallbackConfigPath)
    const definedTiers = extractDefinedTiers(fallbackSource)

    const tiersUsed = new Set(Object.values(agentTierMap))
    for (const tier of tiersUsed) {
      if (!definedTiers.includes(tier)) {
        issues.push(`Tier "${tier}" used in AGENT_TIER_MAP but not defined in fallback chains`)
      }
    }

    for (const requiredTier of ['T1', 'T2', 'T3']) {
      if (!definedTiers.includes(requiredTier)) {
        issues.push(`Tier chain "${requiredTier}" not defined in fallback-config.ts`)
      }
    }
  }

  if (await fileExists(configPath)) {
    const config = (await readJsonc(configPath)) as Record<string, unknown>
    const agents = config.agents as Record<string, unknown> | undefined

    if (agents && Object.keys(agentTierMap).length > 0) {
      const configAgentNames = Object.keys(agents)
      const untiedAgents = configAgentNames.filter(name => !agentTierMap[name])

      const builtInAgents = new Set(['sisyphus', 'hephaestus', 'atlas', 'librarian', 'explore', 'metis', 'momus', 'multimodal-looker'])
      const relevantUntied = untiedAgents.filter(name => !builtInAgents.has(name))

      if (relevantUntied.length > 0) {
        warnings.push(`Agents missing tier assignment: ${relevantUntied.join(', ')}`)
      }
    }
  }

  if (await fileExists(healthCachePath)) {
    try {
      const cacheText = await readTextFile(healthCachePath)
      JSON.parse(cacheText)
    } catch {
      warnings.push('provider-health.json cache exists but is invalid JSON')
    }
  }

  const assignedCount = Object.keys(agentTierMap).length

  if (issues.length > 0) {
    return {
      status: 'fail',
      message: `${assignedCount} agents with tier, ${issues.length} issue(s)`,
      details: [...issues, ...warnings],
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'warn',
      message: `${assignedCount} agents with tier, ${warnings.length} warning(s)`,
      details: warnings,
    }
  }

  return { status: 'pass', message: `${assignedCount} agents with tier assignments` }
}

function extractAgentTierMap(source: string): Record<string, string> {
  const result: Record<string, string> = {}
  const blockMatch = source.match(/AGENT_TIER_MAP[^{]*\{([^}]+)\}/)
  if (!blockMatch) return result

  const entries = blockMatch[1].matchAll(/'([^']+)':\s*'(T\d)'/g)
  for (const entry of entries) {
    result[entry[1]] = entry[2]
  }

  return result
}

function extractDefinedTiers(source: string): string[] {
  const tiers: string[] = []
  const matches = source.matchAll(/\b(T\d)\s*:/g)
  for (const match of matches) {
    if (!tiers.includes(match[1])) {
      tiers.push(match[1])
    }
  }
  return tiers
}

async function checkComplianceRules(): Promise<CheckResult> {
  const issues: string[] = []
  const warnings: string[] = []

  const agentsMdPath = `${BASE_DIR}/AGENTS.md`
  if (await fileExists(agentsMdPath)) {
    const contentLower = (await readTextFile(agentsMdPath)).toLowerCase()
    const requiredSections = ['golden rule', 'tool restrictions', 'specialist agent routing']
    for (const section of requiredSections) {
      if (!contentLower.includes(section)) {
        issues.push(`AGENTS.md missing required section: "${section}"`)
      }
    }
  } else {
    issues.push('AGENTS.md not found')
  }

  const disciplinePath = `${BASE_DIR}/agents-rules-discipline.md`
  if (!(await fileExists(disciplinePath))) {
    warnings.push('agents-rules-discipline.md not found')
  }

  const specPath = `${BASE_DIR}/specs/rigid-orchestrator-v1.md`
  if (!(await fileExists(specPath))) {
    issues.push('specs/rigid-orchestrator-v1.md not found')
  }

  const configPath = `${BASE_DIR}/oh-my-opencode.jsonc`
  const agentsDir = `${BASE_DIR}/agents`

  let configAgentCount = 0
  let mdAgentCount = 0
  const missingFromConfig: string[] = []

  if (await fileExists(configPath)) {
    const config = (await readJsonc(configPath)) as Record<string, unknown>
    const agents = config.agents as Record<string, unknown> | undefined
    configAgentCount = agents ? Object.keys(agents).length : 0

    try {
      const glob = new Bun.Glob('*.md')
      const mdAgentNames: string[] = []
      for await (const file of glob.scan({ cwd: agentsDir })) {
        mdAgentNames.push(file.replace(/\.md$/, ''))
        mdAgentCount++
      }

      if (agents) {
        const configNames = Object.keys(agents)
        for (const mdName of mdAgentNames) {
          if (!configNames.includes(mdName)) {
            missingFromConfig.push(mdName)
          }
        }
      }
    } catch {
      warnings.push('Could not scan agents/ directory')
    }
  }

  if (missingFromConfig.length > 0) {
    warnings.push(`Agents in agents/ but missing from oh-my-opencode.jsonc: ${missingFromConfig.join(', ')}`)
  }

  if (issues.length > 0) {
    return {
      status: 'fail',
      message: `${issues.length} issue(s) (${configAgentCount} configured, ${mdAgentCount} .md files)`,
      details: [...issues, ...warnings],
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'warn',
      message: `${warnings.length} warning(s) (${configAgentCount} configured, ${mdAgentCount} .md files)`,
      details: warnings,
    }
  }

  return { status: 'pass', message: `all spec files present (${configAgentCount} configured, ${mdAgentCount} .md files)` }
}

function formatStatus(status: 'pass' | 'fail' | 'warn'): string {
  switch (status) {
    case 'pass': return `${GREEN}✅${RESET}`
    case 'fail': return `${RED}❌${RESET}`
    case 'warn': return `${YELLOW}⚠️${RESET} `
  }
}

async function main(): Promise<void> {
  console.log('')
  console.log(`${BOLD}🏥 Agentic Flow Health Check${RESET}`)
  console.log(`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log('')

  const checks: Array<{ name: string; fn: () => Promise<CheckResult> }> = [
    { name: 'Agent Permissions', fn: checkAgentPermissions },
    { name: 'Skill Auto-Loader', fn: checkSkillAutoLoader },
    { name: 'Agent Routing', fn: checkAgentRouting },
    { name: 'Model Routing', fn: checkModelRouting },
    { name: 'Compliance Rules', fn: checkComplianceRules },
  ]

  const results: Array<{ name: string; result: CheckResult }> = []

  for (const check of checks) {
    try {
      const result = await check.fn()
      results.push({ name: check.name, result })
    } catch (err) {
      results.push({
        name: check.name,
        result: {
          status: 'fail',
          message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        },
      })
    }
  }

  for (const { name, result } of results) {
    console.log(`${formatStatus(result.status)} ${BOLD}${name}${RESET} (${result.message})`)
    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`   ${DIM}→${RESET} ${detail}`)
      }
    }
  }

  const passed = results.filter(r => r.result.status === 'pass').length
  const failed = results.filter(r => r.result.status === 'fail').length
  const warned = results.filter(r => r.result.status === 'warn').length

  console.log('')
  console.log(`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)

  const parts: string[] = [`${passed}/${results.length} passed`]
  if (warned > 0) parts.push(`${warned} warning${warned > 1 ? 's' : ''}`)
  if (failed > 0) parts.push(`${failed} failure${failed > 1 ? 's' : ''}`)

  const statusColour = failed > 0 ? RED : warned > 0 ? YELLOW : GREEN
  console.log(`${BOLD}Result:${RESET} ${statusColour}${parts.join(', ')}${RESET}`)
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

main()
