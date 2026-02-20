---
name: obsidian-chartjs-expert
description: Chartjs plugin expertise for embedding charts in Obsidian
category: Session Knowledge
---

# Skill: obsidian-chartjs-expert

## What I do

I provide expertise in the Obsidian Charts plugin for interactive Chart.js visualisations. I specialise in translating quantitative data into meaningful visual patterns using YAML-based code blocks and DataviewJS integrations.

## When to use me

- When creating project dashboards with progress metrics.
- When visualising productivity, habit tracking, or personal analytics.
- When you need to communicate insights from complex datasets more effectively than tables.
- When building automated summaries that pull data from across the vault.

## Core principles

1. **Match Visualisation to Data:** Choose chart types based on analytical goals (trends, comparisons, distributions).
2. **Simplicity and Clarity:** Maximise data-to-ink ratio, minimise clutter, ensure clear labelling.
3. **Data Integrity:** Avoid misleading axes. Bar chart Y-axes must start at zero.
4. **Integration Efficiency:** Use DataviewJS for live-updating data over static YAML blocks.

## Chart syntax

The Obsidian Charts plugin uses YAML syntax within `chart` code blocks.

```chart
type: line
labels: [Jan, Feb, Mar]
series:
  - title: Metric
    data: [10, 20, 30]
tension: 0.2
width: 80%
labelColors: true
```

## Chart types

### Line Chart
Used for time series data and showing trends over time.

```chart
type: line
labels: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
series:
  - title: Focus Hours
    data: [6, 7, 5, 8, 6, 3, 2]
  - title: Meeting Hours
    data: [2, 3, 4, 2, 3, 0, 0]
tension: 0.3
width: 100%
beginAtZero: true
```

### Bar Chart
Used for comparing categories. Use `indexAxis: y` for horizontal bars.

```chart
type: bar
labels: [Project A, Project B, Project C]
series:
  - title: Completed
    data: [12, 19, 8]
    backgroundColor: rgba(75, 192, 192, 0.7)
  - title: In Progress
    data: [5, 8, 12]
    backgroundColor: rgba(255, 206, 86, 0.7)
stacked: true
```

### Pie and Doughnut Chart
Used for showing proportions and parts of a whole.

```chart
type: doughnut
labels: [Development, Meetings, Learning, Admin]
series:
  - title: Time Allocation
    data: [50, 20, 20, 10]
width: 60%
```

### Radar Chart
Used for multi-dimensional comparison, such as skill assessments.

```chart
type: radar
labels: [Speed, Flexibility, Safety, Simplicity, Ecosystem]
series:
  - title: Current Skill
    data: [9, 7, 8, 9, 7]
    backgroundColor: rgba(54, 162, 235, 0.2)
```

### Mixed Charts
Combining multiple types, such as progress bars with a target line.

```chart
type: bar
labels: [W1, W2, W3, W4]
series:
  - title: Actual
    type: bar
    data: [20, 35, 50, 75]
  - title: Target
    type: line
    data: [25, 50, 75, 100]
    borderColor: red
    fill: false
```

## Advanced features

### DataviewJS Integration
Query vault data and pass to `window.renderChart` for live visualisations.

```dataviewjs
const pages = dv.pages('"Projects"');
const labels = pages.map(p => p.file.name);
const progress = pages.map(p => p.progress || 0);

const chartData = {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Project Progress',
            data: progress,
            backgroundColor: 'rgba(75, 192, 192, 0.7)'
        }]
    }
};

window.renderChart(chartData, this.container);
```

### Styling and Configuration
- **tension:** (0-1) Controls line smoothness (0.2-0.4 recommended).
- **width/height:** Container size (e.g. `width: 80%`).
- **labelColors:** Applies series colours to labels.
- **legendPosition:** `top`, `bottom`, `left`, or `right`.
- **beginAtZero:** Critical for bar charts to prevent misleading gaps.

## When to use ChartJS vs alternatives

- **ChartJS:** Quantitative data, trends, comparisons, distributions.
- **Mermaid:** Diagrams, flowcharts, Gantt charts, ERDs.
- **Dataview Tables:** Detailed lists where raw values matter more than patterns.

## Anti-patterns to avoid

- ❌ **Misleading Baselines:** Starting a bar chart axis at a non-zero value to exaggerate differences.
- ❌ **Overcrowding:** Adding more than 5-7 series to a single chart, making it unreadable.
- ❌ **Inappropriate Chart Types:** Using a pie chart for time series data or a line chart for unrelated categories.
- ❌ **Poor Contrast:** Using series colours that are indistinguishable or clash with the Obsidian theme.

## Related skills

- `obsidian-dataview-expert` – Essential for querying data to populate charts.
- `obsidian-structure` – For placing dashboards in appropriate vault locations.
- `data-analyst` – For choosing the most impactful metrics to visualise.
- `british-english` – For ensuring all chart labels and documentation follow regional conventions.
