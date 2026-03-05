#!/usr/bin/env python3
"""
Rewrite agent prompt_append strings in oh-my-opencode.jsonc.

Replaces bloated 30KB+ prompts with slim, role-specific CRITICAL blocks (~800-1200 chars).
Preserves all other fields (permissions, tools, mode, description, etc.).

Usage:
    python3 rewrite-prompt-append.py [--dry-run] [--backup]
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

# Configuration
CONFIG_PATH = Path.home() / ".config" / "opencode" / "oh-my-opencode.jsonc"
BACKUP_SUFFIX = ".bak"

# Template definitions - role-specific CRITICAL blocks

ORCHESTRATOR_TEMPLATE = """<CRITICAL>
YOU ARE AN ORCHESTRATOR. You coordinate — you do NOT implement.

BEFORE YOUR FIRST TOOL CALL, output a PREFLIGHT:
  Goal: [what you're trying to achieve]
  Constraints: [scope limits, what NOT to touch]
  Plan: [≤5 numbered steps]
  Parallel: [which steps are independent and can run simultaneously]
  Stop: [when to stop and report back]

RULES (violations = failure):
1. NEVER use Edit/Write tools — delegate ALL implementation to task()
2. NEVER read files for investigation — delegate to explore/librarian
3. Batch ALL independent task() calls in a single message
4. Delegate to specialists: Senior-Engineer, QA-Engineer, Writer, DevOps, etc.
5. Verify results with binary checks only (build, test, lsp_diagnostics)
6. Enforce step discipline on sub-agents — they MUST NOT skip prescribed steps
7. Search memory → vault → codebase (in that order) before any investigation

Before tools: produce Preflight.
</CRITICAL>

COMMIT: Use git_master for planning, make ai-commit FILE=tmp/commit.txt for execution. Never raw git commit -m.
KNOWLEDGE: mcp_memory_search_nodes → mcp_vault-rag_query_vault → codebase. Never skip.
KB CURATOR: Fire task(subagent_type="Knowledge Base Curator", run_in_background=true) after significant work."""

WORKER_TEMPLATE = """<CRITICAL>
BEFORE YOUR FIRST TOOL CALL, output a PREFLIGHT:
  Assumptions: [what you believe is true about the task]
  Plan: [≤5 numbered steps]
  Parallel: [which file reads/searches can run simultaneously]
  Risks: [what could go wrong]

RULES (violations = failure):
1. Execute EVERY step prescribed by skills and task prompt — no skipping, no shortcuts
2. Batch ALL independent tool calls (reads, searches, diagnostics) in a single message
3. Test-first: write failing test → implement → verify green → refactor
4. Verify each change with lsp_diagnostics before moving on
5. No type suppression (as any, @ts-ignore, @ts-expect-error)
6. Search memory/vault BEFORE investigating codebase
7. If a step seems unnecessary: complete it anyway, then report to orchestrator

Before tools: produce Preflight.
</CRITICAL>

COMMIT: Use git_master for planning, make ai-commit FILE=tmp/commit.txt for execution. Never raw git commit -m.
KNOWLEDGE: mcp_memory_search_nodes → mcp_vault-rag_query_vault → codebase. Never skip."""

WRITER_TEMPLATE = """<CRITICAL>
BEFORE YOUR FIRST TOOL CALL, output a PREFLIGHT:
  Assumptions: [what you believe about the writing task]
  Plan: [≤5 numbered steps]
  Parallel: [which reads/research can run simultaneously]
  Style: [audience, tone, format constraints]

RULES (violations = failure):
1. Execute EVERY step prescribed by skills and task prompt — no skipping
2. Batch ALL independent reads/searches in a single message
3. British English throughout all written content
4. Search memory/vault BEFORE investigating codebase
5. Cite sources with file paths when referencing code or docs
6. If a step seems unnecessary: complete it anyway, then report

Before tools: produce Preflight.
</CRITICAL>

KNOWLEDGE: mcp_memory_search_nodes → mcp_vault-rag_query_vault → codebase. Never skip."""

READ_ONLY_TEMPLATE = """<CRITICAL>
BEFORE YOUR FIRST TOOL CALL, output a PREFLIGHT:
  Assumptions: [what you believe about the situation]
  Plan: [≤3 numbered steps]
  Parallel: [which searches/reads can run simultaneously]

RULES (violations = failure):
1. Read-only: you advise, you do NOT modify files
2. Batch ALL independent reads/searches in a single message
3. Search memory/vault BEFORE investigating codebase
4. Evidence over assumption — cite file paths and line numbers
5. Execute EVERY step prescribed — no skipping

Before tools: produce Preflight.
</CRITICAL>

KNOWLEDGE: mcp_memory_search_nodes → mcp_vault-rag_query_vault → codebase. Never skip."""

LOOKUP_TEMPLATE = """<CRITICAL>
BEFORE YOUR FIRST TOOL CALL, output a PREFLIGHT:
  Question: [what you need to find out]
  Sources: [which tools/searches to use]
  Parallel: [which searches can run simultaneously]

RULES:
1. Batch ALL independent searches in a single message
2. Search memory/vault BEFORE investigating codebase
3. Evidence over assumption — cite file paths and line numbers
4. Return structured, actionable findings

Before tools: produce Preflight.
</CRITICAL>

KNOWLEDGE: mcp_memory_search_nodes → mcp_vault-rag_query_vault → codebase. Never skip."""

# Agent to template mapping
AGENT_TEMPLATES: dict[str, str] = {
    # ORCHESTRATORS (edit: deny, delegate work)
    "sisyphus": ORCHESTRATOR_TEMPLATE,
    "hephaestus": ORCHESTRATOR_TEMPLATE,
    "atlas": ORCHESTRATOR_TEMPLATE,
    "Tech-Lead": ORCHESTRATOR_TEMPLATE,
    # WORKERS (edit: allow, implement directly)
    "sisyphus-junior": WORKER_TEMPLATE,
    "Senior-Engineer": WORKER_TEMPLATE,
    "QA-Engineer": WORKER_TEMPLATE,
    "Code-Reviewer": WORKER_TEMPLATE,
    "Embedded-Engineer": WORKER_TEMPLATE,
    "DevOps": WORKER_TEMPLATE,
    "VHS-Director": WORKER_TEMPLATE,
    "Model-Evaluator": WORKER_TEMPLATE,
    # WRITERS (content creators)
    "Writer": WRITER_TEMPLATE,
    "Editor": WRITER_TEMPLATE,
    "Knowledge Base Curator": WRITER_TEMPLATE,
    # READ-ONLY (advisors with edit: deny)
    "Security-Engineer": READ_ONLY_TEMPLATE,
    "Data-Analyst": READ_ONLY_TEMPLATE,
    "Nix-Expert": READ_ONLY_TEMPLATE,
    "Linux-Expert": READ_ONLY_TEMPLATE,
    "SysOp": READ_ONLY_TEMPLATE,
    # LOOKUP (pure research/consultation)
    "oracle": WORKER_TEMPLATE,
    "librarian": LOOKUP_TEMPLATE,
    "explore": LOOKUP_TEMPLATE,
    "metis": LOOKUP_TEMPLATE,
    "momus": LOOKUP_TEMPLATE,
    "multimodal-looker": LOOKUP_TEMPLATE,
}


def read_jsonc(path: Path) -> dict[str, Any]:
    """Read a JSONC file, stripping comments if needed."""
    content = path.read_text(encoding="utf-8")
    
    # First try parsing as-is (most JSONC files are actually valid JSON)
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    # If that fails, try stripping comments (more careful approach needed)
    # For now, this is a simple fallback
    clean_content = strip_jsonc_comments(content)
    return json.loads(clean_content)


def write_jsonc(path: Path, data: dict[str, Any]) -> None:
    """Write data to a JSONC file with pretty formatting."""
    content = json.dumps(data, indent=2, ensure_ascii=False)
    path.write_text(content, encoding="utf-8")


def rewrite_prompt_append(
    data: dict[str, Any], dry_run: bool = False
) -> dict[str, list[str]]:
    """
    Rewrite prompt_append fields for all agents.

    Returns a dict with 'updated' and 'skipped' agent lists.
    """
    result: dict[str, list[str]] = {
        "updated": [],
        "skipped": [],
        "missing_template": [],
    }

    agents = data.get("agents", {})

    for agent_name, agent_config in agents.items():
        if not isinstance(agent_config, dict):
            result["skipped"].append(f"{agent_name} (not a dict)")
            continue

        if "prompt_append" not in agent_config:
            result["skipped"].append(f"{agent_name} (no prompt_append)")
            continue

        if agent_name not in AGENT_TEMPLATES:
            result["missing_template"].append(agent_name)
            continue

        old_len = len(agent_config["prompt_append"])
        new_template = AGENT_TEMPLATES[agent_name]
        new_len = len(new_template)

        if not dry_run:
            agent_config["prompt_append"] = new_template

        result["updated"].append(f"{agent_name} ({old_len} → {new_len} chars)")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rewrite agent prompt_append strings with slim CRITICAL blocks"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without modifying the file",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Create a backup of the original file before modifying",
    )
    args = parser.parse_args()

    if not CONFIG_PATH.exists():
        print(f"Error: Config file not found: {CONFIG_PATH}", file=sys.stderr)
        return 1

    print(f"Reading: {CONFIG_PATH}")

    try:
        data = read_jsonc(CONFIG_PATH)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in config file: {e}", file=sys.stderr)
        return 1

    print(f"Found {len(data.get('agents', {}))} agents")
    print()

    # Show template sizes
    print("Template sizes:")
    print(f"  ORCHESTRATOR: {len(ORCHESTRATOR_TEMPLATE)} chars")
    print(f"  WORKER:       {len(WORKER_TEMPLATE)} chars")
    print(f"  WRITER:       {len(WRITER_TEMPLATE)} chars")
    print(f"  READ_ONLY:    {len(READ_ONLY_TEMPLATE)} chars")
    print(f"  LOOKUP:       {len(LOOKUP_TEMPLATE)} chars")
    print()

    result = rewrite_prompt_append(data, dry_run=args.dry_run)

    print("Updated agents:")
    for agent in result["updated"]:
        print(f"  ✓ {agent}")

    if result["skipped"]:
        print("\nSkipped agents:")
        for agent in result["skipped"]:
            print(f"  - {agent}")

    if result["missing_template"]:
        print("\nAgents without template mapping (using existing prompt_append):")
        for agent in result["missing_template"]:
            print(f"  ⚠ {agent}")

    if args.dry_run:
        print("\n[DRY RUN] No changes made.")
        return 0

    if args.backup:
        backup_path = CONFIG_PATH.with_suffix(CONFIG_PATH.suffix + BACKUP_SUFFIX)
        print(f"\nCreating backup: {backup_path}")
        shutil.copy2(CONFIG_PATH, backup_path)

    print(f"\nWriting: {CONFIG_PATH}")
    write_jsonc(CONFIG_PATH, data)

    # Validate the written file
    print("Validating written file...")
    try:
        read_jsonc(CONFIG_PATH)
        print("✓ File is valid JSONC")
    except json.JSONDecodeError as e:
        print(f"✗ Error: Written file is invalid JSON: {e}", file=sys.stderr)
        return 1

    print("\nDone!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
