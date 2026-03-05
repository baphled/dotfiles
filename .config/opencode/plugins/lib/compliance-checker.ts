/**
 * Orchestrator Compliance Checker
 * 
 * Analyses session transcripts to verify orchestrators follow the 100% delegation rule.
 * Detects tool usage violations, anti-patterns, and generates compliance reports.
 */

// === TYPE DEFINITIONS ===

export type OrchestratorAgent = 'sisyphus' | 'hephaestus' | 'atlas' | 'Tech-Lead';

export type ViolationType = 
  | 'framework-blocked'      // Edit/Write tools (blocked by permission gates)
  | 'investigation-overreach' // Read/Glob/Grep without delegation
  | 'bash-investigation'     // Bash commands for reading/searching
  | 'bash-modification'      // Bash commands for modifying files
  | 'delegation-bypass'      // File modifications without prior task()
  | 'static-skill-injection' // Non-empty load_skills in task()
  | 'lsp-overreach';         // LSP tools except diagnostics

export type ComplianceStatus = 'COMPLIANT' | 'VIOLATION' | 'WARNING';

export interface ToolCall {
  tool: string;
  arguments?: Record<string, unknown>;
  timestamp: string;
  messageIndex: number;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  tool: string;
  violationType?: ViolationType;
  reason: string;
  suggestedAction?: string;
  context?: string;
}

export interface AntiPattern {
  name: string;
  triggerPhrase: string;
  violatingTool: string;
  messageIndex: number;
}

export interface ComplianceReport {
  sessionId: string;
  agent: string;
  timestamp: string;
  overallStatus: ComplianceStatus;
  complianceScore: number;
  totalCalls: number;
  compliantCalls: number;
  violationCount: number;
  warningCount: number;
  results: ComplianceResult[];
  antiPatterns: AntiPattern[];
  recommendations: string[];
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

// === TOOL CLASSIFICATION ===

const ORCHESTRATOR_AGENTS: OrchestratorAgent[] = ['sisyphus', 'hephaestus', 'atlas', 'Tech-Lead'];

const WHITELISTED_TOOLS = {
  delegation: ['task', 'mcp_call_omo_agent'],
  memory: [
    'mcp_memory_search_nodes',
    'mcp_memory_open_nodes',
    'mcp_memory_create_entities',
    'mcp_memory_add_observations',
    'mcp_memory_create_relations',
    'mcp_memory_delete_entities',
    'mcp_memory_delete_observations',
    'mcp_memory_delete_relations',
    'mcp_memory_read_graph',
    'mcp_vault-rag_query_vault',
    'mcp_vault-rag_sync_vault',
    'mcp_vault-rag_list_vaults',
  ],
  system: [
    'mcp_provider-health',
    'mcp_skill',
    'mcp_todowrite',
    'mcp_background_output',
    'mcp_background_cancel',
    'mcp_session_list',
    'mcp_session_read',
    'mcp_session_search',
    'mcp_session_info',
  ],
  verification: ['mcp_bash', 'mcp_lsp_diagnostics'],
};

const BLACKLISTED_TOOLS = {
  frameworkBlocked: ['mcp_edit', 'mcp_write'],
  investigation: [
    'mcp_read',
    'mcp_glob',
    'mcp_grep',
    'mcp_ast_grep_search',
    'mcp_ast_grep_replace',
    'mcp_webfetch',
    'mcp_look_at',
  ],
  lspOverreach: [
    'mcp_lsp_goto_definition',
    'mcp_lsp_find_references',
    'mcp_lsp_symbols',
    'mcp_lsp_prepare_rename',
    'mcp_lsp_rename',
  ],
};

const BASH_INVESTIGATION_PATTERNS = [
  /\bcat\s+/,
  /\bhead\s+/,
  /\btail\s+/,
  /\bless\s+/,
  /\bmore\s+/,
  /\bbat\s+/,
  /\bgrep\s+/,
  /\brg\s+/,
  /\bag\s+/,
  /\back\s+/,
  /\bfind\s+/,
  /\bfd\s+/,
  /\blocate\s+/,
  /\bls\s+-la/,
  /\bls\s+-l/,
  /\bgit\s+log\b/,
  /\bgit\s+show\b/,
  /\bgit\s+diff\b/,
  /\bgit\s+blame\b/,
  /\btree\b/,
];

const BASH_MODIFICATION_PATTERNS = [
  /\becho\s+.*>/,
  /\bprintf\s+.*>/,
  /\bsed\s+/,
  /\bawk\s+/,
  /\bmv\s+/,
  /\bcp\s+/,
  /\brm\s+/,
];

const PERMITTED_BASH_COMMANDS = [
  /^make\s+(build|test|lint|check-compliance)$/,
  /^git\s+status$/,
  /^lsp_diagnostics/,
];

const ANTI_PATTERN_PHRASES = {
  quickFixTrap: [
    'just a typo',
    'only one line',
    'quick fix',
    'simple change',
    'too simple to delegate',
    "it's trivial",
    'small tweak',
  ],
  investigationOverreach: [
    'let me check',
    'let me look at',
    'I need to understand',
    'let me see what',
    'I\'ll read',
    'let me examine',
  ],
};

// === CORE ANALYSIS FUNCTIONS ===

/**
 * Checks if an agent is an orchestrator
 */
export function isOrchestrator(agent: string): boolean {
  const normalised = agent.toLowerCase().replace(/[^a-z-]/g, '');
  return ORCHESTRATOR_AGENTS.some(orch => 
    normalised.includes(orch.toLowerCase())
  );
}

/**
 * Gets all whitelisted tools as a flat array
 */
export function getWhitelistedTools(): string[] {
  return Object.values(WHITELISTED_TOOLS).flat();
}

/**
 * Checks if a tool is whitelisted for orchestrators
 */
export function isToolWhitelisted(tool: string): boolean {
  return getWhitelistedTools().includes(tool);
}

/**
 * Analyses a bash command for compliance
 */
export function analyseBashCommand(command: string): ComplianceResult {
  const trimmedCommand = command.trim();

  // Check permitted commands first
  for (const pattern of PERMITTED_BASH_COMMANDS) {
    if (pattern.test(trimmedCommand)) {
      return {
        status: 'COMPLIANT',
        tool: 'mcp_bash',
        reason: 'binary verification - permitted',
      };
    }
  }

  // Check for investigation patterns
  for (const pattern of BASH_INVESTIGATION_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      return {
        status: 'VIOLATION',
        tool: 'mcp_bash',
        violationType: 'bash-investigation',
        reason: `Bash command "${trimmedCommand.slice(0, 50)}..." is an investigation command`,
        suggestedAction: 'delegate to explore agent',
        context: trimmedCommand,
      };
    }
  }

  // Check for modification patterns
  for (const pattern of BASH_MODIFICATION_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      return {
        status: 'VIOLATION',
        tool: 'mcp_bash',
        violationType: 'bash-modification',
        reason: `Bash command "${trimmedCommand.slice(0, 50)}..." modifies files`,
        suggestedAction: 'delegate to worker agent',
        context: trimmedCommand,
      };
    }
  }

  // Unknown bash command - could be a violation or legitimate
  return {
    status: 'WARNING',
    tool: 'mcp_bash',
    reason: `Bash command "${trimmedCommand.slice(0, 50)}..." requires manual review`,
    suggestedAction: 'verify command is for binary verification only',
    context: trimmedCommand,
  };
}

/**
 * Analyses a single tool call for compliance
 */
export function analyseToolCall(toolCall: ToolCall): ComplianceResult {
  const { tool, arguments: args } = toolCall;

  // Framework-blocked tools
  if (BLACKLISTED_TOOLS.frameworkBlocked.includes(tool)) {
    return {
      status: 'VIOLATION',
      tool,
      violationType: 'framework-blocked',
      reason: `${tool} is blocked by framework permission gates`,
      suggestedAction: 'delegate to worker agent',
    };
  }

  // Investigation tools
  if (BLACKLISTED_TOOLS.investigation.includes(tool)) {
    return {
      status: 'VIOLATION',
      tool,
      violationType: 'investigation-overreach',
      reason: `${tool} is an investigation tool`,
      suggestedAction: 'delegate to explore agent',
    };
  }

  // LSP overreach
  if (BLACKLISTED_TOOLS.lspOverreach.includes(tool)) {
    return {
      status: 'VIOLATION',
      tool,
      violationType: 'lsp-overreach',
      reason: `${tool} is an LSP tool (only diagnostics permitted)`,
      suggestedAction: 'delegate to explore agent',
    };
  }

  // Bash command analysis
  if (tool === 'mcp_bash' && args?.command) {
    return analyseBashCommand(String(args.command));
  }

  // Check for task() with non-empty load_skills
  if (tool === 'task' || tool === 'mcp_call_omo_agent') {
    if (args?.load_skills && Array.isArray(args.load_skills) && args.load_skills.length > 0) {
      return {
        status: 'WARNING',
        tool,
        violationType: 'static-skill-injection',
        reason: 'task() called with non-empty load_skills array',
        suggestedAction: 'use load_skills=[] and let subagent discover skills',
        context: JSON.stringify(args.load_skills),
      };
    }
  }

  // Whitelisted tools
  if (isToolWhitelisted(tool)) {
    const category = Object.entries(WHITELISTED_TOOLS).find(([, tools]) => 
      tools.includes(tool)
    )?.[0] || 'unknown';
    
    return {
      status: 'COMPLIANT',
      tool,
      reason: `${category} tool - permitted`,
    };
  }

  // Unknown tool - warn
  return {
    status: 'WARNING',
    tool,
    reason: `Unknown tool "${tool}" requires manual review`,
  };
}

/**
 * Extracts tool calls from session messages
 */
export function extractToolCalls(messages: SessionMessage[]): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  messages.forEach((msg, index) => {
    // Parse tool calls from message content
    // Format: [tool: toolname] or explicit toolCalls array
    if (msg.toolCalls) {
      msg.toolCalls.forEach(tc => {
        toolCalls.push({ ...tc, messageIndex: index });
      });
    }

    // Also detect tool calls from formatted output
    const toolMatches = msg.content.matchAll(/\[tool:\s*(\w+)\]/g);
    for (const match of toolMatches) {
      toolCalls.push({
        tool: match[1],
        timestamp: msg.timestamp,
        messageIndex: index,
      });
    }
  });

  return toolCalls;
}

/**
 * Detects anti-patterns in message content
 */
export function detectAntiPatterns(
  messages: SessionMessage[],
  results: ComplianceResult[]
): AntiPattern[] {
  const antiPatterns: AntiPattern[] = [];

  messages.forEach((msg, index) => {
    if (msg.role !== 'assistant') return;
    
    const content = msg.content.toLowerCase();

    // Check for quick fix trap phrases followed by violations
    for (const phrase of ANTI_PATTERN_PHRASES.quickFixTrap) {
      if (content.includes(phrase)) {
        // Check if there's a violation in this or subsequent messages
        const subsequentViolation = results.find(r => 
          r.status === 'VIOLATION' && 
          (results.indexOf(r) >= index)
        );
        
        if (subsequentViolation) {
          antiPatterns.push({
            name: 'Quick Fix Trap',
            triggerPhrase: phrase,
            violatingTool: subsequentViolation.tool,
            messageIndex: index,
          });
        }
      }
    }

    // Check for investigation overreach phrases
    for (const phrase of ANTI_PATTERN_PHRASES.investigationOverreach) {
      if (content.includes(phrase)) {
        const subsequentInvestigation = results.find(r =>
          r.violationType === 'investigation-overreach' ||
          r.violationType === 'bash-investigation'
        );

        if (subsequentInvestigation) {
          antiPatterns.push({
            name: 'Investigation Overreach',
            triggerPhrase: phrase,
            violatingTool: subsequentInvestigation.tool,
            messageIndex: index,
          });
        }
      }
    }
  });

  return antiPatterns;
}

/**
 * Generates recommendations based on violations
 */
export function generateRecommendations(results: ComplianceResult[]): string[] {
  const recommendations: string[] = [];
  const violationTypes = new Set(results.filter(r => r.status === 'VIOLATION').map(r => r.violationType));

  if (violationTypes.has('framework-blocked')) {
    recommendations.push(
      'Framework-blocked tools (edit/write) detected. These should be delegated to worker agents like Senior-Engineer or QA-Engineer.'
    );
  }

  if (violationTypes.has('investigation-overreach')) {
    recommendations.push(
      'Investigation tools (read/glob/grep) were used directly. Delegate these to the explore agent: task(subagent_type="explore", prompt="...")'
    );
  }

  if (violationTypes.has('bash-investigation')) {
    recommendations.push(
      'Bash was used for investigation (cat, grep, git log, etc.). These should be delegated to the explore agent.'
    );
  }

  if (violationTypes.has('bash-modification')) {
    recommendations.push(
      'Bash was used for file modification (sed, awk, mv, etc.). These should be delegated to worker agents.'
    );
  }

  if (violationTypes.has('static-skill-injection')) {
    recommendations.push(
      'Static skill injection detected in task() calls. Use load_skills=[] and let subagents discover skills dynamically via skill-discovery.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('No violations detected. Session is fully compliant with the 100% delegation rule.');
  }

  return recommendations;
}

/**
 * Analyses a complete session and generates a compliance report
 */
export function analyseSession(
  sessionId: string,
  agent: string,
  messages: SessionMessage[]
): ComplianceReport {
  const toolCalls = extractToolCalls(messages);
  const results = toolCalls.map(analyseToolCall);
  const antiPatterns = detectAntiPatterns(messages, results);
  const recommendations = generateRecommendations(results);

  const compliantCalls = results.filter(r => r.status === 'COMPLIANT').length;
  const violationCount = results.filter(r => r.status === 'VIOLATION').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const totalCalls = results.length;

  const complianceScore = totalCalls > 0 
    ? Math.round((compliantCalls / totalCalls) * 100) 
    : 100;

  const overallStatus: ComplianceStatus = 
    violationCount > 0 ? 'VIOLATION' :
    warningCount > 0 ? 'WARNING' :
    'COMPLIANT';

  return {
    sessionId,
    agent,
    timestamp: new Date().toISOString(),
    overallStatus,
    complianceScore,
    totalCalls,
    compliantCalls,
    violationCount,
    warningCount,
    results,
    antiPatterns,
    recommendations,
  };
}

/**
 * Formats a compliance report as human-readable text
 */
export function formatReport(report: ComplianceReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('                    ORCHESTRATOR COMPLIANCE REPORT');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Session ID: ${report.sessionId}`);
  lines.push(`Agent: ${report.agent}`);
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');
  lines.push('─────────────────────────────────────────────────────────────────');
  lines.push('                           SUMMARY');
  lines.push('─────────────────────────────────────────────────────────────────');
  lines.push('');
  
  const statusEmoji = report.overallStatus === 'COMPLIANT' ? '✅' :
                      report.overallStatus === 'WARNING' ? '⚠️' : '❌';
  
  lines.push(`Overall Status: ${statusEmoji} ${report.overallStatus}`);
  lines.push(`Compliance Score: ${report.complianceScore}%`);
  lines.push('');
  lines.push(`Total Tool Calls: ${report.totalCalls}`);
  lines.push(`  ✅ Compliant: ${report.compliantCalls}`);
  lines.push(`  ❌ Violations: ${report.violationCount}`);
  lines.push(`  ⚠️  Warnings: ${report.warningCount}`);
  lines.push('');

  if (report.violationCount > 0 || report.warningCount > 0) {
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                        VIOLATION DETAILS');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('');

    report.results
      .filter(r => r.status !== 'COMPLIANT')
      .forEach((result, i) => {
        const emoji = result.status === 'VIOLATION' ? '❌' : '⚠️';
        lines.push(`${i + 1}. ${emoji} [${result.status}] ${result.tool}`);
        lines.push(`   Type: ${result.violationType || 'N/A'}`);
        lines.push(`   Reason: ${result.reason}`);
        if (result.suggestedAction) {
          lines.push(`   Action: ${result.suggestedAction}`);
        }
        if (result.context) {
          lines.push(`   Context: ${result.context.slice(0, 100)}${result.context.length > 100 ? '...' : ''}`);
        }
        lines.push('');
      });
  }

  if (report.antiPatterns.length > 0) {
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                    ANTI-PATTERNS DETECTED');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('');

    report.antiPatterns.forEach((pattern, i) => {
      lines.push(`${i + 1}. 🚨 ${pattern.name}`);
      lines.push(`   Trigger: "${pattern.triggerPhrase}"`);
      lines.push(`   Led to: ${pattern.violatingTool}`);
      lines.push('');
    });
  }

  lines.push('─────────────────────────────────────────────────────────────────');
  lines.push('                       RECOMMENDATIONS');
  lines.push('─────────────────────────────────────────────────────────────────');
  lines.push('');

  report.recommendations.forEach((rec, i) => {
    lines.push(`${i + 1}. ${rec}`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Checks if a session ID belongs to an orchestrator
 * based on agent name in session info
 */
export function isOrchestratorSession(agentName: string): boolean {
  return isOrchestrator(agentName);
}
