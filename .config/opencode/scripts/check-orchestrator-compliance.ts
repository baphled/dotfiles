#!/usr/bin/env bun
/**
 * Orchestrator Compliance Checker CLI
 * 
 * Analyses session transcripts to verify orchestrators follow the 100% delegation rule.
 * 
 * Usage:
 *   bun run scripts/check-orchestrator-compliance.ts [session_id]
 *   bun run scripts/check-orchestrator-compliance.ts --recent [count]
 *   bun run scripts/check-orchestrator-compliance.ts --all
 *   bun run scripts/check-orchestrator-compliance.ts --help
 * 
 * Examples:
 *   # Check a specific session
 *   bun run scripts/check-orchestrator-compliance.ts ses_abc123
 *   
 *   # Check the 5 most recent sessions
 *   bun run scripts/check-orchestrator-compliance.ts --recent 5
 *   
 *   # Check all orchestrator sessions
 *   bun run scripts/check-orchestrator-compliance.ts --all
 */

import {
  analyseSession,
  formatReport,
  isOrchestrator,
  type SessionMessage,
  type ComplianceReport,
} from '../plugins/lib/compliance-checker'

// === CONFIGURATION ===

const OPENCODE_DATA_DIR = process.env.OPENCODE_DATA_DIR || `${process.env.HOME}/.local/share/opencode`

// === SESSION READING (MOCK - TO BE INTEGRATED WITH ACTUAL SESSION STORAGE) ===

interface SessionInfo {
  id: string
  agent: string
  messageCount: number
  firstMessage: string
  lastMessage: string
}

/**
 * Lists available sessions (placeholder - needs actual implementation)
 */
async function listSessions(limit?: number): Promise<SessionInfo[]> {
  // In real implementation, this would read from session storage
  // For now, we'll return a placeholder that instructs users to use mcp_session_list
  console.log('Note: Session listing requires MCP session tools.')
  console.log('Use mcp_session_list to get available sessions.')
  return []
}

/**
 * Reads a session transcript (placeholder - needs actual implementation)
 */
async function readSession(sessionId: string): Promise<{ agent: string; messages: SessionMessage[] } | null> {
  // In real implementation, this would use mcp_session_read
  console.log(`Note: Session reading requires MCP session tools.`)
  console.log(`Use mcp_session_read(session_id="${sessionId}") to read the session.`)
  return null
}

/**
 * Parses session transcript text into structured messages
 */
export function parseSessionTranscript(transcript: string): SessionMessage[] {
  const messages: SessionMessage[] = []
  const lines = transcript.split('\n')
  
  let currentMessage: Partial<SessionMessage> | null = null
  let contentLines: string[] = []
  
  for (const line of lines) {
    // Match message header: [role (agent)] timestamp
    const headerMatch = line.match(/^\[(user|assistant)\s*(?:\(([^)]+)\))?\]\s*(.+)$/)
    
    if (headerMatch) {
      // Save previous message
      if (currentMessage && currentMessage.role) {
        currentMessage.content = contentLines.join('\n').trim()
        messages.push(currentMessage as SessionMessage)
      }
      
      // Start new message
      currentMessage = {
        role: headerMatch[1] as 'user' | 'assistant',
        timestamp: headerMatch[3] || new Date().toISOString(),
      }
      contentLines = []
    } else if (currentMessage) {
      contentLines.push(line)
    }
  }
  
  // Save last message
  if (currentMessage && currentMessage.role) {
    currentMessage.content = contentLines.join('\n').trim()
    messages.push(currentMessage as SessionMessage)
  }
  
  return messages
}

/**
 * Analyses a session from stdin
 */
async function analyseFromStdin(): Promise<ComplianceReport | null> {
  console.log('Reading session transcript from stdin...')
  console.log('Paste the session transcript and press Ctrl+D when done.\n')
  
  const chunks: string[] = []
  const decoder = new TextDecoder()
  
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(decoder.decode(chunk))
  }
  
  const transcript = chunks.join('')
  
  if (!transcript.trim()) {
    console.error('Error: Empty transcript received.')
    return null
  }
  
  const messages = parseSessionTranscript(transcript)
  
  if (messages.length === 0) {
    console.error('Error: No messages parsed from transcript.')
    return null
  }
  
  // Try to extract agent from first assistant message
  const firstAssistant = messages.find(m => m.role === 'assistant')
  const agent = 'unknown'
  
  return analyseSession('stdin', agent, messages)
}

// === CLI IMPLEMENTATION ===

function printUsage() {
  console.log(`
Orchestrator Compliance Checker
===============================

Verifies that orchestrators follow the 100% delegation rule by analysing
session transcripts for tool usage violations.

Usage:
  bun run scripts/check-orchestrator-compliance.ts [options] [session_id]

Options:
  --help, -h        Show this help message
  --recent [N]      Check the N most recent orchestrator sessions (default: 5)
  --all             Check all orchestrator sessions
  --stdin           Read session transcript from stdin
  --json            Output report as JSON instead of formatted text
  --verbose, -v     Show detailed analysis including compliant calls

Examples:
  # Check a specific session
  bun run scripts/check-orchestrator-compliance.ts ses_abc123

  # Check the 5 most recent sessions  
  bun run scripts/check-orchestrator-compliance.ts --recent 5

  # Check from stdin (pipe transcript)
  cat session.txt | bun run scripts/check-orchestrator-compliance.ts --stdin

  # Get JSON output for further processing
  bun run scripts/check-orchestrator-compliance.ts --stdin --json

Tool Categories:
  PERMITTED (Orchestrators may use):
    - Delegation: task(), mcp_call_omo_agent
    - Memory: mcp_memory_*, mcp_vault-rag_query_vault
    - System: mcp_provider-health, mcp_skill, mcp_todowrite, mcp_background_*
    - Verify: mcp_bash (make build/test/lint only), mcp_lsp_diagnostics

  FORBIDDEN (Must delegate instead):
    - Framework-blocked: mcp_edit, mcp_write
    - Investigation: mcp_read, mcp_glob, mcp_grep, mcp_ast_grep_*
    - LSP (except diagnostics): mcp_lsp_goto_definition, mcp_lsp_find_references, etc.
    - Bash investigation: cat, grep, git log, find, ls -la, etc.
    - Bash modification: sed, awk, mv, cp, rm, etc.

For more details, see:
  ~/.config/opencode/specs/rigid-orchestrator-v1.md
  ~/.config/opencode/specs/orchestrator-compliance.feature
`)
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }
  
  const jsonOutput = args.includes('--json')
  const verbose = args.includes('--verbose') || args.includes('-v')
  const fromStdin = args.includes('--stdin')
  
  if (fromStdin) {
    const report = await analyseFromStdin()
    
    if (!report) {
      process.exit(1)
    }
    
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(formatReport(report))
    }
    
    process.exit(report.overallStatus === 'VIOLATION' ? 1 : 0)
  }
  
  // For non-stdin modes, we need MCP integration
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              ORCHESTRATOR COMPLIANCE CHECKER                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  This tool requires MCP session tools for direct session access.   ║
║                                                                    ║
║  INTERACTIVE USAGE (within OpenCode):                              ║
║  ─────────────────────────────────────                             ║
║  1. List sessions: mcp_session_list(limit=10)                      ║
║  2. Read session:  mcp_session_read(session_id="ses_xxx")          ║
║  3. Pipe to this:  cat transcript | bun run check... --stdin       ║
║                                                                    ║
║  PROGRAMMATIC USAGE:                                               ║
║  ─────────────────────────────────────                             ║
║  Import the compliance-checker module directly:                    ║
║                                                                    ║
║    import { analyseSession, formatReport }                         ║
║      from './plugins/lib/compliance-checker'                       ║
║                                                                    ║
║    const report = analyseSession(sessionId, agent, messages)       ║
║    console.log(formatReport(report))                               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`)
  
  // If a session ID was provided, show how to fetch it
  const sessionId = args.find(arg => !arg.startsWith('-'))
  if (sessionId) {
    console.log(`
To analyse session "${sessionId}":

1. In OpenCode, run:
   mcp_session_read(session_id="${sessionId}")

2. Copy the output and pipe to this script:
   echo '<paste output>' | bun run scripts/check-orchestrator-compliance.ts --stdin
`)
  }
}

main().catch(console.error)
