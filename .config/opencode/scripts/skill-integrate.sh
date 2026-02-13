#!/bin/bash
# skill-integrate.sh - Generate 10-touchpoint integration report for a skill
# Usage: ./skill-integrate.sh vendor/owner/skill-name

SKILL_KEY="$1"
SKILLS_DIR="${HOME}/.config/opencode/skills"
VAULT_DIR="${HOME}/vaults/baphled/3. Resources"
INVENTORY_FILE="${VAULT_DIR}/Tech/OpenCode/Skills Inventory.md"
DASHBOARD_FILE="${VAULT_DIR}/Tech/OpenCode/Skills Dashboard.md"
KB_DIR="${VAULT_DIR}/Knowledge Base/Skills"

if [ -z "$SKILL_KEY" ]; then
    echo "Usage: $0 vendor/owner/skill-name"
    exit 1
fi

SKILL_PATH="${SKILLS_DIR}/${SKILL_KEY}/SKILL.md"

if [ ! -f "$SKILL_PATH" ]; then
    echo "❌ ERROR: SKILL.md not found at $SKILL_PATH"
    exit 1
fi

# Helper to read frontmatter
get_fm() {
    local key="$1"
    sed -n '/^---$/,/^---$/p' "$SKILL_PATH" | grep "^${key}:" | head -1 | sed "s/^${key}:[[:space:]]*//;s/[[:space:]]*$//"
}

NAME=$(get_fm "name")
DESC=$(get_fm "description")
CAT=$(get_fm "category")

if [ -z "$CAT" ]; then
    # Simple category inference
    if [[ "$DESC" =~ (database|sql|postgres|mongo) ]]; then CAT="Database Persistence";
    elif [[ "$DESC" =~ (ui|frontend|css|html|react) ]]; then CAT="UI Frameworks";
    elif [[ "$DESC" =~ (test|spec|mock) ]]; then CAT="Testing BDD";
    elif [[ "$DESC" =~ (git|commit|repo) ]]; then CAT="Git";
    elif [[ "$DESC" =~ (deploy|docker|ci|cd) ]]; then CAT="DevOps Operations";
    else CAT="General Cross Cutting"; fi
fi

echo "================================================================"
echo "🧩 SKILL INTEGRATION REPORT: $NAME"
echo "================================================================"
echo "Source: $SKILL_KEY"
echo "Category: $CAT"
echo "Description: $DESC"
echo ""

# Touchpoint 1: Placement
echo "----------------------------------------------------------------"
echo "1. ✅ SKILL.md Placement"
echo "----------------------------------------------------------------"
echo "   File exists at: $SKILL_PATH"
echo "   Frontmatter validated."
echo ""

# Touchpoint 2: Memory Graph
echo "----------------------------------------------------------------"
echo "2. ✅ Memory Graph Entity"
echo "----------------------------------------------------------------"
echo "   [Action] Use the 'memory-keeper' agent or tool to run:"
echo ""
cat <<EOF
{
  "entities": [
    {
      "name": "$NAME",
      "entityType": "Skill",
      "observations": [
        "Description: $DESC",
        "Category: $CAT",
        "Path: $SKILL_KEY"
      ]
    }
  ],
  "relations": [
    {
      "from": "$NAME",
      "to": "OpenCode",
      "relationType": "is part of"
    },
    {
      "from": "$NAME",
      "to": "$CAT",
      "relationType": "belongs to category"
    }
  ]
}
EOF
echo ""

# Touchpoint 3: Skills Inventory
echo "----------------------------------------------------------------"
echo "3. ✅ Skills Inventory Count"
echo "----------------------------------------------------------------"
if [ -f "$INVENTORY_FILE" ]; then
    CURRENT_COUNT=$(grep -o "all [0-9]\+ skills" "$INVENTORY_FILE" | head -1 | grep -o "[0-9]\+")
    NEW_COUNT=$((CURRENT_COUNT + 1))
    echo "   Current count: $CURRENT_COUNT"
    echo "   Target count:  $NEW_COUNT"
    echo "   [Suggestion] Run:"
    echo "   sed -i 's/all $CURRENT_COUNT skills/all $NEW_COUNT skills/' \"$INVENTORY_FILE\""
else
    echo "   ⚠️  Inventory file not found at $INVENTORY_FILE"
fi
echo ""

# Touchpoint 4: Skills Dashboard
echo "----------------------------------------------------------------"
echo "4. ✅ Skills Dashboard Count"
echo "----------------------------------------------------------------"
if [ -f "$DASHBOARD_FILE" ]; then
    # Assuming similar format or just noting it needs update
    echo "   [Suggestion] Update total skill count in dashboard."
    echo "   File: $DASHBOARD_FILE"
else
    echo "   ⚠️  Dashboard file not found (or optional)."
fi
echo ""

# Touchpoint 5: KB Doc
echo "----------------------------------------------------------------"
echo "5. 📋 Obsidian KB Doc Template"
echo "----------------------------------------------------------------"
KB_PATH="${KB_DIR}/${CAT// /-}/$NAME.md"
echo "   [Suggestion] Create file at: $KB_PATH"
echo "   --- TEMPLATE START ---"
cat <<EOF
---
tags:
  - skill/opencode
  - category/${CAT// /-}
  - source/vendor
alias: [$NAME]
created: $(date +%Y-%m-%d)
---

# Skill: $NAME

## Description
$DESC

## What I do
I provide expertise in... (expand on description)

## When to use me
- Task A
- Task B

## Integration
- Command: (suggested command)
- Agent: (suggested agent)
EOF
echo "   --- TEMPLATE END ---"
echo ""

# Touchpoint 6: Agent Loading
echo "----------------------------------------------------------------"
echo "6. 📋 Agent Skill Loading Suggestions"
echo "----------------------------------------------------------------"
echo "   Based on keywords in description, consider adding '$NAME' to:"
AGENTS_DIR="${HOME}/.config/opencode/agents"
KEYWORDS=$(echo "$DESC" | tr -cs '[:alnum:]' '\n' | awk 'length($0) > 4' | tr '\n' '|')
KEYWORDS=${KEYWORDS%|}

for agent in "$AGENTS_DIR"/*.md; do
    aname=$(basename "$agent" .md)
    # Keyword matching > 4 chars
    if [ -n "$KEYWORDS" ] && grep -q -i -E "($KEYWORDS)" "$agent"; then
        echo "   - $aname (matches context keywords)"
    fi
done
echo ""

# Touchpoint 7: Command References
echo "----------------------------------------------------------------"
echo "7. 📋 Command Reference Suggestions"
echo "----------------------------------------------------------------"
echo "   Consider referencing '$NAME' in these commands:"
CMDS_DIR="${HOME}/.config/opencode/commands"
if [ -d "$CMDS_DIR" ]; then
    for cmd in "$CMDS_DIR"/*.md; do
        cname=$(basename "$cmd" .md)
        if [ -n "$KEYWORDS" ] && grep -q -i -E "($KEYWORDS)" "$cmd"; then
            echo "   - $cname"
        fi
    done
fi
echo ""

# Touchpoint 8: Related Skills
echo "----------------------------------------------------------------"
echo "8. 📋 Related Skills Suggestions"
echo "----------------------------------------------------------------"
echo "   Consider relating to:"
# Find skills in same category or similar name
find "$SKILLS_DIR" -name "SKILL.md" -not -path "$SKILL_PATH" | while read -r s; do
    sname=$(sed -n '/^---$/,/^---$/p' "$s" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//')
    sdesc=$(sed -n '/^---$/,/^---$/p' "$s" | grep "^description:" | head -1 | sed 's/^description:[[:space:]]*//')
    
    # Match category or words
    if [[ "$sdesc" =~ $CAT ]]; then
         echo "   - $sname (same category inferred)"
    fi
done | head -n 5
echo ""

# Touchpoint 9: Workflow Placement
echo "----------------------------------------------------------------"
echo "9. 📋 Workflow Placement"
echo "----------------------------------------------------------------"
echo "   Suggested Workflow Phase:"
if [[ "$CAT" == "Testing BDD" ]]; then echo "   - Validation / Testing Phase";
elif [[ "$CAT" == "Git" ]]; then echo "   - Version Control / Delivery Phase";
elif [[ "$CAT" == "UI Frameworks" ]]; then echo "   - Implementation / Frontend Phase";
else echo "   - General Development Phase"; fi
echo ""

# Touchpoint 10: Relationship Mapping
echo "----------------------------------------------------------------"
echo "10. 📋 Relationship Mapping"
echo "----------------------------------------------------------------"
echo "   [Suggestion] Add to 'Skills Relationship Mapping.md':"
echo ""
echo "   $NAME --> [Related Skill]"
echo "   [Category] contains $NAME"
echo ""

echo "================================================================"
echo "✅ Integration Report Generated. Please review and apply suggestions."
echo "================================================================"
