#!/usr/bin/env python3
"""
Surgically add rule 8 to sisyphus, hephaestus, and atlas orchestrator prompt_appends.
Inserts the rule after rule 7 in the RULES section.
"""

import json
import re
import sys
from pathlib import Path


def strip_jsonc_comments(content: str) -> str:
    """Remove JSONC comments while preserving string content."""
    lines = []
    for line in content.split("\n"):
        # Remove line comments (// ...) but not in strings
        if "//" in line:
            # Simple approach: find // outside of quotes
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


def add_rule_8(prompt_append: str) -> str:
    """
    Add rule 8 after rule 7 in the RULES section.
    Rule 7 ends with "7. Search memory → vault → codebase (in that order) before any investigation"
    Insert rule 8 before "Before tools: produce Preflight."
    """
    # Find the position of rule 7
    rule_7_pattern = r"7\. Search memory → vault → codebase \(in that order\) before any investigation"

    if not re.search(rule_7_pattern, prompt_append):
        print("ERROR: Could not find rule 7 in prompt_append")
        return prompt_append

    # Find the position after rule 7 (end of that line)
    match = re.search(rule_7_pattern, prompt_append)
    if not match:
        return prompt_append

    insert_pos = match.end()

    # The new rule 8
    rule_8 = "\n8. EVERY task() call MUST specify an explicit subagent_type — NEVER leave it undefined or empty"

    # Insert the rule
    new_prompt = prompt_append[:insert_pos] + rule_8 + prompt_append[insert_pos:]

    return new_prompt


def main():
    config_path = Path.home() / ".config" / "opencode" / "oh-my-opencode.jsonc"

    if not config_path.exists():
        print(f"ERROR: Config file not found at {config_path}")
        sys.exit(1)

    # Read the file
    with open(config_path, "r") as f:
        content = f.read()

    # Strip comments for JSON parsing
    json_content = strip_jsonc_comments(content)

    # Parse JSON
    try:
        config = json.loads(json_content)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON: {e}")
        sys.exit(1)

    # Update the three orchestrators
    orchestrators = ["sisyphus", "hephaestus", "atlas"]
    updated_count = 0

    for agent_name in orchestrators:
        if agent_name not in config.get("agents", {}):
            print(f"WARNING: Agent '{agent_name}' not found in config")
            continue

        agent = config["agents"][agent_name]
        if "prompt_append" not in agent:
            print(f"WARNING: No prompt_append found for '{agent_name}'")
            continue

        old_prompt = agent["prompt_append"]
        new_prompt = add_rule_8(old_prompt)

        if old_prompt == new_prompt:
            print(f"WARNING: No changes made to '{agent_name}' (rule 7 not found?)")
            continue

        agent["prompt_append"] = new_prompt
        updated_count += 1
        print(f"✓ Updated '{agent_name}'")

    if updated_count == 0:
        print("ERROR: No agents were updated")
        sys.exit(1)

    # Now we need to write back the JSONC file with comments preserved
    # Strategy: use regex to find and replace the prompt_append values in the original content

    for agent_name in orchestrators:
        if agent_name not in config.get("agents", {}):
            continue

        new_prompt = config["agents"][agent_name]["prompt_append"]

        # Find the prompt_append value in the original content
        # Pattern: "agent_name": { ... "prompt_append": "..."
        pattern = (
            rf'("{agent_name}":\s*\{{[^}}]*?"prompt_append":\s*)"([^"]*(?:\\.[^"]*)*)"'
        )

        # We need to escape the new prompt for use in regex replacement
        # But this is complex with the newlines. Instead, let's do a simpler approach:
        # Find the exact string in the original and replace it

        # Extract the old prompt from the original file
        agent_pattern = (
            rf'"{agent_name}":\s*\{{[^}}]*?"prompt_append":\s*"((?:[^"\\]|\\.)*)"'
        )
        match = re.search(agent_pattern, content, re.DOTALL)

        if match:
            old_prompt_in_file = match.group(1)
            # Unescape the prompt from the file
            old_prompt_unescaped = (
                old_prompt_in_file.replace('\\"', '"')
                .replace("\\n", "\n")
                .replace("\\\\", "\\")
            )

            # Find where this prompt appears in the content
            # We'll search for a unique substring to locate it
            search_str = f'"{agent_name}": {{'
            agent_start = content.find(search_str)
            if agent_start == -1:
                print(f"ERROR: Could not find agent block for '{agent_name}'")
                continue

            # Find the prompt_append line after this point
            prompt_start = content.find('"prompt_append": "', agent_start)
            if prompt_start == -1:
                print(f"ERROR: Could not find prompt_append for '{agent_name}'")
                continue

            # Find the closing quote of the prompt_append value
            # We need to handle escaped quotes
            quote_start = prompt_start + len('"prompt_append": "')
            quote_end = quote_start
            while quote_end < len(content):
                if content[quote_end] == '"' and content[quote_end - 1] != "\\":
                    break
                quote_end += 1

            if quote_end >= len(content):
                print(
                    f"ERROR: Could not find closing quote for prompt_append in '{agent_name}'"
                )
                continue

            # Extract the old prompt (with escaping)
            old_prompt_escaped = content[quote_start:quote_end]

            # Escape the new prompt for JSON
            new_prompt_escaped = (
                new_prompt.replace("\\", "\\\\")
                .replace('"', '\\"')
                .replace("\n", "\\n")
            )

            # Replace in content
            content = content[:quote_start] + new_prompt_escaped + content[quote_end:]
            print(f"✓ Replaced prompt_append in file for '{agent_name}'")

    # Write back the file
    with open(config_path, "w") as f:
        f.write(content)

    print(f"\n✓ Successfully updated {updated_count} orchestrators")

    # Validate the result
    with open(config_path, "r") as f:
        updated_content = f.read()

    json_content = strip_jsonc_comments(updated_content)
    try:
        json.loads(json_content)
        print("✓ JSON validation passed")
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON validation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
