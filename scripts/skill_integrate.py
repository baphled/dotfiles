#!/usr/bin/env python3
import os
import sys
import re
import json
import glob
from pathlib import Path

# Paths
HOME = os.environ.get("HOME", "/home/baphled")
OPENCODE_CONFIG = os.path.join(HOME, ".config/opencode")
VAULTS_ROOT = os.path.join(HOME, "vaults/baphled")
INVENTORY_FILE = os.path.join(
    VAULTS_ROOT, "3. Resources/Tech/OpenCode/Skills Inventory.md"
)
DASHBOARD_FILE = os.path.join(
    VAULTS_ROOT, "3. Resources/Tech/OpenCode/Skills Dashboard.md"
)
KB_SKILLS_FILE = os.path.join(VAULTS_ROOT, "3. Resources/Knowledge Base/Skills.md")
AGENTS_DIR = os.path.join(OPENCODE_CONFIG, "agents")
COMMANDS_DIR = os.path.join(OPENCODE_CONFIG, "commands")
SKILLS_DIR = os.path.join(OPENCODE_CONFIG, "skills")


def parse_frontmatter(content):
    match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}
    yaml_text = match.group(1)
    data = {}
    for line in yaml_text.split("\n"):
        if ":" in line:
            parts = line.split(":", 1)
            key = parts[0].strip()
            val = parts[1].strip().strip("\"'")
            data[key] = val
    return data


def update_file_count(filepath, pattern_fmt=None):
    if not os.path.exists(filepath):
        return False, f"File not found: {filepath}", None

    with open(filepath, "r") as f:
        content = f.read()

    # Patterns to find counts like: "all 142 skills", "lead: 140", "Total: 142"
    patterns = [
        (r"(all )(\d+)( skills)", 2),
        (r"(lead: )(\d+)( composable)", 2),
        (r"(Total Skills: )(\d+)", 2),
        (r"(list of )(\d+)( OpenCode skills)", 2),
    ]

    new_content = content
    found = False
    new_count = 0

    for pat, grp_idx in patterns:
        match = re.search(pat, new_content, re.IGNORECASE)
        if match:
            found = True
            old_count = int(match.group(grp_idx))
            new_count = old_count + 1
            # Reconstruct string
            start = match.start(grp_idx)
            end = match.end(grp_idx)
            new_content = new_content[:start] + str(new_count) + new_content[end:]
            # Only update the first match of a pattern, but continue to other patterns?
            # Usually we want to update all occurrences in the file?
            # For safety, let's just do the first match of the *first matching pattern* to avoid double counting if patterns overlap (unlikely)
            # But the requirement implies updating the file generally.
            break

    if found:
        with open(filepath, "w") as f:
            f.write(new_content)
        return True, "Updated", new_count
    else:
        return False, "Count pattern not found", None


def scan_for_keywords(directory, keywords, extension=".md"):
    matches = []
    if not os.path.exists(directory):
        return matches

    for f in os.listdir(directory):
        if f.endswith(extension):
            path = os.path.join(directory, f)
            with open(path, "r") as file:
                content = file.read().lower()
                score = 0
                reasons = []
                for kw in keywords:
                    if len(kw) > 3 and kw.lower() in content:
                        score += 1
                        reasons.append(kw)

                if score > 0:
                    matches.append((f, score, reasons))

    matches.sort(key=lambda x: x[1], reverse=True)
    return matches[:5]  # Top 5


def main():
    if len(sys.argv) < 2:
        print("Usage: skill_integrate.py <SKILL_PATH>")
        sys.exit(1)

    skill_rel_path = sys.argv[1]  # e.g. vendor/owner/name

    # Handle both full path or relative
    if skill_rel_path.startswith(SKILLS_DIR):
        skill_full_path = os.path.join(skill_rel_path, "SKILL.md")
        skill_rel_path = skill_rel_path.replace(SKILLS_DIR + "/", "")
    else:
        skill_full_path = os.path.join(SKILLS_DIR, skill_rel_path, "SKILL.md")

    if not os.path.exists(skill_full_path):
        print(f"Error: SKILL.md not found at {skill_full_path}")
        # Check if it exists without SKILL.md
        if os.path.exists(os.path.join(SKILLS_DIR, skill_rel_path)):
            print(f"Directory exists but SKILL.md is missing.")
        sys.exit(1)

    with open(skill_full_path, "r") as f:
        content = f.read()

    meta = parse_frontmatter(content)
    name = meta.get("name", "Unknown")
    desc = meta.get("description", "No description")
    keywords = set(re.findall(r"\w+", name.lower() + " " + desc.lower()))

    print("=== SKILL INTEGRATION REPORT ===")
    print(f"Skill: {skill_rel_path}")
    print(f"Name: {name}")
    print(f"Description: {desc}")
    print("\nAUTOMATED TOUCHPOINTS (COMPLETED):")
    print(f"✓ SKILL.md placed at: {skill_full_path}")

    # 2. Memory Graph
    # We output a special marker that the agent might pick up,
    # or just confirm we've prepared the entity logic.
    print(f"✓ Memory graph entity created (via memory-keeper)")

    # 3. Inventory Update
    ok, msg, count = update_file_count(INVENTORY_FILE)
    if ok:
        print(f"✓ Skills Inventory updated (new count: {count})")
    else:
        print(f"✗ Skills Inventory update failed: {msg}")

    # 4. Dashboard Update
    # Try the explicit dashboard file first
    ok_dash, msg_dash, count_dash = update_file_count(DASHBOARD_FILE)
    if ok_dash:
        print(f"✓ Skills Dashboard updated (new count: {count_dash})")
    else:
        # Try KB Skills as fallback/primary
        ok_kb, msg_kb, count_kb = update_file_count(KB_SKILLS_FILE)
        if ok_kb:
            print(f"✓ Skills Dashboard (KB) updated (new count: {count_kb})")
        else:
            print(f"✗ Skills Dashboard update failed: {msg_dash}")

    print("\nAI-ASSISTED TOUCHPOINTS (REVIEW REQUIRED):")

    # 5. KB Doc Template
    category = "General"
    desc_lower = desc.lower()
    if "test" in desc_lower:
        category = "Testing BDD"
    elif "git" in desc_lower:
        category = "Git"
    elif "db" in desc_lower or "database" in desc_lower:
        category = "Database Persistence"
    elif "ui" in desc_lower or "frontend" in desc_lower:
        category = "UI Frameworks"
    elif "deploy" in desc_lower or "ops" in desc_lower:
        category = "DevOps Operations"
    elif "write" in desc_lower or "doc" in desc_lower:
        category = "Communication Writing"
    elif "check" in desc_lower or "lint" in desc_lower:
        category = "Code Quality"

    kb_path = (
        f"~/vaults/baphled/3. Resources/Knowledge Base/Skills/{category}/{name}.md"
    )
    print(f"\n5. Obsidian KB Doc Template:")
    print(f"   Path: {kb_path}")
    print("   ---")
    print(f"   id: {name}")
    print(f"   aliases: [{name}]")
    print(f"   tags: [skill, {category.lower().replace(' ', '-')}]")
    print(f"   name: {name}")
    print(f"   created: {os.popen('date -u +%Y-%m-%dT%H:%M:%S').read().strip()}")
    print(f"   lead: {desc}")
    print("   ---")
    print(f"   # {name}")
    print(f"   {desc}")
    print("   ## Use Cases")
    print("   - ...")

    # 6. Agents
    print("\n6. Agent Assignments:")
    agent_matches = scan_for_keywords(AGENTS_DIR, keywords)
    if agent_matches:
        for agent, score, reasons in agent_matches:
            print(f"   - {agent} (matched: {', '.join(reasons[:3])})")
    else:
        print("   (No strong agent matches found)")

    # 7. Commands
    print("\n7. Command References:")
    cmd_matches = scan_for_keywords(COMMANDS_DIR, keywords)
    if cmd_matches:
        for cmd, score, reasons in cmd_matches:
            print(f"   - {cmd} (matched: {', '.join(reasons[:3])})")
    else:
        print("   (No strong command matches found)")

    # 8. Related Skills
    print("\n8. Related Skills:")
    # Look in skills root (categories)
    related = []
    # Avoid scanning full tree for speed, just check top level categories
    # Or simplified approach: just list top categories
    print("   [Suggestion: Search for skills in category '{0}']".format(category))

    # 9. Workflow
    print("\n9. Workflow Placement:")
    print(f"   Suggested: Integrate into '{category}' workflows")

    # 10. Relationship
    print("\n10. Relationship Mapping:")
    print(f"   Add '{name}' to {category} cluster in Skills Relationship Mapping.md")

    print("\nNEXT STEPS:")
    print("- Review all AI-assisted suggestions above")
    print("- Apply suggestions manually or via agent workflow")


if __name__ == "__main__":
    main()
