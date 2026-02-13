#!/usr/bin/env bats
# BATS tests for skill collision detection

setup() {
    # Create temporary test directory
    export TEST_DIR="$(mktemp -d)"
    export SKILLS_DIR="${TEST_DIR}/skills"
    mkdir -p "$SKILLS_DIR"
    
    # Create test skill files
    create_test_skill "golang" "Go language expertise"
    create_test_skill "rust" "Rust systems programming"
    create_test_skill "python" "Python development"
}

teardown() {
    # Clean up test directory
    rm -rf "$TEST_DIR"
}

# Helper: Create a test skill file
create_test_skill() {
    local name="$1"
    local description="$2"
    local dir="${SKILLS_DIR}/${name}"
    
    mkdir -p "$dir"
    cat > "${dir}/SKILL.md" << EOF
---
name: $name
description: $description
category: Programming
---

# Skill: $name
## What I do
$description
EOF
}

# Helper: Create imported skill file
create_imported_skill() {
    local name="$1"
    local description="${2:-Test skill}"
    local file="${TEST_DIR}/imported_${name}.md"
    
    cat > "$file" << EOF
---
name: $name
description: $description
category: Programming
---

# Skill: $name
## What I do
$description
EOF
    
    echo "$file"
}

# ============================================================================
# TEST CASES
# ============================================================================

@test "detects collision with existing skill" {
    local imported_file
    imported_file=$(create_imported_skill "golang" "New golang skill")
    
    # Override SKILLS_DIR for test
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "COLLISION: Skill 'golang' already exists"
}

@test "collision detection exits with non-zero code" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    ! HOME="$TEST_DIR" \
      SKILLS_DIR="$SKILLS_DIR" \
      /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>/dev/null
}

@test "shows location of conflicting skill" {
    local imported_file
    imported_file=$(create_imported_skill "rust")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "Location:.*rust/SKILL.md"
}

@test "allows import when no collision exists" {
    local imported_file
    imported_file=$(create_imported_skill "javascript" "JavaScript development")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "No collision detected"
}

@test "no collision exits with zero code" {
    local imported_file
    imported_file=$(create_imported_skill "javascript")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>/dev/null
    
    # Should succeed
    [ $? -eq 0 ]
}

@test "FORCE=1 renames skill with vendor prefix" {
    local imported_file
    imported_file=$(create_imported_skill "golang" "Conflicting golang")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    FORCE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" "anthropic" 2>&1 | \
        grep -q "vendor-anthropic-golang"
}

@test "FORCE=1 modifies imported skill name in frontmatter" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    FORCE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" "anthropic" >/dev/null 2>&1
    
    # Check that the imported file was modified
    grep -q "name: vendor-anthropic-golang" "$imported_file"
}

@test "FORCE=1 exits with zero code after rename" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    FORCE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" "anthropic" 2>/dev/null
    
    [ $? -eq 0 ]
}

@test "FORCE=1 requires vendor name argument" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    FORCE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "requires vendor name"
}

@test "detects missing name in frontmatter" {
    local file="${TEST_DIR}/no_name.md"
    cat > "$file" << EOF
---
description: Missing name field
category: Programming
---

# Skill
EOF
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$file" 2>&1 | \
        grep -q "Cannot extract 'name'"
}

@test "warns on directory/name mismatch" {
    # Create a skill file in a directory with a different name
    local mismatched_dir="${TEST_DIR}/wrong_dir_name"
    mkdir -p "$mismatched_dir"
    cat > "${mismatched_dir}/SKILL.md" << EOF
---
name: correct-skill-name
description: Test skill
category: Programming
---

# Skill
EOF
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "${mismatched_dir}/SKILL.md" 2>&1 | \
        grep -q "Directory name doesn't match"
}

@test "handles missing imported skill file" {
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "/nonexistent/file.md" 2>&1 | \
        grep -q "not found"
}

@test "handles missing skills directory gracefully" {
    local imported_file
    imported_file=$(create_imported_skill "newskill")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="/nonexistent/skills" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "No collision detected"
}

@test "case-sensitive name matching" {
    local imported_file
    imported_file=$(create_imported_skill "Golang" "Different case")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "No collision detected"
}

@test "handles quoted names in frontmatter" {
    local file="${TEST_DIR}/quoted.md"
    cat > "$file" << EOF
---
name: "quoted-skill"
description: Test
---

# Skill
EOF
    
    # Create existing skill with quoted name
    local dir="${SKILLS_DIR}/quoted-skill"
    mkdir -p "$dir"
    cat > "${dir}/SKILL.md" << EOF
---
name: "quoted-skill"
description: Existing
---

# Skill
EOF
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$file" 2>&1 | \
        grep -q "COLLISION"
}

@test "verbose mode shows debug output" {
    local imported_file
    imported_file=$(create_imported_skill "javascript")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    VERBOSE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>&1 | \
        grep -q "\[DEBUG\]"
}

@test "does not modify existing skills on collision" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    local original_content
    original_content=$(cat "${SKILLS_DIR}/golang/SKILL.md")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" 2>/dev/null || true
    
    local current_content
    current_content=$(cat "${SKILLS_DIR}/golang/SKILL.md")
    
    [ "$original_content" = "$current_content" ]
}

@test "creates backup when renaming with FORCE" {
    local imported_file
    imported_file=$(create_imported_skill "golang")
    
    HOME="$TEST_DIR" \
    SKILLS_DIR="$SKILLS_DIR" \
    FORCE=1 \
    /home/baphled/scripts/detect-skill-collision.sh "$imported_file" "anthropic" >/dev/null 2>&1
    
    # Check backup exists
    [ -f "${imported_file}.bak" ]
}
