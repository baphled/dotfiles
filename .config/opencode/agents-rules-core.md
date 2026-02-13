# OpenCode Agent System - Core Rules

## Change Request Verification (MANDATORY)

When addressing change requests, comments, or review feedback:

### Verification Workflow
1. **Identify** - Locate each specific request/comment
2. **Understand** - What exactly is being asked? (not assumptions)
3. **Verify** - Read the actual code to confirm change was made
4. **Document** - Show evidence that change was applied
5. **Report** - Summarize all addressed requests with line references

### Evidence Requirements
For each change request, you MUST provide:
- **File location** - `file_path:line_number` format
- **Before state** - What was there originally
- **After state** - What is there now
- **Verification** - Proof the change exists in current code
- **Status** - ADDRESSED, FALSE POSITIVE, or REJECTED (with reason)

### Handling Different Request Types

**Real Issues** (actual code/docs that need changes):
- Make the change
- Verify in code (use Read tool)
- Document with exact line references
- Mark as ADDRESSED

**False Positives** (requests for non-existent files/code):
- Verify file/code doesn't exist
- Document why it's not applicable
- Mark as FALSE POSITIVE
- Include reason (e.g., "File not in this branch")

**Rejected Requests** (working as intended):
- Verify the code works correctly
- Explain why change is NOT needed
- Document the verification
- Mark as REJECTED + reason
- Example: "Tests work correctly - verifies behavior is intentional"

### Format for Reporting
```
## Change Request Summary

### Real Issues Fixed (N of total)

**1. [Request Description]**
- File: `path/to/file.go:123`
- Change: [what was modified]
- Evidence: [verification from Read tool]
- Status: ADDRESSED

### False Positives (N of total)

**1. [Request Description]**
- Reason: [why not applicable]
- Status: FALSE POSITIVE

### Rejected Requests (N of total)

**1. [Request Description]**
- Why: [explanation]
- Status: REJECTED
```

### Skills Integration
- Use **Read tool** to verify changes in actual code
- Use **memory-keeper** to document verification process
- Use **pre-action** framework when uncertain about a request

---

## Three Pillars (MANDATORY)

1. **Always-Active Discipline** - pre-action, memory-keeper, search first
2. **Parallel Execution** - Independent tasks in single message
3. **Progressive Disclosure** - Load only what's needed

**No exceptions.**
