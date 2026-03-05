---
name: profiling
description: Performance profiling and measurement tools for identifying bottlenecks
category: Performance Profiling
---

# Skill: profiling

## What I do

I help you identify performance bottlenecks in your code by measuring resource usage. I focus on CPU cycles, memory allocations, and goroutine scheduling. I ensure that you make optimization decisions based on actual data rather than guesses.

## When to use me

- When your application is running slower than expected.
- When you notice high memory usage or a potential memory leak.
- When you're trying to identify "hot paths" in your code.
- When you want to verify the impact of a performance optimization.

## Core principles

1. **Measure first**, always collect profiling data before attempting to optimize.
2. **Profile in context**, try to profile with realistic data and under conditions that match production.
3. **Focus on the hot path**, prioritize optimizing the parts of the code where the most time or memory is spent.
4. **Iterative improvement**, profile, optimize, and then profile again to verify the gain.

## Patterns & examples

### Profiling in Go with pprof
Use the built-in `pprof` tool for comprehensive profiling.
- **CPU profiling**, `go test -cpuprofile cpu.prof -bench .`
- **Memory profiling**, `go test -memprofile mem.prof -bench .`
- **Interactive mode**, `go tool pprof cpu.prof`

### Flame graphs
Visualize call stacks to find expensive functions.
- **Usage**, run `go tool pprof -http=:8080 cpu.prof` to view an interactive flame graph in your browser.

### Production profiling
Safely profile a running service.
```go
import _ "net/http/pprof"
import "net/http"

func main() {
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()
    // ... rest of your app
}
```

### Allocation profiling
Identify functions that create excessive garbage.
- **Action**, use the `top` and `list` commands in `pprof` to find specific lines of code causing allocations.

## Anti-patterns to avoid

- ❌ **Premature optimization**, spending time optimizing code that doesn't significantly impact overall performance.
- ❌ **Guessing the bottleneck**, assuming you know where the slow part is without measuring first.
- ❌ **Profiling with small data**, using trivial datasets that don't reveal the performance characteristics of production workloads.
- ❌ **Ignoring GC overhead**, failing to account for the time spent by the garbage collector due to excessive allocations.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Performance-Profiling/Profiling.md`

## Related skills

- `benchmarking`, for repeatable performance tests.
- `performance`, for general optimization techniques.
- `golang`, for language-specific performance characteristics.
- `static-analysis`, for finding potential performance issues in code.
