#!/usr/bin/env bats
# Test suite for agent configuration validation
# Tests core agent system configuration without network access

load test_helper

# =============================================================================
# Test Setup & Helpers
# =============================================================================

setup() {
    # Create isolated test environment
    export TEST_WORK_DIR="$(mktemp -d)"
    export CONFIG_DIR="${BATS_TEST_DIRNAME}/.."
    export SKILLS_DIR="${CONFIG_DIR}/skills"
    export AGENTS_MD="${CONFIG_DIR}/AGENTS.md"
    export JSONC_FILE="${CONFIG_DIR}/oh-my-opencode.jsonc"
}

teardown() {
    if [[ -n "${TEST_WORK_DIR}" && -d "${TEST_WORK_DIR}" ]]; then
        rm -rf "${TEST_WORK_DIR}"
    fi
}

# Helper: Check if file exists and is readable
file_exists_and_readable() {
    local file="$1"
    [[ -f "${file}" ]] && [[ -r "${file}" ]]
}

# Helper: Check if directory exists
dir_exists() {
    local dir="$1"
    [[ -d "${dir}" ]]
}

# Helper: Validate JSONC syntax (basic check - not full parser)
validate_jsonc_syntax() {
    local file="$1"
    # Check for balanced braces and brackets
    local open_braces
    local close_braces
    local open_brackets
    local close_brackets
    
    open_braces=$(grep -o '{' "${file}" | wc -l)
    close_braces=$(grep -o '}' "${file}" | wc -l)
    open_brackets=$(grep -o '\[' "${file}" | wc -l)
    close_brackets=$(grep -o '\]' "${file}" | wc -l)
    
    [[ "${open_braces}" -eq "${close_braces}" ]] && \
    [[ "${open_brackets}" -eq "${close_brackets}" ]]
}

# Helper: Extract agent names from JSONC
get_agents_from_jsonc() {
    local file="$1"
    # Extract agent names from "agents": { "name": { ... } }
    grep -oP '"agents":\s*\{\s*"\K[^"]+(?="\s*:)' "${file}" | sort -u
}

# Helper: Check if skill directory exists
skill_dir_exists() {
    local skill_name="$1"
    dir_exists "${SKILLS_DIR}/${skill_name}"
}

# Helper: Check if SKILL.md has frontmatter field
has_frontmatter_field() {
    local skill_dir="$1"
    local field="$2"
    local skill_md="${skill_dir}/SKILL.md"
    
    if [[ ! -f "${skill_md}" ]]; then
        return 1
    fi
    
    # Extract frontmatter (between --- markers) and check for field
    sed -n '/^---$/,/^---$/p' "${skill_md}" | grep -q "^${field}:"
}

# Helper: Get all user agents from AGENTS.md
get_user_agents() {
    # Extract agent names from AGENTS.md (agents defined in oh-my-opencode.jsonc)
    # This is a simple heuristic - looks for agent sections
    grep -oP '^\s*"[a-z-]+"\s*:\s*\{' "${JSONC_FILE}" | \
        sed 's/[^"]*"\([^"]*\)".*/\1/' | \
        grep -v "^\$" | sort -u
}

# =============================================================================
# Configuration File Existence Tests (2 tests)
# =============================================================================

@test "config: AGENTS.md exists and is readable" {
    file_exists_and_readable "${AGENTS_MD}"
}

@test "config: oh-my-opencode.jsonc exists and is readable" {
    file_exists_and_readable "${JSONC_FILE}"
}

# =============================================================================
# Agent Configuration Tests (3 tests)
# =============================================================================

@test "config: all agents have prompt_append in oh-my-opencode.jsonc" {
    # Get list of agents from jsonc
    local agents
    agents=$(get_agents_from_jsonc "${JSONC_FILE}")
    
    # Expected agents that should have prompt_append
    local expected_agents=("sisyphus" "sisyphus-junior" "hephaestus" "atlas" "oracle" "librarian" "explore" "metis" "momus" "multimodal-looker")
    
    # Check each expected agent has prompt_append
    for agent in "${expected_agents[@]}"; do
        # Look for agent section with prompt_append
        grep -A 10 "\"${agent}\":" "${JSONC_FILE}" | grep -q "prompt_append"
    done
}

@test "config: agents-rules-core.md section file exists" {
    file_exists_and_readable "${CONFIG_DIR}/agents-rules-core.md"
}

@test "config: agents-rules-commit.md section file exists" {
    file_exists_and_readable "${CONFIG_DIR}/agents-rules-commit.md"
}

@test "config: agents-rules-routing.md section file exists" {
    file_exists_and_readable "${CONFIG_DIR}/agents-rules-routing.md"
}

# =============================================================================
# JSONC Validation Tests (2 tests)
# =============================================================================

@test "config: oh-my-opencode.jsonc has valid JSON structure" {
    validate_jsonc_syntax "${JSONC_FILE}"
}

@test "config: oh-my-opencode.jsonc contains agents section" {
    grep -q '"agents"' "${JSONC_FILE}"
}

# =============================================================================
# Skills Directory Tests (2 tests)
# =============================================================================

@test "config: skills directory exists" {
    dir_exists "${SKILLS_DIR}"
}

@test "config: core-auto-detect skill exists" {
    skill_dir_exists "core-auto-detect"
}

# =============================================================================
# Skill Validation Tests (3 tests)
# =============================================================================

@test "config: core-auto-detect has SKILL.md with name frontmatter" {
    local skill_dir="${SKILLS_DIR}/core-auto-detect"
    [[ -f "${skill_dir}/SKILL.md" ]]
    has_frontmatter_field "${skill_dir}" "name"
}

@test "config: core-auto-detect has SKILL.md with description frontmatter" {
    local skill_dir="${SKILLS_DIR}/core-auto-detect"
    has_frontmatter_field "${skill_dir}" "description"
}

@test "config: core-auto-detect SKILL.md contains detection rules (not stub)" {
    local skill_md="${SKILLS_DIR}/core-auto-detect/SKILL.md"
    # Check for real detection rules (Go, Node.js, etc.)
    grep -q "Detection:" "${skill_md}" || grep -q "go.mod" "${skill_md}"
}

# =============================================================================
# Referenced Skills Existence Tests (2 tests)
# =============================================================================

@test "config: most skills referenced in core-auto-detect exist as directories" {
    local skill_md="${SKILLS_DIR}/core-auto-detect/SKILL.md"
    
    # Extract skill names from backticks (e.g., `golang`, `jest`)
    local referenced_skills
    referenced_skills=$(grep -oP '`\K[a-z-]+(?=`)' "${skill_md}" | sort -u)
    
    # Count how many referenced skills exist
    local found=0
    local total=0
    
    while IFS= read -r skill; do
        [[ -z "${skill}" ]] && continue
        # Skip non-skill references (like "go.mod", "package.json")
        [[ "${skill}" =~ \. ]] && continue
        
        total=$((total + 1))
        
        # Check if skill directory exists
        if [[ -d "${SKILLS_DIR}/${skill}" ]]; then
            found=$((found + 1))
        fi
    done <<< "${referenced_skills}"
    
    # At least 80% of referenced skills should exist
    [[ ${total} -gt 0 ]]
    [[ $((found * 100 / total)) -ge 80 ]]
}

@test "config: referenced skills have SKILL.md files" {
    local skill_md="${SKILLS_DIR}/core-auto-detect/SKILL.md"
    
    # Extract skill names
    local referenced_skills
    referenced_skills=$(grep -oP '`\K[a-z-]+(?=`)' "${skill_md}" | sort -u)
    
    # Check a sample of referenced skills have SKILL.md
    local count=0
    local found_with_md=0
    
    while IFS= read -r skill; do
        [[ -z "${skill}" ]] && continue
        [[ "${skill}" =~ \. ]] && continue
        
        if [[ -d "${SKILLS_DIR}/${skill}" ]]; then
            count=$((count + 1))
            if [[ -f "${SKILLS_DIR}/${skill}/SKILL.md" ]]; then
                found_with_md=$((found_with_md + 1))
            fi
        fi
    done <<< "${referenced_skills}"
    
    # At least some skills should be found and validated
    [[ ${count} -gt 0 ]]
    # All found skills should have SKILL.md
    [[ ${found_with_md} -eq ${count} ]]
}

# =============================================================================
# JSONC Content Validation Tests (3 tests)
# =============================================================================

@test "config: oh-my-opencode.jsonc has sisyphus agent with prompt_append" {
    grep -A 15 '"sisyphus":' "${JSONC_FILE}" | grep -q "prompt_append"
}

@test "config: oh-my-opencode.jsonc has sisyphus-junior agent with prompt_append" {
    grep -A 15 '"sisyphus-junior":' "${JSONC_FILE}" | grep -q "prompt_append"
}

@test "config: oh-my-opencode.jsonc has oracle agent with prompt_append" {
    grep -A 10 '"oracle":' "${JSONC_FILE}" | grep -q "prompt_append"
}

# =============================================================================
# AGENTS.md Content Tests (2 tests)
# =============================================================================

@test "config: AGENTS.md contains Commit Rules section" {
    grep -q "Commit Rules" "${AGENTS_MD}"
}

@test "config: AGENTS.md contains Change Request Verification section" {
    grep -q "Change Request Verification" "${AGENTS_MD}"
}

# =============================================================================
# Integration Tests (2 tests)
# =============================================================================

@test "config: agents-rules files are referenced in AGENTS.md or jsonc" {
    # Check that the section files are mentioned somewhere in the config
    grep -r "agents-rules" "${CONFIG_DIR}" | grep -q "agents-rules-core\|agents-rules-commit\|agents-rules-routing"
}

@test "config: core-auto-detect skill is properly integrated" {
    # Verify skill exists, has proper structure, and is referenced
    local skill_dir="${SKILLS_DIR}/core-auto-detect"
    
    # Check directory exists
    [[ -d "${skill_dir}" ]]
    
    # Check SKILL.md exists
    [[ -f "${skill_dir}/SKILL.md" ]]
    
    # Check it has required frontmatter
    has_frontmatter_field "${skill_dir}" "name"
    has_frontmatter_field "${skill_dir}" "description"
    
    # Check it has content (not stub)
    [[ $(wc -l < "${skill_dir}/SKILL.md") -gt 20 ]]
}

# =============================================================================
# Edge Case Tests (2 tests)
# =============================================================================

@test "config: AGENTS.md is not empty" {
    [[ -s "${AGENTS_MD}" ]]
}

@test "config: oh-my-opencode.jsonc is not empty" {
    [[ -s "${JSONC_FILE}" ]]
}
