#!/usr/bin/env bats
# Test suite for skill import, remove, and collision detection
# Verifies Makefile targets work correctly with mock git repos (no network)

load test_helper

# ============================================================================
# Setup / Teardown — full isolation per test
# ============================================================================

setup() {
    # Create isolated temp directory for ALL test state
    export TEST_WORK_DIR="$(mktemp -d)"

    # Override all paths so nothing touches real ~/.config/opencode
    export OPENCODE_CONFIG="$TEST_WORK_DIR/config"
    export SKILLS_DIR="$OPENCODE_CONFIG/skills"
    export VENDOR_DIR="$SKILLS_DIR/vendor"
    export STAGING_DIR="$SKILLS_DIR/.staging"
    export LOCK_FILE="$OPENCODE_CONFIG/.skill-lock.json"
    export MAKEFILE="$HOME/Makefile"

    # Create base directories
    mkdir -p "$SKILLS_DIR"
    mkdir -p "$VENDOR_DIR"

    # Initialise empty lockfile
    echo '{"version":1,"skills":{}}' > "$LOCK_FILE"

    # Create a mock git repo that skill-import can clone from
    _create_mock_repo
}

teardown() {
    if [[ -n "${TEST_WORK_DIR:-}" && -d "${TEST_WORK_DIR:-}" ]]; then
        rm -rf "$TEST_WORK_DIR"
    fi
}

# ============================================================================
# Helper functions
# ============================================================================

# Creates a local bare git repo with a valid SKILL.md at test-skill/SKILL.md
_create_mock_repo() {
    export MOCK_REPO_DIR="$TEST_WORK_DIR/mock-repo"
    local work_dir="$TEST_WORK_DIR/mock-repo-work"

    mkdir -p "$work_dir/test-skill"

    # Write a SKILL.md with allowed-tools in frontmatter (should be stripped)
    cat > "$work_dir/test-skill/SKILL.md" << 'SKILLEOF'
---
name: test-skill
description: A test skill for BATS testing
allowed-tools: [read, edit, bash]
---

# Test Skill

This is the body of the test skill.
SKILLEOF

    # Also create extra files that should NOT be imported
    mkdir -p "$work_dir/test-skill/scripts"
    echo "#!/bin/bash" > "$work_dir/test-skill/scripts/helper.sh"
    mkdir -p "$work_dir/test-skill/references"
    echo "ref doc" > "$work_dir/test-skill/references/note.md"
    mkdir -p "$work_dir/test-skill/assets"
    echo "image data" > "$work_dir/test-skill/assets/logo.png"

    # Init as a proper git repo so `git clone` works locally
    git -C "$work_dir" init --quiet
    git -C "$work_dir" add -A
    git -C "$work_dir" -c user.name="Test" -c user.email="test@test.com" commit -m "init" --quiet

    # Create a bare clone the Makefile can clone from via file:// protocol
    git clone --bare --quiet "$work_dir" "$MOCK_REPO_DIR"
}

# Runs make with overridden paths to use test isolation.
# Optionally prepends a custom git wrapper to PATH via GIT_WRAPPER_DIR env var.
# Usage: _make_skill <target> [extra make vars...]
_make_skill() {
    local target="$1"
    shift
    local custom_path="${PATH}"
    if [[ -n "${GIT_WRAPPER_DIR:-}" ]]; then
        custom_path="${GIT_WRAPPER_DIR}:${PATH}"
    fi
    PATH="$custom_path" make -f "$MAKEFILE" "$target" \
        OPENCODE_CONFIG="$OPENCODE_CONFIG" \
        SKILLS_DIR="$SKILLS_DIR" \
        VENDOR_DIR="$VENDOR_DIR" \
        STAGING_DIR="$STAGING_DIR" \
        LOCK_FILE="$LOCK_FILE" \
        "$@" 2>&1
}

# Creates a fake git wrapper that redirects clone to our mock repo
# Usage: _create_git_wrapper <wrapper_dir> <mock_repo_path>
_create_git_wrapper() {
    local wrapper_dir="$1"
    local mock_repo="$2"
    mkdir -p "$wrapper_dir"

    cat > "$wrapper_dir/git" << FAKESCRIPT
#!/bin/bash
if [[ "\$1" == "clone" ]]; then
    # Redirect clone to local mock repo, preserving last arg as destination
    exec /usr/bin/git clone --depth 1 --quiet "$mock_repo" "\${@: -1}"
fi
exec /usr/bin/git "\$@"
FAKESCRIPT
    chmod +x "$wrapper_dir/git"
}

# Creates a fake git wrapper that always fails on clone
_create_failing_git_wrapper() {
    local wrapper_dir="$1"
    mkdir -p "$wrapper_dir"

    cat > "$wrapper_dir/git" << 'FAKESCRIPT'
#!/bin/bash
if [[ "$1" == "clone" ]]; then
    echo "fatal: repository not found" >&2
    exit 128
fi
exec /usr/bin/git "$@"
FAKESCRIPT
    chmod +x "$wrapper_dir/git"
}

# ============================================================================
# Test 1: Successful import creates correct directory structure
# ============================================================================

@test "successful direct import creates correct directory structure" {
    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1
    [[ "$status" -eq 0 ]]

    # Directory structure: vendor/owner/skill-name/
    [[ -d "$VENDOR_DIR/testowner" ]]
    [[ -d "$VENDOR_DIR/testowner/test-skill" ]]
    [[ -f "$VENDOR_DIR/testowner/test-skill/SKILL.md" ]]
}

# ============================================================================
# Test 2: Successful import writes valid lockfile entry
# ============================================================================

@test "successful import writes valid lockfile entry" {
    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1
    [[ "$status" -eq 0 ]]

    # Lockfile has the key
    run jq -e '.skills["vendor/testowner/test-skill"]' "$LOCK_FILE"
    [[ "$status" -eq 0 ]]

    # Required fields present
    run jq -r '.skills["vendor/testowner/test-skill"].repo' "$LOCK_FILE"
    [[ "$output" == "testowner/test-repo" ]]

    run jq -r '.skills["vendor/testowner/test-skill"].status' "$LOCK_FILE"
    [[ "$output" == "ACTIVE" ]]

    run jq -r '.skills["vendor/testowner/test-skill"].commit' "$LOCK_FILE"
    [[ -n "$output" && "$output" != "null" ]]

    run jq -r '.skills["vendor/testowner/test-skill"].original_name' "$LOCK_FILE"
    [[ "$output" == "test-skill" ]]

    run jq -r '.skills["vendor/testowner/test-skill"].imported_at' "$LOCK_FILE"
    [[ "$output" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

# ============================================================================
# Test 3: Import strips allowed-tools from frontmatter
# ============================================================================

@test "import strips allowed-tools from frontmatter" {
    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1
    [[ "$status" -eq 0 ]]

    local dest_file="$VENDOR_DIR/testowner/test-skill/SKILL.md"
    [[ -f "$dest_file" ]]

    # allowed-tools should NOT be in the imported file
    run grep "allowed-tools" "$dest_file"
    [[ "$status" -ne 0 ]]

    run grep "allowed_tools" "$dest_file"
    [[ "$status" -ne 0 ]]

    # name and description should still be present
    run grep "^name:" "$dest_file"
    [[ "$status" -eq 0 ]]

    run grep "^description:" "$dest_file"
    [[ "$status" -eq 0 ]]

    # Body content preserved
    run grep "This is the body" "$dest_file"
    [[ "$status" -eq 0 ]]
}

# ============================================================================
# Test 4: Import copies only SKILL.md (strips scripts/references/assets)
# ============================================================================

@test "import copies only SKILL.md — strips scripts, references, and assets" {
    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1
    [[ "$status" -eq 0 ]]

    local dest_dir="$VENDOR_DIR/testowner/test-skill"

    # SKILL.md exists
    [[ -f "$dest_dir/SKILL.md" ]]

    # scripts/, references/, assets/ should NOT exist
    [[ ! -d "$dest_dir/scripts" ]]
    [[ ! -d "$dest_dir/references" ]]
    [[ ! -d "$dest_dir/assets" ]]

    # Only 1 file in destination
    local file_count
    file_count="$(find "$dest_dir" -type f | wc -l)"
    [[ "$file_count" -eq 1 ]]
}

# ============================================================================
# Test 5: Collision detection rejects duplicate names
# ============================================================================

@test "collision detection rejects duplicate skill names" {
    local collision_script="$HOME/scripts/detect-skill-collision.sh"
    if [[ ! -x "$collision_script" ]]; then
        skip "detect-skill-collision.sh not found or not executable"
    fi

    # Create an existing skill with name "golang"
    mkdir -p "$SKILLS_DIR/golang"
    cat > "$SKILLS_DIR/golang/SKILL.md" << 'EOF'
---
name: golang
description: Go language expertise
---

# Golang skill
EOF

    # Create an imported skill that uses the same name
    local imported_file="$TEST_WORK_DIR/imported-skill/SKILL.md"
    mkdir -p "$(dirname "$imported_file")"
    cat > "$imported_file" << 'EOF'
---
name: golang
description: A conflicting skill with the same name
---

# Conflicting skill
EOF

    # Should FAIL with collision error
    run env SKILLS_DIR="$SKILLS_DIR" FORCE=0 "$collision_script" "$imported_file" "somevendor"
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "COLLISION" ]] || [[ "$output" =~ "already exists" ]]
}

# ============================================================================
# Test 6: Collision with FORCE=1 renames with vendor prefix
# ============================================================================

@test "collision with FORCE=1 renames skill with vendor prefix" {
    local collision_script="$HOME/scripts/detect-skill-collision.sh"
    if [[ ! -x "$collision_script" ]]; then
        skip "detect-skill-collision.sh not found or not executable"
    fi

    # Create an existing skill with name "golang"
    mkdir -p "$SKILLS_DIR/golang"
    cat > "$SKILLS_DIR/golang/SKILL.md" << 'EOF'
---
name: golang
description: Go language expertise
---

# Golang skill
EOF

    # Create an imported skill that collides
    local imported_file="$TEST_WORK_DIR/imported-skill/SKILL.md"
    mkdir -p "$(dirname "$imported_file")"
    cat > "$imported_file" << 'EOF'
---
name: golang
description: A conflicting skill
---

# Conflicting skill body
EOF

    # FORCE=1 — should succeed and rename
    run env SKILLS_DIR="$SKILLS_DIR" FORCE=1 "$collision_script" "$imported_file" "externalvendor"
    [[ "$status" -eq 0 ]]

    # Imported file now has vendor-prefixed name
    run grep "^name:" "$imported_file"
    [[ "$output" =~ vendor-externalvendor-golang ]]

    # Original skill untouched
    run grep "^name:" "$SKILLS_DIR/golang/SKILL.md"
    [[ "$output" =~ "golang" ]]
    [[ ! "$output" =~ "vendor-" ]]
}

# ============================================================================
# Test 7: Remove cleans up directory and lockfile
# ============================================================================

@test "remove cleans up skill directory and lockfile entry" {
    local owner="testowner"
    local skill="test-skill"
    local dest_dir="$VENDOR_DIR/$owner/$skill"
    local lock_key="vendor/$owner/$skill"

    # Create the skill directory and lockfile entry
    mkdir -p "$dest_dir"
    cat > "$dest_dir/SKILL.md" << 'EOF'
---
name: test-skill
description: A test skill
---

# Test
EOF

    jq --arg key "$lock_key" \
       '.skills[$key] = {"repo": "testowner/repo", "commit": "abc123", "status": "ACTIVE", "original_name": "test-skill"}' \
       "$LOCK_FILE" > "$LOCK_FILE.tmp" && mv "$LOCK_FILE.tmp" "$LOCK_FILE"

    # Preconditions
    [[ -d "$dest_dir" ]]
    run jq -e --arg key "$lock_key" '.skills[$key]' "$LOCK_FILE"
    [[ "$status" -eq 0 ]]

    # Run skill-remove
    run _make_skill skill-remove SKILL="$lock_key"
    [[ "$status" -eq 0 ]]

    # Directory gone
    [[ ! -d "$dest_dir" ]]

    # Lockfile entry removed
    run jq -e --arg key "$lock_key" '.skills[$key]' "$LOCK_FILE"
    [[ "$status" -ne 0 ]]

    # Lockfile still valid JSON
    run jq '.' "$LOCK_FILE"
    [[ "$status" -eq 0 ]]
}

# ============================================================================
# Test 8: Remove nonexistent skill fails gracefully
# ============================================================================

@test "remove nonexistent skill fails gracefully" {
    run _make_skill skill-remove SKILL="vendor/nobody/fake-skill"
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "not found" ]] || [[ "$output" =~ "ERROR" ]]

    # Lockfile unchanged
    run jq '.' "$LOCK_FILE"
    [[ "$status" -eq 0 ]]
}

# ============================================================================
# Test 9: Import with bad/nonexistent repo fails gracefully
# ============================================================================

@test "import with bad repo fails gracefully" {
    local wrapper_dir="$TEST_WORK_DIR/fail-git"
    _create_failing_git_wrapper "$wrapper_dir"

    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="nonexistent/repo" SKILL="fake" DIRECT=1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "Failed to clone" ]] || [[ "$output" =~ "ERROR" ]] || [[ "$output" =~ "not found" ]]

    # No partial files
    [[ ! -d "$VENDOR_DIR/nonexistent" ]]
}

# ============================================================================
# Test 10: Collision — directory-level with local skill
# ============================================================================

@test "import rejects when local skill with same directory name exists" {
    # Create a local (non-vendor) skill
    mkdir -p "$SKILLS_DIR/test-skill"
    cat > "$SKILLS_DIR/test-skill/SKILL.md" << 'EOF'
---
name: test-skill
description: A local skill
---

# Local skill
EOF

    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    # Should fail — local skill directory exists
    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "already exists" ]] || [[ "$output" =~ "ERROR" ]]
}

# ============================================================================
# Test 11: FORCE=1 allows import despite local skill name match
# ============================================================================

@test "import with FORCE=1 proceeds despite local skill directory match" {
    # Create a local skill
    mkdir -p "$SKILLS_DIR/test-skill"
    cat > "$SKILLS_DIR/test-skill/SKILL.md" << 'EOF'
---
name: test-skill
description: A local skill
---

# Local skill
EOF

    local wrapper_dir="$TEST_WORK_DIR/git-wrapper"
    _create_git_wrapper "$wrapper_dir" "$MOCK_REPO_DIR"

    # FORCE=1 — should succeed
    GIT_WRAPPER_DIR="$wrapper_dir" run _make_skill skill-import REPO="testowner/test-repo" SKILL="test-skill" DIRECT=1 FORCE=1
    [[ "$status" -eq 0 ]]

    # Vendor skill exists
    [[ -f "$VENDOR_DIR/testowner/test-skill/SKILL.md" ]]

    # Original local skill untouched
    [[ -f "$SKILLS_DIR/test-skill/SKILL.md" ]]
}

# ============================================================================
# Test 12: Remove cleans up empty owner directory
# ============================================================================

@test "remove cleans up empty parent owner directory" {
    local owner="cleanowner"
    local skill="only-skill"
    local dest_dir="$VENDOR_DIR/$owner/$skill"
    local lock_key="vendor/$owner/$skill"

    mkdir -p "$dest_dir"
    cat > "$dest_dir/SKILL.md" << 'EOF'
---
name: only-skill
description: The only skill under this owner
---

# Only
EOF

    jq --arg key "$lock_key" \
       '.skills[$key] = {"repo": "cleanowner/repo", "commit": "def456", "status": "ACTIVE", "original_name": "only-skill"}' \
       "$LOCK_FILE" > "$LOCK_FILE.tmp" && mv "$LOCK_FILE.tmp" "$LOCK_FILE"

    run _make_skill skill-remove SKILL="$lock_key"
    [[ "$status" -eq 0 ]]

    # Skill dir gone
    [[ ! -d "$dest_dir" ]]

    # Empty owner dir should be cleaned up
    [[ ! -d "$VENDOR_DIR/$owner" ]]
}

# ============================================================================
# Test 13: No-args import shows usage errors
# ============================================================================

@test "import without required args shows usage error" {
    run _make_skill skill-import REPO="" SKILL="" DIRECT=1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "REPO is required" ]] || [[ "$output" =~ "ERROR" ]]
}
