/**
 * Skill Auto-Loader Plugin
 * 
 * Intercepts task() calls via tool.execute.before hook
 * and auto-injects context-aware skills into load_skills.
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { selectSkills, type SkillAutoLoaderConfig, type SkillSelectionInput } from './lib/skill-selector'
import { AgentConfigCache } from './lib/agent-config-parser'
import { filterSkillsAgainstCache } from './lib/skill-validation-filter'
import { injectSkillContent } from './lib/skill-content-injection'
import { detectCodebaseLanguages } from './lib/codebase-detector'

type WarnFn = (message: string) => void

const PLUGIN_DIR = `${process.env.HOME}/.config/opencode/plugins`
const CONFIG_FILE = join(PLUGIN_DIR, 'skill-auto-loader-config.jsonc')
const LOG_FILE = `${process.env.HOME}/.config/opencode/logs/skill-auto-loader.log`
const LOGS_DIR = `${process.env.HOME}/.config/opencode/logs`

// Default config if file missing
const DEFAULT_CONFIG: SkillAutoLoaderConfig = {
  baseline_skills: ['pre-action', 'memory-keeper'],
  max_auto_skills: 5,
  skip_on_session_continue: true,
  category_mappings: {
    'visual-engineering': ['frontend-ui-ux', 'accessibility', 'clean-code'],
    'ultrabrain': ['architecture', 'critical-thinking', 'systems-thinker'],
    'deep': ['clean-code', 'error-handling'],
    'quick': ['clean-code'],
    'artistry': ['design-patterns', 'critical-thinking'],
    'writing': ['british-english', 'documentation-writing'],
    'unspecified-low': ['clean-code'],
    'unspecified-high': ['clean-code', 'error-handling']
  },
  subagent_mappings: {
    'explore': [],
    'librarian': [],
    'oracle': ['critical-thinking', 'architecture', 'systems-thinker'],
    'sisyphus-junior': []
  },
  keyword_patterns: []
}

let config: SkillAutoLoaderConfig = DEFAULT_CONFIG
let agentCache: AgentConfigCache
let skillCache: { hasSkill(name: string): boolean; getSkillContent(name: string): string | undefined } | null = null

/**
 * Load config from JSONC file (strips comments).
 */
function loadConfig(onWarn?: WarnFn): SkillAutoLoaderConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      onWarn?.('[SkillAutoLoader] Config file not found, using defaults')
      return DEFAULT_CONFIG
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8')
    // Strip single-line comments
    const jsonContent = content.replace(/\/\/.*$/gm, '')
    return JSON.parse(jsonContent) as SkillAutoLoaderConfig
  } catch (err) {
    onWarn?.(`[SkillAutoLoader] Failed to load config: ${err instanceof Error ? err.message : String(err)}`)
    return DEFAULT_CONFIG
  }
}

/**
 * Log injection event as JSON line.
 */
function logInjection(event: {
  timestamp: string
  tool: string
  category?: string
  subagentType?: string
  injected: string[]
  existing: string[]
  final: string[]
  sources: Array<{ skill: string; source: string; pattern?: string }>
  contentInjected: boolean
  contentSizeBytes: number
  skillsWithContent: string[]
  skillsWithoutContent: string[]
  skillsDropped: string[]
}): void {
  try {
    const line = JSON.stringify(event) + '\n'
    writeFileSync(LOG_FILE, line, { flag: 'a' })
  } catch {
    // Ignore logging errors
  }
}

/**
 * Create toast notifier.
 */
function createNotifier(client: PluginInput['client']) {
  return (message: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 5000): void => {
    client.tui.showToast({ 
      body: { title: 'Skill Auto-Loader', message, variant, duration } 
    }).catch(() => {})
  }
}

const SkillAutoLoaderPlugin: Plugin = async (_input) => {
  const notify = createNotifier(_input.client)
  const warnViaToast: WarnFn = (msg: string) => notify(msg, 'warning')

  // Initialize config and agent cache at plugin load time
  config = loadConfig(warnViaToast)
  
  // Ensure logs directory exists
  try {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true })
    }
  } catch {
    // Ignore directory creation errors
  }
  
  agentCache = new AgentConfigCache(undefined, warnViaToast)
  await agentCache.init()

  // Detect codebase languages at init time
  // codebaseSkills from codebase detection, passed to selectSkills as Tier 2.5
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let codebaseSkills: string[] = []
  try {
    const projectDir = _input.directory
    const detection = await detectCodebaseLanguages(projectDir)
    codebaseSkills = detection.skills
  } catch {
    // Non-fatal: codebase detection failure should not prevent plugin from loading
  }

  // Attempt to initialise skill content cache (Task 4 parallel module)
  try {
    // Dynamic require so a missing module doesn't prevent the plugin from loading
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cacheModule = require('./lib/skill-content-cache') as {
      SkillContentCache: new (dir: string, onWarn?: (message: string) => void) => {
        hasSkill(name: string): boolean
        getSkillContent(name: string): string | undefined
        init(): Promise<void>
      }
    }
    const SKILLS_DIR = join(PLUGIN_DIR, '..', 'skills')
    const cache = new cacheModule.SkillContentCache(SKILLS_DIR, warnViaToast)
    await cache.init()
    skillCache = cache
  } catch {
    notify('skill-content-cache module not available, skill existence validation will be skipped', 'warning')
  }

  // Build skill sizes map for byte budget enforcement in selectSkills
  // Starts empty; the selector treats missing entries as 0 bytes (no-op when empty)
  const skillSizes = new Map<string, number>()

  notify('Skill Auto-Loader loaded', 'info', 3000)

  return {
    'tool.execute.before': async (input, output) => {
      // Only intercept task tool calls
      if (input.tool !== 'task') return

      // Extract args from output
      const args = output.args as Record<string, unknown>
      
      // Get existing skills from load_skills
      const existingSkills: string[] = Array.isArray(args.load_skills) 
        ? args.load_skills as string[] 
        : []

      // Get session ID if present
      const sessionId = args.session_id as string | undefined

      // Get category or subagent_type
      const category = args.category as string | undefined
       let subagentType = (args.subagent_type ?? args.subagentType) as string | undefined
      
      // Get prompt for keyword analysis
      const prompt = args.prompt as string | undefined

      // === Skill Selection ===
      
      // Get agent default skills if subagentType provided
      let agentDefaultSkills: string[] | undefined
      if (subagentType) {
        const agentConfig = agentCache.getAgentConfig(subagentType)
        if (agentConfig) {
          agentDefaultSkills = agentConfig.defaultSkills
        }
      }

      // Build selection input
      const focus = args.focus as string | undefined

      const selectionInput: SkillSelectionInput = {
        category,
        subagentType,
        focus,
        prompt,
        existingSkills,
        sessionId,
        agentDefaultSkills,
        codebaseSkills
      }

      // Run skill selection
      const result = selectSkills(selectionInput, config, skillSizes)

      // === Skill Existence Validation ===
      // Filter out any skills that don't have a corresponding SKILL.md file.
      // If skillCache is not available (module not yet installed), skip validation.
      const { filtered: validatedSkills } = filterSkillsAgainstCache(result.skills, skillCache, warnViaToast)

      // Update load_skills with injected skills only if result is non-empty
      if (validatedSkills.length > 0) {
        args.load_skills = validatedSkills

        // === Content Injection ===
        // Inject skill CONTENT directly into args.prompt for deterministic loading.
        // This avoids relying on agents to call mcp_skill at runtime.
        const originalPrompt = (args.prompt as string | undefined) ?? ''
        const injectionResult = injectSkillContent({
          skills: validatedSkills,
          sources: result.sources,
          originalPrompt,
          skillCache,
          baselineSkills: config.baseline_skills,
        })

        if (injectionResult.ceilingExceeded) {
          notify(
            `Skill content budget exceeded, ${injectionResult.skillsDropped.length} skill(s) dropped: ${injectionResult.skillsDropped.join(', ')}`,
            'warning'
          )
        }
        if (injectionResult.injected) {
          args.prompt = injectionResult.prompt
        }

        // Log the injection event
        const contentSizeBytes = injectionResult.injected
          ? injectionResult.prompt.length - originalPrompt.length
          : 0
        const skillsWithContent = validatedSkills.filter(
          s => skillCache?.getSkillContent(s) !== undefined
        )
        const skillsWithoutContent = validatedSkills.filter(
          s => !skillCache?.getSkillContent(s)
        )

        logInjection({
          timestamp: new Date().toISOString(),
          tool: input.tool,
          category,
          subagentType,
          injected: validatedSkills,
          existing: existingSkills,
          final: validatedSkills,
          sources: result.sources as Array<{ skill: string; source: string; pattern?: string }>,
          contentInjected: injectionResult.injected,
          contentSizeBytes,
          skillsWithContent,
          skillsWithoutContent,
          skillsDropped: injectionResult.skillsDropped,
        })

        // Show toast notification
        const autoCount = validatedSkills.length - existingSkills.length
        const existingCount = existingSkills.length
        const skillsList = validatedSkills.slice(0, 3).join(', ')
        const more = validatedSkills.length > 3 ? ` +${validatedSkills.length - 3} more` : ''
        notify(`⚡ Skills: ${skillsList}${more} (${autoCount} auto + ${existingCount} explicit)`, 'success', 4000)
      }
    }
  }
}

export default SkillAutoLoaderPlugin
