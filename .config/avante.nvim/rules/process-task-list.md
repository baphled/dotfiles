## Task Planning + Execution Guide

This guide ensures Claude can plan and execute tasks efficiently via API in Avante.nvim, without triggering rate limits. It replaces the old `process-task-list.md` and integrates language-specific guidance, memory usage, and Claude-friendly prompting.

---

### ✅ High-Level Workflow

1. Load best practices and guidelines into **memory** once:

   * `Ruby-guidelines`, `JavaScript-guidelines`, etc. (depending on the target language)
   * `senior-engineer-context-guidelines`
   * `process-task-list`
   * PRD summary or user story

2. Use Claude to generate a **locked task checklist**, following coding rules embedded per task

3. Confirm the checklist (do not allow Claude to regenerate it later)

4. Have Claude **execute tasks one at a time**, ticking them off and referring to memory for rules

---

### 🔍 Pre-Task Planning Phase

Claude should:

* Identify the target language + stack (e.g., Ruby CLI, Rails, etc.)
* Parse any PRD or user story for functional requirements
* Search the existing codebase for relevant helpers, tests, or abstractions
* Use the memory-loaded guidelines to generate a checklist with detailed rules per step

**Each task must include inline rules**, such as:

* “Follow BetterSpecs format with one expectation per `it` block”
* “Run rubocop + RSpec after implementation”
* “Revert if changes cause regressions or fail tests”

---

### ✅ Checklist Format

```md
## Tasks

- [ ] Build frontmatter tag logic
  - [ ] Write a failing test (BetterSpecs, one expectation per `it`)
  - [ ] Implement the code using idiomatic Ruby and existing helpers
  - [ ] Run rubocop + RSpec and ensure no regressions
  - [ ] Refactor duplication and clean up comments
```

Once this is generated, Claude must not overwrite it.

---

### 🧠 Claude Execution Phase

Claude should:

* Reference the locked checklist (do not replan)
* Refer to memory for rules (e.g., “Ruby-guidelines-condensed”)
* Complete one task at a time:

  * ✅ Write test → implement code → refactor → confirm tests
  * ✅ Mark as `[x]` when done
  * ✅ Delete task’s memory entry when completed

Example prompt:

```txt
Using the locked checklist and memory-stored rules, begin with Task 1.
Write a failing test (BetterSpecs format, one expectation per `it`).
Use idiomatic Ruby and reuse existing helpers.
Do not replan or change the checklist.
```

---

### 🧱 Claude Prompt Template

Use this to generate your initial task list:

```txt
Use `process-task-list-condensed` and the memory-loaded language rules to generate atomic tasks for: <feature/PRD summary>
- Reference the codebase before task generation
- Embed RSpec/Bundler/Rubocop rules inline where applicable
- Use one expectation per `it`, Red→Green→Refactor model
- Follow existing patterns and avoid side effects
- Return checklist only under `## Tasks`
- Do not explain or regenerate later
```

---

### 💡 Tips to Avoid Rate Limits

* ✅ Don’t resend large specs/guidelines repeatedly — store them in memory
* ✅ Use Claude 3.5 **Haiku** where possible for speed and looser rate limits
* ✅ Avoid sending the full checklist each time — refer to it by name
* ✅ Break prompts into short, scoped tasks (e.g., “write test”, then “implement”)
* ✅ Throttle API calls or queue prompts if Avante.nvim sends bursts
* ✅ If supported, use Claude’s API `cache_control` to reuse long system prompts

---

### 🧩 Claude Cost Control and Execution Strategy

To minimize cost and stay within rate limits:

* Use **Claude Sonnet** for planning and checklist generation
* Use **Claude 3.5 Haiku** for all step-by-step task execution
* Snapshot the checklist into memory or a file (`task-plan.md`) and reuse it
* Avante.nvim must **throttle requests** (min. 2s between Claude API calls)
* Never resend full spec or rules — refer to memory-stored `Ruby-guidelines-condensed` and checklist name only

