#!/usr/bin/env python3
"""Update rule 8 in orchestrator prompt_appends to list valid subagent_types and ban Sisyphus-Junior."""

import json
import sys
from pathlib import Path

# File path
config_file = Path.home() / ".config" / "opencode" / "oh-my-opencode.jsonc"

# Read the file
with open(config_file, "r") as f:
    content = f.read()

# Current rule 8 text (exact match)
old_rule_8 = "8. EVERY task() call MUST specify an explicit subagent_type — NEVER leave it undefined or empty"

# New rule 8 text (with \n for newline within the JSON string)
new_rule_8 = "8. EVERY task() call MUST specify a subagent_type from: Tech-Lead, Senior-Engineer, QA-Engineer, Writer, Editor, DevOps, Security-Engineer, Data-Analyst, Knowledge Base Curator, VHS-Director, Embedded-Engineer, Nix-Expert, Linux-Expert, SysOp, Model-Evaluator, Researcher. NEVER use undefined/empty. Sisyphus-Junior is RETIRED — use Senior-Engineer or Tech-Lead instead"

# Replace in all three orchestrator blocks
count = content.count(old_rule_8)
print(f"Found {count} occurrences of old rule 8")

if count != 3:
    print(f"ERROR: Expected 3 occurrences (sisyphus, hephaestus, atlas), found {count}")
    sys.exit(1)

# Perform replacement
new_content = content.replace(old_rule_8, new_rule_8)

# Verify replacement
new_count = new_content.count(new_rule_8)
print(f"After replacement: {new_count} occurrences of new rule 8")

if new_count != 3:
    print(f"ERROR: Replacement failed. Expected 3 new occurrences, found {new_count}")
    sys.exit(1)

# Verify "RETIRED" appears exactly 3 times
retired_count = new_content.count("Sisyphus-Junior is RETIRED")
print(f"Verification: 'Sisyphus-Junior is RETIRED' appears {retired_count} times")

if retired_count != 3:
    print(f"ERROR: Expected 'RETIRED' to appear 3 times, found {retired_count}")
    sys.exit(1)

# Write back
with open(config_file, "w") as f:
    f.write(new_content)

print(f"✓ Successfully updated {config_file}")
print(f"✓ Rule 8 updated in all 3 orchestrator blocks (sisyphus, hephaestus, atlas)")
print(f"✓ Sisyphus-Junior retirement notice added")
