# Orchestrator Compliance Verification
# BDD Feature Specification for the 100% Delegation Rule

Feature: Orchestrator Tool Compliance
  As a system administrator
  I want to verify that orchestrators follow the 100% delegation rule
  So that architectural boundaries are maintained

  Background:
    Given the following agents are orchestrators:
      | Agent       | Tier       |
      | sisyphus    | top-level  |
      | hephaestus  | top-level  |
      | atlas       | top-level  |
      | Tech-Lead   | mid-tier   |

  # === TOOL WHITELIST COMPLIANCE ===

  @whitelist @pass
  Scenario: Orchestrator uses permitted delegation tools
    Given an orchestrator session transcript
    When the orchestrator calls "task()" or "mcp_call_omo_agent"
    Then the call should be marked as "COMPLIANT"
    And the reason should be "delegation tool - permitted"

  @whitelist @pass
  Scenario: Orchestrator uses permitted memory tools
    Given an orchestrator session transcript
    When the orchestrator calls any of:
      | Tool                          |
      | mcp_memory_search_nodes       |
      | mcp_memory_open_nodes         |
      | mcp_memory_create_entities    |
      | mcp_memory_add_observations   |
      | mcp_vault-rag_query_vault     |
    Then the call should be marked as "COMPLIANT"
    And the reason should be "knowledge tool - permitted"

  @whitelist @pass
  Scenario: Orchestrator uses permitted system tools
    Given an orchestrator session transcript
    When the orchestrator calls any of:
      | Tool                    |
      | mcp_provider-health     |
      | mcp_skill               |
      | mcp_todowrite           |
      | mcp_background_output   |
      | mcp_background_cancel   |
    Then the call should be marked as "COMPLIANT"
    And the reason should be "system tool - permitted"

  @whitelist @pass
  Scenario: Orchestrator uses permitted verification commands
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_bash" with command:
      | Command               |
      | make build            |
      | make test             |
      | make lint             |
      | make check-compliance |
      | git status            |
    Then the call should be marked as "COMPLIANT"
    And the reason should be "binary verification - permitted"

  # === TOOL BLACKLIST VIOLATIONS ===

  @blacklist @violation @framework-blocked
  Scenario: Orchestrator attempts to use edit tool
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_edit"
    Then the call should be marked as "VIOLATION"
    And the violation type should be "framework-blocked"
    And the suggested action should be "delegate to worker agent"

  @blacklist @violation @framework-blocked
  Scenario: Orchestrator attempts to use write tool
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_write"
    Then the call should be marked as "VIOLATION"
    And the violation type should be "framework-blocked"
    And the suggested action should be "delegate to worker agent"

  @blacklist @violation @investigation
  Scenario: Orchestrator attempts to read files directly
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_read"
    Then the call should be marked as "VIOLATION"
    And the violation type should be "investigation-overreach"
    And the suggested action should be "delegate to explore agent"

  @blacklist @violation @investigation
  Scenario: Orchestrator attempts to search files directly
    Given an orchestrator session transcript
    When the orchestrator calls any of:
      | Tool            |
      | mcp_glob        |
      | mcp_grep        |
      | mcp_ast_grep_search |
    Then the call should be marked as "VIOLATION"
    And the violation type should be "investigation-overreach"
    And the suggested action should be "delegate to explore agent"

  @blacklist @violation @investigation
  Scenario: Orchestrator uses bash for investigation
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_bash" with command containing:
      | Pattern           |
      | cat               |
      | head              |
      | tail              |
      | less              |
      | more              |
      | grep              |
      | rg                |
      | find              |
      | fd                |
      | ls -la            |
      | git log           |
      | git show          |
      | git diff          |
      | git blame         |
      | tree              |
    Then the call should be marked as "VIOLATION"
    And the violation type should be "bash-investigation"
    And the suggested action should be "delegate to explore agent"

  @blacklist @violation @modification
  Scenario: Orchestrator uses bash for modification
    Given an orchestrator session transcript
    When the orchestrator calls "mcp_bash" with command containing:
      | Pattern           |
      | echo >            |
      | printf >          |
      | sed               |
      | awk               |
      | mv                |
      | cp                |
      | rm                |
    Then the call should be marked as "VIOLATION"
    And the violation type should be "bash-modification"
    And the suggested action should be "delegate to worker agent"

  # === DELEGATION PATTERN VIOLATIONS ===

  @delegation @violation
  Scenario: Orchestrator modifies files without prior delegation
    Given an orchestrator session transcript
    When a file is modified
    And no "task()" call preceded the modification
    Then the call should be marked as "VIOLATION"
    And the violation type should be "delegation-bypass"
    And the suggested action should be "delegate implementation to worker"

  @delegation @violation
  Scenario: Orchestrator passes non-empty load_skills array
    Given an orchestrator session transcript
    When the orchestrator calls "task()" with "load_skills" containing skills
    Then the call should be marked as "WARNING"
    And the violation type should be "static-skill-injection"
    And the suggested action should be "use load_skills=[] and let subagent discover skills"

  # === ANTI-PATTERN DETECTION ===

  @anti-pattern @quick-fix-trap
  Scenario: Orchestrator exhibits "quick fix" anti-pattern
    Given an orchestrator session transcript
    When the orchestrator message contains phrases like:
      | Phrase                        |
      | "just a typo"                 |
      | "only one line"               |
      | "quick fix"                   |
      | "simple change"               |
      | "too simple to delegate"      |
    And the orchestrator subsequently uses a blacklisted tool
    Then the pattern should be flagged as "ANTI-PATTERN: Quick Fix Trap"
    And the report should include the justification phrase

  @anti-pattern @investigation-overreach
  Scenario: Orchestrator exhibits "investigation overreach" anti-pattern
    Given an orchestrator session transcript
    When the orchestrator message contains phrases like:
      | Phrase                        |
      | "let me check"                |
      | "let me look at"              |
      | "I need to understand"        |
      | "let me see what"             |
    And the orchestrator subsequently uses mcp_read, mcp_glob, or mcp_grep
    Then the pattern should be flagged as "ANTI-PATTERN: Investigation Overreach"
    And the suggested action should be "delegate to explore agent"

  # === COMPLIANCE REPORTING ===

  @reporting
  Scenario: Generate compliance report for clean session
    Given an orchestrator session with only permitted tool usage
    When the compliance report is generated
    Then the overall status should be "COMPLIANT"
    And the violation count should be 0
    And the warning count should be 0

  @reporting
  Scenario: Generate compliance report for session with violations
    Given an orchestrator session with mixed tool usage
    When the compliance report is generated
    Then the report should include:
      | Section                       |
      | Summary (pass/fail counts)    |
      | Violation details             |
      | Suggested corrections         |
      | Timeline of events            |

  @reporting
  Scenario: Compliance score calculation
    Given an orchestrator session transcript
    When the compliance report is generated
    Then the compliance score should be calculated as:
      """
      score = (compliant_calls / total_calls) * 100
      """
    And sessions with score < 100 should be flagged for review
