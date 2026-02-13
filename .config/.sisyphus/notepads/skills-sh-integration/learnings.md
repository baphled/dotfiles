## Task 8: BATS Tests for Staging and Version Tracking

### Key Patterns

1. **Simulation helpers mirror Makefile logic** — `simulate_stage`, `simulate_promote`, `simulate_list_staged` replicate exact Makefile behaviour without network access. Each matches the corresponding target's directory operations and lockfile mutations.

2. **Status transitions as test assertions** — The `STAGED` → `ACTIVE` status transition is verified in both unit and integration tests. Lockfile is the single source of truth; directory location is the physical manifestation.

3. **Collision detection during promotion** — Tests override `HOME` to isolate the collision script's scan of `$HOME/.config/opencode/skills/**/SKILL.md`. Collision test creates dirs manually instead of using `create_mock_repo` to avoid git committer config issues in temp environments.

4. **No mock repos where unnecessary** — The collision-on-promote test originally used `create_mock_repo` but failed because git requires committer identity even with `--author`. Fixed by manually creating the staging directory and lockfile entry.

5. **Schema completeness testing** — Iterates over all required fields (`repo`, `skill_path`, `commit`, `imported_at`, `original_name`, `local_name`, `status`) and asserts non-null + non-empty for each.

### Test Coverage (11 new tests, 33 total)

| Category | New Tests | Total |
|----------|-----------|-------|
| Staging | 5 | 5 |
| Version tracking (additional) | 4 | 13 |
| Integration | 2 | 2 |
| **Grand total** | **11** | **33** |

### Gotchas

- **Git committer identity in temp dirs**: `create_mock_repo` passes `--author` but git still requires a committer. For tests that don't need real git history, create directories manually.
- **`simulate_list_staged` uses jq filter**: Only returns entries with `"status": "STAGED"` — active skills excluded by design, matching `make skill-staged` behaviour.
- **Integration test verifies field preservation**: The stage→promote→list test checks that all lockfile fields survive the status transition, not just the status field itself.

---

## Task 7: Version Tracking — Lockfile and skill-outdated

### Key Design Decisions

1. **Enhanced lockfile schema**: Added `skill_path` (relative path within repo, e.g. `skills/frontend-design`) and `local_name` (vendor-prefixed name, e.g. `vendor-anthropics-frontend-design`). These fields enable precise outdated checking (path-scoped commit queries) and future namespace management.

2. **Dual GitHub API strategy**: `skill-outdated` tries `gh api` first (authenticated, higher rate limits) then falls back to unauthenticated `curl`. This handles both developer workstations (gh authenticated) and CI environments (may only have curl).

3. **Path-scoped commit checking**: When checking for updates via `gh api`, the `skill_path` is passed to `repos/{owner}/{repo}/commits?path={skill_path}` to only detect commits that actually changed the skill, not every repo commit. Falls back to HEAD commit if path isn't available.

4. **Interactive confirmation by default**: `skill-update` shows `diff -u` output and requires `y/N` confirmation before applying. `YES=1` flag skips for CI/scripting. This prevents accidental overwrites of customised vendor skills.

5. **`updated_at` field**: The lockfile gains an `updated_at` timestamp distinct from `imported_at` when skills are updated. Original import date is preserved.

6. **Network isolation in tests**: All BATS tests use `simulate_outdated_check` and `simulate_update` helpers that operate on local mock git repos — zero network calls. The mock outdated check accepts a string of `key=commit` pairs to simulate remote responses.

### Test Coverage (9 new tests, 22 total)

**Version Tracking Tests (9)**:
1. Lockfile includes `skill_path` and `local_name` fields
2. Outdated check shows up-to-date for matching commits
3. Outdated check detects different commits (outdated)
4. Outdated check handles fetch failure gracefully
5. Update applies new SKILL.md and updates lockfile commit + `updated_at`
6. Update shows diff output (contains `---`/`+++`/`@@` markers)
7. Update of already-up-to-date skill returns early
8. Missing args shows usage error
9. Empty lockfile exits cleanly

### Gotchas

- **Subshell variable loss in Makefile while-loops**: Variables set inside a `while` loop piped from `jq` are lost when the subshell exits. The outdated count/error count can't be reliably accumulated in the main shell. Workaround: print status inline per-skill rather than summarising at end.
- **`$${var:0:12}` in Makefile**: Bash substring expansion works in Makefile shell blocks but requires `$$` escaping for the `$`.
- **`diff -u` exit code**: Returns 1 when files differ, which would abort the Makefile shell. Must add `|| true` to prevent premature exit.
- **STAGED vs ACTIVE filtering**: `skill-outdated` only checks skills with `"status": "ACTIVE"` — staged skills are excluded since they haven't been promoted yet.

### Implementation Summary

| Target | Purpose |
|--------|---------|
| `skill-outdated` | Table of all ACTIVE skills with local/remote commit comparison |
| `skill-update SKILL=... [YES=1]` | Clone latest, show diff, confirm, apply, update lockfile |

---

## Task 6: Staging Workflow (skill-stage, skill-promote, skill-staged)

### Key Design Decisions

1. **Staging directory mirrors vendor structure**: `.staging/owner/skill-name/` parallels `vendor/owner/skill-name/` making promotion a simple `mv` operation.

2. **Lockfile status field**: Uses uppercase `"STAGED"` / `"ACTIVE"` strings. The lock key uses the final `vendor/owner/skill-name` format even when staged, so promotion only changes status — not the key.

3. **skill-import defaults to staging**: Without `DIRECT=1`, `skill-import` delegates to `skill-stage` via `$(MAKE)`. Backward compatible — explicit opt-out for direct vendor placement.

4. **Collision check at promotion time**: Runs against staging content before `mv` to vendor. Catches conflicts that appeared between staging and promotion.

5. **Owner directory cleanup**: After promotion, empty owner dirs under `.staging/` cleaned with `rmdir`.

### Gotchas

- **Make variable expansion vs shell conditionals**: `$(DIRECT)` expanded by Make at parse time, not by shell. `make -n` (dry-run) prints all commands without evaluating shell conditionals — don't use dry-run to verify branching.
- **Exit code propagation**: `exit $$?` after `$(MAKE) skill-stage` ensures parent target exits with sub-make's exit code.
- **jq lockfile writes**: Always write to temp file then `mv` to avoid truncation on failure.

### Test Results

All acceptance scenarios pass:
- Staging creates `.staging/owner/skill/SKILL.md` + lockfile `"STAGED"` status
- `skill-staged` lists staged skills in formatted table with columns
- `skill-promote` moves to vendor, updates to `"ACTIVE"`, cleans staging dir
- `DIRECT=1` bypasses staging entirely
- Empty params show usage help

---

## Task 5: BATS Tests for Core Targets

### Key Patterns

- **Simulation over integration**: Rather than wrapping the Makefile (which hardcodes paths and uses `git clone`), tests use `simulate_import` and `simulate_remove` helpers that replicate the exact logic. This avoids network access while testing the same operations.
- **HOME override for collision script**: The `detect-skill-collision.sh` script uses `$HOME/.config/opencode/skills` — override `HOME` to a temp dir for full isolation.
- **Mock git repos**: Use `git init` + commits in temp dirs to get real commit hashes for lockfile verification.
- **Test isolation**: Each test gets a fresh `mktemp -d` with its own `MOCK_SKILLS_DIR`, `MOCK_VENDOR_DIR`, and `MOCK_LOCK_FILE`. Teardown removes everything.
- **Makefile tested directly** for edge cases (missing args, bad repo) where Make's own exit codes matter.
- **BATS 1.13.0** is installed via nvm (node package), not nix.

### Test Coverage (13 tests)

**Import Tests (5)**:
1. Creates correct directory structure (`vendor/owner/skill/SKILL.md`)
2. Writes valid lockfile entry with all fields (repo, commit, imported_at, original_name, status)
3. Strips `allowed-tools` from frontmatter
4. Copies only SKILL.md (no scripts/references/assets)
5. Bad repo clone fails gracefully (via real Make invocation)

**Collision Tests (3)**:
6. Rejects duplicate skill names (exit 1, COLLISION message)
7. `--force` flag renames with vendor prefix
8. Validates against all existing skills (tests multiple collisions + unique name)

**Remove Tests (3)**:
9. Cleans up directory and lockfile entry
10. Nonexistent skill fails gracefully
11. Cleans empty owner directories

**Edge Cases (2)**:
12. Missing args shows usage error (tests all 3 targets)
13. Malformed SKILL.md handled gracefully (no frontmatter = validation fail)

### Execution Time
- 13 tests pass in <5 seconds, all green on first run

### Gotchas
- **`run` vs direct execution**: BATS `run` captures exit code + output; use it for tests that should fail. Direct execution for tests that must succeed (no silent swallowing).
- **`create_skill_md` extra fields**: The helper accepts a 4th arg for extra frontmatter (e.g. `allowed-tools:`) — blank lines from empty args are harmless in YAML.
- The `sed` pattern for stripping `allowed-tools` only removes the line — multi-line YAML arrays would survive (acceptable trade-off for the Makefile's current approach).

---

## Task 4: Collision Detection - Name Validation

### Implementation Summary

Created `~/.config/opencode/scripts/detect-skill-collision.sh` - a bash script that validates skill names against existing skills before import.

### Key Design Decisions

#### 1. **Frontmatter Parsing Strategy**
- Used `sed` with YAML-aware pattern matching: `/^---$/,/^---$/p` to extract frontmatter block
- Then grep for `^name:` field and extract value with `sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//'`
- **Why**: Robust against whitespace variations, handles YAML formatting correctly
- **Alternative considered**: Using `yq` or `python` - rejected for zero external dependencies

#### 2. **Collision Detection with Associative Arrays**
- Built hash map of existing skills: `declare -A existing_skills`
- Scanned all `~/.config/opencode/skills/**/SKILL.md` files
- Checked membership with `[[ -v "existing_skills[$SKILL_NAME]" ]]`
- **Why**: O(1) lookup, clean bash idiom, no external tools needed
- **Limitation**: Requires bash 4.0+ (associative arrays)

#### 3. **Vendor Prefix Strategy**
- Pattern: `vendor-{prefix}-{original-name}` (e.g., `vendor-imported-golang`)
- Default prefix: `vendor-imported` (generic, can be customized)
- **Why**: Clear namespace separation, prevents future collisions
- **Future enhancement**: Could extract owner from directory path or git metadata

#### 4. **Error Handling Approach**
- Exit code 0 = no collision (success)
- Exit code 1 = collision detected (failure)
- Stderr for all messages (errors and info)
- Graceful handling of missing SKILL.md files
- **Why**: Standard Unix conventions, integrates cleanly with Makefiles

#### 5. **In-Place SKILL.md Modification**
- Used `sed -i` to modify name field directly
- Pattern: `sed -i "s/^name:[[:space:]]*.*$/name: $new_name/"`
- **Why**: Atomic operation, no temporary files, preserves file structure
- **Risk**: Could corrupt malformed YAML - mitigated by validation before update

### Testing Results

All acceptance criteria passed:

```
✓ TEST 1: Collision Detection
  - Detected 'golang' collision correctly
  - Exit code 1 as expected
  - Clear error message with existing skill location

✓ TEST 2: No Collision
  - Unique skill name passed validation
  - Exit code 0 as expected
  - No error output

✓ TEST 3: Force Flag Rename
  - Renamed 'golang' to 'vendor-imported-golang'
  - Exit code 0 as expected
  - SKILL.md updated correctly
```

### Integration Points

#### With Task 3 (Makefile)
- Called before file placement: `detect-skill-collision.sh --force <dir> <name>`
- Returns exit code for Makefile conditional logic
- Modifies SKILL.md in place if --force flag used

#### Error Messages
- **Collision without --force**: "COLLISION: Skill name 'X' already exists"
- **Force rename**: "INFO: Skill renamed from 'X' to 'Y' to avoid collision"
- **Missing SKILL.md**: "ERROR: SKILL.md not found at <path>"

### Bash Idioms Used

- **Associative arrays**: `declare -A`, `[[ -v array[key] ]]`
- **Parameter expansion**: `${var##*/}` for basename
- **Regex matching**: `[[ $var =~ pattern ]]`
- **Process substitution**: `<(command)` for reading multiple files
- **Error handling**: `set -euo pipefail` for strict mode

### Dependencies

- **Required**: bash 4.0+ (associative arrays)
- **External tools**: sed, grep, basename (all standard POSIX)
- **No external dependencies**: yq, python, jq, etc.

### Performance Characteristics

- **Time complexity**: O(n) where n = number of existing skills
- **Space complexity**: O(n) for associative array
- **Typical execution**: <100ms for ~150 existing skills
- **Bottleneck**: File I/O (reading all SKILL.md files)

### Edge Cases Handled

1. ✓ Missing SKILL.md in imported skill
2. ✓ Malformed frontmatter (gracefully skipped)
3. ✓ Whitespace variations in YAML fields
4. ✓ Double collision (renamed name also collides)
5. ✓ Missing arguments (clear error message)
6. ✓ Non-existent skill directory

### Related Tasks

- **Task 3**: Makefile integration - calls this script before placement
- **Task 5**: BATS tests - will test collision detection scenarios
- **Future**: Skill registry/index - could use extracted names for catalog

---

**Task 4 Status**: Complete - All acceptance criteria met, ready for Task 3 integration
## Dataview Dashboard Patterns
- Existing dashboards in the baphled vault use `TABLE without id` for simple lists and `TABLE` with `GROUP BY` for grouped indices.
- CSS classes like `dashboard` and `table-max` are standard for these views.
- Tag-based grouping is achieved by flattening `file.tags` and filtering with `startswith(tag, 'skill/')`.
- Frontmatter follows a specific schema including `id`, `aliases`, `tags`, `lead`, and `created` fields.
