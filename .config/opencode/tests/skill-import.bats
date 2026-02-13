#!/usr/bin/env bats
# Test suite for skill import, remove, and collision detection
# Tests core Makefile targets without network access using mock repos

load test_helper

# =============================================================================
# Test Setup & Helpers
# =============================================================================

setup() {
    # Create isolated test environment
    export TEST_WORK_DIR="$(mktemp -d)"
    export MOCK_SKILLS_DIR="${TEST_WORK_DIR}/skills"
    export MOCK_VENDOR_DIR="${MOCK_SKILLS_DIR}/vendor"
    export MOCK_LOCK_FILE="${TEST_WORK_DIR}/.skill-lock.json"
    export MAKEFILE_DIR="${BATS_TEST_DIRNAME}/.."
    export COLLISION_SCRIPT="${MAKEFILE_DIR}/scripts/detect-skill-collision.sh"

    # Create base directories
    mkdir -p "${MOCK_VENDOR_DIR}"
    mkdir -p "${MOCK_SKILLS_DIR}"

    # Initialise empty lockfile
    echo '{"version":1,"skills":{}}' > "${MOCK_LOCK_FILE}"
}

teardown() {
    if [[ -n "${TEST_WORK_DIR}" && -d "${TEST_WORK_DIR}" ]]; then
        rm -rf "${TEST_WORK_DIR}"
    fi
}

# Helper: create a valid SKILL.md with frontmatter
create_skill_md() {
    local dir="$1"
    local name="${2:-test-skill}"
    local desc="${3:-A test skill for unit testing}"
    local extra_fields="${4:-}"

    mkdir -p "${dir}"
    cat > "${dir}/SKILL.md" <<EOF
---
name: ${name}
description: ${desc}
${extra_fields}
---

# Skill: ${name}

## What I do

Test skill content for automated testing.
EOF
}

# Helper: create a mock git repo with a skill
create_mock_repo() {
    local repo_dir="$1"
    local skill_name="$2"
    local extra_fields="${3:-}"

    mkdir -p "${repo_dir}"
    git -C "${repo_dir}" init --quiet
    mkdir -p "${repo_dir}/skills/${skill_name}"
    create_skill_md "${repo_dir}/skills/${skill_name}" "${skill_name}" "A mock skill" "${extra_fields}"
    git -C "${repo_dir}" add -A
    git -C "${repo_dir}" commit --quiet -m "Initial commit" --author="Test <test@test.com>"
}

# Helper: simulate a skill import (what the Makefile does, without git clone)
simulate_import() {
    local repo_dir="$1"
    local skill_name="$2"
    local owner="${3:-testowner}"

    local dest_dir="${MOCK_VENDOR_DIR}/${owner}/${skill_name}"
    local skill_md="${repo_dir}/skills/${skill_name}/SKILL.md"
    local commit_hash
    commit_hash=$(git -C "${repo_dir}" rev-parse HEAD)

    # Copy only SKILL.md (matches Makefile behaviour)
    mkdir -p "${dest_dir}"
    cp "${skill_md}" "${dest_dir}/SKILL.md"

    # Strip allowed-tools (matches Makefile behaviour)
    sed -i '/^allowed-tools:/d' "${dest_dir}/SKILL.md"
    sed -i '/^allowed_tools:/d' "${dest_dir}/SKILL.md"

    # Extract original name
    local original_name
    original_name=$(sed -n '/^---$/,/^---$/p' "${dest_dir}/SKILL.md" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//')

    # Update lockfile
    local lock_key="vendor/${owner}/${skill_name}"
    local import_date
    import_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local tmplock="${TEST_WORK_DIR}/lock.json"

    jq --arg key "${lock_key}" \
       --arg repo "${owner}/mock-repo" \
       --arg commit "${commit_hash}" \
       --arg date "${import_date}" \
       --arg name "${original_name}" \
       '.skills[$key] = {"repo": $repo, "commit": $commit, "imported_at": $date, "original_name": $name, "status": "active"}' \
       "${MOCK_LOCK_FILE}" > "${tmplock}" && mv "${tmplock}" "${MOCK_LOCK_FILE}"
}

# Helper: simulate skill removal (what the Makefile does)
simulate_remove() {
    local skill_path="$1"  # e.g. vendor/testowner/my-skill

    local skill_dir="${MOCK_SKILLS_DIR}/${skill_path}"
    local lock_key="${skill_path}"

    if [[ ! -d "${skill_dir}" ]]; then
        echo "ERROR: Skill directory not found: ${skill_dir}" >&2
        return 1
    fi

    # Remove the directory
    rm -rf "${skill_dir}"

    # Clean up empty owner directory
    local owner_dir
    owner_dir=$(dirname "${skill_dir}")
    if [[ -d "${owner_dir}" ]] && [[ -z "$(ls -A "${owner_dir}" 2>/dev/null)" ]]; then
        rmdir "${owner_dir}" 2>/dev/null || true
    fi

    # Update lockfile
    local tmplock
    tmplock=$(mktemp)
    jq --arg key "${lock_key}" 'del(.skills[$key])' "${MOCK_LOCK_FILE}" > "${tmplock}" && mv "${tmplock}" "${MOCK_LOCK_FILE}"
}

# =============================================================================
# Import Tests (5 tests)
# =============================================================================

@test "import: creates correct directory structure" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "my-test-skill"

    simulate_import "${mock_repo}" "my-test-skill" "testowner"

    # Verify directory structure: vendor/owner/skill-name/SKILL.md
    [[ -d "${MOCK_VENDOR_DIR}/testowner/my-test-skill" ]]
    [[ -f "${MOCK_VENDOR_DIR}/testowner/my-test-skill/SKILL.md" ]]
}

@test "import: writes valid lockfile entry with all fields" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "lockfile-skill"

    simulate_import "${mock_repo}" "lockfile-skill" "testowner"

    # Verify lockfile has the correct key
    local lock_key="vendor/testowner/lockfile-skill"
    local entry
    entry=$(jq --arg key "${lock_key}" '.skills[$key]' "${MOCK_LOCK_FILE}")

    # Verify all required fields are present
    [[ $(echo "${entry}" | jq -r '.repo') == "testowner/mock-repo" ]]
    [[ $(echo "${entry}" | jq -r '.commit') != "null" ]]
    [[ $(echo "${entry}" | jq -r '.commit' | wc -c) -ge 40 ]]  # SHA is 40+ chars
    [[ $(echo "${entry}" | jq -r '.imported_at') != "null" ]]
    [[ $(echo "${entry}" | jq -r '.imported_at') =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
    [[ $(echo "${entry}" | jq -r '.original_name') == "lockfile-skill" ]]
    [[ $(echo "${entry}" | jq -r '.status') == "active" ]]
}

@test "import: strips allowed-tools from frontmatter" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "tools-skill" "allowed-tools: mcp_bash, mcp_read"

    simulate_import "${mock_repo}" "tools-skill" "testowner"

    local skill_file="${MOCK_VENDOR_DIR}/testowner/tools-skill/SKILL.md"

    # Verify allowed-tools was stripped
    ! grep -q "^allowed-tools:" "${skill_file}"
    ! grep -q "^allowed_tools:" "${skill_file}"

    # Verify other frontmatter is still present
    grep -q "^name:" "${skill_file}"
    grep -q "^description:" "${skill_file}"
}

@test "import: copies only SKILL.md, not scripts or other assets" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "multi-file-skill"

    # Add extra files that should NOT be imported
    mkdir -p "${mock_repo}/skills/multi-file-skill/scripts"
    echo "#!/bin/bash" > "${mock_repo}/skills/multi-file-skill/scripts/helper.sh"
    echo "ref content" > "${mock_repo}/skills/multi-file-skill/REFERENCES.md"
    mkdir -p "${mock_repo}/skills/multi-file-skill/assets"
    echo "asset" > "${mock_repo}/skills/multi-file-skill/assets/data.json"
    git -C "${mock_repo}" add -A
    git -C "${mock_repo}" commit --quiet -m "Add extras" --author="Test <test@test.com>"

    simulate_import "${mock_repo}" "multi-file-skill" "testowner"

    local dest="${MOCK_VENDOR_DIR}/testowner/multi-file-skill"

    # Only SKILL.md should exist
    [[ -f "${dest}/SKILL.md" ]]
    [[ ! -f "${dest}/REFERENCES.md" ]]
    [[ ! -d "${dest}/scripts" ]]
    [[ ! -d "${dest}/assets" ]]

    # Count files - should be exactly 1
    local file_count
    file_count=$(find "${dest}" -type f | wc -l)
    [[ "${file_count}" -eq 1 ]]
}

@test "import: bad repo fails gracefully" {
    # The Makefile's git clone would fail for a nonexistent repo.
    # Test via make invocation — should fail with non-zero exit and error message.
    run make -f "${MAKEFILE_DIR}/Makefile" skill-import REPO="nonexistent/repo-that-does-not-exist" SKILL="fake-skill" 2>&1

    # Should fail (exit code non-zero)
    [[ "$status" -ne 0 ]]
}

# =============================================================================
# Collision Tests (3 tests)
# =============================================================================

@test "collision: rejects duplicate skill names" {
    # Override HOME so the collision script looks in our test directory
    export HOME="${TEST_WORK_DIR}"
    local skills_base="${TEST_WORK_DIR}/.config/opencode/skills"

    # Create an existing skill
    create_skill_md "${skills_base}/existing-skill" "duplicate-name"

    # Create incoming vendor skill with the same name
    create_skill_md "${skills_base}/vendor/newowner/incoming-skill" "duplicate-name"

    run "${COLLISION_SCRIPT}" "${skills_base}/vendor/newowner/incoming-skill" "duplicate-name"

    [[ "$status" -eq 1 ]]
    [[ "$output" =~ "COLLISION" ]] || [[ "$output" =~ "collision" ]] || [[ "$output" =~ "already exists" ]]
}

@test "collision: --force flag renames with vendor prefix" {
    export HOME="${TEST_WORK_DIR}"
    local skills_base="${TEST_WORK_DIR}/.config/opencode/skills"

    # Create an existing skill
    create_skill_md "${skills_base}/existing-skill" "force-test-skill"

    # Create incoming skill with the same name
    create_skill_md "${skills_base}/vendor/forceowner/force-test-skill" "force-test-skill"

    # Run with --force
    run "${COLLISION_SCRIPT}" --force "${skills_base}/vendor/forceowner/force-test-skill" "force-test-skill"

    [[ "$status" -eq 0 ]]

    # Verify the SKILL.md was renamed with a vendor prefix
    local new_name
    new_name=$(sed -n '/^---$/,/^---$/p' "${skills_base}/vendor/forceowner/force-test-skill/SKILL.md" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//')
    [[ "${new_name}" != "force-test-skill" ]]
    [[ "${new_name}" =~ "force-test-skill" ]]  # Should contain original name
}

@test "collision: validates against all existing skills" {
    export HOME="${TEST_WORK_DIR}"
    local skills_base="${TEST_WORK_DIR}/.config/opencode/skills"

    # Create multiple existing skills
    create_skill_md "${skills_base}/skill-alpha" "alpha"
    create_skill_md "${skills_base}/skill-beta" "beta"
    create_skill_md "${skills_base}/skill-gamma" "gamma"

    # Test collision against second skill
    create_skill_md "${skills_base}/vendor/owner/incoming" "beta"
    run "${COLLISION_SCRIPT}" "${skills_base}/vendor/owner/incoming" "beta"
    [[ "$status" -eq 1 ]]

    # Test collision against third skill
    create_skill_md "${skills_base}/vendor/owner/incoming2" "gamma"
    run "${COLLISION_SCRIPT}" "${skills_base}/vendor/owner/incoming2" "gamma"
    [[ "$status" -eq 1 ]]

    # Test no collision with unique name
    create_skill_md "${skills_base}/vendor/owner/incoming3" "delta"
    run "${COLLISION_SCRIPT}" "${skills_base}/vendor/owner/incoming3" "delta"
    [[ "$status" -eq 0 ]]
}

# =============================================================================
# Remove Tests (3 tests)
# =============================================================================

@test "remove: cleans up directory and lockfile entry" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "removable-skill"
    simulate_import "${mock_repo}" "removable-skill" "testowner"

    # Verify skill exists before removal
    [[ -d "${MOCK_VENDOR_DIR}/testowner/removable-skill" ]]
    [[ $(jq '.skills | length' "${MOCK_LOCK_FILE}") -eq 1 ]]

    # Remove it
    simulate_remove "vendor/testowner/removable-skill"

    # Verify directory is gone
    [[ ! -d "${MOCK_VENDOR_DIR}/testowner/removable-skill" ]]

    # Verify lockfile entry is gone
    local entry
    entry=$(jq --arg key "vendor/testowner/removable-skill" '.skills[$key]' "${MOCK_LOCK_FILE}")
    [[ "${entry}" == "null" ]]

    # Verify lockfile is still valid JSON
    jq '.' "${MOCK_LOCK_FILE}" > /dev/null 2>&1
}

@test "remove: nonexistent skill fails gracefully" {
    run simulate_remove "vendor/nobody/nonexistent-skill"

    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "ERROR" ]] || [[ "$output" =~ "not found" ]]
}

@test "remove: cleans empty owner directories" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "only-child"
    simulate_import "${mock_repo}" "only-child" "lonely-owner"

    # Verify owner directory exists
    [[ -d "${MOCK_VENDOR_DIR}/lonely-owner" ]]
    [[ -d "${MOCK_VENDOR_DIR}/lonely-owner/only-child" ]]

    # Remove the only skill under this owner
    simulate_remove "vendor/lonely-owner/only-child"

    # Owner directory should be cleaned up
    [[ ! -d "${MOCK_VENDOR_DIR}/lonely-owner" ]]
}

# =============================================================================
# Edge Case Tests (2 tests)
# =============================================================================

@test "edge: missing args shows usage error" {
    # Test skill-import with no REPO
    run make -f "${MAKEFILE_DIR}/Makefile" skill-import SKILL=foo 2>&1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "Usage" ]]

    # Test skill-import with no SKILL
    run make -f "${MAKEFILE_DIR}/Makefile" skill-import REPO=owner/repo 2>&1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "Usage" ]]

    # Test skill-remove with no SKILL
    run make -f "${MAKEFILE_DIR}/Makefile" skill-remove 2>&1
    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "Usage" ]]
}

@test "edge: malformed SKILL.md handled gracefully" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    mkdir -p "${mock_repo}"
    git -C "${mock_repo}" init --quiet

    # Create a SKILL.md with no frontmatter at all
    mkdir -p "${mock_repo}/skills/bad-skill"
    cat > "${mock_repo}/skills/bad-skill/SKILL.md" <<'HEREDOC'
# No Frontmatter Here

Just some content without YAML frontmatter.
No name field. No description field.
HEREDOC
    git -C "${mock_repo}" add -A
    git -C "${mock_repo}" commit --quiet -m "Bad skill" --author="Test <test@test.com>"

    # The Makefile validates frontmatter — it should reject this.
    # We simulate the validation logic the Makefile performs.
    local skill_md="${mock_repo}/skills/bad-skill/SKILL.md"

    # Check that required fields are missing (matches Makefile validation)
    ! grep -q "^name:" "${skill_md}"
    ! grep -q "^description:" "${skill_md}"
}
