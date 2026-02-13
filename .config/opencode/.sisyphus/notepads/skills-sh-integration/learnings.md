# Skills.sh Integration - Learnings

## Task 3: Makefile skill-import and skill-remove Targets

### Key Decisions

1. **Skill location search order**: Skills in repos like `anthropics/skills` live at `skills/{name}/SKILL.md`. The Makefile searches: `skills/{SKILL}/SKILL.md` → `{SKILL}/SKILL.md` → `SKILL.md` → `find` fallback.

2. **Lock file format**: Uses `{"version":1,"skills":{}}` with keys like `vendor/owner/skill-name`. Each entry tracks: `repo`, `commit`, `imported_at`, `original_name`, `status`.

3. **Collision detection integration**: Calls `detect-skill-collision.sh` with `<skill-dir> <skill-name>` args. If collision detected (exit 1), import aborts and cleans up the destination directory.

4. **Frontmatter stripping**: Removes `allowed-tools` and `allowed_tools` variants from SKILL.md. These are Claude Code-specific and not relevant for oh-my-opencode.

5. **Temp directory cleanup**: Uses `trap cleanup EXIT` to ensure cloned repos are cleaned up even on error.

### Repo Structure Discovery

- `anthropics/skills` repo structure: `skills/{skill-name}/SKILL.md` + `skills/{skill-name}/LICENSE.txt`
- SKILL.md frontmatter uses `---` delimited YAML with `name:` and `description:` fields
- Some skills have `allowed-tools:` in frontmatter which must be stripped

### Error Handling

- Nonexistent repo: Git clone fails cleanly, no partial files left behind
- Missing SKILL.md: Clear error listing searched paths
- Missing frontmatter: Validates `name:` and `description:` presence
- Nonexistent skill removal: Catches directory-not-found, suggests `skill-list`
- Owner dir cleanup: Removes empty owner directories after last skill removed

### Integration Points

- `detect-skill-collision.sh` at `scripts/detect-skill-collision.sh`
- `.skill-lock.json` at opencode root
- Vendor skills at `skills/vendor/{owner}/{skill-name}/SKILL.md`
- Makefile follows KoRiya style: `.PHONY`, `@` prefix, `$$` escaping, emoji prefixed output

### Testing Results

All 3 acceptance scenarios pass:
1. ✅ Import `anthropics/skills` → `frontend-design` - SKILL.md placed, lockfile updated, allowed-tools stripped
2. ✅ Remove `vendor/anthropics/frontend-design` - directory removed, lockfile cleaned
3. ✅ Nonexistent repo import - clean failure, non-zero exit, no partial files
