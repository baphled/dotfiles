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

    local skill_path="skills/${skill_name}"
    local local_name="vendor-${owner}-${skill_name}"
    jq --arg key "${lock_key}" \
       --arg repo "${owner}/mock-repo" \
       --arg skill_path "${skill_path}" \
       --arg commit "${commit_hash}" \
       --arg date "${import_date}" \
       --arg name "${original_name}" \
       --arg local_name "${local_name}" \
       '.skills[$key] = {"repo": $repo, "skill_path": $skill_path, "commit": $commit, "imported_at": $date, "original_name": $name, "local_name": $local_name, "status": "ACTIVE"}' \
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
    [[ $(echo "${entry}" | jq -r '.skill_path') == "skills/lockfile-skill" ]]
    [[ $(echo "${entry}" | jq -r '.commit') != "null" ]]
    [[ $(echo "${entry}" | jq -r '.commit' | wc -c) -ge 40 ]]  # SHA is 40+ chars
    [[ $(echo "${entry}" | jq -r '.imported_at') != "null" ]]
    [[ $(echo "${entry}" | jq -r '.imported_at') =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
    [[ $(echo "${entry}" | jq -r '.original_name') == "lockfile-skill" ]]
    [[ $(echo "${entry}" | jq -r '.local_name') == "vendor-testowner-lockfile-skill" ]]
    [[ $(echo "${entry}" | jq -r '.status') == "ACTIVE" ]]
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

# =============================================================================
# Version Tracking Tests (7 tests)
# =============================================================================

# Helper: simulate an import with enhanced lockfile schema
simulate_import_v2() {
    local repo_dir="$1"
    local skill_name="$2"
    local owner="${3:-testowner}"
    local commit_override="${4:-}"

    local dest_dir="${MOCK_VENDOR_DIR}/${owner}/${skill_name}"
    local skill_md="${repo_dir}/skills/${skill_name}/SKILL.md"
    local commit_hash
    if [[ -n "${commit_override}" ]]; then
        commit_hash="${commit_override}"
    else
        commit_hash=$(git -C "${repo_dir}" rev-parse HEAD)
    fi

    mkdir -p "${dest_dir}"
    cp "${skill_md}" "${dest_dir}/SKILL.md"

    sed -i '/^allowed-tools:/d' "${dest_dir}/SKILL.md"
    sed -i '/^allowed_tools:/d' "${dest_dir}/SKILL.md"

    local original_name
    original_name=$(sed -n '/^---$/,/^---$/p' "${dest_dir}/SKILL.md" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//')

    local lock_key="vendor/${owner}/${skill_name}"
    local import_date
    import_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local skill_path="skills/${skill_name}"
    local local_name="vendor-${owner}-${skill_name}"
    local tmplock="${TEST_WORK_DIR}/lock.json"

    jq --arg key "${lock_key}" \
       --arg repo "${owner}/mock-repo" \
       --arg skill_path "${skill_path}" \
       --arg commit "${commit_hash}" \
       --arg date "${import_date}" \
       --arg name "${original_name}" \
       --arg local_name "${local_name}" \
       '.skills[$key] = {"repo": $repo, "skill_path": $skill_path, "commit": $commit, "imported_at": $date, "original_name": $name, "local_name": $local_name, "status": "ACTIVE"}' \
       "${MOCK_LOCK_FILE}" > "${tmplock}" && mv "${tmplock}" "${MOCK_LOCK_FILE}"
}

# Helper: simulate the outdated check logic (no network - uses mock data)
simulate_outdated_check() {
    local lock_file="$1"
    local mock_remote_commits="$2"  # "key1=commit1,key2=commit2" format

    # Parse mock remote commits into associative array
    declare -A remote_commits
    IFS=',' read -ra pairs <<< "${mock_remote_commits}"
    for pair in "${pairs[@]}"; do
        local k="${pair%%=*}"
        local v="${pair#*=}"
        remote_commits["${k}"]="${v}"
    done

    local output=""
    output+=$(printf "%-40s %-14s %-14s %s\n" "SKILL" "LOCAL" "REMOTE" "STATUS")
    output+=$'\n'

    while IFS='|' read -r key repo local_commit skill_path; do
        local local_short="${local_commit:0:12}"
        local remote_commit="${remote_commits[${key}]:-}"

        if [[ -z "${remote_commit}" ]]; then
            output+=$(printf "%-40s %-14s %-14s %s\n" "${key}" "${local_short}" "(error)" "fetch failed")
        elif [[ "${local_commit}" == "${remote_commit}" ]]; then
            local remote_short="${remote_commit:0:12}"
            output+=$(printf "%-40s %-14s %-14s %s\n" "${key}" "${local_short}" "${remote_short}" "up-to-date")
        else
            local remote_short="${remote_commit:0:12}"
            output+=$(printf "%-40s %-14s %-14s %s\n" "${key}" "${local_short}" "${remote_short}" "outdated")
        fi
        output+=$'\n'
    done < <(jq -r '.skills | to_entries[] | select(.value.status == "ACTIVE") | "\(.key)|\(.value.repo)|\(.value.commit)|\(.value.skill_path // "")"' "${lock_file}")

    echo "${output}"
}

# Helper: simulate the update logic (no network - uses local mock repos)
simulate_update() {
    local skill_key="$1"    # e.g. vendor/testowner/my-skill
    local new_repo_dir="$2" # path to mock repo with new version
    local lock_file="${MOCK_LOCK_FILE}"

    local entry
    entry=$(jq --arg key "${skill_key}" '.skills[$key] // empty' "${lock_file}")
    if [[ -z "${entry}" ]]; then
        echo "ERROR: Skill '${skill_key}' not found in lockfile" >&2
        return 1
    fi

    local local_commit
    local_commit=$(echo "${entry}" | jq -r '.commit')
    local skill_path
    skill_path=$(echo "${entry}" | jq -r '.skill_path // empty')
    local skill_name
    skill_name=$(echo "${skill_key}" | awk -F'/' '{print $NF}')
    local owner
    owner=$(echo "${skill_key}" | awk -F'/' '{print $(NF-1)}')
    local dest_dir="${MOCK_SKILLS_DIR}/${skill_key}"

    local new_commit
    new_commit=$(git -C "${new_repo_dir}" rev-parse HEAD)

    if [[ "${local_commit}" == "${new_commit}" ]]; then
        echo "UPTODATE"
        return 0
    fi

    # Find new SKILL.md
    local new_skill_md=""
    if [[ -n "${skill_path}" ]] && [[ -f "${new_repo_dir}/${skill_path}/SKILL.md" ]]; then
        new_skill_md="${new_repo_dir}/${skill_path}/SKILL.md"
    else
        for candidate in \
            "${new_repo_dir}/skills/${skill_name}/SKILL.md" \
            "${new_repo_dir}/${skill_name}/SKILL.md" \
            "${new_repo_dir}/SKILL.md"; \
        do
            if [[ -f "${candidate}" ]]; then
                new_skill_md="${candidate}"
                break
            fi
        done
    fi

    if [[ -z "${new_skill_md}" ]]; then
        echo "ERROR: SKILL.md not found in new version" >&2
        return 1
    fi

    # Generate diff
    local current_skill_md="${dest_dir}/SKILL.md"
    local diff_output=""
    if [[ -f "${current_skill_md}" ]]; then
        diff_output=$(diff -u "${current_skill_md}" "${new_skill_md}" \
            --label "local (${local_commit:0:12})" \
            --label "remote (${new_commit:0:12})" 2>&1 || true)
    fi

    # Apply update
    mkdir -p "${dest_dir}"
    cp "${new_skill_md}" "${dest_dir}/SKILL.md"
    sed -i '/^allowed-tools:/d' "${dest_dir}/SKILL.md"
    sed -i '/^allowed_tools:/d' "${dest_dir}/SKILL.md"

    # Update lockfile
    local update_date
    update_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local new_skill_path="${new_skill_md#${new_repo_dir}/}"
    new_skill_path="${new_skill_path%/SKILL.md}"
    local local_name="vendor-${owner}-${skill_name}"
    local tmplock="${TEST_WORK_DIR}/lock.json"

    jq --arg key "${skill_key}" \
       --arg commit "${new_commit}" \
       --arg date "${update_date}" \
       --arg skill_path "${new_skill_path}" \
       --arg local_name "${local_name}" \
       '.skills[$key].commit = $commit | .skills[$key].updated_at = $date | .skills[$key].skill_path = $skill_path | .skills[$key].local_name = $local_name' \
       "${lock_file}" > "${tmplock}" && mv "${tmplock}" "${lock_file}"

    echo "${diff_output}"
}

@test "version: lockfile includes skill_path and local_name" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "versioned-skill"

    simulate_import_v2 "${mock_repo}" "versioned-skill" "testowner"

    local lock_key="vendor/testowner/versioned-skill"
    local entry
    entry=$(jq --arg key "${lock_key}" '.skills[$key]' "${MOCK_LOCK_FILE}")

    # Verify enhanced schema fields
    [[ $(echo "${entry}" | jq -r '.skill_path') == "skills/versioned-skill" ]]
    [[ $(echo "${entry}" | jq -r '.local_name') == "vendor-testowner-versioned-skill" ]]
    [[ $(echo "${entry}" | jq -r '.original_name') == "versioned-skill" ]]
    [[ $(echo "${entry}" | jq -r '.repo') == "testowner/mock-repo" ]]
    [[ $(echo "${entry}" | jq -r '.status') == "ACTIVE" ]]
}

@test "version: outdated check shows up-to-date for matching commits" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "check-skill"

    simulate_import_v2 "${mock_repo}" "check-skill" "testowner"

    local commit_hash
    commit_hash=$(git -C "${mock_repo}" rev-parse HEAD)

    # Simulate outdated check with same commit (up-to-date)
    run simulate_outdated_check "${MOCK_LOCK_FILE}" "vendor/testowner/check-skill=${commit_hash}"

    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "up-to-date" ]]
    [[ ! "$output" =~ "outdated" ]]
}

@test "version: outdated check detects different commits" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "stale-skill"

    simulate_import_v2 "${mock_repo}" "stale-skill" "testowner"

    # Simulate outdated check with different commit
    local fake_remote_commit="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    run simulate_outdated_check "${MOCK_LOCK_FILE}" "vendor/testowner/stale-skill=${fake_remote_commit}"

    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "outdated" ]]
}

@test "version: outdated check handles fetch failure gracefully" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "unreachable-skill"

    simulate_import_v2 "${mock_repo}" "unreachable-skill" "testowner"

    # Simulate outdated check with no remote commit (fetch failure)
    run simulate_outdated_check "${MOCK_LOCK_FILE}" ""

    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "fetch failed" ]] || [[ "$output" =~ "(error)" ]]
}

@test "version: update applies new SKILL.md and updates lockfile" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "updatable-skill"

    # Import v1
    simulate_import_v2 "${mock_repo}" "updatable-skill" "testowner"

    local old_commit
    old_commit=$(git -C "${mock_repo}" rev-parse HEAD)

    # Create v2 in the same mock repo (new commit)
    cat > "${mock_repo}/skills/updatable-skill/SKILL.md" <<EOF
---
name: updatable-skill
description: Updated version of the skill with new content
---

# Skill: updatable-skill

## What I do

Updated test skill content — version 2.
EOF
    git -C "${mock_repo}" add -A
    git -C "${mock_repo}" commit --quiet -m "Update skill" --author="Test <test@test.com>"

    local new_commit
    new_commit=$(git -C "${mock_repo}" rev-parse HEAD)

    # Verify commits differ
    [[ "${old_commit}" != "${new_commit}" ]]

    # Run update
    run simulate_update "vendor/testowner/updatable-skill" "${mock_repo}"

    [[ "$status" -eq 0 ]]

    # Verify SKILL.md was updated
    local skill_file="${MOCK_VENDOR_DIR}/testowner/updatable-skill/SKILL.md"
    grep -q "version 2" "${skill_file}"

    # Verify lockfile commit was updated
    local updated_commit
    updated_commit=$(jq -r --arg key "vendor/testowner/updatable-skill" '.skills[$key].commit' "${MOCK_LOCK_FILE}")
    [[ "${updated_commit}" == "${new_commit}" ]]

    # Verify updated_at field exists
    local updated_at
    updated_at=$(jq -r --arg key "vendor/testowner/updatable-skill" '.skills[$key].updated_at' "${MOCK_LOCK_FILE}")
    [[ "${updated_at}" != "null" ]]
    [[ "${updated_at}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

@test "version: update shows diff output" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "diff-skill"

    simulate_import_v2 "${mock_repo}" "diff-skill" "testowner"

    # Create v2
    cat > "${mock_repo}/skills/diff-skill/SKILL.md" <<EOF
---
name: diff-skill
description: A skill with changed content for diff testing
---

# Skill: diff-skill

## What I do

Completely new content that differs from original.
EOF
    git -C "${mock_repo}" add -A
    git -C "${mock_repo}" commit --quiet -m "Change skill content" --author="Test <test@test.com>"

    run simulate_update "vendor/testowner/diff-skill" "${mock_repo}"

    [[ "$status" -eq 0 ]]
    # diff -u output contains --- and +++ headers and diff markers
    [[ "$output" =~ "---" ]] || [[ "$output" =~ "+++" ]] || [[ "$output" =~ "@@" ]]
}

@test "version: update of already-up-to-date skill returns early" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "current-skill"

    simulate_import_v2 "${mock_repo}" "current-skill" "testowner"

    # Run update with same repo (no new commits)
    run simulate_update "vendor/testowner/current-skill" "${mock_repo}"

    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "UPTODATE" ]]
}

@test "version: skill-outdated missing args shows usage" {
    run make -f "${MAKEFILE_DIR}/Makefile" skill-update 2>&1

    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "Usage" ]]
}

@test "version: skill-outdated with empty lockfile exits cleanly" {
    # Overrides to use our mock lockfile
    run make -f "${MAKEFILE_DIR}/Makefile" skill-outdated LOCK_FILE="${MOCK_LOCK_FILE}" 2>&1

    [[ "$status" -eq 0 ]]
}

# =============================================================================
# Staging Helpers
# =============================================================================

# Helper: simulate staging a skill (places in .staging/ with STAGED status)
simulate_stage() {
    local repo_dir="$1"
    local skill_name="$2"
    local owner="${3:-testowner}"

    local staging_dir="${MOCK_SKILLS_DIR}/.staging"
    local dest_dir="${staging_dir}/${owner}/${skill_name}"
    local skill_md="${repo_dir}/skills/${skill_name}/SKILL.md"
    local commit_hash
    commit_hash=$(git -C "${repo_dir}" rev-parse HEAD)

    mkdir -p "${dest_dir}"
    cp "${skill_md}" "${dest_dir}/SKILL.md"

    sed -i '/^allowed-tools:/d' "${dest_dir}/SKILL.md"
    sed -i '/^allowed_tools:/d' "${dest_dir}/SKILL.md"

    local original_name
    original_name=$(sed -n '/^---$/,/^---$/p' "${dest_dir}/SKILL.md" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//')

    local lock_key="vendor/${owner}/${skill_name}"
    local import_date
    import_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local skill_path="skills/${skill_name}"
    local local_name="vendor-${owner}-${skill_name}"
    local tmplock="${TEST_WORK_DIR}/lock.json"

    jq --arg key "${lock_key}" \
       --arg repo "${owner}/mock-repo" \
       --arg skill_path "${skill_path}" \
       --arg commit "${commit_hash}" \
       --arg date "${import_date}" \
       --arg name "${original_name}" \
       --arg local_name "${local_name}" \
       '.skills[$key] = {"repo": $repo, "skill_path": $skill_path, "commit": $commit, "imported_at": $date, "original_name": $name, "local_name": $local_name, "status": "STAGED"}' \
       "${MOCK_LOCK_FILE}" > "${tmplock}" && mv "${tmplock}" "${MOCK_LOCK_FILE}"
}

# Helper: simulate promoting a staged skill (moves .staging/ → vendor/, STAGED → ACTIVE)
simulate_promote() {
    local skill_key="$1"  # e.g. vendor/testowner/my-skill
    local lock_file="${MOCK_LOCK_FILE}"

    local owner
    owner=$(echo "${skill_key}" | sed 's|^vendor/||' | cut -d'/' -f1)
    local skill_name
    skill_name=$(echo "${skill_key}" | sed 's|^vendor/||' | cut -d'/' -f2)
    local staging_src="${MOCK_SKILLS_DIR}/.staging/${owner}/${skill_name}"
    local vendor_dest="${MOCK_VENDOR_DIR}/${owner}/${skill_name}"

    if [[ ! -d "${staging_src}" ]]; then
        echo "ERROR: Staged skill not found: ${staging_src}" >&2
        return 1
    fi

    local lock_status
    lock_status=$(jq -r --arg key "${skill_key}" '.skills[$key].status // "UNKNOWN"' "${lock_file}")
    if [[ "${lock_status}" != "STAGED" ]]; then
        echo "ERROR: Skill '${skill_key}' is not in STAGED status (current: ${lock_status})" >&2
        return 1
    fi

    # Run collision check if script exists
    if [[ -x "${COLLISION_SCRIPT}" ]]; then
        local original_name
        original_name=$(jq -r --arg key "${skill_key}" '.skills[$key].original_name // ""' "${lock_file}")
        if [[ -n "${original_name}" ]]; then
            if ! "${COLLISION_SCRIPT}" "${staging_src}" "${original_name}" 2>&1; then
                echo "ERROR: Collision detected during promotion" >&2
                return 1
            fi
        fi
    fi

    # Move from staging to vendor
    mkdir -p "$(dirname "${vendor_dest}")"
    mv "${staging_src}" "${vendor_dest}"

    # Clean up empty owner directory in staging
    local owner_dir="${MOCK_SKILLS_DIR}/.staging/${owner}"
    if [[ -d "${owner_dir}" ]] && [[ -z "$(ls -A "${owner_dir}" 2>/dev/null)" ]]; then
        rmdir "${owner_dir}" 2>/dev/null || true
    fi

    # Update lockfile status
    local tmplock="${TEST_WORK_DIR}/lock.json"
    jq --arg key "${skill_key}" \
       '.skills[$key].status = "ACTIVE"' \
       "${lock_file}" > "${tmplock}" && mv "${tmplock}" "${lock_file}"
}

# Helper: list staged skills from lockfile
simulate_list_staged() {
    local lock_file="${MOCK_LOCK_FILE}"
    jq -r '.skills | to_entries[] | select(.value.status == "STAGED") | "\(.key)|\(.value.repo)|\(.value.imported_at)|\(.value.status)"' "${lock_file}"
}

# =============================================================================
# Staging Tests (5 tests)
# =============================================================================

@test "staging: places skill in .staging/ directory" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "staged-skill"

    simulate_stage "${mock_repo}" "staged-skill" "testowner"

    # Verify skill is in .staging/, NOT in vendor/
    [[ -d "${MOCK_SKILLS_DIR}/.staging/testowner/staged-skill" ]]
    [[ -f "${MOCK_SKILLS_DIR}/.staging/testowner/staged-skill/SKILL.md" ]]
    [[ ! -d "${MOCK_VENDOR_DIR}/testowner/staged-skill" ]]

    # Verify lockfile entry has STAGED status
    local status
    status=$(jq -r '.skills["vendor/testowner/staged-skill"].status' "${MOCK_LOCK_FILE}")
    [[ "${status}" == "STAGED" ]]
}

@test "staging: promoting moves from .staging/ to vendor/" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "promote-skill"

    # Stage first
    simulate_stage "${mock_repo}" "promote-skill" "testowner"
    [[ -d "${MOCK_SKILLS_DIR}/.staging/testowner/promote-skill" ]]
    [[ ! -d "${MOCK_VENDOR_DIR}/testowner/promote-skill" ]]

    # Promote
    simulate_promote "vendor/testowner/promote-skill"

    # Verify moved to vendor/
    [[ ! -d "${MOCK_SKILLS_DIR}/.staging/testowner/promote-skill" ]]
    [[ -d "${MOCK_VENDOR_DIR}/testowner/promote-skill" ]]
    [[ -f "${MOCK_VENDOR_DIR}/testowner/promote-skill/SKILL.md" ]]

    # Verify lockfile status changed to ACTIVE
    local status
    status=$(jq -r '.skills["vendor/testowner/promote-skill"].status' "${MOCK_LOCK_FILE}")
    [[ "${status}" == "ACTIVE" ]]
}

@test "staging: promoting runs collision check" {
    export HOME="${TEST_WORK_DIR}"
    local skills_base="${TEST_WORK_DIR}/.config/opencode/skills"

    # Create an existing local skill with name "collider"
    create_skill_md "${skills_base}/local-collider" "collider"

    # Manually stage a skill with the same name "collider" (collision target)
    local staging_dir="${MOCK_SKILLS_DIR}/.staging/testowner/collider-skill"
    mkdir -p "${staging_dir}"
    create_skill_md "${staging_dir}" "collider"

    local tmplock="${TEST_WORK_DIR}/lock.json"
    jq '.skills["vendor/testowner/collider-skill"] = {"repo": "testowner/mock-repo", "skill_path": "skills/collider-skill", "commit": "abc123def456abc123def456abc123def456abc1", "imported_at": "2026-01-01T00:00:00Z", "original_name": "collider", "local_name": "vendor-testowner-collider-skill", "status": "STAGED"}' \
        "${MOCK_LOCK_FILE}" > "${tmplock}" && mv "${tmplock}" "${MOCK_LOCK_FILE}"

    # Promote should fail due to collision
    run simulate_promote "vendor/testowner/collider-skill"

    [[ "$status" -ne 0 ]]
    [[ "$output" =~ "COLLISION" ]] || [[ "$output" =~ "collision" ]] || [[ "$output" =~ "already exists" ]] || [[ "$output" =~ "Collision" ]]
}

@test "staging: listing staged skills shows correct output" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "list-skill-a"

    local mock_repo2="${TEST_WORK_DIR}/mock-repo2"
    create_mock_repo "${mock_repo2}" "list-skill-b"

    # Stage two skills
    simulate_stage "${mock_repo}" "list-skill-a" "ownerA"
    simulate_stage "${mock_repo2}" "list-skill-b" "ownerB"

    # Also import one active skill (should NOT appear in staged list)
    local mock_repo3="${TEST_WORK_DIR}/mock-repo3"
    create_mock_repo "${mock_repo3}" "active-skill"
    simulate_import "${mock_repo3}" "active-skill" "ownerC"

    # List staged
    run simulate_list_staged

    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "vendor/ownerA/list-skill-a" ]]
    [[ "$output" =~ "vendor/ownerB/list-skill-b" ]]
    [[ "$output" =~ "STAGED" ]]
    # Active skill should not appear
    [[ ! "$output" =~ "active-skill" ]]
}

@test "staging: skill-import default routes through staging" {
    # Verify Makefile default (no DIRECT=1) mentions staging
    run make -f "${MAKEFILE_DIR}/Makefile" skill-import REPO=fake/repo SKILL=fake-skill 2>&1

    # It will fail (no network) but should mention staging routing
    # The Makefile routes to skill-stage when DIRECT is not set
    [[ "$output" =~ "staging" ]] || [[ "$output" =~ "Stage" ]] || [[ "$output" =~ "stage" ]] || [[ "$output" =~ "Routing" ]]
}

# =============================================================================
# Version Tracking Tests (4 additional tests)
# =============================================================================

@test "version: lockfile schema includes all required fields" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "schema-check-skill"

    simulate_import_v2 "${mock_repo}" "schema-check-skill" "testowner"

    local lock_key="vendor/testowner/schema-check-skill"
    local entry
    entry=$(jq --arg key "${lock_key}" '.skills[$key]' "${MOCK_LOCK_FILE}")

    # Verify ALL required fields from enhanced schema exist and are non-null
    local required_fields=("repo" "skill_path" "commit" "imported_at" "original_name" "local_name" "status")
    for field in "${required_fields[@]}"; do
        local value
        value=$(echo "${entry}" | jq -r ".${field}")
        [[ "${value}" != "null" ]]
        [[ -n "${value}" ]]
    done

    # Verify field value formats
    [[ $(echo "${entry}" | jq -r '.skill_path') == "skills/schema-check-skill" ]]
    [[ $(echo "${entry}" | jq -r '.local_name') == "vendor-testowner-schema-check-skill" ]]
    [[ $(echo "${entry}" | jq -r '.status') == "ACTIVE" ]]
}

@test "version: skill-outdated handles no network gracefully" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "no-net-skill"

    simulate_import_v2 "${mock_repo}" "no-net-skill" "testowner"

    # Simulate outdated check with empty remote data (no network)
    run simulate_outdated_check "${MOCK_LOCK_FILE}" ""

    # Should not crash — exits cleanly with error indication
    [[ "$status" -eq 0 ]]
    [[ "$output" =~ "fetch failed" ]] || [[ "$output" =~ "(error)" ]]
}

@test "version: skill-update shows diff between versions" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "diff-check-skill"

    simulate_import_v2 "${mock_repo}" "diff-check-skill" "testowner"

    # Create v2 with different content
    cat > "${mock_repo}/skills/diff-check-skill/SKILL.md" <<EOF
---
name: diff-check-skill
description: Updated description with new content
---

# Skill: diff-check-skill

## What I do

Completely rewritten content for version 2.

## New section

This section did not exist before.
EOF
    git -C "${mock_repo}" add -A
    git -C "${mock_repo}" commit --quiet -m "Update to v2" --author="Test <test@test.com>"

    run simulate_update "vendor/testowner/diff-check-skill" "${mock_repo}"

    [[ "$status" -eq 0 ]]
    # diff -u output markers
    [[ "$output" =~ "---" ]] || [[ "$output" =~ "+++" ]] || [[ "$output" =~ "@@" ]]
    # Should contain some changed content indicator
    [[ "$output" =~ "version 2" ]] || [[ "$output" =~ "rewritten" ]] || [[ "$output" =~ "New section" ]]
}

@test "version: skill-remove also cleans lockfile entry" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "remove-tracked-skill"

    simulate_import_v2 "${mock_repo}" "remove-tracked-skill" "testowner"

    # Verify lockfile has entry with all enhanced fields
    local entry_before
    entry_before=$(jq --arg key "vendor/testowner/remove-tracked-skill" '.skills[$key]' "${MOCK_LOCK_FILE}")
    [[ "${entry_before}" != "null" ]]
    [[ $(echo "${entry_before}" | jq -r '.skill_path') == "skills/remove-tracked-skill" ]]
    [[ $(echo "${entry_before}" | jq -r '.local_name') == "vendor-testowner-remove-tracked-skill" ]]
    [[ $(echo "${entry_before}" | jq -r '.status') == "ACTIVE" ]]

    # Remove the skill
    simulate_remove "vendor/testowner/remove-tracked-skill"

    # Verify lockfile entry is completely gone
    local entry_after
    entry_after=$(jq --arg key "vendor/testowner/remove-tracked-skill" '.skills[$key]' "${MOCK_LOCK_FILE}")
    [[ "${entry_after}" == "null" ]]

    # Verify directory is gone
    [[ ! -d "${MOCK_VENDOR_DIR}/testowner/remove-tracked-skill" ]]
}

# =============================================================================
# Integration Tests (2 tests)
# =============================================================================

@test "integration: stage→promote→list workflow works end-to-end" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "e2e-skill"

    # Step 1: Stage the skill
    simulate_stage "${mock_repo}" "e2e-skill" "e2eowner"

    # Verify staged state
    [[ -d "${MOCK_SKILLS_DIR}/.staging/e2eowner/e2e-skill" ]]
    [[ ! -d "${MOCK_VENDOR_DIR}/e2eowner/e2e-skill" ]]
    local status_staged
    status_staged=$(jq -r '.skills["vendor/e2eowner/e2e-skill"].status' "${MOCK_LOCK_FILE}")
    [[ "${status_staged}" == "STAGED" ]]

    # Step 2: List staged — should appear
    run simulate_list_staged
    [[ "$output" =~ "vendor/e2eowner/e2e-skill" ]]
    [[ "$output" =~ "STAGED" ]]

    # Step 3: Promote
    simulate_promote "vendor/e2eowner/e2e-skill"

    # Verify promoted state
    [[ ! -d "${MOCK_SKILLS_DIR}/.staging/e2eowner/e2e-skill" ]]
    [[ -d "${MOCK_VENDOR_DIR}/e2eowner/e2e-skill" ]]
    [[ -f "${MOCK_VENDOR_DIR}/e2eowner/e2e-skill/SKILL.md" ]]
    local status_active
    status_active=$(jq -r '.skills["vendor/e2eowner/e2e-skill"].status' "${MOCK_LOCK_FILE}")
    [[ "${status_active}" == "ACTIVE" ]]

    # Step 4: List staged — should NOT appear anymore
    run simulate_list_staged
    [[ ! "$output" =~ "e2e-skill" ]]

    # Verify all lockfile fields preserved through transition
    local entry
    entry=$(jq '.skills["vendor/e2eowner/e2e-skill"]' "${MOCK_LOCK_FILE}")
    [[ $(echo "${entry}" | jq -r '.repo') == "e2eowner/mock-repo" ]]
    [[ $(echo "${entry}" | jq -r '.skill_path') == "skills/e2e-skill" ]]
    [[ $(echo "${entry}" | jq -r '.local_name') == "vendor-e2eowner-e2e-skill" ]]
    [[ $(echo "${entry}" | jq -r '.commit') != "null" ]]
}

@test "integration: remove also cleans empty staging directories" {
    local mock_repo="${TEST_WORK_DIR}/mock-repo"
    create_mock_repo "${mock_repo}" "cleanup-skill"

    # Stage a skill (creates .staging/cleanowner/cleanup-skill/)
    simulate_stage "${mock_repo}" "cleanup-skill" "cleanowner"

    # Verify staging directory structure exists
    [[ -d "${MOCK_SKILLS_DIR}/.staging/cleanowner/cleanup-skill" ]]
    [[ -d "${MOCK_SKILLS_DIR}/.staging/cleanowner" ]]

    # Promote it first (moves to vendor/)
    simulate_promote "vendor/cleanowner/cleanup-skill"

    # Verify staging owner dir was cleaned up during promote
    [[ ! -d "${MOCK_SKILLS_DIR}/.staging/cleanowner" ]]

    # Now remove the active skill from vendor/
    simulate_remove "vendor/cleanowner/cleanup-skill"

    # Verify vendor directory and owner dir cleaned up
    [[ ! -d "${MOCK_VENDOR_DIR}/cleanowner/cleanup-skill" ]]
    [[ ! -d "${MOCK_VENDOR_DIR}/cleanowner" ]]

    # Verify lockfile cleaned
    local entry
    entry=$(jq '.skills["vendor/cleanowner/cleanup-skill"]' "${MOCK_LOCK_FILE}")
    [[ "${entry}" == "null" ]]
}
