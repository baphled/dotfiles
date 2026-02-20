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

/**
 * Load config from JSONC file (strips comments).
 */
function loadConfig(): SkillAutoLoaderConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      console.warn('[SkillAutoLoader] Config file not found, using defaults')
      return DEFAULT_CONFIG
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8')
    // Strip single-line comments
    const jsonContent = content.replace(/\/\/.*$/gm, '')
    return JSON.parse(jsonContent) as SkillAutoLoaderConfig
  } catch (err) {
    console.warn(`[SkillAutoLoader] Failed to load config: ${err instanceof Error ? err.message : String(err)}`)
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
  routedAgent?: string | null
  routedPattern?: string | null
  injected: string[]
  existing: string[]
  final: string[]
  sources: Array<{ skill: string; source: string; pattern?: string }>
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

export const SkillAutoLoaderPlugin: Plugin = async (_input) => {
  // Initialize config and agent cache at plugin load time
  config = loadConfig()
  
  // Ensure logs directory exists
  try {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true })
    }
  } catch {
    // Ignore directory creation errors
  }
  
  agentCache = new AgentConfigCache()
  await agentCache.init()

  const notify = createNotifier(_input.client)
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
      const selectionInput: SkillSelectionInput = {
        category,
        subagentType,
        prompt,
        existingSkills,
        sessionId,
        agentDefaultSkills
      }

      // Run skill selection
      const result = selectSkills(selectionInput, config)

      // Update load_skills with injected skills only if result is non-empty
      if (result.skills.length > 0) {
        args.load_skills = result.skills

        // Log the injection event
        logInjection({
          timestamp: new Date().toISOString(),
          tool: input.tool,
          category,
          subagentType,
          injected: result.skills,
          existing: existingSkills,
          final: result.skills,
          sources: result.sources as Array<{ skill: string; source: string; pattern?: string }>
        })

        // Show toast notification
        const autoCount = result.skills.length - existingSkills.length
        const existingCount = existingSkills.length
        const skillsList = result.skills.slice(0, 3).join(', ')
        const more = result.skills.length > 3 ? ` +${result.skills.length - 3} more` : ''
        notify(`⚡ Skills: ${skillsList}${more} (${autoCount} auto + ${existingCount} explicit)`, 'success', 4000)
      }
    }
  }
}
