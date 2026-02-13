# Skill Collision Detection

Prevents silent skill name collisions when importing new skills into opencode.

## Problem

opencode scans `~/.config/opencode/skills/**/SKILL.md` and identifies skills by their frontmatter `name` field. If two skills have the same `name`, the last one scanned silently wins, causing the first to be hidden.

With 140+ existing skills, collision risk is high. This script detects and prevents collisions.

## Solution

The `detect-skill-collision.sh` script:

1. **Extracts** all existing skill names from `~/.config/opencode/skills/**/SKILL.md`
2. **Compares** the imported skill's name against the full list
3. **Rejects** the import if a collision is detected
4. **Optionally renames** with vendor prefix if `FORCE=1` flag is set

## Usage

### Basic Collision Detection

```bash
./scripts/detect-skill-collision.sh <imported_skill_file>
```

**Example:**
```bash
./scripts/detect-skill-collision.sh /tmp/golang-skill/SKILL.md
```

**Output (collision detected):**
```
ERROR: COLLISION: Skill 'golang' already exists
ERROR:   Location: /home/user/.config/opencode/skills/golang/SKILL.md
ERROR: Use FORCE=1 to rename with vendor prefix and proceed
```

**Exit code:** 1 (failure)

### Collision Detection with Vendor Prefix Rename

```bash
FORCE=1 ./scripts/detect-skill-collision.sh <imported_skill_file> <vendor_name>
```

**Example:**
```bash
FORCE=1 ./scripts/detect-skill-collision.sh /tmp/golang-skill/SKILL.md anthropic
```

**Output:**
```
ERROR: COLLISION: Skill 'golang' already exists
ERROR:   Location: /home/user/.config/opencode/skills/golang/SKILL.md
WARNING: FORCE=1: Renaming to avoid collision
WARNING:   Old name: golang
WARNING:   New name: vendor-anthropic-golang
✓ Skill renamed with vendor prefix: vendor-anthropic-golang
```

**Exit code:** 0 (success)

The imported skill's frontmatter is modified:
```yaml
---
name: vendor-anthropic-golang
description: ...
---
```

### Verbose Mode

```bash
VERBOSE=1 ./scripts/detect-skill-collision.sh <imported_skill_file>
```

Prints debug information about the collision detection process.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SKILLS_DIR` | `~/.config/opencode/skills` | Location of existing skills |
| `FORCE` | `0` | Set to `1` to allow collision with vendor prefix rename |
| `VERBOSE` | `0` | Set to `1` for debug output |

## Vendor Prefix Format

When `FORCE=1` is used, the skill is renamed with the format:

```
vendor-{vendor_name}-{original_name}
```

**Examples:**
- `vendor-anthropic-golang`
- `vendor-openai-frontend-design`
- `vendor-custom-my-skill`

This ensures:
- No collision with existing skills
- Clear origin/vendor attribution
- Predictable naming convention

## Edge Cases Handled

### 1. Missing Name Field

If the imported skill's SKILL.md lacks a `name:` field in frontmatter:

```
ERROR: Cannot extract 'name' from frontmatter: /path/to/SKILL.md
ERROR: Ensure the SKILL.md file has a 'name:' field in the frontmatter
```

**Exit code:** 1

### 2. Directory/Name Mismatch

If the directory name doesn't match the skill's `name` field:

```
WARNING: Directory name doesn't match skill name
WARNING:   Directory: wrong_dir_name
WARNING:   Name field: correct-skill-name
WARNING:   (This is allowed but may cause confusion)
✓ No collision detected for skill: correct-skill-name
```

**Exit code:** 0 (allowed, but warned)

### 3. Corruption Detection

If existing skills have duplicate names (indicating corruption):

```
WARNING: Multiple skills with same name detected (corruption):
  - golang
  - python
ERROR: Existing skills have duplicate names. Please resolve corruption first.
```

**Exit code:** 1

### 4. Case-Sensitive Matching

Name matching is **case-sensitive**:

```bash
# These are treated as DIFFERENT skills
golang  # existing
Golang  # imported (no collision)
```

### 5. Quoted Names in Frontmatter

Both quoted and unquoted names are handled:

```yaml
# Both work
name: golang
name: "golang"
name: 'golang'
```

## Integration with Makefile

Add to your Makefile:

```makefile
.PHONY: check-skill-collision
check-skill-collision:
	@./scripts/detect-skill-collision.sh $(SKILL_FILE)

.PHONY: import-skill
import-skill: check-skill-collision
	@echo "Importing skill..."
	# Copy skill to ~/.config/opencode/skills/
```

Usage:
```bash
make check-skill-collision SKILL_FILE=/path/to/imported/SKILL.md
make import-skill SKILL_FILE=/path/to/imported/SKILL.md
```

With FORCE flag:
```bash
FORCE=1 make check-skill-collision SKILL_FILE=/path/to/imported/SKILL.md vendor-name
```

## Testing

Run the comprehensive test suite:

```bash
bats tests/test-skill-collision.bats
```

**Test coverage:**
- ✓ Collision detection with existing skills
- ✓ Non-zero exit code on collision
- ✓ Conflicting skill location reporting
- ✓ No collision detection
- ✓ Zero exit code on success
- ✓ FORCE=1 vendor prefix renaming
- ✓ Frontmatter modification verification
- ✓ Vendor name requirement with FORCE
- ✓ Missing name field detection
- ✓ Directory/name mismatch warnings
- ✓ Missing imported skill file handling
- ✓ Missing skills directory handling
- ✓ Case-sensitive name matching
- ✓ Quoted name handling
- ✓ Verbose mode output
- ✓ Existing skills not modified on collision
- ✓ Backup file creation on rename

All 18 tests pass.

## Implementation Details

### Name Extraction

Names are extracted from YAML frontmatter using sed:

```bash
sed -n '/^---$/,/^---$/p' "$file" | \
    grep -E '^name:\s*' | \
    sed -E 's/^name:\s*["'"'"']?([^"'"'"']+)["'"'"']?$/\1/'
```

This:
1. Extracts content between `---` markers
2. Finds the `name:` line
3. Strips quotes and whitespace
4. Returns the name value

### Collision Check

Collision detection uses exact string matching:

```bash
grep -q "^${imported_name}$" "$temp_names_file"
```

This ensures:
- Case-sensitive matching
- Exact name matching (no partial matches)
- Fast lookup using grep

### Vendor Prefix Rename

Frontmatter is rewritten using awk to preserve YAML structure:

```awk
awk -v new_name="$new_name" '
    /^---$/ { in_frontmatter = !in_frontmatter; print; next }
    in_frontmatter && /^name:/ { print "name: " new_name; next }
    { print }
' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
```

This:
1. Tracks frontmatter boundaries
2. Replaces only the `name:` line
3. Preserves all other content
4. Creates atomic rename (tmp → final)

### Backup Creation

When renaming with FORCE, a backup is created:

```bash
cp "$file" "${file}.bak"
```

This allows recovery if the rename causes issues.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No collision detected (or collision handled with FORCE) |
| 1 | Collision detected (without FORCE) or other error |

## Performance

- **Time complexity:** O(n) where n = number of existing skills
- **Space complexity:** O(n) for storing skill names
- **Typical runtime:** <100ms for 140+ skills

## Security Considerations

- ✓ No shell injection (all variables quoted)
- ✓ No arbitrary code execution
- ✓ Backup created before modification
- ✓ Existing skills never modified (only imported skill)
- ✓ Vendor prefix prevents accidental overwrites

## Troubleshooting

### "Cannot extract 'name' from frontmatter"

**Cause:** The SKILL.md file doesn't have a `name:` field in the frontmatter.

**Fix:** Add the field:
```yaml
---
name: my-skill
description: ...
---
```

### "COLLISION: Skill 'X' already exists"

**Cause:** A skill with the same name already exists.

**Options:**
1. Rename your skill to something unique
2. Use `FORCE=1` to rename with vendor prefix
3. Delete the existing skill (if appropriate)

### "FORCE=1 requires vendor name as second argument"

**Cause:** You used `FORCE=1` but didn't provide a vendor name.

**Fix:**
```bash
FORCE=1 ./scripts/detect-skill-collision.sh file.md vendor-name
```

### "Directory name doesn't match skill name"

**Cause:** The directory name and `name:` field don't match.

**Impact:** Allowed but may cause confusion. Consider renaming the directory to match.

## Related Files

- `scripts/detect-skill-collision.sh` — Main collision detection script
- `tests/test-skill-collision.bats` — Comprehensive test suite
- `~/.config/opencode/skills/` — Existing skills directory
