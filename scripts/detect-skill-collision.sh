#!/bin/bash
# Collision Detection — Name Validation Against Existing Skills
# Detects name collisions when importing new skills and optionally renames with vendor prefix

set -euo pipefail

# Configuration
SKILLS_DIR="${SKILLS_DIR:-${HOME}/.config/opencode/skills}"
FORCE="${FORCE:-0}"
VERBOSE="${VERBOSE:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

log_error() {
    echo -e "${RED}ERROR: $*${NC}" >&2
}

log_success() {
    echo -e "${GREEN}✓ $*${NC}"
}

log_warning() {
    echo -e "${YELLOW}WARNING: $*${NC}" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "1" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Extract name from SKILL.md frontmatter
# Usage: extract_name <file_path>
# Returns: name value or empty string if not found
extract_name() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    # Extract name from YAML frontmatter (between --- markers)
    # Matches: name: value (with optional quotes)
    sed -n '/^---$/,/^---$/p' "$file" | \
        grep -E '^name:\s*' | \
        sed -E 's/^name:\s*["'"'"']?([^"'"'"']+)["'"'"']?$/\1/' | \
        head -1
}

# Build a map of all existing skill names
# Usage: get_existing_skill_names [exclude_file]
# Returns: space-separated list of names
get_existing_skill_names() {
    local exclude_file="${1:-}"
    local names=()
    
    if [[ ! -d "$SKILLS_DIR" ]]; then
        log_verbose "Skills directory not found: $SKILLS_DIR"
        return 0
    fi
    
    while IFS= read -r skill_file; do
        # Skip the imported file itself
        if [[ -n "$exclude_file" && "$skill_file" == "$exclude_file" ]]; then
            continue
        fi
        
        local name
        name=$(extract_name "$skill_file") || continue
        
        if [[ -z "$name" ]]; then
            log_verbose "Skipping skill with missing name: $skill_file"
            continue
        fi
        
        names+=("$name")
    done < <(find "$SKILLS_DIR" -name "SKILL.md" -type f 2>/dev/null)
    
    printf '%s\n' "${names[@]}"
}

# Check for duplicate names in existing skills (corruption detection)
check_for_duplicates() {
    local names_file="$1"
    local duplicates
    
    duplicates=$(sort "$names_file" | uniq -d)
    
    if [[ -n "$duplicates" ]]; then
        log_warning "Multiple skills with same name detected (corruption):"
        echo "$duplicates" | sed 's/^/  - /'
        return 1
    fi
    
    return 0
}

# Find which existing skill has the conflicting name
# Usage: find_conflicting_skill <target_name> [exclude_file]
find_conflicting_skill() {
    local target_name="$1"
    local exclude_file="${2:-}"
    
    if [[ ! -d "$SKILLS_DIR" ]]; then
        return 1
    fi
    
    while IFS= read -r skill_file; do
        # Skip the imported file itself
        if [[ -n "$exclude_file" && "$skill_file" == "$exclude_file" ]]; then
            continue
        fi
        
        local name
        name=$(extract_name "$skill_file") || continue
        
        if [[ "$name" == "$target_name" ]]; then
            echo "$skill_file"
            return 0
        fi
    done < <(find "$SKILLS_DIR" -name "SKILL.md" -type f 2>/dev/null)
    
    return 1
}

# Rename skill in frontmatter with vendor prefix
# Usage: rename_skill_with_prefix <file_path> <vendor> <new_name>
rename_skill_with_prefix() {
    local file="$1"
    local vendor="$2"
    local new_name="$3"
    
    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return 1
    fi
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # Replace name in frontmatter using awk to handle YAML properly
    # This preserves the file structure and handles quoted/unquoted names
    awk -v new_name="$new_name" '
        /^---$/ { in_frontmatter = !in_frontmatter; print; next }
        in_frontmatter && /^name:/ { print "name: " new_name; next }
        { print }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    
    log_verbose "Renamed skill in $file to: $new_name"
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

main() {
    local imported_skill_file="$1"
    local vendor="${2:-}"
    
    # Validate inputs
    if [[ -z "$imported_skill_file" ]]; then
        log_error "Usage: $0 <imported_skill_file> [vendor_name]"
        echo "  FORCE=1 to allow collision with vendor prefix rename" >&2
        return 1
    fi
    
    if [[ ! -f "$imported_skill_file" ]]; then
        log_error "Imported skill file not found: $imported_skill_file"
        return 1
    fi
    
    # Extract name from imported skill
    local imported_name
    imported_name=$(extract_name "$imported_skill_file") || true
    
    if [[ -z "$imported_name" ]]; then
        log_error "Cannot extract 'name' from frontmatter: $imported_skill_file"
        log_error "Ensure the SKILL.md file has a 'name:' field in the frontmatter"
        return 1
    fi
    
    log_verbose "Checking collision for skill: $imported_name"
    
    # Get all existing skill names (excluding the imported file itself)
    local temp_names_file
    temp_names_file=$(mktemp)
    trap "rm -f $temp_names_file" EXIT
    
    get_existing_skill_names "$imported_skill_file" > "$temp_names_file"
    
    # Check for corruption (duplicate names in existing skills)
    if ! check_for_duplicates "$temp_names_file"; then
        log_error "Existing skills have duplicate names. Please resolve corruption first."
        return 1
    fi
    
    # Check for collision
    if grep -q "^${imported_name}$" "$temp_names_file"; then
        local conflicting_file
        conflicting_file=$(find_conflicting_skill "$imported_name" "$imported_skill_file")
        
        log_error "COLLISION: Skill '$imported_name' already exists"
        log_error "  Location: $conflicting_file"
        
        if [[ "$FORCE" == "1" ]]; then
            if [[ -z "$vendor" ]]; then
                log_error "FORCE=1 requires vendor name as second argument"
                return 1
            fi
            
            # Generate prefixed name
            local prefixed_name="vendor-${vendor}-${imported_name}"
            log_warning "FORCE=1: Renaming to avoid collision"
            log_warning "  Old name: $imported_name"
            log_warning "  New name: $prefixed_name"
            
            # Rename in the imported skill file
            if rename_skill_with_prefix "$imported_skill_file" "$vendor" "$prefixed_name"; then
                log_success "Skill renamed with vendor prefix: $prefixed_name"
                return 0
            else
                log_error "Failed to rename skill with vendor prefix"
                return 1
            fi
        else
            log_error "Use FORCE=1 to rename with vendor prefix and proceed"
            return 1
        fi
    fi
    
    # Check for directory/name mismatch
    local dir_name
    dir_name=$(basename "$(dirname "$imported_skill_file")")
    
    if [[ "$dir_name" != "$imported_name" ]]; then
        log_warning "Directory name doesn't match skill name"
        log_warning "  Directory: $dir_name"
        log_warning "  Name field: $imported_name"
        log_warning "  (This is allowed but may cause confusion)"
    fi
    
    log_success "No collision detected for skill: $imported_name"
    return 0
}

# Run main function with all arguments
main "$@"
