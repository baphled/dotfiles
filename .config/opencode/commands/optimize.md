---
description: Optimize code performance using profiling and benchmarking
agent: senior-engineer
---

# Performance Optimization

Systematically improve the performance of specific components using a data-driven approach. This command ensures that all optimisations are measured, verified, and justified by benchmarks.

## Skills Loaded

- `performance` - Go/language-specific performance patterns
- `benchmarking` - Creating and running benchmarks
- `profiling` - Analysing CPU, memory, and blocking profiles
- `ai-commit` - Attributed commits for performance changes

## When to Use

- Resolving a performance regression identified in production
- Optimising a hot path identified during profiling
- Reducing memory allocations in high-throughput services
- Improving the execution speed of a specific algorithm

## Process / Workflow

1. **Establish Baseline (RED)**
   - Identify the component or path that requires optimisation
   - Write or identify a benchmark that measures the current performance
   - Run the benchmark multiple times to ensure stable results: `go test -bench . -benchmem`

2. **Profiling and Bottleneck Analysis**
   - Use the `profiling` skill to collect CPU and memory profiles
   - Analyse profiles (e.g. via `pprof`) to identify specific bottlenecks
   - Use `pre-action` to evaluate potential optimisation strategies (e.g. pooling, algorithm change)

3. **Implementation of Optimisation**
   - Apply the chosen optimisation following `clean-code` standards
   - Favour readability unless the performance gain is significant
   - Verify that the component still functions correctly (GREEN)

4. **Verify Improvements (BENCHMARK)**
   - Run the baseline benchmark against the optimised code
   - Compare results using `benchstat` or similar tools
   - Verify that the improvement is statistically significant and meets the goal

5. **Compliance and Commit**
   - Run full project checks: `make check-compliance`
   - Document the performance gains in the commit message or an ADR
   - Execute: `make ai-commit FILE=/tmp/commit.txt`

6. **Capture Baseline and Results**
   - Document the before/after results in the `memory-keeper`
   - Include the profiling data or charts in the PR description

$ARGUMENTS
