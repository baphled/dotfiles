#!/bin/bash
# detect-skill-collision.sh - Validate skill names against existing skills
# Usage: ./detect-skill-collision.sh [--force] <skill-dir> <skill-name>
# Exit codes: 0 = no collision, 1 = collision detected

set -euo pipefail

# Configuration
SKILLS_DIR="${HOME}/.config/opencode/skills"
FORCE_FLAG=false
SKILL_DIR=""
SKILL_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)
            FORCE_FLAG=true
            shift
            ;;
        *)
            if [[ -z "$SKILL_DIR" ]]; then
                SKILL_DIR="$1"
            elif [[ -z "$SKILL_NAME" ]]; then
                SKILL_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$SKILL_DIR" ]] || [[ -z "$SKILL_NAME" ]]; then
    echo "ERROR: Missing required arguments" >&2
    echo "Usage: $0 [--force] <skill-dir> <skill-name>" >&2
    exit 1
fi

# Function to extract skill name from SKILL.md frontmatter
extract_skill_name() {
    local skill_file="$1"
    if [[ ! -f "$skill_file" ]]; then
        return 1
    fi
    
    # Extract name field from YAML frontmatter (between --- markers)
    sed -n '/^---$/,/^---$/p' "$skill_file" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//'
}

# Function to get vendor prefix from skill directory
get_vendor_prefix() {
    local skill_dir="$1"
    # Extract vendor info from directory path or use default
    # Pattern: /path/to/vendor-owner-name or just name
    local dir_name=$(basename "$skill_dir")
    
    # If directory already has vendor prefix, use it; otherwise use generic vendor prefix
    if [[ "$dir_name" =~ ^vendor- ]]; then
        echo "$dir_name"
    else
        # Default vendor prefix - can be customized based on source
        echo "vendor-imported"
    fi
}

# Function to update SKILL.md with new name
update_skill_name() {
    local skill_file="$1"
    local new_name="$2"
    
    if [[ ! -f "$skill_file" ]]; then
        echo "ERROR: SKILL.md not found at $skill_file" >&2
        return 1
    fi
    
    # Use sed to replace the name field in frontmatter
    sed -i "s/^name:[[:space:]]*.*$/name: $new_name/" "$skill_file"
}

# Build list of existing skill names
declare -A existing_skills
for skill_file in "$SKILLS_DIR"/**/SKILL.md; do
    if [[ -f "$skill_file" ]]; then
        existing_name=$(extract_skill_name "$skill_file" || true)
        if [[ -n "$existing_name" ]]; then
            skill_path=$(dirname "$skill_file")
            existing_skills["$existing_name"]="$skill_path"
        fi
    fi
done

# Check for collision
if [[ -v "existing_skills[$SKILL_NAME]" ]]; then
    collision_path="${existing_skills[$SKILL_NAME]}"
    
    if [[ "$FORCE_FLAG" == true ]]; then
        # Generate vendor-prefixed name
        vendor_prefix=$(get_vendor_prefix "$SKILL_DIR")
        new_name="${vendor_prefix}-${SKILL_NAME}"
        
        # Check if the new name also collides
        if [[ -v "existing_skills[$new_name]" ]]; then
            echo "ERROR: COLLISION - Skill name '$SKILL_NAME' collides with existing skill at $collision_path" >&2
            echo "ERROR: Attempted rename to '$new_name' also collides" >&2
            exit 1
        fi
        
        # Update the SKILL.md with new name
        skill_md="$SKILL_DIR/SKILL.md"
        if [[ ! -f "$skill_md" ]]; then
            echo "ERROR: SKILL.md not found at $skill_md" >&2
            exit 1
        fi
        
        update_skill_name "$skill_md" "$new_name"
        echo "INFO: Skill renamed from '$SKILL_NAME' to '$new_name' to avoid collision" >&2
        exit 0
    else
        # Collision detected and no --force flag
        echo "COLLISION: Skill name '$SKILL_NAME' already exists" >&2
        echo "Existing skill location: $collision_path" >&2
        echo "Use --force flag to rename with vendor prefix" >&2
        exit 1
    fi
fi

# No collision detected
exit 0
