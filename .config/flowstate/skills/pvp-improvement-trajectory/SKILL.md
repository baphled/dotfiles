---
name: pvp-improvement-trajectory
description: Analyze Pokémon GO PvP telemetry over time to measure improvement in move awareness, shield management, energy management, switching/alignment, recovery, and dynamic role flexibility. Use this skill when reviewing batches of battle.json or matches.json telemetry, comparing earlier versus later play, validating whether perceived PvP improvement is supported by evidence, or producing a repeatable trajectory report from recorded matches.
---

# PvP Improvement Trajectory

Use this skill to turn Pokémon GO battle telemetry into an evidence-based improvement trajectory rather than a raw win-rate report.

## Core rule

Separate **telemetry facts** from **strategic interpretation**.

Telemetry may establish that a switch, shield, charged move, forced entry, catch candidate, or energy-bank candidate occurred. It does not by itself establish *why* the player made that decision. Treat strategic labels such as recovery, sacrifice, preservation, alignment manipulation, or role transition as interpretations supported by telemetry and, when needed, targeted video review.

## Inputs

Accept any of:

- an aggregate `matches.json` list;
- one or more `battle.json` files from `pogo-telemetry-next`;
- a directory containing either format.

Prefer the newest telemetry available. Do not silently merge duplicate recordings.

## Workflow

1. Run `scripts/analyze_trajectory.py` against the supplied telemetry.
2. Review the generated quality summary before interpreting trends.
3. Compare rolling blocks, default 10 matches, rather than individual-match fluctuations.
4. Evaluate the six dimensions defined in `references/metrics.md`.
5. Treat recovery detection as a candidate classifier, not ground truth. Spot-check decisive windows in video when available.
6. If telemetry is incomplete, preserve the missingness. Never convert an absent event into a zero unless the schema explicitly means zero.
7. When telemetry disagrees with video, trust verified video ground truth and append the discrepancy to `references/telemetry-dogfooding.md` using the structure in `references/telemetry-quality.md`.
8. Analyse opponent composition empirically: common species, recurring pairs/cores, and low-win-rate core-breaker candidates. Only attach `meta`/`anti-meta` labels when an explicit current league/cup reference is supplied.
9. Produce conclusions about *behavioural change*, with win rate as context rather than the sole measure.

## Default invocation

```bash
python3 scripts/analyze_trajectory.py PATH \
  --block-size 10 \
  --json-out trajectory.json \
  --markdown-out trajectory.md
```

For multiple inputs:

```bash
python3 scripts/analyze_trajectory.py matches.json battle-1.json battle-2.json
```

## Interpretation discipline

- Prefer trends that recur across blocks.
- Call out changes in telemetry/schema quality that could mimic player improvement.
- Do not compare absolute counts across matches of very different duration without normalization.
- Do not infer matchup quality from species names unless a type/move knowledge source is explicitly available.
- A detected voluntary switch is not automatically a good switch.
- A shield followed by no charged move is not automatically a bad shield.
- An energy-bank candidate is evidence of possible resource preservation, not proof of intentional planning.
- Recovery quality is strongest when several signals agree: early adverse state, subsequent stabilization, preserved resource, and eventual conversion.

## Reusable telemetry contract

For detector-independent analysis, consume the stable observation semantics defined in `references/telemetry-quality.md`: timestamp, actor/side, event type, value, confidence, provenance, identity confidence, schema version, and telemetry version. Gate analyses on coverage/confidence rather than assuming a populated field is complete. Keep observable evidence separate from inferred labels such as recovery, sacrifice, farming, alignment preservation, or opponent-model exploitation.

## Persistent project context

Read `references/context.md` when this skill is used for Yomi's Pokémon GO telemetry/Obsidian workflow. It is the portable source of truth for project-specific names, paths, review conventions, and current dogfooding findings.
