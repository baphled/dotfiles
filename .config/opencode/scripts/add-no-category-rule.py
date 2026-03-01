#!/usr/bin/env python3
"""
Add rule 8 (subagent_type mandate) and rule 9 (ban category parameter)
to sisyphus, hephaestus, and atlas orchestrator prompt_appends.

Rule 8 was intended by update-rule8-valid-agents.py but not present in file.
Rule 9 is the new no-category rule.

Uses str.replace() for surgical edits — safe for long single-line JSON values.
"""

import json
import sys
from pathlib import Path


def strip_jsonc_comments(content: str) -> str:
    """Remove JSONC comments while preserving string content."""
    lines = []
    for line in content.split("\n"):
        if "//" in line:
            in_string = False
            escape_next = False
            result = []
            for i, char in enumerate(line):
                if escape_next:
                    result.append(char)
                    escape_next = False
                    continue
                if char == "\\":
                    escape_next = True
                    result.append(char)
                    continue
                if char == '"' and not escape_next:
                    in_string = not in_string
                    result.append(char)
                    continue
                if (
                    char == "/"
                    and i + 1 < len(line)
                    and line[i + 1] == "/"
                    and not in_string
                ):
                    break
                result.append(char)
            line = "".join(result)
        lines.append(line)
    return "\n".join(lines)


def main():
    config_path = Path.home() / ".config" / "opencode" / "oh-my-opencode.jsonc"

    if not config_path.exists():
        print(f"ERROR: Config file not found at {config_path}")
        sys.exit(1)

    with open(config_path, "r") as f:
        content = f.read()

    # The anchor text — rule 7, which is the last rule in the orchestrator blocks.
    # In the JSON file, this appears as a literal escaped string (with \\n for newlines).
    anchor = "7. Search memory \\u2192 vault \\u2192 codebase (in that order) before any investigation"

    # Check if the file uses unicode escapes or literal UTF-8 arrows
    if anchor not in content:
        # Try with literal UTF-8 arrows
        anchor = "7. Search memory → vault → codebase (in that order) before any investigation"

    count = content.count(anchor)
    print(f"Found {count} occurrences of rule 7 anchor")

    if count < 3:
        print(
            f"ERROR: Expected at least 3 occurrences (sisyphus, hephaestus, atlas), found {count}"
        )
        sys.exit(1)

    # Check rule 8 doesn't already exist
    rule_8_check = "8. EVERY task() call MUST specify a subagent_type"
    existing_rule_8 = content.count(rule_8_check)
    print(f"Existing rule 8 occurrences: {existing_rule_8}")

    # Check rule 9 doesn't already exist
    rule_9_check = "NEVER use category parameter"
    existing_rule_9 = content.count(rule_9_check)
    print(f"Existing rule 9 occurrences: {existing_rule_9}")

    if existing_rule_9 >= 3:
        print("Rule 9 already present in all 3 orchestrators. Nothing to do.")
        sys.exit(0)

    # Build the new rules text to insert after rule 7
    rule_8 = "8. EVERY task() call MUST specify a subagent_type from: Tech-Lead, Senior-Engineer, QA-Engineer, Writer, Editor, DevOps, Security-Engineer, Data-Analyst, Knowledge Base Curator, VHS-Director, Embedded-Engineer, Nix-Expert, Linux-Expert, SysOp, Model-Evaluator, Researcher. NEVER use undefined/empty. Sisyphus-Junior is RETIRED \\u2014 use Senior-Engineer or Tech-Lead instead"
    rule_9 = "9. NEVER use category parameter in task() calls \\u2014 it forces Sisyphus-Junior agent. ALWAYS use subagent_type with a named agent (Senior-Engineer, Tech-Lead, QA-Engineer, Writer, etc.). Model selection comes from agent config, not categories."

    # Check if file uses literal UTF-8 or unicode escapes for em-dash
    if "→" in content and "\\u2192" not in content:
        # File uses literal UTF-8
        rule_8 = rule_8.replace("\\u2014", "—")
        rule_9 = rule_9.replace("\\u2014", "—")

    # Determine what to insert based on current state
    if existing_rule_8 >= 3:
        # Rule 8 exists, only add rule 9
        # Find the end of rule 8 text to anchor rule 9
        print("Rule 8 already present. Adding rule 9 only.")
        # The anchor becomes rule 8's ending
        # We need to find the rule 8 text in file and append rule 9 after it
        # Since rule 8 is a long text, find a unique suffix
        r8_suffix = "Sisyphus-Junior is RETIRED"
        if "Sisyphus-Junior is RETIRED" not in content:
            r8_suffix = "NEVER use undefined/empty"

        # This case is complex — fall through to the simpler approach below
        # For now, use the rule 7 anchor and insert both (rule 8 already there won't duplicate)
        print("WARNING: Complex case. Aborting for safety.")
        sys.exit(1)
    else:
        # Neither rule 8 nor rule 9 exists. Insert both after rule 7.
        # The anchor is the full rule 7 text. We replace it with rule 7 + rule 8 + rule 9.
        new_text = anchor + "\\n" + rule_8 + "\\n" + rule_9
        new_content = content.replace(anchor, new_text)

    # Verify replacements
    new_rule_9_count = new_content.count("NEVER use category parameter")
    print(f"After replacement: rule 9 appears {new_rule_9_count} times")

    if new_rule_9_count != count:
        print(f"ERROR: Expected {count} occurrences, got {new_rule_9_count}")
        sys.exit(1)

    # Only update the 3 orchestrator blocks — verify rule 7 anchor count matches
    # (Tech-Lead also has rule 7, so count might be 4 — but we want all of them that have it)
    # Actually the task says only sisyphus, hephaestus, atlas. Let's verify.
    # Since we're replacing ALL occurrences of the anchor, and Tech-Lead has the same
    # prompt_append, it will also get the rules. The task says "Do NOT modify any agents
    # other than sisyphus, hephaestus, atlas". If Tech-Lead has the same text, we need
    # to be selective.

    # Check if Tech-Lead prompt uses the same rules text
    # We need to only replace in the 3 orchestrator blocks

    # Let's take a different approach: only replace if it's in one of the 3 target agents
    # We can do this by finding each agent's prompt_append and only modifying those

    # Reset and do targeted replacement
    new_content = content
    replaced = 0
    for agent_name in ["sisyphus", "hephaestus", "atlas"]:
        # Find the agent block start
        search_key = f'"{agent_name}": {{'
        if agent_name == "sisyphus":
            # Avoid matching sisyphus-junior
            search_key = '"sisyphus": {'
            # Find exact match
            idx = new_content.find(search_key)
            # Verify it's not sisyphus-junior by checking what's before
            while idx >= 0:
                # Check if this is "sisyphus" and not "sisyphus-junior"
                before = new_content[max(0, idx - 5) : idx]
                if "-" not in before:
                    break
                idx = new_content.find(search_key, idx + 1)
        else:
            idx = new_content.find(search_key)

        if idx == -1:
            print(f"ERROR: Could not find agent block for '{agent_name}'")
            sys.exit(1)

        # Find the next agent block or end of agents section
        # Look for the next occurrence of the anchor within a reasonable range
        anchor_idx = new_content.find(anchor, idx)
        if anchor_idx == -1:
            print(f"ERROR: Could not find rule 7 in '{agent_name}' block")
            sys.exit(1)

        # Check this anchor is within the agent's prompt_append (within ~2000 chars)
        if anchor_idx - idx > 5000:
            print(f"WARNING: Rule 7 found too far from '{agent_name}' start, skipping")
            continue

        # Replace just this occurrence
        replacement = anchor + "\\n" + rule_8 + "\\n" + rule_9
        new_content = (
            new_content[:anchor_idx]
            + replacement
            + new_content[anchor_idx + len(anchor) :]
        )
        replaced += 1
        print(f"✓ Updated '{agent_name}'")

    if replaced != 3:
        print(f"ERROR: Expected to update 3 agents, updated {replaced}")
        sys.exit(1)

    # Final verification
    final_rule_9_count = new_content.count("NEVER use category parameter")
    print(
        f"\nFinal verification: 'NEVER use category parameter' appears {final_rule_9_count} times"
    )

    if final_rule_9_count != 3:
        print(f"ERROR: Expected exactly 3 occurrences, found {final_rule_9_count}")
        sys.exit(1)

    # Write back
    with open(config_path, "w") as f:
        f.write(new_content)

    print(f"✓ Written to {config_path}")

    # Validate JSON
    with open(config_path, "r") as f:
        validate_content = f.read()

    json_content = strip_jsonc_comments(validate_content)
    try:
        json.loads(json_content)
        print("✓ JSON validation passed")
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON validation failed: {e}")
        sys.exit(1)

    print(
        f"\n✓ Successfully added rules 8 and 9 to 3 orchestrators (sisyphus, hephaestus, atlas)"
    )


if __name__ == "__main__":
    main()
