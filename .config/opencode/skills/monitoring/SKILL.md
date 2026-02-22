---
name: monitoring
description: Post-deployment health checks, observability, and system monitoring
category: DevOps Operations
---

# Skill: monitoring

## What I do

I ensure that systems are observable and their health is constantly monitored. I focus on defining meaningful metrics, setting up alerts that matter, and building dashboards that provide clear insights into system performance and reliability.

## When to use me

- During system design to identify key observability requirements
- When setting up new services or infrastructure
- To define SLIs (Service Level Indicators) and SLOs (Service Level Objectives)
- When investigating performance bottlenecks or stability issues
- To design dashboards for different stakeholder groups (engineering, product, ops)

## Core principles

1. **Monitor symptoms, not just causes** — Alert on high latency or error rates (symptoms) rather than just a CPU spike (possible cause).
2. **Golden Signals** — Focus on the four key signals: Latency, Traffic, Errors, and Saturation.
3. **Alert Actionability** — Every alert should have a corresponding runbook or clear set of steps for the on-call engineer to follow.
4. **Overview to Detail** — Design dashboards that allow for a high-level health overview with the ability to "drill down" into specific services or logs.

## Patterns & examples

**The Four Golden Signals:**
- **Latency**: The time it takes to service a request.
- **Traffic**: A measure of how much demand is being placed on the system.
- **Errors**: The rate of requests that fail, either explicitly, implicitly, or by policy.
- **Saturation**: How "full" your service is. A measure of the most constrained system resources.

**Health Check Endpoint Pattern:**
```go
// ✅ Correct: Perform a shallow check for readiness and a deep check for health
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    // 1. Check local service state
    if !isStarted {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    // 2. Perform deep check of critical dependencies
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}
```

## Anti-patterns to avoid

- ❌ **Alert fatigue** — Flooding engineers with too many low-priority or non-actionable alerts.
- ❌ **Ignoring "soft" failures** — Failing to monitor for partial failures or slow degradations that don't trigger a hard "down" alert.
- ❌ **Static thresholds** — Using fixed alerting thresholds that don't account for normal traffic patterns (e.g., peak hours).

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/DevOps-Operations/Monitoring.md`

## Related skills

- `logging-observability` — Deep dive into logs, metrics, and traces
- `incident-response` — Handling alerts and system failures
- `devops` — Core infrastructure and deployment patterns
- `systems-thinker` — Understanding interdependencies in complex systems
