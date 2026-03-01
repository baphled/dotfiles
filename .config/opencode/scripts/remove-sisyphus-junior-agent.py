#!/usr/bin/env python3
"""
Remove the "sisyphus-junior" agent entry from oh-my-opencode.jsonc.

Surgically removes the entire agent block (key + value) from the "agents" section
using str.replace() — safe for long single-line JSON values that corrupt with
line-based edit tools.

Does NOT touch any prompt_append content that mentions "Sisyphus-Junior" in other
agents (those are orchestrator rules, not the agent definition).
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


def extract_agent_keys(content: str) -> list[str]:
    """Extract agent key names from the agents section for reporting."""
    keys = []
    json_content = strip_jsonc_comments(content)
    try:
        data = json.loads(json_content)
        if "agents" in data:
            keys = list(data["agents"].keys())
    except json.JSONDecodeError:
        pass
    return keys


def main():
    config_path = Path.home() / ".config" / "opencode" / "oh-my-opencode.jsonc"

    if not config_path.exists():
        print(f"ERROR: Config file not found at {config_path}")
        sys.exit(1)

    with open(config_path, "r") as f:
        content = f.read()

    # Report before state
    before_keys = extract_agent_keys(content)
    print(f"BEFORE — Agent keys ({len(before_keys)}):")
    for k in before_keys:
        print(f"  - {k}")

    if "sisyphus-junior" not in before_keys:
        print("\nsisyphus-junior not found in agents section. Nothing to do.")
        sys.exit(0)

    # Find the exact sisyphus-junior block boundaries in the raw text.
    # We need to find:
    #   "sisyphus-junior": { ... },
    # and remove it completely, including the trailing comma and newline.
    #
    # Strategy: Find the key, then match braces to find the end of the value object,
    # then handle the trailing comma.

    key_marker = '"sisyphus-junior"'
    key_idx = content.find(key_marker)

    if key_idx == -1:
        print("ERROR: Could not find '\"sisyphus-junior\"' key in file")
        sys.exit(1)

    # Walk backwards from key_idx to find the start of the line (leading whitespace)
    block_start = key_idx
    while block_start > 0 and content[block_start - 1] in (" ", "\t"):
        block_start -= 1

    # Walk forwards from key_idx to find the opening brace of the value
    colon_idx = content.find(":", key_idx + len(key_marker))
    brace_idx = content.find("{", colon_idx)

    if brace_idx == -1:
        print("ERROR: Could not find opening brace for sisyphus-junior value")
        sys.exit(1)

    # Match braces to find the closing brace of the entire agent object
    depth = 0
    in_string = False
    escape_next = False
    block_end = brace_idx

    for i in range(brace_idx, len(content)):
        char = content[i]

        if escape_next:
            escape_next = False
            continue
        if char == "\\":
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                block_end = i
                break

    if depth != 0:
        print(f"ERROR: Brace matching failed. Remaining depth: {depth}")
        sys.exit(1)

    # block_end is the index of the closing '}' of the sisyphus-junior value.
    # Now handle trailing comma and newline.
    after_brace = block_end + 1

    # Skip optional whitespace then check for comma
    while after_brace < len(content) and content[after_brace] in (" ", "\t"):
        after_brace += 1

    if after_brace < len(content) and content[after_brace] == ",":
        after_brace += 1  # consume the comma

    # Skip trailing whitespace and one newline
    while after_brace < len(content) and content[after_brace] in (" ", "\t"):
        after_brace += 1

    if after_brace < len(content) and content[after_brace] == "\n":
        after_brace += 1  # consume the newline

    # Also handle the newline before the block (the line ending after the previous block)
    # We want to remove the blank line that would be left behind
    # block_start already points to the first whitespace char of the "sisyphus-junior" line
    # Check if there's a newline just before block_start
    if block_start > 0 and content[block_start - 1] == "\n":
        block_start -= 1  # consume the preceding newline

    # Extract the text we're removing for verification
    removed_text = content[block_start:after_brace]
    print(
        f"\nRemoving {len(removed_text)} chars (block_start={block_start}, after_brace={after_brace})"
    )

    # Verify the removed text contains ONLY sisyphus-junior content
    if '"sisyphus-junior"' not in removed_text:
        print("ERROR: Removed text does not contain sisyphus-junior key")
        sys.exit(1)

    # Verify we're NOT removing other agent definitions
    for agent_name in [
        "sisyphus",
        "hephaestus",
        "atlas",
        "Senior-Engineer",
        "Tech-Lead",
    ]:
        if agent_name == "sisyphus":
            # Check for exact "sisyphus" key (not sisyphus-junior)
            import re

            if re.search(r'"sisyphus"(?!-)', removed_text):
                print(f"ERROR: Removed text contains '{agent_name}' agent definition!")
                sys.exit(1)
        elif f'"{agent_name}"' in removed_text:
            print(f"ERROR: Removed text contains '{agent_name}' agent definition!")
            sys.exit(1)

    # Perform the removal
    new_content = content[:block_start] + content[after_brace:]

    # Verify the result
    if '"sisyphus-junior"' in new_content:
        print("ERROR: sisyphus-junior still present after removal")
        sys.exit(1)

    # Verify prompt_append references to Sisyphus-Junior are preserved (these are rules, not the agent)
    retired_refs = new_content.count("Sisyphus-Junior is RETIRED")
    print(f"\nPreserved 'Sisyphus-Junior is RETIRED' references: {retired_refs}")
    if retired_refs < 3:
        print(
            "WARNING: Expected at least 3 'Sisyphus-Junior is RETIRED' references in orchestrator rules"
        )

    # Report after state
    after_keys = extract_agent_keys(new_content)
    print(f"\nAFTER — Agent keys ({len(after_keys)}):")
    for k in after_keys:
        print(f"  - {k}")

    # Verify removal count
    removed_keys = set(before_keys) - set(after_keys)
    added_keys = set(after_keys) - set(before_keys)

    print(f"\nRemoved: {removed_keys}")
    print(f"Added: {added_keys}")

    if removed_keys != {"sisyphus-junior"}:
        print(
            f"ERROR: Expected to remove only 'sisyphus-junior', but removed: {removed_keys}"
        )
        sys.exit(1)

    if added_keys:
        print(f"ERROR: Unexpectedly added keys: {added_keys}")
        sys.exit(1)

    # Validate JSON
    json_content = strip_jsonc_comments(new_content)
    try:
        json.loads(json_content)
        print("\n✓ JSON validation passed")
    except json.JSONDecodeError as e:
        print(f"\nERROR: JSON validation failed: {e}")
        print("Not writing file.")
        sys.exit(1)

    # Write back
    with open(config_path, "w") as f:
        f.write(new_content)

    print(f"✓ Written to {config_path}")
    print("\n✓ Successfully removed sisyphus-junior agent from oh-my-opencode.jsonc")


if __name__ == "__main__":
    main()
