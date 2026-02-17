/**
 * Agent Config Parser
 * 
 * Parses YAML frontmatter from agent definition files (.md)
 * and caches the results at init time.
 */

import { existsSync, readFileSync } from 'fs'
import { readdir } from 'fs/promises'
import { join } from 'path'

export interface AgentConfig {
  name: string
  description: string
  defaultSkills: string[]
}

const DEFAULT_AGENTS_DIR = `${process.env.HOME}/.config/opencode/agents`

export class AgentConfigCache {
  private agents: Map<string, AgentConfig> = new Map()
  private initialized: boolean = false

  constructor(private agentsDir: string = DEFAULT_AGENTS_DIR) {}

  /**
   * Initialize the cache by reading all agent files.
   * Must be called before getAgentConfig().
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      if (!existsSync(this.agentsDir)) {
        console.warn(`[AgentConfigCache] Agents directory not found: ${this.agentsDir}`)
        this.initialized = true
        return
      }

      const files = await readdir(this.agentsDir)
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue
        
        const filePath = join(this.agentsDir, file)
        try {
          const content = readFileSync(filePath, 'utf-8')
          const config = this.parseFrontmatter(content, file)
          
          if (config) {
            // Use filename without .md as the key
            const agentName = file.replace(/\.md$/, '')
            this.agents.set(agentName, config)
          }
        } catch (err) {
          console.warn(`[AgentConfigCache] Failed to parse ${file}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } catch (err) {
      console.warn(`[AgentConfigCache] Failed to read agents directory: ${err instanceof Error ? err.message : String(err)}`)
    }

    this.initialized = true
  }

  /**
   * Parse YAML frontmatter from markdown content.
   */
  private parseFrontmatter(content: string, filename: string): AgentConfig | null {
    // Check for frontmatter delimiter
    if (!content.startsWith('---')) {
      return null
    }

    // Find the closing delimiter
    const endIndex = content.indexOf('---', 3)
    if (endIndex === -1) {
      return null
    }

    const frontmatter = content.slice(3, endIndex).trim()
    
    // Extract fields
    const defaultSkills = this.extractArrayField(frontmatter, 'default_skills')
    const description = this.extractStringField(frontmatter, 'description')

    return {
      name: filename.replace(/\.md$/, ''),
      description: description || '',
      defaultSkills: defaultSkills || []
    }
  }

  /**
   * Extract a string field from YAML frontmatter.
   */
  private extractStringField(frontmatter: string, fieldName: string): string {
    const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm')
    const match = frontmatter.match(regex)
    if (match) {
      // Remove quotes if present
      return match[1].replace(/^["']|["']$/g, '').trim()
    }
    return ''
  }

  /**
   * Extract an array field from YAML frontmatter.
   */
  private extractArrayField(frontmatter: string, fieldName: string): string[] {
    const result: string[] = []
    
    const lines = frontmatter.split('\n')
    let inArray = false
    let arrayContent = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this line starts the array
      if (line === fieldName + ':' || line.match(new RegExp('^' + fieldName + ':\\s*$'))) {
        inArray = true
        continue
      }
      
      // If we're in the array, collect items
      if (inArray) {
        const match2space = line.match(/^[\s]+- /)
        const matchDash = line.match(/^- /)
        
        if (match2space || matchDash) {
          arrayContent += line + '\n'
        } else if (line.trim() === '') {
          continue
        } else {
          break
        }
      }
    }
    
    // Parse collected items
    if (arrayContent) {
      const itemRegex = /^\s*- (.+)$/gm
      let match
      while ((match = itemRegex.exec(arrayContent)) !== null) {
        result.push(match[1].trim())
      }
    }
    
    // Also try inline array: field: [item1, item2]
    if (result.length === 0) {
      const inlineRegex = new RegExp(`^${fieldName}:\\s*\\[(.+)\\]`, 'm')
      const inlineMatch = frontmatter.match(inlineRegex)
      if (inlineMatch) {
        const items = inlineMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
        return items.filter(s => s.length > 0)
      }
    }
    
    return result
  }

  /**
   * Get config for a specific agent by name.
   */
  getAgentConfig(agentName: string): AgentConfig | undefined {
    return this.agents.get(agentName)
  }

  /**
   * Get all cached agents.
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
  }
}
