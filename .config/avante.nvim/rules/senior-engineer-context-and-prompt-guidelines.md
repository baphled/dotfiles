# Senior Engineer Context & Prompt Guidelines

A concise, language-agnostic checklist to guide LLM-driven "senior engineer" workflows (code generation, testing, refactoring, code review, etc.). Use these principles and keywords in prompts to ensure SOLID design, test-driven development (TDD), refactoring discipline, CI/CD pipeline automation, maintainable code, and observability.

---

## 1. Principles & Patterns

- **SOLID**

    - **S**ingle Responsibility

    - **O**pen/Closed

    - **L**iskov Substitution

    - **I**nterface Segregation

    - **D**ependency Inversion

- **Clean Code**: KISS, DRY, YAGNI

- **Design Patterns**: Strategy, Factory, Observer, etc.

- **Architectural Decisions**: ADR → context, options, decision, consequences


## 2. Workflow: Red-Green-Refactor (TDD)

1. **Small Change** → scope one behavior or bug fix

2. **Write/Update Test** (Red) → write a failing test first

3. **Implement Minimal Code** (Green) → just enough to satisfy the test

4. **Run Tests & CI** → linting, static analysis, coverage, mutation tests

5. **Refactor** → remove code smells (e.g. Extract Method, Rename)

6. **Atomic Commit** → descriptive message; push triggers CI pipeline


## 3. Documentation & Communication

- **Docstrings & Comments**: clarify intent, focus on public APIs

- **README / Runbook**: provide setup steps, CI badges, troubleshooting

- **ADR Updates**: keep architectural decision records up to date


## 4. Error-Handling & Resilience

- **Fail-Fast** validation: early input checks with descriptive exceptions

- **Graceful Degradation**: safely disable or reduce functionality on failures

- **Retries & Circuit Breakers**: handle intermittent faults in external calls


## 5. Observability & Monitoring

- **Logging & Tracing**: structured logs and trace spans for debugging

- **Metrics & Alerts**: track rates, latency, error counts; alert on thresholds

- **Health Endpoints**: expose `/healthz` and `/readyz` for service status


## 6. Performance & Scalability

- **Benchmarking & Profiling**: measure performance and detect regressions

- **Caching**: use TTL and proper invalidation to reduce load

- **Concurrency Controls**: employ bulkheads, rate limiting, etc. for safe scaling


## 7. Security & Compliance

- **Input Validation & Sanitization**: reject bad or malformed inputs early

- **Secret Management**: use vaults/env vars for credentials and keys

- **Dependency Scanning**: run SAST/DAST and check for known CVEs in libraries


## 8. Release & Dependency Management

- **Continuous Integration/Delivery (CI/CD)**: automated tests on each commit (CI); streamlined, safe release pipeline (CD)

- **Semantic Versioning**: follow MAJOR.MINOR.PATCH version increments

- **Feature Toggles & Canary Releases**: gradual rollouts and quick rollbacks

- **Changelog Automation**: auto-generate release notes from commit history


## 9. Developer Experience

- **Branching Model**: use a clear strategy (e.g. GitHub Flow or Git Flow with `feature/...` and `fix/...` branches)

- **Onboarding Scripts**: one-command setup (e.g. `make setup`, `npm run setup`)

- **Pre-commit Hooks**: run formatters, linters, tests, and static analysis on commit

- **Watch Mode**: auto-rerun tests on file save for rapid feedback


## 10. Continuous Learning & Improvement

- **Code Reviews**: enforce clarity, good patterns, sufficient tests, and SOLID practices

- **Refactoring Backlog**: schedule regular cleanup and improvement tasks

- **Post-Mortems & RCA**: hold blameless incident reviews (Root Cause Analysis)

- **Tech Radar & Spikes**: document experiments and track emerging tech


---

## Prompt-Engineering Keywords

"Generate minimal change"
"Use Red-Green-Refactor cycle"
"Follow SOLID principles"
"Write failing test first"
"Maintain 100% branch coverage"
"Refactor code smells"
"Refactor before commit"
"Provide atomic commit message"
"Use semantic commit"
"Ensure CI pipeline runs on each commit"
"Update ADR"
"Instrument logs and metrics"
"Implement health checks"
"Add secret vault integration"
