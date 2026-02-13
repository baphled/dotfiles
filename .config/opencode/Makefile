.PHONY: skill-import skill-remove skill-list skill-help skill-stage skill-promote skill-staged skill-outdated skill-update

# Configuration
SKILLS_DIR := $(HOME)/.config/opencode/skills
VENDOR_DIR := $(SKILLS_DIR)/vendor
STAGING_DIR := $(SKILLS_DIR)/.staging
LOCK_FILE := $(HOME)/.config/opencode/.skill-lock.json
COLLISION_SCRIPT := $(HOME)/.config/opencode/scripts/detect-skill-collision.sh

# =============================================================================
# Skill Management Targets
# =============================================================================

# Import a skill from a GitHub repository (skills.sh format)
# Usage: make skill-import REPO=owner/repo SKILL=skill-name [DIRECT=1]
# Default: imports via staging. Set DIRECT=1 to skip staging and go straight to vendor.
skill-import:
	@if [ -z "$(REPO)" ] || [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-import REPO=owner/repo SKILL=skill-name [DIRECT=1]"; \
		echo ""; \
		echo "Options:"; \
		echo "  DIRECT=1  Skip staging, import directly to vendor/"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design"; \
		echo "  make skill-import REPO=anthropics/skills SKILL=mcp-builder DIRECT=1"; \
		exit 1; \
	fi; \
	\
	if [ "$(DIRECT)" != "1" ]; then \
		echo "📦 Routing through staging workflow..."; \
		echo "   (Use DIRECT=1 to skip staging)"; \
		echo ""; \
		$(MAKE) skill-stage REPO="$(REPO)" SKILL="$(SKILL)"; \
		exit $$?; \
	fi; \
	\
	OWNER=$$(echo "$(REPO)" | cut -d'/' -f1); \
	REPO_NAME=$$(echo "$(REPO)" | cut -d'/' -f2); \
	DEST_DIR="$(VENDOR_DIR)/$$OWNER/$(SKILL)"; \
	TMPDIR=$$(mktemp -d); \
	\
	cleanup() { rm -rf "$$TMPDIR"; }; \
	trap cleanup EXIT; \
	\
	echo "📦 Importing skill '$(SKILL)' from $(REPO)..."; \
	echo ""; \
	\
	echo "⬇️  Cloning repository..."; \
	if ! git clone --depth 1 --quiet "https://github.com/$(REPO).git" "$$TMPDIR/repo" 2>/dev/null; then \
		echo "❌ ERROR: Failed to clone repository '$(REPO)'" >&2; \
		echo "   Check that the repository exists and is accessible." >&2; \
		exit 1; \
	fi; \
	\
	COMMIT_HASH=$$(git -C "$$TMPDIR/repo" rev-parse HEAD); \
	echo "   Commit: $$COMMIT_HASH"; \
	echo ""; \
	\
	echo "🔍 Locating SKILL.md..."; \
	SKILL_MD=""; \
	for candidate in \
		"$$TMPDIR/repo/skills/$(SKILL)/SKILL.md" \
		"$$TMPDIR/repo/$(SKILL)/SKILL.md" \
		"$$TMPDIR/repo/SKILL.md"; \
	do \
		if [ -f "$$candidate" ]; then \
			SKILL_MD="$$candidate"; \
			break; \
		fi; \
	done; \
	\
	if [ -z "$$SKILL_MD" ]; then \
		SKILL_MD=$$(find "$$TMPDIR/repo" -path "*/$(SKILL)/SKILL.md" -type f 2>/dev/null | head -1); \
	fi; \
	\
	if [ -z "$$SKILL_MD" ] || [ ! -f "$$SKILL_MD" ]; then \
		echo "❌ ERROR: SKILL.md not found for '$(SKILL)' in repository '$(REPO)'" >&2; \
		echo "   Searched:" >&2; \
		echo "     - skills/$(SKILL)/SKILL.md" >&2; \
		echo "     - $(SKILL)/SKILL.md" >&2; \
		echo "     - SKILL.md" >&2; \
		exit 1; \
	fi; \
	echo "   Found: $${SKILL_MD#$$TMPDIR/repo/}"; \
	echo ""; \
	\
	echo "✅ Validating frontmatter..."; \
	if ! grep -q "^name:" "$$SKILL_MD"; then \
		echo "❌ ERROR: SKILL.md missing required 'name' field in frontmatter" >&2; \
		exit 1; \
	fi; \
	if ! grep -q "^description:" "$$SKILL_MD"; then \
		echo "❌ ERROR: SKILL.md missing required 'description' field in frontmatter" >&2; \
		exit 1; \
	fi; \
	ORIGINAL_NAME=$$(sed -n '/^---$$/,/^---$$/p' "$$SKILL_MD" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$$//'); \
	echo "   name: $$ORIGINAL_NAME"; \
	echo ""; \
	\
	echo "🔎 Checking for collisions..."; \
	mkdir -p "$$DEST_DIR"; \
	cp "$$SKILL_MD" "$$DEST_DIR/SKILL.md"; \
	if [ -x "$(COLLISION_SCRIPT)" ]; then \
		if ! "$(COLLISION_SCRIPT)" "$$DEST_DIR" "$$ORIGINAL_NAME" 2>&1; then \
			echo "❌ ERROR: Skill name collision detected" >&2; \
			rm -rf "$$DEST_DIR"; \
			exit 1; \
		fi; \
	fi; \
	echo "   No collisions detected"; \
	echo ""; \
	\
	echo "🧹 Stripping disallowed frontmatter fields..."; \
	sed -i '/^allowed-tools:/d' "$$DEST_DIR/SKILL.md"; \
	sed -i '/^allowed_tools:/d' "$$DEST_DIR/SKILL.md"; \
	echo "   Stripped allowed-tools (if present)"; \
	echo ""; \
	\
	echo "📝 Updating lockfile..."; \
	if [ ! -f "$(LOCK_FILE)" ]; then \
		echo '{"version":1,"skills":{}}' > "$(LOCK_FILE)"; \
	fi; \
	LOCK_KEY="vendor/$$OWNER/$(SKILL)"; \
	IMPORT_DATE=$$(date -u +"%Y-%m-%dT%H:%M:%SZ"); \
	TMPLOCK="$$TMPDIR/lock.json"; \
	SKILL_PATH=$${SKILL_MD#$$TMPDIR/repo/}; \
	SKILL_PATH=$${SKILL_PATH%/SKILL.md}; \
	LOCAL_NAME="vendor-$$OWNER-$(SKILL)"; \
	jq --arg key "$$LOCK_KEY" \
	   --arg repo "$(REPO)" \
	   --arg skill_path "$$SKILL_PATH" \
	   --arg commit "$$COMMIT_HASH" \
	   --arg date "$$IMPORT_DATE" \
	   --arg name "$$ORIGINAL_NAME" \
	   --arg local_name "$$LOCAL_NAME" \
	   '.skills[$$key] = {"repo": $$repo, "skill_path": $$skill_path, "commit": $$commit, "imported_at": $$date, "original_name": $$name, "local_name": $$local_name, "status": "ACTIVE"}' \
	   "$(LOCK_FILE)" > "$$TMPLOCK" && mv "$$TMPLOCK" "$(LOCK_FILE)"; \
	echo "   Updated: $(LOCK_FILE)"; \
	echo ""; \
	\
	echo "================================================"; \
	echo "✅ Skill '$(SKILL)' imported successfully"; \
	echo "================================================"; \
	echo "  Source:   $(REPO)"; \
	echo "  Commit:   $$COMMIT_HASH"; \
	echo "  Location: $$DEST_DIR/SKILL.md"; \
	echo "  Lock key: $$LOCK_KEY"

# Stage a skill for review before promotion to vendor
# Usage: make skill-stage REPO=owner/repo SKILL=skill-name
skill-stage:
	@if [ -z "$(REPO)" ] || [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-stage REPO=owner/repo SKILL=skill-name"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-stage REPO=anthropics/skills SKILL=skill-creator"; \
		exit 1; \
	fi; \
	\
	OWNER=$$(echo "$(REPO)" | cut -d'/' -f1); \
	REPO_NAME=$$(echo "$(REPO)" | cut -d'/' -f2); \
	DEST_DIR="$(STAGING_DIR)/$$OWNER/$(SKILL)"; \
	TMPDIR=$$(mktemp -d); \
	\
	cleanup() { rm -rf "$$TMPDIR"; }; \
	trap cleanup EXIT; \
	\
	echo "📦 Staging skill '$(SKILL)' from $(REPO)..."; \
	echo ""; \
	\
	echo "⬇️  Cloning repository..."; \
	if ! git clone --depth 1 --quiet "https://github.com/$(REPO).git" "$$TMPDIR/repo" 2>/dev/null; then \
		echo "❌ ERROR: Failed to clone repository '$(REPO)'" >&2; \
		echo "   Check that the repository exists and is accessible." >&2; \
		exit 1; \
	fi; \
	\
	COMMIT_HASH=$$(git -C "$$TMPDIR/repo" rev-parse HEAD); \
	echo "   Commit: $$COMMIT_HASH"; \
	echo ""; \
	\
	echo "🔍 Locating SKILL.md..."; \
	SKILL_MD=""; \
	for candidate in \
		"$$TMPDIR/repo/skills/$(SKILL)/SKILL.md" \
		"$$TMPDIR/repo/$(SKILL)/SKILL.md" \
		"$$TMPDIR/repo/SKILL.md"; \
	do \
		if [ -f "$$candidate" ]; then \
			SKILL_MD="$$candidate"; \
			break; \
		fi; \
	done; \
	\
	if [ -z "$$SKILL_MD" ]; then \
		SKILL_MD=$$(find "$$TMPDIR/repo" -path "*/$(SKILL)/SKILL.md" -type f 2>/dev/null | head -1); \
	fi; \
	\
	if [ -z "$$SKILL_MD" ] || [ ! -f "$$SKILL_MD" ]; then \
		echo "❌ ERROR: SKILL.md not found for '$(SKILL)' in repository '$(REPO)'" >&2; \
		echo "   Searched:" >&2; \
		echo "     - skills/$(SKILL)/SKILL.md" >&2; \
		echo "     - $(SKILL)/SKILL.md" >&2; \
		echo "     - SKILL.md" >&2; \
		exit 1; \
	fi; \
	echo "   Found: $${SKILL_MD#$$TMPDIR/repo/}"; \
	echo ""; \
	\
	echo "✅ Validating frontmatter..."; \
	if ! grep -q "^name:" "$$SKILL_MD"; then \
		echo "❌ ERROR: SKILL.md missing required 'name' field in frontmatter" >&2; \
		exit 1; \
	fi; \
	if ! grep -q "^description:" "$$SKILL_MD"; then \
		echo "❌ ERROR: SKILL.md missing required 'description' field in frontmatter" >&2; \
		exit 1; \
	fi; \
	ORIGINAL_NAME=$$(sed -n '/^---$$/,/^---$$/p' "$$SKILL_MD" | grep "^name:" | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$$//'); \
	echo "   name: $$ORIGINAL_NAME"; \
	echo ""; \
	\
	echo "🧹 Stripping disallowed frontmatter fields..."; \
	mkdir -p "$$DEST_DIR"; \
	cp "$$SKILL_MD" "$$DEST_DIR/SKILL.md"; \
	sed -i '/^allowed-tools:/d' "$$DEST_DIR/SKILL.md"; \
	sed -i '/^allowed_tools:/d' "$$DEST_DIR/SKILL.md"; \
	echo "   Stripped allowed-tools (if present)"; \
	echo ""; \
	\
	echo "📝 Updating lockfile..."; \
	if [ ! -f "$(LOCK_FILE)" ]; then \
		echo '{"version":1,"skills":{}}' > "$(LOCK_FILE)"; \
	fi; \
	LOCK_KEY="vendor/$$OWNER/$(SKILL)"; \
	IMPORT_DATE=$$(date -u +"%Y-%m-%dT%H:%M:%SZ"); \
	TMPLOCK="$$TMPDIR/lock.json"; \
	SKILL_PATH=$${SKILL_MD#$$TMPDIR/repo/}; \
	SKILL_PATH=$${SKILL_PATH%/SKILL.md}; \
	LOCAL_NAME="vendor-$$OWNER-$(SKILL)"; \
	jq --arg key "$$LOCK_KEY" \
	   --arg repo "$(REPO)" \
	   --arg skill_path "$$SKILL_PATH" \
	   --arg commit "$$COMMIT_HASH" \
	   --arg date "$$IMPORT_DATE" \
	   --arg name "$$ORIGINAL_NAME" \
	   --arg local_name "$$LOCAL_NAME" \
	   '.skills[$$key] = {"repo": $$repo, "skill_path": $$skill_path, "commit": $$commit, "imported_at": $$date, "original_name": $$name, "local_name": $$local_name, "status": "STAGED"}' \
	   "$(LOCK_FILE)" > "$$TMPLOCK" && mv "$$TMPLOCK" "$(LOCK_FILE)"; \
	echo "   Updated: $(LOCK_FILE)"; \
	echo ""; \
	\
	echo "================================================"; \
	echo "📋 Skill '$(SKILL)' staged for review"; \
	echo "================================================"; \
	echo "  Source:   $(REPO)"; \
	echo "  Commit:   $$COMMIT_HASH"; \
	echo "  Location: $$DEST_DIR/SKILL.md"; \
	echo "  Status:   STAGED"; \
	echo "  Lock key: $$LOCK_KEY"; \
	echo ""; \
	echo "--- SKILL.md content ---"; \
	cat "$$DEST_DIR/SKILL.md"; \
	echo ""; \
	echo "--- End of SKILL.md ---"; \
	echo ""; \
	echo "To promote: make skill-promote SKILL=$$LOCK_KEY"

# Promote a staged skill to active vendor status
# Usage: make skill-promote SKILL=vendor/owner/skill-name
skill-promote:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-promote SKILL=vendor/owner/skill-name"; \
		echo ""; \
		echo "Staged skills:"; \
		if [ -f "$(LOCK_FILE)" ]; then \
			jq -r '.skills | to_entries[] | select(.value.status == "STAGED") | "  \(.key)"' "$(LOCK_FILE)" 2>/dev/null || echo "  (none)"; \
		else \
			echo "  (none)"; \
		fi; \
		exit 1; \
	fi; \
	\
	SKILL_PATH="$(SKILL)"; \
	OWNER=$$(echo "$$SKILL_PATH" | sed 's|^vendor/||' | cut -d'/' -f1); \
	SKILL_NAME=$$(echo "$$SKILL_PATH" | sed 's|^vendor/||' | cut -d'/' -f2); \
	STAGING_SRC="$(STAGING_DIR)/$$OWNER/$$SKILL_NAME"; \
	VENDOR_DEST="$(VENDOR_DIR)/$$OWNER/$$SKILL_NAME"; \
	\
	if [ ! -d "$$STAGING_SRC" ]; then \
		echo "❌ ERROR: Staged skill not found: $$STAGING_SRC" >&2; \
		echo "   Use 'make skill-staged' to see staged skills." >&2; \
		exit 1; \
	fi; \
	\
	if [ ! -f "$(LOCK_FILE)" ]; then \
		echo "❌ ERROR: Lockfile not found: $(LOCK_FILE)" >&2; \
		exit 1; \
	fi; \
	\
	LOCK_STATUS=$$(jq -r --arg key "$$SKILL_PATH" '.skills[$$key].status // "UNKNOWN"' "$(LOCK_FILE)"); \
	if [ "$$LOCK_STATUS" != "STAGED" ]; then \
		echo "❌ ERROR: Skill '$$SKILL_PATH' is not in STAGED status (current: $$LOCK_STATUS)" >&2; \
		exit 1; \
	fi; \
	\
	echo "🚀 Promoting skill '$$SKILL_NAME' from staging to vendor..."; \
	echo ""; \
	\
	echo "🔎 Checking for collisions..."; \
	ORIGINAL_NAME=$$(jq -r --arg key "$$SKILL_PATH" '.skills[$$key].original_name // ""' "$(LOCK_FILE)"); \
	if [ -x "$(COLLISION_SCRIPT)" ] && [ -n "$$ORIGINAL_NAME" ]; then \
		if ! "$(COLLISION_SCRIPT)" "$$STAGING_SRC" "$$ORIGINAL_NAME" 2>&1; then \
			echo "❌ ERROR: Skill name collision detected — promotion aborted" >&2; \
			exit 1; \
		fi; \
	fi; \
	echo "   No collisions detected"; \
	echo ""; \
	\
	echo "📂 Moving to vendor directory..."; \
	mkdir -p "$$(dirname "$$VENDOR_DEST")"; \
	mv "$$STAGING_SRC" "$$VENDOR_DEST"; \
	echo "   Moved: $$STAGING_SRC -> $$VENDOR_DEST"; \
	\
	OWNER_DIR="$(STAGING_DIR)/$$OWNER"; \
	if [ -d "$$OWNER_DIR" ] && [ -z "$$(ls -A "$$OWNER_DIR" 2>/dev/null)" ]; then \
		rmdir "$$OWNER_DIR" 2>/dev/null || true; \
	fi; \
	echo ""; \
	\
	echo "📝 Updating lockfile..."; \
	TMPLOCK=$$(mktemp); \
	jq --arg key "$$SKILL_PATH" \
	   '.skills[$$key].status = "ACTIVE"' \
	   "$(LOCK_FILE)" > "$$TMPLOCK" && mv "$$TMPLOCK" "$(LOCK_FILE)"; \
	echo "   Status: STAGED -> ACTIVE"; \
	echo ""; \
	\
	echo "================================================"; \
	echo "✅ Skill '$$SKILL_NAME' promoted successfully"; \
	echo "================================================"; \
	echo "  Location: $$VENDOR_DEST/SKILL.md"; \
	echo "  Status:   ACTIVE"

# List all staged skills pending review
# Usage: make skill-staged
skill-staged:
	@echo "================================================"
	@echo "📋 STAGED SKILLS (pending review)"
	@echo "================================================"
	@echo ""
	@if [ -f "$(LOCK_FILE)" ]; then \
		COUNT=$$(jq '[.skills | to_entries[] | select(.value.status == "STAGED")] | length' "$(LOCK_FILE)" 2>/dev/null || echo 0); \
		if [ "$$COUNT" -gt 0 ]; then \
			printf "  %-40s %-25s %-25s %s\n" "SKILL" "REPO" "IMPORTED" "STATUS"; \
			printf "  %-40s %-25s %-25s %s\n" "----------------------------------------" "-------------------------" "-------------------------" "------"; \
			jq -r '.skills | to_entries[] | select(.value.status == "STAGED") | "\(.key)|\(.value.repo)|\(.value.imported_at)|\(.value.status)"' "$(LOCK_FILE)" | \
			while IFS='|' read -r name repo date status; do \
				printf "  %-40s %-25s %-25s %s\n" "$$name" "$$repo" "$$date" "$$status"; \
			done; \
			echo ""; \
			echo "  Total: $$COUNT staged skill(s)"; \
			echo ""; \
			echo "  Promote with: make skill-promote SKILL=<skill-key>"; \
		else \
			echo "  No staged skills."; \
			echo ""; \
			echo "  Stage with: make skill-stage REPO=owner/repo SKILL=skill-name"; \
		fi; \
	else \
		echo "  No lockfile found. No skills staged."; \
	fi
	@echo ""

# Remove an imported vendor skill
# Usage: make skill-remove SKILL=vendor/owner/skill-name
skill-remove:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-remove SKILL=vendor/owner/skill-name"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-remove SKILL=vendor/anthropics/frontend-design"; \
		echo ""; \
		echo "Installed vendor skills:"; \
		if [ -f "$(LOCK_FILE)" ]; then \
			jq -r '.skills | keys[]' "$(LOCK_FILE)" 2>/dev/null || echo "  (none)"; \
		else \
			echo "  (none)"; \
		fi; \
		exit 1; \
	fi; \
	\
	SKILL_DIR="$(SKILLS_DIR)/$(SKILL)"; \
	LOCK_KEY="$(SKILL)"; \
	\
	if [ ! -d "$$SKILL_DIR" ]; then \
		echo "❌ ERROR: Skill directory not found: $$SKILL_DIR" >&2; \
		echo "   Use 'make skill-list' to see installed vendor skills." >&2; \
		exit 1; \
	fi; \
	\
	echo "🗑️  Removing skill '$(SKILL)'..."; \
	echo ""; \
	\
	rm -rf "$$SKILL_DIR"; \
	echo "   Removed: $$SKILL_DIR"; \
	\
	OWNER_DIR=$$(dirname "$$SKILL_DIR"); \
	if [ -d "$$OWNER_DIR" ] && [ -z "$$(ls -A "$$OWNER_DIR" 2>/dev/null)" ]; then \
		rmdir "$$OWNER_DIR" 2>/dev/null || true; \
		echo "   Cleaned up empty owner directory"; \
	fi; \
	echo ""; \
	\
	if [ -f "$(LOCK_FILE)" ]; then \
		echo "📝 Updating lockfile..."; \
		TMPLOCK=$$(mktemp); \
		jq --arg key "$$LOCK_KEY" 'del(.skills[$$key])' "$(LOCK_FILE)" > "$$TMPLOCK" && mv "$$TMPLOCK" "$(LOCK_FILE)"; \
		echo "   Removed '$$LOCK_KEY' from $(LOCK_FILE)"; \
		echo ""; \
	fi; \
	\
	echo "✅ Skill '$(SKILL)' removed successfully"

# List all imported vendor skills
# Usage: make skill-list
skill-list:
	@echo "================================================"
	@echo "📋 IMPORTED VENDOR SKILLS"
	@echo "================================================"
	@echo ""
	@if [ -f "$(LOCK_FILE)" ]; then \
		COUNT=$$(jq '.skills | length' "$(LOCK_FILE)" 2>/dev/null || echo 0); \
		if [ "$$COUNT" -gt 0 ]; then \
			jq -r '.skills | to_entries[] | "  \(.key)\n    repo: \(.value.repo)\n    commit: \(.value.commit[0:12])\n    imported: \(.value.imported_at)\n    status: \(.value.status)\n"' "$(LOCK_FILE)"; \
		else \
			echo "  No vendor skills installed."; \
			echo ""; \
			echo "  Import with: make skill-import REPO=owner/repo SKILL=skill-name"; \
		fi; \
	else \
		echo "  No lockfile found. No vendor skills installed."; \
	fi
	@echo ""

# Check for outdated vendor skills by comparing against GitHub
# Usage: make skill-outdated
skill-outdated:
	@echo "================================================"
	@echo "🔍 CHECKING FOR OUTDATED VENDOR SKILLS"
	@echo "================================================"
	@echo ""
	@if [ ! -f "$(LOCK_FILE)" ]; then \
		echo "  No lockfile found. Nothing to check."; \
		exit 0; \
	fi; \
	\
	COUNT=$$(jq '[.skills | to_entries[] | select(.value.status == "ACTIVE")] | length' "$(LOCK_FILE)" 2>/dev/null || echo 0); \
	if [ "$$COUNT" -eq 0 ]; then \
		echo "  No active vendor skills installed. Nothing to check."; \
		exit 0; \
	fi; \
	\
	HAS_GH=false; \
	if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then \
		HAS_GH=true; \
	fi; \
	\
	printf "%-40s %-14s %-14s %s\n" "SKILL" "LOCAL" "REMOTE" "STATUS"; \
	printf "%-40s %-14s %-14s %s\n" "────────────────────────────────────────" "──────────────" "──────────────" "──────────"; \
	\
	jq -r '.skills | to_entries[] | select(.value.status == "ACTIVE") | "\(.key)|\(.value.repo)|\(.value.commit)|\(.value.skill_path // "")"' "$(LOCK_FILE)" | \
	while IFS='|' read -r key repo local_commit skill_path; do \
		REMOTE_COMMIT=""; \
		FETCH_OK=false; \
		\
		if [ "$$HAS_GH" = true ]; then \
			RESPONSE=$$(gh api "repos/$$repo/commits?per_page=1&path=$$skill_path" --jq '.[0].sha' 2>/dev/null) && FETCH_OK=true; \
			if [ "$$FETCH_OK" = true ] && [ -n "$$RESPONSE" ] && [ "$$RESPONSE" != "null" ]; then \
				REMOTE_COMMIT="$$RESPONSE"; \
			else \
				FETCH_OK=false; \
			fi; \
		fi; \
		\
		if [ "$$FETCH_OK" = false ]; then \
			RESPONSE=$$(curl -sSf -H "Accept: application/vnd.github.v3+json" \
				"https://api.github.com/repos/$$repo/commits?per_page=1&sha=HEAD" 2>/dev/null) || true; \
			if [ -n "$$RESPONSE" ]; then \
				REMOTE_COMMIT=$$(echo "$$RESPONSE" | jq -r '.[0].sha // empty' 2>/dev/null); \
			fi; \
		fi; \
		\
		LOCAL_SHORT=$${local_commit:0:12}; \
		if [ -z "$$REMOTE_COMMIT" ]; then \
			printf "%-40s %-14s %-14s %s\n" "$$key" "$$LOCAL_SHORT" "(error)" "⚠️  fetch failed"; \
		elif [ "$$local_commit" = "$$REMOTE_COMMIT" ]; then \
			REMOTE_SHORT=$${REMOTE_COMMIT:0:12}; \
			printf "%-40s %-14s %-14s %s\n" "$$key" "$$LOCAL_SHORT" "$$REMOTE_SHORT" "✅ up-to-date"; \
		else \
			REMOTE_SHORT=$${REMOTE_COMMIT:0:12}; \
			printf "%-40s %-14s %-14s %s\n" "$$key" "$$LOCAL_SHORT" "$$REMOTE_SHORT" "⬆️  outdated"; \
		fi; \
	done; \
	echo ""; \
	echo "Done."

# Update an outdated vendor skill to the latest version
# Usage: make skill-update SKILL=vendor/owner/skill-name [YES=1]
# Set YES=1 to skip confirmation prompt (for CI/scripting)
skill-update:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-update SKILL=vendor/owner/skill-name [YES=1]"; \
		echo ""; \
		echo "Options:"; \
		echo "  YES=1  Skip confirmation prompt (for CI/scripting)"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-update SKILL=vendor/anthropics/frontend-design"; \
		echo "  make skill-update SKILL=vendor/anthropics/frontend-design YES=1"; \
		exit 1; \
	fi; \
	\
	if [ ! -f "$(LOCK_FILE)" ]; then \
		echo "❌ ERROR: Lockfile not found at $(LOCK_FILE)" >&2; \
		exit 1; \
	fi; \
	\
	ENTRY=$$(jq --arg key "$(SKILL)" '.skills[$$key] // empty' "$(LOCK_FILE)"); \
	if [ -z "$$ENTRY" ]; then \
		echo "❌ ERROR: Skill '$(SKILL)' not found in lockfile" >&2; \
		echo "   Use 'make skill-list' to see installed vendor skills." >&2; \
		exit 1; \
	fi; \
	\
	REPO=$$(echo "$$ENTRY" | jq -r '.repo'); \
	LOCAL_COMMIT=$$(echo "$$ENTRY" | jq -r '.commit'); \
	SKILL_PATH=$$(echo "$$ENTRY" | jq -r '.skill_path // empty'); \
	ORIGINAL_NAME=$$(echo "$$ENTRY" | jq -r '.original_name // empty'); \
	SKILL_NAME=$$(echo "$(SKILL)" | awk -F'/' '{print $$NF}'); \
	OWNER=$$(echo "$(SKILL)" | awk -F'/' '{print $$(NF-1)}'); \
	DEST_DIR="$(SKILLS_DIR)/$(SKILL)"; \
	\
	echo "🔄 Updating skill '$(SKILL)'..."; \
	echo "   Repository: $$REPO"; \
	echo "   Local commit: $${LOCAL_COMMIT:0:12}"; \
	echo ""; \
	\
	TMPDIR=$$(mktemp -d); \
	cleanup() { rm -rf "$$TMPDIR"; }; \
	trap cleanup EXIT; \
	\
	echo "⬇️  Cloning repository..."; \
	if ! git clone --depth 1 --quiet "https://github.com/$$REPO.git" "$$TMPDIR/repo" 2>/dev/null; then \
		echo "❌ ERROR: Failed to clone repository '$$REPO'" >&2; \
		echo "   Check your network connection and repository access." >&2; \
		exit 1; \
	fi; \
	\
	NEW_COMMIT=$$(git -C "$$TMPDIR/repo" rev-parse HEAD); \
	echo "   Remote commit: $${NEW_COMMIT:0:12}"; \
	echo ""; \
	\
	if [ "$$LOCAL_COMMIT" = "$$NEW_COMMIT" ]; then \
		echo "✅ Skill '$(SKILL)' is already up-to-date."; \
		exit 0; \
	fi; \
	\
	NEW_SKILL_MD=""; \
	if [ -n "$$SKILL_PATH" ] && [ -f "$$TMPDIR/repo/$$SKILL_PATH/SKILL.md" ]; then \
		NEW_SKILL_MD="$$TMPDIR/repo/$$SKILL_PATH/SKILL.md"; \
	else \
		for candidate in \
			"$$TMPDIR/repo/skills/$$SKILL_NAME/SKILL.md" \
			"$$TMPDIR/repo/$$SKILL_NAME/SKILL.md" \
			"$$TMPDIR/repo/SKILL.md"; \
		do \
			if [ -f "$$candidate" ]; then \
				NEW_SKILL_MD="$$candidate"; \
				break; \
			fi; \
		done; \
	fi; \
	\
	if [ -z "$$NEW_SKILL_MD" ] || [ ! -f "$$NEW_SKILL_MD" ]; then \
		echo "❌ ERROR: SKILL.md not found in latest version of '$$REPO'" >&2; \
		exit 1; \
	fi; \
	\
	CURRENT_SKILL_MD="$$DEST_DIR/SKILL.md"; \
	if [ ! -f "$$CURRENT_SKILL_MD" ]; then \
		echo "⚠️  No local SKILL.md found at $$CURRENT_SKILL_MD"; \
		echo "   Will install fresh copy."; \
		echo ""; \
	fi; \
	\
	echo "📝 Diff between local and remote SKILL.md:"; \
	echo "────────────────────────────────────────────"; \
	if [ -f "$$CURRENT_SKILL_MD" ]; then \
		diff -u "$$CURRENT_SKILL_MD" "$$NEW_SKILL_MD" \
			--label "local ($${LOCAL_COMMIT:0:12})" \
			--label "remote ($${NEW_COMMIT:0:12})" || true; \
	else \
		echo "(new file)"; \
		cat "$$NEW_SKILL_MD"; \
	fi; \
	echo "────────────────────────────────────────────"; \
	echo ""; \
	\
	if [ "$(YES)" != "1" ]; then \
		printf "Apply update? [y/N] "; \
		read -r CONFIRM; \
		if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then \
			echo "❌ Update cancelled."; \
			exit 0; \
		fi; \
	else \
		echo "   (Auto-confirmed via YES=1)"; \
	fi; \
	echo ""; \
	\
	echo "📦 Applying update..."; \
	mkdir -p "$$DEST_DIR"; \
	cp "$$NEW_SKILL_MD" "$$DEST_DIR/SKILL.md"; \
	\
	sed -i '/^allowed-tools:/d' "$$DEST_DIR/SKILL.md"; \
	sed -i '/^allowed_tools:/d' "$$DEST_DIR/SKILL.md"; \
	\
	echo "📝 Updating lockfile..."; \
	UPDATE_DATE=$$(date -u +"%Y-%m-%dT%H:%M:%SZ"); \
	NEW_SKILL_PATH=$${NEW_SKILL_MD#$$TMPDIR/repo/}; \
	NEW_SKILL_PATH=$${NEW_SKILL_PATH%/SKILL.md}; \
	LOCAL_NAME="vendor-$$OWNER-$$SKILL_NAME"; \
	TMPLOCK="$$TMPDIR/lock.json"; \
	jq --arg key "$(SKILL)" \
	   --arg commit "$$NEW_COMMIT" \
	   --arg date "$$UPDATE_DATE" \
	   --arg skill_path "$$NEW_SKILL_PATH" \
	   --arg local_name "$$LOCAL_NAME" \
	   '.skills[$$key].commit = $$commit | .skills[$$key].updated_at = $$date | .skills[$$key].skill_path = $$skill_path | .skills[$$key].local_name = $$local_name' \
	   "$(LOCK_FILE)" > "$$TMPLOCK" && mv "$$TMPLOCK" "$(LOCK_FILE)"; \
	echo "   Lockfile updated."; \
	echo ""; \
	\
	echo "================================================"; \
	echo "✅ Skill '$(SKILL)' updated successfully"; \
	echo "================================================"; \
	echo "  Old commit: $${LOCAL_COMMIT:0:12}"; \
	echo "  New commit: $${NEW_COMMIT:0:12}"

# Show help for skill management
# Usage: make skill-help
skill-help:
	@echo "================================================"
	@echo "📋 SKILL MANAGEMENT - AVAILABLE COMMANDS"
	@echo "================================================"
	@echo ""
	@echo "🔧 Skill Import/Remove:"
	@echo "  make skill-import REPO=owner/repo SKILL=name  - Import a skill (via staging by default)"
	@echo "  make skill-import ... DIRECT=1                - Import directly to vendor (skip staging)"
	@echo "  make skill-remove SKILL=vendor/owner/name     - Remove an imported skill"
	@echo "  make skill-list                               - List imported vendor skills"
	@echo ""
	@echo "🤝 Integration:"
	@echo "  make skill-integrate SKILL=vendor/owner/name  - Generate 10-touchpoint integration report"
	@echo ""
	@echo "🔍 Staging Workflow:"
	@echo "  make skill-stage REPO=owner/repo SKILL=name   - Stage a skill for review"
	@echo "  make skill-staged                             - List staged skills pending review"
	@echo "  make skill-promote SKILL=vendor/owner/name    - Promote staged skill to active"
	@echo ""
	@echo "🔄 Version Tracking:"
	@echo "  make skill-outdated                           - Check for outdated vendor skills"
	@echo "  make skill-update SKILL=vendor/owner/name     - Update a skill to latest version"
	@echo "  make skill-update ... YES=1                   - Update without confirmation prompt"
	@echo ""
	@echo "📖 Examples:"
	@echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design"
	@echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design DIRECT=1"
	@echo "  make skill-stage REPO=anthropics/skills SKILL=skill-creator"
	@echo "  make skill-promote SKILL=vendor/anthropics/skill-creator"
	@echo "  make skill-remove SKILL=vendor/anthropics/frontend-design"
	@echo "  make skill-outdated"
	@echo "  make skill-update SKILL=vendor/anthropics/frontend-design"
	@echo "  make skill-update SKILL=vendor/anthropics/frontend-design YES=1"
	@echo ""

# Generate 10-touchpoint integration report for a skill
# Usage: make skill-integrate SKILL=vendor/owner/skill-name
skill-integrate:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-integrate SKILL=vendor/owner/skill-name"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-integrate SKILL=vendor/anthropics/frontend-design"; \
		exit 1; \
	fi; \
	\
	"$(HOME)/.config/opencode/scripts/skill-integrate.sh" "$(SKILL)"
