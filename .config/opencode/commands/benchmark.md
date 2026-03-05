---
description: Create and run benchmarks to measure code performance
agent: senior-engineer
---

# Performance Benchmarking

Benchmark the performance of specific code paths to measure execution time, memory allocations, and throughput. This command provides a standardised way to create and execute benchmarks.

## Skills Loaded

- `benchmarking` - Creating and running benchmarks
- `performance` - Interpreting results and common patterns
- `memory-keeper` - Storing benchmark history

## When to Use

- Measuring the impact of a structural change on execution time
- Comparing the performance of two different algorithms
- Monitoring baseline performance for critical service paths
- Identifying memory-heavy operations in a package

## Process / Workflow

1. **Identify Benchmark Goal**
   - Define what exactly needs to be measured (e.g. nanoseconds per operation)
   - Identify the inputs and scenarios to benchmark
   - Use `pre-action` to ensure the benchmark is realistic

2. **Write Benchmarks**
   - Create a `_test.go` file (or equivalent) with benchmark functions
   - Follow the naming pattern: `BenchmarkXxx(b *testing.B)`
   - Ensure the loop resets timers and handles setup/teardown correctly

3. **Execute Benchmarks**
   - Run the benchmarks with memory allocation stats: `go test -bench . -benchmem`
   - Use `-count N` to run multiple iterations and ensure stability
   - Filter benchmarks using the `-bench` flag if necessary

4. **Analyse and Compare**
   - Use `benchstat` to compare results between different iterations or branches
   - Identify statistical outliers or high variance in the results
   - Verify that the performance meets the defined requirements

5. **Document Results**
   - Store the benchmark results and analysis in the `memory-keeper`
   - Include results in pull request descriptions or technical documentation
   - Capture environmental factors (CPU, OS, memory) for repeatability

6. **Create Follow-up Actions**
   - If performance is insufficient, trigger the `optimize.md` workflow
   - If a regression is found, create an issue and notify the team

$ARGUMENTS
