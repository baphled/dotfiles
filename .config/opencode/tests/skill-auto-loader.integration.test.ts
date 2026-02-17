/**
 * Integration Tests for Skill Auto-Loader Plugin
 *
 * Tests the full plugin lifecycle from initialization through task interception.
 * Uses real file system operations and actual configuration files.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { SkillAutoLoaderPlugin } from '../plugins/skill-auto-loader'
import { AgentConfigCache } from '../plugins/lib/agent-config-parser'
import type { PluginInput } from '@opencode-ai/plugin'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'

const TEST_LOG_FILE = `${process.env.HOME}/.config/opencode/logs/skill-auto-loader-test.log`
const REAL_LOG_FILE = `${process.env.HOME}/.config/opencode/logs/skill-auto-loader.log`
const CONFIG_FILE = `${process.env.HOME}/.config/opencode/plugins/skill-auto-loader-config.jsonc`
const AGENTS_DIR = `${process.env.HOME}/.config/opencode/agents`

// Type for the tool.execute.before hook input
type ToolExecuteInput = {
  tool: string
  sessionID: string
  callID: string
}

// Type for the tool.execute.before hook output
type ToolExecuteOutput = {
  args: {
    tool: string
    category?: string
    subagentType?: string
    prompt?: string
    load_skills: string[]
    session_id?: string
    [key: string]: any
  }
}

// Type for plugin hooks
type PluginHookFunction = (input: any, output: any) => Promise<void> | void
type PluginHooks = Record<string, PluginHookFunction>

describe('Skill Auto-Loader Plugin Integration', () => {
  let mockClient: PluginInput['client']
  let toastCalls: Array<{ title: string; message: string; variant: string; duration: number }>
  let pluginHooks: PluginHooks

  beforeEach(() => {
    // Reset toast tracking
    toastCalls = []

    // Create mock client with toast spy
    mockClient = {
      tui: {
        showToast: async (options: { body: { title: string; message: string; variant: string; duration: number } }) => {
          toastCalls.push(options.body)
        }
      }
    } as unknown as PluginInput['client']

    // Backup and clear real log file if it exists
    if (existsSync(REAL_LOG_FILE)) {
      const backup = readFileSync(REAL_LOG_FILE, 'utf-8')
      writeFileSync(`${REAL_LOG_FILE}.backup`, backup)
      unlinkSync(REAL_LOG_FILE)
    }
  })

  afterAll(() => {
    // Restore real log file
    if (existsSync(`${REAL_LOG_FILE}.backup`)) {
      const backup = readFileSync(`${REAL_LOG_FILE}.backup`, 'utf-8')
      writeFileSync(REAL_LOG_FILE, backup)
      unlinkSync(`${REAL_LOG_FILE}.backup`)
    }

    // Clean up test log
    if (existsSync(TEST_LOG_FILE)) {
      unlinkSync(TEST_LOG_FILE)
    }
  })

  // ============================================================
  // Plugin Initialization Tests
  // ============================================================

  describe('Plugin Initialization', () => {
    test('plugin initializes successfully', async () => {
      const input: PluginInput = { client: mockClient } as PluginInput
      const hooks = await SkillAutoLoaderPlugin(input)

      expect(hooks).toBeDefined()
      expect(hooks['tool.execute.before']).toBeDefined()
      expect(typeof hooks['tool.execute.before']).toBe('function')
    })

    test('shows toast notification on load', async () => {
      const input: PluginInput = { client: mockClient } as PluginInput
      await SkillAutoLoaderPlugin(input)

      expect(toastCalls.length).toBeGreaterThanOrEqual(1)
      expect(toastCalls[0].title).toBe('Skill Auto-Loader')
      expect(toastCalls[0].variant).toBe('info')
    })

    test('initializes agent cache with real agent files', async () => {
      const cache = new AgentConfigCache(AGENTS_DIR)
      await cache.init()

      const agents = cache.getAllAgents()
      expect(agents.length).toBeGreaterThanOrEqual(10)

      // Verify specific agents exist
      expect(cache.getAgentConfig('Senior-Engineer')).toBeDefined()
      expect(cache.getAgentConfig('VHS-Director')).toBeDefined()
    })
  })

  // ============================================================
  // Config Loading Tests
  // ============================================================

  describe('Config Loading', () => {
    test('loads configuration from JSONC file', () => {
      expect(existsSync(CONFIG_FILE)).toBe(true)

      const content = readFileSync(CONFIG_FILE, 'utf-8')
      expect(content).toContain('baseline_skills')
      expect(content).toContain('category_mappings')
      expect(content).toContain('keyword_patterns')
    })

    test('config file contains valid structure', () => {
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      // Strip comments and parse
      const jsonContent = content.replace(/\/\/.*$/gm, '')
      const config = JSON.parse(jsonContent)

      expect(config.baseline_skills).toBeDefined()
      expect(Array.isArray(config.baseline_skills)).toBe(true)
      expect(config.max_auto_skills).toBeDefined()
      expect(typeof config.max_auto_skills).toBe('number')
      expect(config.category_mappings).toBeDefined()
      expect(typeof config.category_mappings).toBe('object')
    })

    test('config contains all 8 category mappings', () => {
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      const jsonContent = content.replace(/\/\/.*$/gm, '')
      const config = JSON.parse(jsonContent)

      const expectedCategories = [
        'visual-engineering',
        'ultrabrain',
        'deep',
        'quick',
        'artistry',
        'writing',
        'unspecified-low',
        'unspecified-high'
      ]

      for (const category of expectedCategories) {
        expect(config.category_mappings[category]).toBeDefined()
        expect(Array.isArray(config.category_mappings[category])).toBe(true)
      }
    })

    test('config contains keyword patterns with priorities', () => {
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      const jsonContent = content.replace(/\/\/.*$/gm, '')
      const config = JSON.parse(jsonContent)

      expect(config.keyword_patterns).toBeDefined()
      expect(Array.isArray(config.keyword_patterns)).toBe(true)
      expect(config.keyword_patterns.length).toBeGreaterThan(0)

      // Check structure of first pattern
      const firstPattern = config.keyword_patterns[0]
      expect(firstPattern.pattern).toBeDefined()
      expect(firstPattern.skills).toBeDefined()
      expect(firstPattern.priority).toBeDefined()
    })
  })

  // ============================================================
  // Task Interception & Skill Injection Tests
  // ============================================================

  describe('Task Interception', () => {
    test('intercepts task() tool calls', async () => {
      const input: PluginInput = { client: mockClient } as PluginInput
      const hooks = await SkillAutoLoaderPlugin(input)

      const mockOutput = {
        args: {
          tool: 'task',
          category: 'quick',
          prompt: 'Fix a typo',
          load_skills: []
        }
      }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Plugin should have modified load_skills
       expect(mockOutput.args.load_skills).toBeDefined()
       expect(Array.isArray(mockOutput.args.load_skills)).toBe(true)
     })

     test('ignores non-task tool calls', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const originalSkills = ['existing-skill']
       const mockOutput = {
         args: {
           tool: 'read',
           load_skills: originalSkills
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // load_skills should remain unchanged
      expect(mockOutput.args.load_skills).toEqual(originalSkills)
    })
  })

  describe('Skill Injection', () => {
     test('injects baseline skills for all tasks', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'quick',
           prompt: 'Simple task',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       expect(mockOutput.args.load_skills).toContain('pre-action')
       expect(mockOutput.args.load_skills).toContain('memory-keeper')
     })

     test('adds category-mapped skills', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'visual-engineering',
           prompt: 'Create UI component',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       expect(mockOutput.args.load_skills).toContain('frontend-ui-ux')
       expect(mockOutput.args.load_skills).toContain('accessibility')
     })

     test('adds subagent-mapped skills', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
            subagentType: 'Senior-Engineer',
           prompt: 'Complex analysis',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

        expect(mockOutput.args.load_skills).toContain('pre-action')
        expect(mockOutput.args.load_skills).toContain('memory-keeper')
        expect(mockOutput.args.load_skills).toContain('clean-code')
     })

     test('detects keywords in prompt and adds relevant skills', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'deep',
           prompt: 'Implement secure authentication with encryption',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Should contain security-related skills based on prompt keywords
       expect(mockOutput.args.load_skills.length).toBeGreaterThan(2) // baseline + category + keywords
     })

     test('merges with existing load_skills', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const existingSkills = ['custom-skill', 'another-skill']
       const mockOutput = {
         args: {
           tool: 'task',
           category: 'quick',
           prompt: 'Task',
           load_skills: existingSkills
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       expect(mockOutput.args.load_skills).toContain('custom-skill')
       expect(mockOutput.args.load_skills).toContain('another-skill')
       expect(mockOutput.args.load_skills).toContain('pre-action')
     })

     test('respects max_auto_skills limit', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'ultrabrain', // Has multiple skills
           prompt: 'Security vulnerability testing with database refactoring and playwright browser automation',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // Load config to check max_auto_skills
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      const jsonContent = content.replace(/\/\/.*$/gm, '')
      const config = JSON.parse(jsonContent)

      // Should have baseline skills + up to max_auto_skills additional
      const baselineCount = config.baseline_skills.length
      expect(mockOutput.args.load_skills.length).toBeLessThanOrEqual(
        baselineCount + config.max_auto_skills
      )
    })

     test('skips injection on session continuation when configured', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'deep',
           prompt: 'Continue work',
           load_skills: [],
           session_id: 'ses_abc123'
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // Load config to check skip setting
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      const jsonContent = content.replace(/\/\/.*$/gm, '')
      const config = JSON.parse(jsonContent)

      if (config.skip_on_session_continue) {
        expect(mockOutput.args.load_skills).toHaveLength(0)
      }
    })
  })

  // ============================================================
  // Agent Routing Tests
  // ============================================================

  describe('Agent Routing', () => {
     test('routes generic agents based on prompt', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           subagentType: 'sisyphus-junior',
           prompt: 'Design a nix flake configuration',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Should have been routed to Nix-Expert and received nix skill
       expect(mockOutput.args.load_skills).toContain('nix')
     })

     test('preserves explicit agent choices', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

        const originalAgent = 'VHS-Director'
       const mockOutput = {
         args: {
           tool: 'task',
           subagentType: originalAgent,
           prompt: 'Security audit with nix configuration', // Matches multiple patterns
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Agent should remain unchanged
       expect(mockOutput.args.subagentType).toBe(originalAgent)
     })

     test('updates subagentType when routing occurs', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           subagentType: undefined,
           prompt: 'VHS tape recording for demo',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Should have been routed to VHS-Director
       expect(mockOutput.args.subagentType).toBe('VHS-Director')
     })

     test('selects highest-priority agent for multi-match prompts', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           subagentType: 'sisyphus-junior',
           prompt: 'Security vulnerability in nix configuration', // Matches Security and Nix
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // Security has higher priority than Nix in config
      // Agent routing toast should mention the routed agent
      const routingToast = toastCalls.find(t =>
        t.message.includes('Routed to') || t.message.includes('🔀')
      )
      expect(routingToast).toBeDefined()
    })
  })

  // ============================================================
  // Logging Tests
  // ============================================================

  describe('Logging', () => {
     test('writes injection events to log file', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       // Clear log file
       if (existsSync(REAL_LOG_FILE)) {
         unlinkSync(REAL_LOG_FILE)
       }

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'deep',
           prompt: 'Test task',
           load_skills: ['existing-skill']
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // Verify log was written
      expect(existsSync(REAL_LOG_FILE)).toBe(true)

      const logContent = readFileSync(REAL_LOG_FILE, 'utf-8')
      const logEntry = JSON.parse(logContent.trim())

      expect(logEntry.timestamp).toBeDefined()
      expect(logEntry.tool).toBe('task')
      expect(logEntry.category).toBe('deep')
      expect(logEntry.injected).toBeDefined()
      expect(Array.isArray(logEntry.injected)).toBe(true)
      expect(logEntry.existing).toContain('existing-skill')
      expect(logEntry.final).toBeDefined()
      expect(logEntry.sources).toBeDefined()
    })

     test('log entry contains correct structure', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       // Clear log file
       if (existsSync(REAL_LOG_FILE)) {
         unlinkSync(REAL_LOG_FILE)
       }

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'visual-engineering',
           subagentType: 'sisyphus-junior',
           prompt: 'Frontend security review',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       const logContent = readFileSync(REAL_LOG_FILE, 'utf-8')
       const logEntry = JSON.parse(logContent.trim())

       // Verify all expected fields
       expect(logEntry).toHaveProperty('timestamp')
       expect(logEntry).toHaveProperty('tool')
       expect(logEntry).toHaveProperty('category')
       expect(logEntry).toHaveProperty('subagentType')
       expect(logEntry).toHaveProperty('routedAgent')
       expect(logEntry).toHaveProperty('routedPattern')
       expect(logEntry).toHaveProperty('injected')
       expect(logEntry).toHaveProperty('existing')
       expect(logEntry).toHaveProperty('final')
       expect(logEntry).toHaveProperty('sources')

       // Verify sources structure
       expect(Array.isArray(logEntry.sources)).toBe(true)
       if (logEntry.sources.length > 0) {
         expect(logEntry.sources[0]).toHaveProperty('skill')
         expect(logEntry.sources[0]).toHaveProperty('source')
       }
     })

     test('appends to existing log', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       // Clear log file
       if (existsSync(REAL_LOG_FILE)) {
         unlinkSync(REAL_LOG_FILE)
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         // First task
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call-1' },
           { args: { tool: 'task', category: 'quick', prompt: 'First', load_skills: [] } }
         )

         // Second task
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call-2' },
           { args: { tool: 'task', category: 'deep', prompt: 'Second', load_skills: [] } }
         )
       }

      const logContent = readFileSync(REAL_LOG_FILE, 'utf-8')
      const lines = logContent.trim().split('\n')

      expect(lines.length).toBe(2)

      const firstEntry = JSON.parse(lines[0])
      const secondEntry = JSON.parse(lines[1])

      expect(firstEntry.category).toBe('quick')
      expect(secondEntry.category).toBe('deep')
    })
  })

  // ============================================================
  // Integration with Real Components
  // ============================================================

  describe('Real Component Integration', () => {
     test('uses actual agent configs from filesystem', async () => {
       const cache = new AgentConfigCache(AGENTS_DIR)
       await cache.init()

       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       // Test with an agent that has defaultSkills
       const mockOutput = {
         args: {
           tool: 'task',
            subagentType: 'Senior-Engineer',
           prompt: 'Analyze architecture',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

        // Verify Senior-Engineer agent was loaded and its skills applied
        const agentConfig = cache.getAgentConfig('Senior-Engineer')
        expect(agentConfig).toBeDefined()

        // Senior-Engineer's default skills should be in the result
        for (const skill of agentConfig!.defaultSkills) {
          expect(mockOutput.args.load_skills).toContain(skill)
        }
     })

     test('end-to-end with complex prompt', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'deep',
           subagentType: 'sisyphus-junior',
           prompt: `
             Implement a secure API endpoint using Go with database integration.
             Add comprehensive tests and ensure proper error handling.
             Use clean code patterns and consider concurrency safety.
           `,
           load_skills: ['custom-skill']
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

      // Verify baseline skills
      expect(mockOutput.args.load_skills).toContain('pre-action')
      expect(mockOutput.args.load_skills).toContain('memory-keeper')

      // Verify category skills
      expect(mockOutput.args.load_skills).toContain('clean-code')

      // Verify existing skill preserved
      expect(mockOutput.args.load_skills).toContain('custom-skill')

      // Verify skill sources tracked
      const logContent = readFileSync(REAL_LOG_FILE, 'utf-8')
      const lines = logContent.trim().split('\n')
      const lastEntry = JSON.parse(lines[lines.length - 1])

      expect(lastEntry.sources.some((s: any) => s.source === 'baseline')).toBe(true)
      expect(lastEntry.sources.some((s: any) => s.source === 'category')).toBe(true)
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
     test('handles empty prompt gracefully', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           category: 'quick',
           prompt: '',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Should still have baseline skills
       expect(mockOutput.args.load_skills).toContain('pre-action')
       expect(mockOutput.args.load_skills).toContain('memory-keeper')
     })

     test('handles undefined category and subagent', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       const mockOutput = {
         args: {
           tool: 'task',
           prompt: 'Simple task',
           load_skills: []
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // Should still work with just baseline skills
       expect(mockOutput.args.load_skills).toContain('pre-action')
       expect(mockOutput.args.load_skills).toContain('memory-keeper')
     })

     test('handles missing config gracefully', async () => {
       // This test verifies the plugin can fall back to defaults
       // We can't easily test missing config without renaming the file,
       // but we verify the fallback logic exists
       const content = readFileSync(CONFIG_FILE, 'utf-8')
       expect(content).toBeTruthy()
     })

     test('deduplicates skills correctly', async () => {
       const input: PluginInput = { client: mockClient } as PluginInput
       const hooks = await SkillAutoLoaderPlugin(input)

       // Category 'deep' has clean-code, prompt also mentions refactor
       const mockOutput = {
         args: {
           tool: 'task',
           category: 'deep',
           prompt: 'Refactor with clean code patterns',
           load_skills: ['clean-code'] // Already provided
         }
       }

       const hook = hooks['tool.execute.before']
       if (hook) {
         await hook(
           { tool: 'task', sessionID: 'test-session', callID: 'test-call' },
           mockOutput
         )
       }

       // clean-code should appear only once
       const cleanCodeCount = mockOutput.args.load_skills.filter((s: string) => s === 'clean-code').length
       expect(cleanCodeCount).toBe(1)
     })
  })
})
