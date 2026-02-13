# ==============================================================================
# OpenCode Skills Manager — Makefile
# ==============================================================================
# Provides targets for importing, staging, promoting, and removing third-party
# skills into the opencode config directory with collision detection and
# provenance tracking.
#
# Usage:
#   make skill-import REPO=owner/repo SKILL=skill-name   (stages by default)
#   make skill-import REPO=owner/repo SKILL=skill-name DIRECT=1  (skip staging)
#   make skill-stage REPO=owner/repo SKILL=skill-name    (stage for review)
#   make skill-promote SKILL=vendor/owner/skill-name      (activate staged skill)
#   make skill-staged                                      (list staged skills)
#   make skill-remove SKILL=vendor/owner/skill-name        (remove any skill)
#   make skill-list                                        (list active skills)
#   make help
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help
.ONESHELL:

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
OPENCODE_CONFIG := $(HOME)/.config/opencode
SKILLS_DIR      := $(OPENCODE_CONFIG)/skills
VENDOR_DIR      := $(SKILLS_DIR)/vendor
STAGING_DIR     := $(SKILLS_DIR)/.staging
LOCK_FILE       := $(OPENCODE_CONFIG)/.skill-lock.json

# ---------------------------------------------------------------------------
# Parameters (set via command line)
# ---------------------------------------------------------------------------
REPO   ?=
SKILL  ?=
FORCE  ?=
DIRECT ?=
YES    ?=

# ==============================================================================
# Targets
# ==============================================================================

.PHONY: help skill-import skill-stage skill-promote skill-staged skill-remove skill-list skill-outdated skill-update

## help: Show all available commands
help:
	@echo ""
	@echo "OpenCode Skills Manager"
	@echo "======================="
	@echo ""
	@echo "Commands:"
	@echo "  make skill-import REPO=owner/repo SKILL=skill-name   Import a skill (stages by default)"
	@echo "  make skill-stage REPO=owner/repo SKILL=skill-name    Stage a skill for review"
	@echo "  make skill-promote SKILL=vendor/owner/skill-name      Promote staged skill to active"
	@echo "  make skill-staged                                      List all staged skills"
	@echo "  make skill-remove SKILL=vendor/owner/skill-name        Remove a skill (staged or active)"
	@echo "  make skill-list                                        List all active vendor skills"
	@echo "  make skill-outdated                                    Check for newer versions"
	@echo "  make skill-update SKILL=vendor/owner/skill-name        Update a skill to latest version"
	@echo "  make help                                              Show this help message"
	@echo ""
	@echo "Flags:"
	@echo "  FORCE=1    Override collision detection during import/promote"
	@echo "  DIRECT=1   Skip staging and import directly to vendor/ (with skill-import)"
	@echo "  YES=1      Skip confirmation prompt during update"
	@echo ""
	@echo "Examples:"
	@echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design"
	@echo "  make skill-stage REPO=anthropics/skills SKILL=frontend-design"
	@echo "  make skill-promote SKILL=vendor/anthropics/frontend-design"
	@echo "  make skill-staged"
	@echo "  make skill-remove SKILL=vendor/anthropics/frontend-design"
	@echo "  make skill-list"
	@echo ""

## skill-stage: Stage a skill from GitHub for review (not yet active)
##   REPO=owner/repo   GitHub repository (required)
##   SKILL=skill-name  Skill to stage (required)
##   FORCE=1           Override collision check (optional)
skill-stage:
	@set -euo pipefail
	REPO="$(REPO)"
	SKILL="$(SKILL)"
	FORCE="$(FORCE)"
	STAGING_DIR="$(STAGING_DIR)"
	SKILLS_DIR="$(SKILLS_DIR)"
	LOCK_FILE="$(LOCK_FILE)"
	# --- Validate required parameters ---
	if [ -z "$$REPO" ]; then
		echo "ERROR: REPO is required."
		echo "  Usage: make skill-stage REPO=owner/repo SKILL=skill-name"
		exit 1
	fi
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		echo "  Usage: make skill-stage REPO=owner/repo SKILL=skill-name"
		exit 1
	fi
	# --- Extract owner from REPO ---
	OWNER="$${REPO%%/*}"
	DEST_DIR="$$STAGING_DIR/$$OWNER/$$SKILL"
	DEST_FILE="$$DEST_DIR/SKILL.md"
	# --- Collision detection: already staged ---
	if [ -f "$$DEST_FILE" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: Skill already staged at $$DEST_FILE"
		echo "  Use FORCE=1 to overwrite: make skill-stage REPO=$$REPO SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Collision detection: already active in vendor ---
	VENDOR_FILE="$(VENDOR_DIR)/$$OWNER/$$SKILL/SKILL.md"
	if [ -f "$$VENDOR_FILE" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: Skill already active at $$VENDOR_FILE"
		echo "  Use FORCE=1 to overwrite staged copy: make skill-stage REPO=$$REPO SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Collision detection: name clashes with local skill ---
	if [ -d "$$SKILLS_DIR/$$SKILL" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: A local skill with name '$$SKILL' already exists at $$SKILLS_DIR/$$SKILL"
		echo "  Vendor prefix prevents runtime collision, but verify this is intended."
		echo "  Use FORCE=1 to proceed: make skill-stage REPO=$$REPO SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Clone repo to temp directory ---
	TMPDIR="$$(mktemp -d)"
	trap 'rm -rf "$$TMPDIR"' EXIT
	echo "Cloning $$REPO to temp directory..."
	if ! git clone --depth 1 --quiet "https://github.com/$$REPO.git" "$$TMPDIR/repo" 2>&1; then
		echo "ERROR: Failed to clone https://github.com/$$REPO.git"
		echo "  Check that the repository exists and is accessible."
		exit 1
	fi
	# --- Locate SKILL.md ---
	SKILL_MD="$$(find "$$TMPDIR/repo" -path "*/$$SKILL/SKILL.md" -type f 2>/dev/null | head -1)"
	if [ -z "$$SKILL_MD" ]; then
		echo "ERROR: Could not find SKILL.md for '$$SKILL' in $$REPO"
		echo "  Searched for: */$$SKILL/SKILL.md"
		echo "  Available skills:"
		find "$$TMPDIR/repo" -name "SKILL.md" -type f 2>/dev/null | sed "s|$$TMPDIR/repo/||" | sort
		exit 1
	fi
	# --- Validate frontmatter (name and description required) ---
	FRONTMATTER="$$(sed -n '/^---$$/,/^---$$/p' "$$SKILL_MD")"
	if [ -z "$$FRONTMATTER" ]; then
		echo "ERROR: SKILL.md has no YAML frontmatter"
		exit 1
	fi
	if ! echo "$$FRONTMATTER" | grep -q '^name:'; then
		echo "ERROR: SKILL.md frontmatter missing required 'name' field"
		exit 1
	fi
	if ! echo "$$FRONTMATTER" | grep -q '^description:'; then
		echo "ERROR: SKILL.md frontmatter missing required 'description' field"
		exit 1
	fi
	# --- Get commit hash for provenance ---
	COMMIT_HASH="$$(git -C "$$TMPDIR/repo" rev-parse HEAD)"
	# --- Create destination and copy SKILL.md (strip allowed-tools) ---
	mkdir -p "$$DEST_DIR"
	sed '/^---$$/,/^---$$/{/^allowed-tools:/d; /^allowed_tools:/d;}' "$$SKILL_MD" > "$$DEST_FILE"
	echo "Staged SKILL.md to $$DEST_FILE"
	# --- Update .skill-lock.json ---
	if [ ! -f "$$LOCK_FILE" ]; then
		echo '{"version":1,"skills":{}}' > "$$LOCK_FILE"
	fi
	LOCK_KEY="vendor/$$OWNER/$$SKILL"
	IMPORT_DATE="$$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	ORIG_NAME="$$(echo "$$FRONTMATTER" | sed -n 's/^name:[[:space:]]*//p')"
	SKILL_REL_PATH="$$(echo "$$SKILL_MD" | sed "s|$$TMPDIR/repo/||")"
	SKILL_DIR_PATH="$$(dirname "$$SKILL_REL_PATH")"
	LOCAL_NAME="vendor-$$OWNER-$$SKILL"
	jq --arg key "$$LOCK_KEY" \
		--arg repo "$$REPO" \
		--arg skill_path "$$SKILL_DIR_PATH" \
		--arg commit "$$COMMIT_HASH" \
		--arg date "$$IMPORT_DATE" \
		--arg status "STAGED" \
		--arg name "$$ORIG_NAME" \
		--arg local_name "$$LOCAL_NAME" \
		'.skills[$$key] = {"repo": $$repo, "skill_path": $$skill_path, "commit": $$commit, "imported_at": $$date, "updated_at": $$date, "status": $$status, "original_name": $$name, "local_name": $$local_name}' \
		"$$LOCK_FILE" > "$$LOCK_FILE.tmp" && mv "$$LOCK_FILE.tmp" "$$LOCK_FILE"
	echo ""
	echo "Successfully staged '$$SKILL' from $$REPO"
	echo "  Location: $$DEST_FILE"
	echo "  Commit:   $$COMMIT_HASH"
	echo "  Status:   STAGED (not active — opencode will not discover this skill)"
	echo ""
	echo "--- SKILL.md content for review ---"
	echo ""
	cat "$$DEST_FILE"
	echo ""
	echo "---"
	echo ""
	echo "To activate: make skill-promote SKILL=vendor/$$OWNER/$$SKILL"

## skill-import: Import a skill from a GitHub repository (stages by default)
##   REPO=owner/repo   GitHub repository (required)
##   SKILL=skill-name  Skill to import (required)
##   FORCE=1           Override collision check (optional)
##   DIRECT=1          Skip staging, import directly to vendor/ (optional)
skill-import:
	@set -euo pipefail
	REPO="$(REPO)"
	SKILL="$(SKILL)"
	FORCE="$(FORCE)"
	DIRECT="$(DIRECT)"
	VENDOR_DIR="$(VENDOR_DIR)"
	STAGING_DIR="$(STAGING_DIR)"
	SKILLS_DIR="$(SKILLS_DIR)"
	LOCK_FILE="$(LOCK_FILE)"
	# --- Validate required parameters ---
	if [ -z "$$REPO" ]; then
		echo "ERROR: REPO is required."
		echo "  Usage: make skill-import REPO=owner/repo SKILL=skill-name"
		exit 1
	fi
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		echo "  Usage: make skill-import REPO=owner/repo SKILL=skill-name"
		exit 1
	fi
	# --- Route: staging (default) or direct ---
	if [ "$$DIRECT" != "1" ]; then
		echo "Staging skill for review (use DIRECT=1 to skip staging)..."
		$(MAKE) skill-stage REPO="$$REPO" SKILL="$$SKILL" FORCE="$$FORCE"
		exit 0
	fi
	# --- Direct import (DIRECT=1) — original behaviour ---
	OWNER="$${REPO%%/*}"
	DEST_DIR="$$VENDOR_DIR/$$OWNER/$$SKILL"
	DEST_FILE="$$DEST_DIR/SKILL.md"
	# --- Collision detection: same vendor skill already imported ---
	if [ -f "$$DEST_FILE" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: Skill already exists at $$DEST_FILE"
		echo "  Use FORCE=1 to overwrite: make skill-import REPO=$$REPO SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Collision detection: name clashes with local skill ---
	if [ -d "$$SKILLS_DIR/$$SKILL" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: A local skill with name '$$SKILL' already exists at $$SKILLS_DIR/$$SKILL"
		echo "  Vendor prefix prevents runtime collision, but verify this is intended."
		echo "  Use FORCE=1 to proceed: make skill-import REPO=$$REPO SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Clone repo to temp directory ---
	TMPDIR="$$(mktemp -d)"
	trap 'rm -rf "$$TMPDIR"' EXIT
	echo "Cloning $$REPO to temp directory..."
	if ! git clone --depth 1 --quiet "https://github.com/$$REPO.git" "$$TMPDIR/repo" 2>&1; then
		echo "ERROR: Failed to clone https://github.com/$$REPO.git"
		echo "  Check that the repository exists and is accessible."
		exit 1
	fi
	# --- Locate SKILL.md ---
	SKILL_MD="$$(find "$$TMPDIR/repo" -path "*/$$SKILL/SKILL.md" -type f 2>/dev/null | head -1)"
	if [ -z "$$SKILL_MD" ]; then
		echo "ERROR: Could not find SKILL.md for '$$SKILL' in $$REPO"
		echo "  Searched for: */$$SKILL/SKILL.md"
		echo "  Available skills:"
		find "$$TMPDIR/repo" -name "SKILL.md" -type f 2>/dev/null | sed "s|$$TMPDIR/repo/||" | sort
		exit 1
	fi
	# --- Validate frontmatter (name and description required) ---
	FRONTMATTER="$$(sed -n '/^---$$/,/^---$$/p' "$$SKILL_MD")"
	if [ -z "$$FRONTMATTER" ]; then
		echo "ERROR: SKILL.md has no YAML frontmatter"
		exit 1
	fi
	if ! echo "$$FRONTMATTER" | grep -q '^name:'; then
		echo "ERROR: SKILL.md frontmatter missing required 'name' field"
		exit 1
	fi
	if ! echo "$$FRONTMATTER" | grep -q '^description:'; then
		echo "ERROR: SKILL.md frontmatter missing required 'description' field"
		exit 1
	fi
	# --- Get commit hash for provenance ---
	COMMIT_HASH="$$(git -C "$$TMPDIR/repo" rev-parse HEAD)"
	# --- Create destination and copy SKILL.md (strip allowed-tools) ---
	mkdir -p "$$DEST_DIR"
	sed '/^---$$/,/^---$$/{/^allowed-tools:/d; /^allowed_tools:/d;}' "$$SKILL_MD" > "$$DEST_FILE"
	echo "Imported SKILL.md to $$DEST_FILE"
	# --- Update .skill-lock.json ---
	if [ ! -f "$$LOCK_FILE" ]; then
		echo '{"version":1,"skills":{}}' > "$$LOCK_FILE"
	fi
	LOCK_KEY="vendor/$$OWNER/$$SKILL"
	IMPORT_DATE="$$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	ORIG_NAME="$$(echo "$$FRONTMATTER" | sed -n 's/^name:[[:space:]]*//p')"
	SKILL_REL_PATH="$$(echo "$$SKILL_MD" | sed "s|$$TMPDIR/repo/||")"
	SKILL_DIR_PATH="$$(dirname "$$SKILL_REL_PATH")"
	LOCAL_NAME="vendor-$$OWNER-$$SKILL"
	jq --arg key "$$LOCK_KEY" \
		--arg repo "$$REPO" \
		--arg skill_path "$$SKILL_DIR_PATH" \
		--arg commit "$$COMMIT_HASH" \
		--arg date "$$IMPORT_DATE" \
		--arg status "ACTIVE" \
		--arg name "$$ORIG_NAME" \
		--arg local_name "$$LOCAL_NAME" \
		'.skills[$$key] = {"repo": $$repo, "skill_path": $$skill_path, "commit": $$commit, "imported_at": $$date, "updated_at": $$date, "status": $$status, "original_name": $$name, "local_name": $$local_name}' \
		"$$LOCK_FILE" > "$$LOCK_FILE.tmp" && mv "$$LOCK_FILE.tmp" "$$LOCK_FILE"
	echo ""
	echo "Successfully imported '$$SKILL' from $$REPO (DIRECT)"
	echo "  Location: $$DEST_FILE"
	echo "  Commit:   $$COMMIT_HASH"
	echo "  Status:   ACTIVE"
	echo "  Lock:     $$LOCK_FILE"

## skill-promote: Promote a staged skill to active (vendor/)
##   SKILL=vendor/owner/skill-name  Staged skill to promote (required)
##   FORCE=1                        Override collision check (optional)
skill-promote:
	@set -euo pipefail
	SKILL="$(SKILL)"
	FORCE="$(FORCE)"
	VENDOR_DIR="$(VENDOR_DIR)"
	STAGING_DIR="$(STAGING_DIR)"
	SKILLS_DIR="$(SKILLS_DIR)"
	LOCK_FILE="$(LOCK_FILE)"
	# --- Validate required parameters ---
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		echo "  Usage: make skill-promote SKILL=vendor/owner/skill-name"
		echo "  Use 'make skill-staged' to see staged skills."
		exit 1
	fi
	# --- Normalise: strip leading vendor/ if present ---
	SKILL_PATH="$${SKILL#vendor/}"
	STAGED_DIR="$$STAGING_DIR/$$SKILL_PATH"
	STAGED_FILE="$$STAGED_DIR/SKILL.md"
	LOCK_KEY="vendor/$$SKILL_PATH"
	# --- Validate staged skill exists ---
	if [ ! -f "$$STAGED_FILE" ]; then
		echo "ERROR: Staged skill not found at $$STAGED_FILE"
		echo "  Use 'make skill-staged' to see staged skills."
		exit 1
	fi
	# --- Validate lockfile shows STAGED status ---
	if [ -f "$$LOCK_FILE" ]; then
		CURRENT_STATUS="$$(jq -r --arg key "$$LOCK_KEY" '.skills[$$key].status // "UNKNOWN"' "$$LOCK_FILE")"
		if [ "$$CURRENT_STATUS" != "STAGED" ]; then
			echo "ERROR: Skill '$$LOCK_KEY' has status '$$CURRENT_STATUS', expected 'STAGED'"
			exit 1
		fi
	fi
	# --- Extract owner/skill for collision detection ---
	OWNER="$$(echo "$$SKILL_PATH" | cut -d'/' -f1)"
	SKILL_NAME="$$(echo "$$SKILL_PATH" | cut -d'/' -f2)"
	DEST_DIR="$$VENDOR_DIR/$$OWNER/$$SKILL_NAME"
	DEST_FILE="$$DEST_DIR/SKILL.md"
	# --- Collision detection: already active in vendor ---
	if [ -f "$$DEST_FILE" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: Skill already active at $$DEST_FILE"
		echo "  Use FORCE=1 to overwrite: make skill-promote SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Collision detection: name clashes with local skill ---
	if [ -d "$$SKILLS_DIR/$$SKILL_NAME" ] && [ "$$FORCE" != "1" ]; then
		echo "ERROR: A local skill with name '$$SKILL_NAME' already exists at $$SKILLS_DIR/$$SKILL_NAME"
		echo "  Vendor prefix prevents runtime collision, but verify this is intended."
		echo "  Use FORCE=1 to proceed: make skill-promote SKILL=$$SKILL FORCE=1"
		exit 1
	fi
	# --- Run collision detection script if available ---
	if [ -x "$(HOME)/scripts/detect-skill-collision.sh" ] && [ "$$FORCE" != "1" ]; then
		if ! SKILLS_DIR="$$SKILLS_DIR" FORCE="$$FORCE" "$(HOME)/scripts/detect-skill-collision.sh" "$$STAGED_FILE" "$$OWNER"; then
			echo "ERROR: Collision detected. Use FORCE=1 to override."
			exit 1
		fi
	fi
	# --- Move from staging to vendor ---
	mkdir -p "$$DEST_DIR"
	cp -r "$$STAGED_DIR"/* "$$DEST_DIR"/
	rm -rf "$$STAGED_DIR"
	echo "Promoted skill from $$STAGED_DIR to $$DEST_DIR"
	# --- Clean up empty staging parent directory ---
	PARENT_DIR="$$(dirname "$$STAGED_DIR")"
	if [ -d "$$PARENT_DIR" ] && [ -z "$$(ls -A "$$PARENT_DIR" 2>/dev/null)" ]; then
		rmdir "$$PARENT_DIR" 2>/dev/null || true
	fi
	# --- Update lockfile status from STAGED to ACTIVE ---
	if [ -f "$$LOCK_FILE" ]; then
		PROMOTE_DATE="$$(date -u +%Y-%m-%dT%H:%M:%SZ)"
		jq --arg key "$$LOCK_KEY" \
			--arg status "ACTIVE" \
			--arg date "$$PROMOTE_DATE" \
			'.skills[$$key].status = $$status | .skills[$$key].updated_at = $$date' \
			"$$LOCK_FILE" > "$$LOCK_FILE.tmp" && mv "$$LOCK_FILE.tmp" "$$LOCK_FILE"
		echo "Updated lockfile: $$LOCK_KEY status → ACTIVE"
	fi
	echo ""
	echo "Successfully promoted '$$SKILL_PATH'"
	echo "  Location: $$DEST_FILE"
	echo "  Status:   ACTIVE (opencode will now discover this skill)"

## skill-staged: List all staged skills awaiting promotion
skill-staged:
	@set -euo pipefail
	LOCK_FILE="$(LOCK_FILE)"
	if [ ! -f "$$LOCK_FILE" ]; then
		echo "No staged skills."
		echo "  Use 'make skill-stage REPO=owner/repo SKILL=skill-name' to stage one."
		exit 0
	fi
	STAGED_COUNT="$$(jq '[.skills | to_entries[] | select(.value.status == "STAGED")] | length' "$$LOCK_FILE" 2>/dev/null)"
	if [ "$$STAGED_COUNT" = "0" ] || [ -z "$$STAGED_COUNT" ]; then
		echo "No staged skills."
		echo "  Use 'make skill-stage REPO=owner/repo SKILL=skill-name' to stage one."
		exit 0
	fi
	echo ""
	echo "Staged Skills (awaiting promotion)"
	echo "==================================="
	echo ""
	jq -r '.skills | to_entries[] | select(.value.status == "STAGED") | "  \(.key)\n    repo:     \(.value.repo)\n    commit:   \(.value.commit[0:12])\n    imported: \(.value.imported_at)\n    name:     \(.value.original_name)\n"' "$$LOCK_FILE"
	echo "To activate a staged skill:"
	echo "  make skill-promote SKILL=<skill-key>"
	echo ""

## skill-remove: Remove an imported skill (staged or active)
##   SKILL=vendor/owner/skill-name  Skill path to remove (required)
skill-remove:
	@set -euo pipefail
	SKILL="$(SKILL)"
	VENDOR_DIR="$(VENDOR_DIR)"
	STAGING_DIR="$(STAGING_DIR)"
	LOCK_FILE="$(LOCK_FILE)"
	# --- Validate required parameters ---
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		echo "  Usage: make skill-remove SKILL=vendor/owner/skill-name"
		exit 1
	fi
	# --- Normalise: strip leading vendor/ if present ---
	SKILL_PATH="$${SKILL#vendor/}"
	LOCK_KEY="vendor/$$SKILL_PATH"
	# --- Determine location (check staging first, then vendor) ---
	FOUND=""
	FULL_PATH=""
	if [ -d "$$STAGING_DIR/$$SKILL_PATH" ]; then
		FULL_PATH="$$STAGING_DIR/$$SKILL_PATH"
		FOUND="STAGED"
	elif [ -d "$$VENDOR_DIR/$$SKILL_PATH" ]; then
		FULL_PATH="$$VENDOR_DIR/$$SKILL_PATH"
		FOUND="ACTIVE"
	fi
	if [ -z "$$FOUND" ]; then
		echo "ERROR: Skill not found in staging or vendor directories"
		echo "  Checked: $$STAGING_DIR/$$SKILL_PATH"
		echo "  Checked: $$VENDOR_DIR/$$SKILL_PATH"
		echo "  Use 'make skill-list' or 'make skill-staged' to see imported skills."
		exit 1
	fi
	# --- Remove skill directory ---
	rm -rf "$$FULL_PATH"
	echo "Removed $$FOUND skill directory: $$FULL_PATH"
	# --- Clean up empty parent directory ---
	PARENT_DIR="$$(dirname "$$FULL_PATH")"
	if [ -d "$$PARENT_DIR" ] && [ -z "$$(ls -A "$$PARENT_DIR" 2>/dev/null)" ]; then
		rmdir "$$PARENT_DIR" 2>/dev/null || true
		echo "Removed empty owner directory: $$PARENT_DIR"
	fi
	# --- Remove entry from .skill-lock.json ---
	if [ -f "$$LOCK_FILE" ]; then
		jq --arg key "$$LOCK_KEY" 'del(.skills[$$key])' \
			"$$LOCK_FILE" > "$$LOCK_FILE.tmp" && mv "$$LOCK_FILE.tmp" "$$LOCK_FILE"
		echo "Removed lock entry: $$LOCK_KEY"
	fi
	echo ""
	echo "Successfully removed '$$SKILL_PATH' (was $$FOUND)"

## skill-list: List all active vendor skills
skill-list:
	@set -euo pipefail
	LOCK_FILE="$(LOCK_FILE)"
	if [ ! -f "$$LOCK_FILE" ] || [ "$$(jq '.skills | length' "$$LOCK_FILE" 2>/dev/null)" = "0" ]; then
		echo "No vendor skills imported."
		echo "  Use 'make skill-import REPO=owner/repo SKILL=skill-name' to import one."
		exit 0
	fi
	ACTIVE_COUNT="$$(jq '[.skills | to_entries[] | select(.value.status == "ACTIVE" or .value.status == null)] | length' "$$LOCK_FILE" 2>/dev/null)"
	STAGED_COUNT="$$(jq '[.skills | to_entries[] | select(.value.status == "STAGED")] | length' "$$LOCK_FILE" 2>/dev/null)"
	echo ""
	echo "Active Vendor Skills"
	echo "====================="
	echo ""
	if [ "$$ACTIVE_COUNT" = "0" ] || [ -z "$$ACTIVE_COUNT" ]; then
		echo "  (none)"
	else
		jq -r '.skills | to_entries[] | select(.value.status == "ACTIVE" or .value.status == null) | "  \(.key)\n    repo:     \(.value.repo)\n    commit:   \(.value.commit[0:12])\n    imported: \(.value.imported_at)\n    status:   \(.value.status // "ACTIVE")\n    name:     \(.value.original_name)\n"' "$$LOCK_FILE"
	fi
	if [ "$$STAGED_COUNT" != "0" ] && [ -n "$$STAGED_COUNT" ]; then
		echo "  ($$STAGED_COUNT skill(s) staged — run 'make skill-staged' to see them)"
	fi
	echo ""

## skill-outdated: Check for newer versions of all imported skills
skill-outdated:
	@set -euo pipefail
	LOCK_FILE="$(LOCK_FILE)"
	if [ ! -f "$$LOCK_FILE" ] || [ "$$(jq '.skills | length' "$$LOCK_FILE" 2>/dev/null)" = "0" ]; then
		echo "No vendor skills imported. Nothing to check."
		exit 0
	fi
	# --- Determine API caller: prefer gh, fallback to curl ---
	API_CMD=""
	if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
		API_CMD="gh"
	elif [ -n "$${GH_TOKEN:-}" ]; then
		API_CMD="curl_token"
	else
		API_CMD="curl_anon"
	fi
	# --- Print table header ---
	printf "\n%-40s %-14s %-14s %s\n" "SKILL" "LOCAL" "REMOTE" "STATUS"
	printf "%-40s %-14s %-14s %s\n" "$(printf '%.0s-' {1..40})" "$(printf '%.0s-' {1..14})" "$(printf '%.0s-' {1..14})" "$(printf '%.0s-' {1..10})"
	# --- Iterate over each skill ---
	SKILLS="$$(jq -r '.skills | to_entries[] | "\(.key)|\(.value.repo)|\(.value.commit)|\(.value.skill_path // "")"' "$$LOCK_FILE")"
	RATE_LIMITED=0
	while IFS='|' read -r KEY REPO LOCAL_COMMIT SKILL_PATH; do
		[ -z "$$KEY" ] && continue
		LOCAL_SHORT="$${LOCAL_COMMIT:0:12}"
		# --- Fetch latest commit for the skill path ---
		REMOTE_COMMIT=""
		if [ "$$API_CMD" = "gh" ]; then
			if [ -n "$$SKILL_PATH" ]; then
				REMOTE_COMMIT="$$(gh api "repos/$$REPO/commits?path=$$SKILL_PATH&per_page=1" --jq '.[0].sha' 2>/dev/null || true)"
			fi
			if [ -z "$$REMOTE_COMMIT" ]; then
				REMOTE_COMMIT="$$(gh api "repos/$$REPO/commits/HEAD" --jq '.sha' 2>/dev/null || true)"
			fi
		elif [ "$$API_CMD" = "curl_token" ]; then
			if [ -n "$$SKILL_PATH" ]; then
				RESPONSE="$$(curl -sf -H "Authorization: token $$GH_TOKEN" \
					"https://api.github.com/repos/$$REPO/commits?path=$$SKILL_PATH&per_page=1" 2>/dev/null || true)"
				REMOTE_COMMIT="$$(echo "$$RESPONSE" | jq -r '.[0].sha // empty' 2>/dev/null || true)"
			fi
			if [ -z "$$REMOTE_COMMIT" ]; then
				RESPONSE="$$(curl -sf -H "Authorization: token $$GH_TOKEN" \
					"https://api.github.com/repos/$$REPO/commits/HEAD" 2>/dev/null || true)"
				REMOTE_COMMIT="$$(echo "$$RESPONSE" | jq -r '.sha // empty' 2>/dev/null || true)"
			fi
		else
			if [ -n "$$SKILL_PATH" ]; then
				RESPONSE="$$(curl -sf "https://api.github.com/repos/$$REPO/commits?path=$$SKILL_PATH&per_page=1" 2>/dev/null || true)"
				REMOTE_COMMIT="$$(echo "$$RESPONSE" | jq -r '.[0].sha // empty' 2>/dev/null || true)"
			fi
			if [ -z "$$REMOTE_COMMIT" ]; then
				RESPONSE="$$(curl -sf "https://api.github.com/repos/$$REPO/commits/HEAD" 2>/dev/null || true)"
				REMOTE_COMMIT="$$(echo "$$RESPONSE" | jq -r '.sha // empty' 2>/dev/null || true)"
			fi
			# --- Check for rate limiting ---
			if [ -z "$$REMOTE_COMMIT" ] && echo "$${RESPONSE:-}" | grep -q "rate limit" 2>/dev/null; then
				RATE_LIMITED=1
			fi
		fi
		# --- Validate remote commit looks like a SHA ---
		if [ -n "$$REMOTE_COMMIT" ] && ! echo "$$REMOTE_COMMIT" | grep -qE '^[0-9a-f]{40}$$'; then
			REMOTE_COMMIT=""
		fi
		# --- Determine status ---
		REMOTE_SHORT=""
		STATUS=""
		if [ -z "$$REMOTE_COMMIT" ]; then
			REMOTE_SHORT="unknown"
			STATUS="⚠ error"
		elif [ "$$LOCAL_COMMIT" = "$$REMOTE_COMMIT" ]; then
			REMOTE_SHORT="$${REMOTE_COMMIT:0:12}"
			STATUS="✓ up-to-date"
		else
			REMOTE_SHORT="$${REMOTE_COMMIT:0:12}"
			STATUS="⬆ outdated"
		fi
		printf "%-40s %-14s %-14s %s\n" "$$KEY" "$$LOCAL_SHORT" "$$REMOTE_SHORT" "$$STATUS"
	done <<< "$$SKILLS"
	echo ""
	if [ "$$RATE_LIMITED" = "1" ]; then
		echo "⚠  GitHub API rate limit reached. Authenticate with 'gh auth login' or set GH_TOKEN for higher limits."
	fi

## skill-update: Update an imported skill to the latest version
##   SKILL=vendor/owner/skill-name  Skill to update (required)
##   YES=1                          Skip confirmation prompt (optional)
skill-update:
	@set -euo pipefail
	SKILL="$(SKILL)"
	YES="$(YES)"
	VENDOR_DIR="$(VENDOR_DIR)"
	LOCK_FILE="$(LOCK_FILE)"
	# --- Validate required parameters ---
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		echo "  Usage: make skill-update SKILL=vendor/owner/skill-name"
		exit 1
	fi
	# --- Normalise: strip leading vendor/ if present for lookup ---
	LOCK_KEY="$$SKILL"
	if [[ ! "$$LOCK_KEY" == vendor/* ]]; then
		LOCK_KEY="vendor/$$LOCK_KEY"
	fi
	# --- Look up skill in lockfile ---
	if [ ! -f "$$LOCK_FILE" ]; then
		echo "ERROR: No lockfile found. Import a skill first."
		exit 1
	fi
	ENTRY="$$(jq -r --arg key "$$LOCK_KEY" '.skills[$$key] // empty' "$$LOCK_FILE")"
	if [ -z "$$ENTRY" ]; then
		echo "ERROR: Skill '$$LOCK_KEY' not found in lockfile."
		echo "  Use 'make skill-list' to see imported skills."
		exit 1
	fi
	REPO="$$(echo "$$ENTRY" | jq -r '.repo')"
	LOCAL_COMMIT="$$(echo "$$ENTRY" | jq -r '.commit')"
	SKILL_PATH="$$(echo "$$ENTRY" | jq -r '.skill_path // empty')"
	CURRENT_STATUS="$$(echo "$$ENTRY" | jq -r '.status // "ACTIVE"')"
	# --- Extract owner and skill name from lock key ---
	SKILL_NAME="$${LOCK_KEY##*/}"
	OWNER="$$(echo "$$LOCK_KEY" | cut -d/ -f2)"
	# --- Resolve destination based on status (STAGED → staging dir, ACTIVE → vendor dir) ---
	STAGING_DIR="$(STAGING_DIR)"
	if [ "$$CURRENT_STATUS" = "STAGED" ]; then
		DEST_DIR="$$STAGING_DIR/$$OWNER/$$SKILL_NAME"
	else
		DEST_DIR="$$VENDOR_DIR/$$OWNER/$$SKILL_NAME"
	fi
	DEST_FILE="$$DEST_DIR/SKILL.md"
	# --- Clone repo to get latest ---
	TMPDIR="$$(mktemp -d)"
	trap 'rm -rf "$$TMPDIR"' EXIT
	echo "Fetching latest from $$REPO..."
	if ! git clone --depth 1 --quiet "https://github.com/$$REPO.git" "$$TMPDIR/repo" 2>&1; then
		echo "ERROR: Failed to clone https://github.com/$$REPO.git"
		exit 1
	fi
	REMOTE_COMMIT="$$(git -C "$$TMPDIR/repo" rev-parse HEAD)"
	# --- Check if already up-to-date ---
	if [ "$$LOCAL_COMMIT" = "$$REMOTE_COMMIT" ]; then
		echo "✓ '$$LOCK_KEY' is already up-to-date ($$LOCAL_COMMIT)"
		exit 0
	fi
	# --- Locate SKILL.md in cloned repo ---
	SKILL_MD="$$(find "$$TMPDIR/repo" -path "*/$$SKILL_NAME/SKILL.md" -type f 2>/dev/null | head -1)"
	if [ -z "$$SKILL_MD" ]; then
		echo "ERROR: Could not find SKILL.md for '$$SKILL_NAME' in latest $$REPO"
		exit 1
	fi
	# --- Strip allowed-tools from new version ---
	NEW_FILE="$$TMPDIR/new-skill.md"
	sed '/^---$$/,/^---$$/{/^allowed-tools:/d; /^allowed_tools:/d;}' "$$SKILL_MD" > "$$NEW_FILE"
	# --- Show diff ---
	echo ""
	echo "Changes for $$LOCK_KEY ($$LOCAL_COMMIT -> $$REMOTE_COMMIT):"
	echo "================================================================"
	if [ -f "$$DEST_FILE" ]; then
		diff -u "$$DEST_FILE" "$$NEW_FILE" --label "current ($$LOCAL_COMMIT)" --label "latest ($$REMOTE_COMMIT)" || true
	else
		echo "(current file missing — will be recreated)"
		cat "$$NEW_FILE"
	fi
	echo ""
	# --- Confirm update ---
	if [ "$$YES" != "1" ]; then
		echo -n "Apply update? [y/N] "
		read -r CONFIRM
		if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then
			echo "Update cancelled."
			exit 0
		fi
	fi
	# --- Apply update ---
	mkdir -p "$$DEST_DIR"
	cp "$$NEW_FILE" "$$DEST_FILE"
	# --- Update lockfile ---
	UPDATE_DATE="$$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	jq --arg key "$$LOCK_KEY" \
		--arg commit "$$REMOTE_COMMIT" \
		--arg date "$$UPDATE_DATE" \
		'.skills[$$key].commit = $$commit | .skills[$$key].updated_at = $$date' \
		"$$LOCK_FILE" > "$$LOCK_FILE.tmp" && mv "$$LOCK_FILE.tmp" "$$LOCK_FILE"
	echo ""
	echo "✓ Updated '$$LOCK_KEY'"
	echo "  Commit: $${LOCAL_COMMIT:0:12} → $${REMOTE_COMMIT:0:12}"
	echo "  Status: $$CURRENT_STATUS (preserved)"
	echo "  Lock:   $$LOCK_FILE"

## skill-integrate: Integrate an imported skill (10-touchpoint workflow)
##   SKILL=vendor/owner/skill-name  Skill to integrate (required)
skill-integrate:
	@set -euo pipefail
	SKILL="$(SKILL)"
	if [ -z "$$SKILL" ]; then
		echo "ERROR: SKILL is required."
		exit 1
	fi
	python3 scripts/skill_integrate.py "$$SKILL"
