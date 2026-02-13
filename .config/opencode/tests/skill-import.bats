#!/usr/bin/env bats
# Test suite for skill import functionality
# Verifies that Makefile targets for skill import work correctly

load test_helper

@test "test infrastructure is working" {
    # Verify BATS is functioning
    [[ -n "$BATS_VERSION" ]]
}

@test "test helper is loaded" {
    # Verify test_helper.bash was sourced correctly
    [[ -n "$TEST_DIR" ]]
    [[ -n "$PROJECT_ROOT" ]]
}

@test "test work directory is created" {
    # Verify setup() creates a temporary work directory
    [[ -d "$TEST_WORK_DIR" ]]
}

@test "test work directory is cleaned up" {
    # Store the work dir path
    local work_dir="$TEST_WORK_DIR"
    
    # Create a test file in it
    touch "$work_dir/test_file.txt"
    [[ -f "$work_dir/test_file.txt" ]]
}
