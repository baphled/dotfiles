---
description: Start a new feature development session
agent: general
subtask: false
---

# Feature Development Session Manager

You are being asked to start a new feature development session. The user can:
- Provide a specific task number (e.g., "22" or "tasks-22")
- Request the "next" incomplete task
- "list" all incomplete tasks to choose from

## Critical Session Requirements

⚠️ **MANDATORY BEFORE ANY WORK**: 
1. Run `make session-start` and verify it PASSES
2. ALL rules must be STRICTLY met
3. If session-start FAILS, work CANNOT proceed

## Step 1: Determine Task Selection

### If argument is "list" or "ls":
1. Run: `grep -l "Status.*Ready for Implementation\|Status.*In Progress\|Status.*📋" tasks/tasks-*.md 2>/dev/null || echo ""`
2. Run: `for f in tasks/tasks-*.md; do echo "=== $f ===" && head -30 "$f" | grep -E "^#|Status:|Goal:" || true; done`
3. Parse output to show incomplete tasks with:
   - Task number
   - Task title
   - Status
   - Goal/description
4. Present numbered list to user: "Which task would you like to work on? (Enter number or 'q' to cancel)"
5. Wait for user selection
6. If user selects a number, proceed with that task
7. If user cancels, exit gracefully

### If argument is "next":
1. Run: `ls tasks/tasks-*.md | sed 's/tasks\/tasks-\([0-9]*\).*/\1/' | sort -n | tail -1`
2. Find the highest task number
3. Check if that task is complete by looking for "Status.*Complete\|✅" in the file
4. If complete, suggest next number (+1)
5. If incomplete, use that task number
6. Present to user: "Next incomplete task is Task X: [Title]. Start session? (y/n)"
7. Wait for confirmation

### If argument is a number (e.g., "22" or "tasks-22"):
1. Extract task number from argument
2. Verify file exists: `tasks/tasks-{number}-*.md`
3. If not found, search for exact match: `ls tasks/tasks-{number}*.md`
4. Present to user: "Found Task {number}: [Title]. Start session? (y/n)"
5. Wait for confirmation

### If no argument provided:
Present options:
```
🎯 Feature Development Session

Choose an option:
1. List incomplete tasks
2. Start next incomplete task
3. Specify task number

Enter choice (1/2/3 or q to cancel):
```

## Step 2: Read Task File

Once task is selected:
1. Run: `cat tasks/tasks-{number}-*.md`
2. Parse the task file to extract:
   - Task title
   - Goal/overview
   - Time estimate
   - Prerequisites
   - Phases and subtasks
   - Files to modify
   - Acceptance criteria

## Step 3: Display Session Information

Show this EXACT format:

```
================================================
🚀 STARTING FEATURE DEVELOPMENT SESSION
================================================

📋 Task Information:
   Number: {task_number}
   Title: {task_title}
   File: tasks/tasks-{number}-{slug}.md
   
🎯 Goal:
   {goal_description}
   
⏱️  Time Estimate: {time_estimate}

📦 Prerequisites:
{list_prerequisites}

📁 Files to Modify:
{list_main_files}

================================================
🔍 MANDATORY: RUNNING SESSION-START
================================================

This command will verify:
  ✅ Git hooks installed (AI attribution)
  ✅ Code formatting (go fmt)
  ✅ Static analysis (go vet, staticcheck)
  ✅ All tests passing
  ✅ No race conditions
  ✅ Zero staticcheck warnings
  
Running: make session-start
```

## Step 4: Run Session Start (MANDATORY)

**CRITICAL**: This step CANNOT be skipped.

1. Run: `make session-start`
2. Capture full output
3. Check exit code

**If session-start FAILS (exit code ≠ 0)**:
```
❌ SESSION START FAILED

The following violations must be fixed before proceeding:

{show_actual_errors}

WORK CANNOT PROCEED until all violations are resolved.

Required actions:
1. Fix all reported violations
2. Run `make session-start` again
3. Verify it passes
4. Then restart this session

I cannot proceed with feature development until session-start passes.
```

**REFUSE to continue** if session-start fails. Output:
```
I cannot proceed with this feature development session because session-start failed.
This violates Session Contract requirement #2 (Compliance First).

Please fix the violations above and run `/feature {task_number}` again.
```

**If session-start PASSES (exit code = 0)**:
```
✅ SESSION START PASSED

All compliance checks passed. Ready to begin work.

================================================
📋 SESSION CONTRACT ACKNOWLEDGMENT
================================================

I acknowledge and commit to:

  1. ✅ TDD Protocol: Tests written BEFORE implementation (RED-GREEN-REFACTOR)
  2. ✅ Compliance First: `make check-compliance` before AND after every task
  3. ✅ Atomic Commits: One logical change per commit + AI attribution
  4. ✅ Sequential Tasks: One task at a time, in order
  5. ✅ Token Efficiency: Tools over text, concise communication

Violation of these rules requires stopping work and correcting before proceeding.

================================================
📖 TASK OVERVIEW
================================================

Reading task file: tasks/tasks-{number}-{slug}.md

{show_task_structure}

Phases:
{list_all_phases_with_status}

================================================
🎯 READY TO BEGIN
================================================

Current Phase: {first_incomplete_phase}

Next Steps:
1. Review task file in detail
2. Confirm first phase to work on
3. Follow TDD protocol (RED-GREEN-REFACTOR)
4. Run `make review-commit` before EVERY commit
5. Run `make check-compliance` after completing phase

Would you like me to:
a) Show detailed phase breakdown
b) Begin work on Phase {X}
c) Review prerequisites first

(Enter a/b/c or specify which phase to start)
```

## Step 5: Interactive Task Execution

Once user confirms, provide:

1. **Detailed Phase Breakdown** (if requested):
   - Show all subtasks in current phase
   - Show files to modify
   - Show acceptance criteria
   - Show TDD checklist

2. **Begin Work** (if requested):
   - State which phase is being worked on
   - Confirm TDD approach: "I will write the FAILING test FIRST"
   - Ask: "Which test file should I create/modify first?"
   - Wait for confirmation before writing ANY code

3. **Prerequisites Review** (if requested):
   - Show prerequisite checklist
   - Verify each prerequisite is met
   - Ask user to confirm before proceeding

## Step 6: During Execution

**TDD Enforcement** (CRITICAL):
- **NEVER** write implementation before test
- **ALWAYS** ask: "Should I write the test first?" (answer must be yes)
- **ALWAYS** show test to user before implementing
- **ALWAYS** ask user to run test and confirm it FAILS
- **ONLY THEN** write implementation

**Before Each Commit**:
```
I'm ready to commit: {commit_description}

Running: make review-commit

{show_output}

Commit message:
---
{type}({scope}): {description}

{body}

AI-Generated-By: {assistant_name} ({model_version})
Co-Authored-By: {user_name}
---

Proceed with commit? (y/n)
```

**After Phase Completion**:
```
Phase {X} complete. Running compliance check...

Running: make check-compliance

{show_output}

Phase {X} Acceptance Criteria:
{list_criteria_with_checkmarks}

All criteria met? (y/n)

If yes: Mark phase complete in task file
If no: List remaining items
```

## Step 7: Session Completion

When all phases complete or user wants to stop:

```
================================================
📊 SESSION SUMMARY
================================================

Task: {task_number} - {task_title}
Status: {complete/in_progress}

Completed:
{list_completed_phases}

Remaining:
{list_remaining_phases}

Commits Made: {count}
Files Modified: {count}

Final Compliance Check:
Running: make check-compliance

{show_output}

================================================
📝 NEXT STEPS
================================================

{if_complete}
✅ Task {task_number} is COMPLETE!

Update task file:
- Mark all checkboxes complete [x]
- Update status to "✅ Complete"
- Add completion date

{if_incomplete}
⏸️  Task {task_number} is IN PROGRESS

Remaining work:
{list_remaining_phases}

To resume:
/feature {task_number}

================================================
🎯 TASK FILE UPDATE
================================================

I will now update the task file to reflect progress...
```

Update the task file with:
- Completed checkboxes marked [x]
- Updated status
- Progress notes if incomplete

## Error Handling

**Task file not found**:
```
❌ Error: Task file not found for task {number}

Available tasks:
{list_all_numbered_tasks}

Please specify a valid task number.
```

**Invalid selection**:
```
❌ Invalid selection: {input}

Please enter:
- A task number (e.g., 22)
- "list" to see all incomplete tasks
- "next" for next incomplete task
- "q" to cancel
```

**Session-start timeout**:
```
⚠️  session-start is taking longer than expected...

This usually means:
- Tests are running (may take 1-2 minutes)
- Static analysis is running
- There are many files to check

Please wait...
```

## Integration with Workflow

This command enforces the complete development workflow:

1. **Session Contract** - Display and acknowledge
2. **TDD Protocol** - RED-GREEN-REFACTOR mandatory
3. **Atomic Commits** - One logical change, AI attribution
4. **Compliance Checks** - Before AND after every task
5. **Token Efficiency** - Use tools, be concise

## Reference Files

- Session Contract: AGENTS.md (Session Contract section)
- Task Workflow: docs/rules/master-task-prompt.md
- TDD Protocol: docs/rules/senior-engineer-guidelines.md
- Atomic Commits: docs/rules/atomic-commits.md
- AI Attribution: docs/rules/AI_COMMIT_ATTRIBUTION.md
- Compliance: docs/rules/rules-compliance-check.md

## Examples

**Example 1 - List tasks**:
```
User: /feature list

AI: [Lists all incomplete tasks with numbers, titles, status]

User: 22

AI: [Shows Task 22 info, runs session-start, begins session]
```

**Example 2 - Specific task**:
```
User: /feature 22

AI: [Shows Task 22 info, confirms, runs session-start, begins session]
```

**Example 3 - Next task**:
```
User: /feature next

AI: [Finds highest numbered incomplete task, confirms, runs session-start, begins session]
```

## Critical Reminders

⚠️ **ALWAYS REFUSE** to:
- Write implementation before test (TDD violation)
- Skip session-start check (Compliance violation)
- Make non-atomic commits (Commit standard violation)
- Skip review-commit (Process violation)
- Proceed when check-compliance fails (Quality violation)

✅ **ALWAYS DO**:
- Run make session-start FIRST
- Write tests BEFORE implementation
- Show test and confirm it FAILS before implementing
- Run make review-commit before EVERY commit
- Run make check-compliance after EVERY phase
- Update task file with progress
- Follow 5-phase workflow from master-task-prompt.md

## Success Criteria

A successful feature session:
- ✅ session-start passed before work began
- ✅ All code changes have tests written first
- ✅ All commits are atomic with AI attribution
- ✅ check-compliance passes after each phase
- ✅ Task file updated with accurate progress
- ✅ All acceptance criteria met
- ✅ Zero regressions introduced
