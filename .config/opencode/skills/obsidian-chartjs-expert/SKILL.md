---
name: obsidian-chartjs-expert
description: Create effective Chart.js visualisations in Obsidian notes using the Charts plugin
---

# Skill: obsidian-chartjs-expert

## What I do

I provide expertise in embedding interactive Chart.js visualisations in Obsidian using the Charts plugin. I help select appropriate chart types, write correct YAML syntax, and integrate charts with Dataview for dynamic dashboards.

## When to use me

- Creating project dashboards with metrics and progress
- Visualising comparisons across multiple dimensions (radar charts)
- Showing trends over time (line charts)
- Building data-driven documentation in Obsidian
- Presenting analysis with visual evidence
- Model selection guides or capability comparisons

## Core principles

1. **One chart = One message** – Each chart answers exactly one question; avoid overload
2. **Right chart for the data** – Line for trends, bar for comparison, radar for multi-dimensional, pie for proportions
3. **Honest axes** – Use `beginAtZero: true` for fair comparisons; don't mislead
4. **Clarity over decoration** – Limit to 5-7 series, use clear labels, readable fonts
5. **Accessible visualisations** – Accompany with data tables and text descriptions

## Patterns & examples

### Radar Chart (Multi-dimensional)

Best for comparing 3–7 items across 5–10 dimensions:

```yaml
```chart
type: radar
labels: [Dimension A, Dimension B, Dimension C, Dimension D]
series:
  - title: Item One
    data: [8, 7, 9, 6]
  - title: Item Two
    data: [6, 9, 7, 8]
width: 70%
rMax: 10
legend: true
```
```

### Bar Chart (Category Comparison)

For comparing single metrics across categories:

```yaml
```chart
type: bar
labels: [Category A, Category B, Category C]
series:
  - title: Metric
    data: [25, 45, 35]
width: 100%
beginAtZero: true
```
```

### Line Chart (Trends)

For showing change over time:

```yaml
```chart
type: line
labels: [Jan, Feb, Mar, Apr, May]
series:
  - title: Trend
    data: [10, 15, 12, 20, 18]
tension: 0.3
fill: true
```
```

## Configuration Quick Reference

| Option | Values | Purpose |
|--------|--------|---------|
| `type` | bar, line, radar, pie, doughnut, polarArea | Chart variant |
| `width` | 80%, 400px | Chart size |
| `beginAtZero` | true/false | Y-axis starts at 0 |
| `tension` | 0-1 | Line smoothness |
| `legendPosition` | top/bottom/left/right | Legend placement |
| `rMax` | number | Radar chart max value |

## Anti-patterns to avoid

- ❌ **Pie chart with >5 segments** – Use bar chart instead; pie becomes unreadable
- ❌ **Radar with >10 dimensions** – Too many axes; use multiple focused charts
- ❌ **Non-zero baseline for comparisons** – Starts at 90 looks like huge difference; use `beginAtZero: true`
- ❌ **Axis misalignment** – Don't use different scales for comparison series
- ❌ **Missing data labels** – Always include legend and axis titles

## Related skills

- `obsidian-dataview-expert` – Query data dynamically for charts
- `obsidian-customjs-expert` – Advanced chart customisation beyond YAML
- `data-analyst` – Data interpretation and insight extraction
- `knowledge-base` – Organising visual dashboards in vault

## References

Comprehensive examples and advanced patterns: See Obsidian ChartJS Expert in knowledge base
