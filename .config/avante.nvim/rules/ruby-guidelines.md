## Ruby Guidelines

This condensed reference is for use during task planning and implementation guidance. It should be **referenced** when working in Ruby, not embedded in full unless required.

---

### ✅ Language & Framework Conventions

* Use idiomatic Ruby and follow [community style guide](https://rubystyle.guide)
* Ensure all files start with: `# frozen_string_literal: true`
* Organize code into conventional folders: `app/`, `lib/`, `spec/`, `config/`
* For web: use Rails (MVC) or Sinatra (API), follow framework defaults
* Use `Dry::CLI` for CLI tools

### ✅ Testing Practices

* Follow the **Red → Green → Refactor** workflow:

  1. **Write a failing test first** (Red)
  2. **Implement the minimum code** to pass the test (Green)
  3. **Refactor** for clarity, duplication, and SOLID (Refactor)
  4. **Re-run tests** to ensure nothing is broken after the change
  5. **Revert the change if it causes unexpected side effects**
* Follow [BetterSpecs](https://www.betterspecs.org/) for RSpec conventions and structure
* Place tests in the `spec/` directory
* Use `FactoryBot`, `Faker` for test data
* Enforce **one expectation per `it` block** to maintain clarity and isolation
* Avoid coupling multiple assertions or behaviors in the same test
* Run tests with `bundle exec rspec`

### ✅ Linting & Code Quality

* Use `rubocop` with extensions: `rubocop-rspec`, `rubocop-factory_bot`
* Maintain 100% branch test coverage (SimpleCov)
* Use YARD (`@param`, `@return`) for documentation comments

### ✅ Best Practices

* Follow SOLID principles (esp. SRP and Open/Closed)
* Apply Red-Green-Refactor cycle as standard
* Prefer built-in methods over custom implementations
* Avoid monkey-patching standard classes
* DRY, KISS, and YAGNI at all times

### ✅ Tooling & CI

* Use `Bundler` for dependencies (`Gemfile`, `.gemspec`)
* Automate with `Rakefile` tasks
* Lint/test/statically check via pre-commit hooks
* Use Docker or Nix for reproducible environments
* CI pipeline should run linter, tests, and coverage

### ✅ Commit Style

* Follow Conventional Commits (e.g. `feat:`, `fix:`)
* Sign commits with GPG (if enforced)
* Add semantic messages with purpose, scope, and PRD tag

---

Use this as a guideline checklist when generating or reviewing tasks. Only expand to full rule files if further clarification is needed.

