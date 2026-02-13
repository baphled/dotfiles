---
name: concurrency
description: Write safe, efficient concurrent Go code - goroutines, channels, sync primitives
category: Performance Profiling
---

# Skill: concurrency

## What I do

I teach safe, efficient concurrent Go code: goroutine lifecycle management, channel patterns, sync primitives, context cancellation, and race condition prevention.

## When to use me

- Designing concurrent architectures (worker pools, pipelines, fan-out/fan-in)
- Choosing between channels and mutexes for a specific problem
- Debugging race conditions or goroutine leaks
- Adding context cancellation and timeout handling
- Reviewing concurrent code for correctness

## Core principles

1. **Share memory by communicating** — Use channels to transfer data ownership between goroutines
2. **Every goroutine must have an exit path** — If you can't explain how it stops, don't start it
3. **Channels for coordination, mutexes for state** — Channels orchestrate; mutexes protect data
4. **Run with `-race` always** — Race detector catches bugs tests miss; use in CI
5. **Context propagates cancellation** — Pass `context.Context` as first parameter to all long-running functions

## Patterns & examples

**Worker pool (bounded concurrency):**
```go
func processAll(ctx context.Context, jobs []Job, workers int) error {
    g, ctx := errgroup.WithContext(ctx)
    jobCh := make(chan Job)

    // Fan-out: start workers
    for i := 0; i < workers; i++ {
        g.Go(func() error {
            for job := range jobCh {
                if err := process(ctx, job); err != nil {
                    return err
                }
            }
            return nil
        })
    }

    // Feed jobs, close when done
    go func() {
        defer close(jobCh)
        for _, j := range jobs {
            select {
            case jobCh <- j:
            case <-ctx.Done():
                return
            }
        }
    }()

    return g.Wait()
}
```

**Pipeline pattern:**
```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}
// Usage: for v := range square(generate(1,2,3)) { ... }
```

**Mutex vs channel decision:**

| Use mutex when | Use channel when |
|---------------|-----------------|
| Protecting a shared counter | Transferring ownership of data |
| Guard a map or slice | Coordinating goroutine lifecycle |
| Simple lock/unlock is sufficient | Building pipelines or fan-out |
| Read-heavy workload (RWMutex) | Signalling completion or cancellation |

**Context-aware goroutine:**
```go
func worker(ctx context.Context, in <-chan Job) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case job, ok := <-in:
            if !ok {
                return nil // channel closed
            }
            process(job)
        }
    }
}
```

## Anti-patterns to avoid

- ❌ **Goroutine leak** (no exit path) — Memory grows until OOM; always use context or done channels
- ❌ **Sending on closed channel** — Causes panic; only the sender should close
- ❌ **Mutex with value receiver** — Copies the mutex, destroying synchronisation guarantees
- ❌ **Mixing sync strategies** — Using both mutex and channel for same data causes confusion and bugs
- ❌ **Forgetting `-race` in CI** — Race conditions are intermittent; the detector is your safety net

## Related skills

- `golang` - Core Go idioms and patterns
- `error-handling` - Error propagation in concurrent code (errgroup)
- `performance` - Profiling goroutine contention and scheduling

## See also

- Vault: `Knowledge Base/Skills/Performance-Profiling/Concurrency.md`
