.PHONY: skill-import skill-remove skill-list skill-help

# Configuration
SKILLS_DIR := $(HOME)/.config/opencode/skills
VENDOR_DIR := $(SKILLS_DIR)/vendor
LOCK_FILE := $(HOME)/.config/opencode/.skill-lock.json
COLLISION_SCRIPT := $(HOME)/.config/opencode/scripts/detect-skill-collision.sh

# =============================================================================
# Skill Management Targets
# =============================================================================

# Import a skill from a GitHub repository (skills.sh format)
# Usage: make skill-import REPO=owner/repo SKILL=skill-name
skill-import:
	@if [ -z "$(REPO)" ] || [ -z "$(SKILL)" ]; then \
		echo "Usage: make skill-import REPO=owner/repo SKILL=skill-name"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design"; \
		echo "  make skill-import REPO=anthropics/skills SKILL=mcp-builder"; \
		exit 1; \
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
	jq --arg key "$$LOCK_KEY" \
	   --arg repo "$(REPO)" \
	   --arg commit "$$COMMIT_HASH" \
	   --arg date "$$IMPORT_DATE" \
	   --arg name "$$ORIGINAL_NAME" \
	   '.skills[$$key] = {"repo": $$repo, "commit": $$commit, "imported_at": $$date, "original_name": $$name, "status": "active"}' \
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

# Show help for skill management
# Usage: make skill-help
skill-help:
	@echo "================================================"
	@echo "📋 SKILL MANAGEMENT - AVAILABLE COMMANDS"
	@echo "================================================"
	@echo ""
	@echo "🔧 Skill Import/Remove:"
	@echo "  make skill-import REPO=owner/repo SKILL=name  - Import a skill from GitHub"
	@echo "  make skill-remove SKILL=vendor/owner/name     - Remove an imported skill"
	@echo "  make skill-list                               - List imported vendor skills"
	@echo ""
	@echo "📖 Examples:"
	@echo "  make skill-import REPO=anthropics/skills SKILL=frontend-design"
	@echo "  make skill-remove SKILL=vendor/anthropics/frontend-design"
	@echo ""
