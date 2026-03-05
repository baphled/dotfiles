/**
 * Tests for Orchestrator Compliance Checker
 * 
 * BDD-style tests verifying the 100% delegation rule enforcement.
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import {
  analyseToolCall,
  analyseBashCommand,
  analyseSession,
  extractToolCalls,
  detectAntiPatterns,
  generateRecommendations,
  formatReport,
  isOrchestrator,
  isToolWhitelisted,
  getWhitelistedTools,
  type ToolCall,
  type SessionMessage,
  type ComplianceResult,
  type ComplianceReport,
} from '../plugins/lib/compliance-checker'

// === TEST FIXTURES ===

const createToolCall = (tool: string, args?: Record<string, unknown>): ToolCall => ({
  tool,
  arguments: args,
  timestamp: new Date().toISOString(),
  messageIndex: 0,
})

const createMessage = (
  role: 'user' | 'assistant',
  content: string,
  toolCalls?: ToolCall[]
): SessionMessage => ({
  role,
  content,
  timestamp: new Date().toISOString(),
  toolCalls,
})

// === ORCHESTRATOR IDENTIFICATION ===

describe('Orchestrator Identification', () => {
  test('identifies top-level orchestrators', () => {
    expect(isOrchestrator('sisyphus')).toBe(true)
    expect(isOrchestrator('Sisyphus (Ultraworker)')).toBe(true)
    expect(isOrchestrator('hephaestus')).toBe(true)
    expect(isOrchestrator('atlas')).toBe(true)
  })

  test('identifies mid-tier orchestrator', () => {
    expect(isOrchestrator('Tech-Lead')).toBe(true)
    expect(isOrchestrator('tech-lead')).toBe(true)
  })

  test('rejects non-orchestrators', () => {
    expect(isOrchestrator('Senior-Engineer')).toBe(false)
    expect(isOrchestrator('QA-Engineer')).toBe(false)
    expect(isOrchestrator('explore')).toBe(false)
    expect(isOrchestrator('librarian')).toBe(false)
  })
})

// === TOOL WHITELIST COMPLIANCE ===

describe('Tool Whitelist Compliance', () => {
  describe('Delegation Tools', () => {
    test('task() is permitted', () => {
      const result = analyseToolCall(createToolCall('task'))
      expect(result.status).toBe('COMPLIANT')
      expect(result.reason).toContain('permitted')
    })

    test('mcp_call_omo_agent is permitted', () => {
      const result = analyseToolCall(createToolCall('mcp_call_omo_agent'))
      expect(result.status).toBe('COMPLIANT')
    })
  })

  describe('Memory Tools', () => {
    const memoryTools = [
      'mcp_memory_search_nodes',
      'mcp_memory_open_nodes',
      'mcp_memory_create_entities',
      'mcp_memory_add_observations',
      'mcp_vault-rag_query_vault',
    ]

    test.each(memoryTools)('%s is permitted', (tool) => {
      const result = analyseToolCall(createToolCall(tool))
      expect(result.status).toBe('COMPLIANT')
      expect(result.reason).toContain('permitted')
    })
  })

  describe('System Tools', () => {
    const systemTools = [
      'mcp_provider-health',
      'mcp_skill',
      'mcp_todowrite',
      'mcp_background_output',
      'mcp_background_cancel',
    ]

    test.each(systemTools)('%s is permitted', (tool) => {
      const result = analyseToolCall(createToolCall(tool))
      expect(result.status).toBe('COMPLIANT')
    })
  })

  describe('Binary Verification Commands', () => {
    test('make build is permitted', () => {
      const result = analyseBashCommand('make build')
      expect(result.status).toBe('COMPLIANT')
      expect(result.reason).toContain('verification')
    })

    test('make test is permitted', () => {
      const result = analyseBashCommand('make test')
      expect(result.status).toBe('COMPLIANT')
    })

    test('make lint is permitted', () => {
      const result = analyseBashCommand('make lint')
      expect(result.status).toBe('COMPLIANT')
    })

    test('make check-compliance is permitted', () => {
      const result = analyseBashCommand('make check-compliance')
      expect(result.status).toBe('COMPLIANT')
    })

    test('git status is permitted', () => {
      const result = analyseBashCommand('git status')
      expect(result.status).toBe('COMPLIANT')
    })

    test('mcp_lsp_diagnostics is permitted', () => {
      const result = analyseToolCall(createToolCall('mcp_lsp_diagnostics'))
      expect(result.status).toBe('COMPLIANT')
    })
  })
})

// === TOOL BLACKLIST VIOLATIONS ===

describe('Tool Blacklist Violations', () => {
  describe('Framework-Blocked Tools', () => {
    test('mcp_edit is a violation', () => {
      const result = analyseToolCall(createToolCall('mcp_edit'))
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('framework-blocked')
      expect(result.suggestedAction).toContain('delegate')
    })

    test('mcp_write is a violation', () => {
      const result = analyseToolCall(createToolCall('mcp_write'))
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('framework-blocked')
    })
  })

  describe('Investigation Tools', () => {
    const investigationTools = [
      'mcp_read',
      'mcp_glob',
      'mcp_grep',
      'mcp_ast_grep_search',
      'mcp_webfetch',
      'mcp_look_at',
    ]

    test.each(investigationTools)('%s is a violation', (tool) => {
      const result = analyseToolCall(createToolCall(tool))
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('investigation-overreach')
      expect(result.suggestedAction).toContain('explore')
    })
  })

  describe('LSP Overreach', () => {
    const lspTools = [
      'mcp_lsp_goto_definition',
      'mcp_lsp_find_references',
      'mcp_lsp_symbols',
      'mcp_lsp_rename',
    ]

    test.each(lspTools)('%s is a violation', (tool) => {
      const result = analyseToolCall(createToolCall(tool))
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('lsp-overreach')
    })
  })

  describe('Bash Investigation Commands', () => {
    const investigationCommands = [
      'cat /etc/passwd',
      'head -n 10 file.txt',
      'tail -f log.txt',
      'grep pattern file.txt',
      'rg "search term"',
      'find . -name "*.go"',
      'ls -la',
      'git log --oneline',
      'git show HEAD',
      'git diff',
      'git blame file.go',
      'tree src/',
    ]

    test.each(investigationCommands)('"%s" is a violation', (command) => {
      const result = analyseBashCommand(command)
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('bash-investigation')
      expect(result.suggestedAction).toContain('explore')
    })
  })

  describe('Bash Modification Commands', () => {
    const modificationCommands = [
      'echo "content" > file.txt',
      'printf "data" > output.txt',
      'sed -i "s/old/new/" file.txt',
      'awk "{print $1}" file.txt',
      'mv old.txt new.txt',
      'cp source.txt dest.txt',
      'rm -rf temp/',
    ]

    test.each(modificationCommands)('"%s" is a violation', (command) => {
      const result = analyseBashCommand(command)
      expect(result.status).toBe('VIOLATION')
      expect(result.violationType).toBe('bash-modification')
      expect(result.suggestedAction).toContain('worker')
    })
  })
})

// === DELEGATION PATTERN VIOLATIONS ===

describe('Delegation Pattern Violations', () => {
  test('task() with non-empty load_skills is a warning', () => {
    const result = analyseToolCall(createToolCall('task', {
      subagent_type: 'Senior-Engineer',
      load_skills: ['golang', 'bdd-workflow'],
      prompt: 'Fix the bug',
    }))
    expect(result.status).toBe('WARNING')
    expect(result.violationType).toBe('static-skill-injection')
    expect(result.suggestedAction).toContain('load_skills=[]')
  })

  test('task() with empty load_skills is compliant', () => {
    const result = analyseToolCall(createToolCall('task', {
      subagent_type: 'Senior-Engineer',
      load_skills: [],
      prompt: 'Fix the bug',
    }))
    expect(result.status).toBe('COMPLIANT')
  })

  test('task() without load_skills is compliant', () => {
    const result = analyseToolCall(createToolCall('task', {
      subagent_type: 'Senior-Engineer',
      prompt: 'Fix the bug',
    }))
    expect(result.status).toBe('COMPLIANT')
  })
})

// === TOOL CALL EXTRACTION ===

describe('Tool Call Extraction', () => {
  test('extracts tool calls from formatted output', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', 'I will help you.\n[tool: task]'),
      createMessage('assistant', '[tool: mcp_memory_search_nodes]'),
    ]
    
    const toolCalls = extractToolCalls(messages)
    expect(toolCalls).toHaveLength(2)
    expect(toolCalls[0].tool).toBe('task')
    expect(toolCalls[1].tool).toBe('mcp_memory_search_nodes')
  })

  test('extracts multiple tool calls from single message', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', '[tool: task]\n[tool: todowrite]'),
    ]
    
    const toolCalls = extractToolCalls(messages)
    expect(toolCalls).toHaveLength(2)
  })

  test('extracts tool calls from explicit toolCalls array', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', 'Working...', [
        createToolCall('task'),
        createToolCall('mcp_skill'),
      ]),
    ]
    
    const toolCalls = extractToolCalls(messages)
    expect(toolCalls).toHaveLength(2)
  })
})

// === ANTI-PATTERN DETECTION ===

describe('Anti-Pattern Detection', () => {
  describe('Quick Fix Trap', () => {
    test('detects quick fix trap anti-pattern', () => {
      const messages: SessionMessage[] = [
        createMessage('assistant', "It's just a typo, I'll fix it quickly"),
        createMessage('assistant', '[tool: mcp_edit]'),
      ]
      
      const results: ComplianceResult[] = [
        { status: 'VIOLATION', tool: 'mcp_edit', violationType: 'framework-blocked', reason: 'blocked' },
      ]
      
      const antiPatterns = detectAntiPatterns(messages, results)
      expect(antiPatterns.length).toBeGreaterThan(0)
      expect(antiPatterns[0].name).toBe('Quick Fix Trap')
      expect(antiPatterns[0].triggerPhrase).toContain('typo')
    })

    test('detects "only one line" anti-pattern', () => {
      const messages: SessionMessage[] = [
        createMessage('assistant', "It's only one line, no need to delegate"),
        createMessage('assistant', '[tool: mcp_write]'),
      ]
      
      const results: ComplianceResult[] = [
        { status: 'VIOLATION', tool: 'mcp_write', violationType: 'framework-blocked', reason: 'blocked' },
      ]
      
      const antiPatterns = detectAntiPatterns(messages, results)
      expect(antiPatterns.some(p => p.triggerPhrase.includes('one line'))).toBe(true)
    })
  })

  describe('Investigation Overreach', () => {
    test('detects "let me check" anti-pattern', () => {
      const messages: SessionMessage[] = [
        createMessage('assistant', 'Let me check the file structure first'),
        createMessage('assistant', '[tool: mcp_read]'),
      ]
      
      const results: ComplianceResult[] = [
        { status: 'VIOLATION', tool: 'mcp_read', violationType: 'investigation-overreach', reason: 'investigation' },
      ]
      
      const antiPatterns = detectAntiPatterns(messages, results)
      expect(antiPatterns.some(p => p.name === 'Investigation Overreach')).toBe(true)
    })
  })
})

// === RECOMMENDATION GENERATION ===

describe('Recommendation Generation', () => {
  test('generates recommendation for framework-blocked violations', () => {
    const results: ComplianceResult[] = [
      { status: 'VIOLATION', tool: 'mcp_edit', violationType: 'framework-blocked', reason: 'blocked' },
    ]
    
    const recommendations = generateRecommendations(results)
    expect(recommendations.some(r => r.includes('Framework-blocked'))).toBe(true)
    expect(recommendations.some(r => r.includes('Senior-Engineer'))).toBe(true)
  })

  test('generates recommendation for investigation violations', () => {
    const results: ComplianceResult[] = [
      { status: 'VIOLATION', tool: 'mcp_read', violationType: 'investigation-overreach', reason: 'investigation' },
    ]
    
    const recommendations = generateRecommendations(results)
    expect(recommendations.some(r => r.includes('explore agent'))).toBe(true)
  })

  test('generates positive message for clean session', () => {
    const results: ComplianceResult[] = [
      { status: 'COMPLIANT', tool: 'task', reason: 'permitted' },
    ]
    
    const recommendations = generateRecommendations(results)
    expect(recommendations.some(r => r.includes('No violations'))).toBe(true)
  })
})

// === SESSION ANALYSIS ===

describe('Session Analysis', () => {
  test('generates compliant report for clean session', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', 'I will delegate this task.\n[tool: task]'),
      createMessage('assistant', '[tool: mcp_memory_search_nodes]'),
      createMessage('assistant', '[tool: mcp_todowrite]'),
    ]
    
    const report = analyseSession('test-session-1', 'sisyphus', messages)
    
    expect(report.overallStatus).toBe('COMPLIANT')
    expect(report.complianceScore).toBe(100)
    expect(report.violationCount).toBe(0)
    expect(report.warningCount).toBe(0)
  })

  test('generates violation report for bad session', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', '[tool: mcp_read]'),
      createMessage('assistant', '[tool: mcp_edit]'),
    ]
    
    const report = analyseSession('test-session-2', 'hephaestus', messages)
    
    expect(report.overallStatus).toBe('VIOLATION')
    expect(report.complianceScore).toBe(0)
    expect(report.violationCount).toBe(2)
  })

  test('calculates correct compliance score', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', '[tool: task]'),
      createMessage('assistant', '[tool: mcp_skill]'),
      createMessage('assistant', '[tool: mcp_read]'),
      createMessage('assistant', '[tool: mcp_todowrite]'),
    ]
    
    const report = analyseSession('test-session-3', 'atlas', messages)
    
    // 3 compliant (task, skill, todowrite), 1 violation (read)
    expect(report.complianceScore).toBe(75)
    expect(report.compliantCalls).toBe(3)
    expect(report.violationCount).toBe(1)
  })

  test('includes anti-patterns in report', () => {
    const messages: SessionMessage[] = [
      createMessage('assistant', "It's just a quick fix"),
      createMessage('assistant', '[tool: mcp_edit]'),
    ]
    
    const report = analyseSession('test-session-4', 'Tech-Lead', messages)
    
    expect(report.antiPatterns.length).toBeGreaterThan(0)
    expect(report.antiPatterns[0].name).toBe('Quick Fix Trap')
  })
})

// === REPORT FORMATTING ===

describe('Report Formatting', () => {
  test('formats compliant report', () => {
    const report: ComplianceReport = {
      sessionId: 'test-123',
      agent: 'sisyphus',
      timestamp: '2026-02-26T12:00:00Z',
      overallStatus: 'COMPLIANT',
      complianceScore: 100,
      totalCalls: 5,
      compliantCalls: 5,
      violationCount: 0,
      warningCount: 0,
      results: [],
      antiPatterns: [],
      recommendations: ['No violations detected.'],
    }
    
    const formatted = formatReport(report)
    
    expect(formatted).toContain('ORCHESTRATOR COMPLIANCE REPORT')
    expect(formatted).toContain('test-123')
    expect(formatted).toContain('sisyphus')
    expect(formatted).toContain('100%')
    expect(formatted).toContain('✅')
    expect(formatted).toContain('COMPLIANT')
  })

  test('formats violation report with details', () => {
    const report: ComplianceReport = {
      sessionId: 'test-456',
      agent: 'hephaestus',
      timestamp: '2026-02-26T12:00:00Z',
      overallStatus: 'VIOLATION',
      complianceScore: 50,
      totalCalls: 4,
      compliantCalls: 2,
      violationCount: 2,
      warningCount: 0,
      results: [
        {
          status: 'VIOLATION',
          tool: 'mcp_read',
          violationType: 'investigation-overreach',
          reason: 'investigation tool',
          suggestedAction: 'delegate to explore',
        },
      ],
      antiPatterns: [
        {
          name: 'Quick Fix Trap',
          triggerPhrase: 'just a typo',
          violatingTool: 'mcp_edit',
          messageIndex: 0,
        },
      ],
      recommendations: ['Delegate investigation to explore agent.'],
    }
    
    const formatted = formatReport(report)
    
    expect(formatted).toContain('VIOLATION')
    expect(formatted).toContain('❌')
    expect(formatted).toContain('50%')
    expect(formatted).toContain('VIOLATION DETAILS')
    expect(formatted).toContain('mcp_read')
    expect(formatted).toContain('ANTI-PATTERNS DETECTED')
    expect(formatted).toContain('Quick Fix Trap')
    expect(formatted).toContain('RECOMMENDATIONS')
  })
})

// === WHITELIST UTILITY ===

describe('Whitelist Utilities', () => {
  test('getWhitelistedTools returns all permitted tools', () => {
    const tools = getWhitelistedTools()
    
    expect(tools).toContain('task')
    expect(tools).toContain('mcp_memory_search_nodes')
    expect(tools).toContain('mcp_provider-health')
    expect(tools).toContain('mcp_bash')
    expect(tools).not.toContain('mcp_edit')
    expect(tools).not.toContain('mcp_read')
  })

  test('isToolWhitelisted correctly identifies permitted tools', () => {
    expect(isToolWhitelisted('task')).toBe(true)
    expect(isToolWhitelisted('mcp_todowrite')).toBe(true)
    expect(isToolWhitelisted('mcp_edit')).toBe(false)
    expect(isToolWhitelisted('mcp_read')).toBe(false)
  })
})

// === EDGE CASES ===

describe('Edge Cases', () => {
  test('handles empty session', () => {
    const report = analyseSession('empty-session', 'sisyphus', [])
    
    expect(report.overallStatus).toBe('COMPLIANT')
    expect(report.complianceScore).toBe(100)
    expect(report.totalCalls).toBe(0)
  })

  test('handles unknown tools with warning', () => {
    const result = analyseToolCall(createToolCall('unknown_tool'))
    
    expect(result.status).toBe('WARNING')
    expect(result.reason).toContain('manual review')
  })

  test('handles malformed bash commands', () => {
    const result = analyseBashCommand('')
    expect(result.status).toBe('WARNING')
    
    const result2 = analyseBashCommand('   ')
    expect(result2.status).toBe('WARNING')
  })

  test('handles bash commands with special characters', () => {
    const result = analyseBashCommand('git log --oneline -n 10')
    expect(result.status).toBe('VIOLATION')
    expect(result.violationType).toBe('bash-investigation')
  })

  test('handles mixed case agent names', () => {
    expect(isOrchestrator('SISYPHUS')).toBe(true)
    expect(isOrchestrator('SiSyPhUs')).toBe(true)
    expect(isOrchestrator('TECH-LEAD')).toBe(true)
  })
})

// === INTEGRATION SCENARIOS ===

describe('Integration Scenarios', () => {
  test('realistic compliant orchestrator session', () => {
    const messages: SessionMessage[] = [
      createMessage('user', 'Add authentication to the API'),
      createMessage('assistant', 'PREFLIGHT: Goal: Add JWT auth\n[tool: mcp_memory_search_nodes]'),
      createMessage('assistant', '[tool: task]'), // Delegate to explore
      createMessage('assistant', '[tool: task]'), // Delegate to Senior-Engineer
      createMessage('assistant', '[tool: task]'), // Delegate to QA-Engineer
      createMessage('assistant', '[tool: mcp_todowrite]'),
      createMessage('assistant', 'Verifying build...\n[tool: mcp_bash]', [
        createToolCall('mcp_bash', { command: 'make build' }),
      ]),
      createMessage('assistant', 'Running tests...\n[tool: mcp_bash]', [
        createToolCall('mcp_bash', { command: 'make test' }),
      ]),
    ]
    
    const report = analyseSession('realistic-good', 'sisyphus', messages)
    
    expect(report.overallStatus).toBe('COMPLIANT')
    expect(report.complianceScore).toBe(100)
    expect(report.recommendations.some(r => r.includes('No violations'))).toBe(true)
  })

  test('realistic violating orchestrator session', () => {
    const messages: SessionMessage[] = [
      createMessage('user', 'Fix the typo in config.go'),
      createMessage('assistant', "It's just a typo, let me check the file"),
      createMessage('assistant', '[tool: mcp_read]'), // Violation: should delegate
      createMessage('assistant', 'Found it, fixing now'),
      createMessage('assistant', '[tool: mcp_edit]'), // Violation: blocked
    ]
    
    const report = analyseSession('realistic-bad', 'hephaestus', messages)
    
    expect(report.overallStatus).toBe('VIOLATION')
    expect(report.violationCount).toBe(2)
    expect(report.antiPatterns.length).toBeGreaterThan(0)
    expect(report.recommendations.some(r => r.includes('Framework-blocked'))).toBe(true)
    expect(report.recommendations.some(r => r.includes('explore'))).toBe(true)
  })
})
