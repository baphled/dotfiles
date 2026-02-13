#!/usr/bin/env bash
# Test helper functions for BATS tests
# Provides common setup, teardown, and utility functions

# Test environment variables
export TEST_DIR="${BATS_TEST_DIRNAME}"
export TEST_TEMP_DIR="${BATS_TMPDIR}"
export PROJECT_ROOT="$(cd "${TEST_DIR}/../.." && pwd)"

# Setup function - runs before each test
setup() {
    # Create a temporary directory for test artifacts
    export TEST_WORK_DIR="$(mktemp -d)"
    
    # Source any environment files needed for tests
    if [[ -f "${PROJECT_ROOT}/.env.test" ]]; then
        source "${PROJECT_ROOT}/.env.test"
    fi
}

# Teardown function - runs after each test
teardown() {
    # Clean up temporary test directory
    if [[ -n "${TEST_WORK_DIR}" && -d "${TEST_WORK_DIR}" ]]; then
        rm -rf "${TEST_WORK_DIR}"
    fi
}

# Utility: Assert command succeeds
assert_success() {
    local cmd="$@"
    if ! eval "$cmd"; then
        echo "Command failed: $cmd" >&2
        return 1
    fi
}

# Utility: Assert command fails
assert_failure() {
    local cmd="$@"
    if eval "$cmd"; then
        echo "Command succeeded but should have failed: $cmd" >&2
        return 1
    fi
}

# Utility: Assert file exists
assert_file_exists() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "File does not exist: $file" >&2
        return 1
    fi
}

# Utility: Assert directory exists
assert_dir_exists() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        echo "Directory does not exist: $dir" >&2
        return 1
    fi
}

# Utility: Assert output contains string
assert_output_contains() {
    local output="$1"
    local expected="$2"
    if [[ ! "$output" =~ $expected ]]; then
        echo "Output does not contain: $expected" >&2
        echo "Actual output: $output" >&2
        return 1
    fi
}
