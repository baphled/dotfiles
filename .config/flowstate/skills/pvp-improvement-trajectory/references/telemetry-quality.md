# Telemetry quality and dogfooding

## Principle

A telemetry miss can create downstream misses. Record causal clusters rather than inflating one root failure into many unrelated bugs.

## Discrepancy record

Use this shape when a match is manually validated:

```yaml
recording: ScreenRecording_...
telemetry_version: 0.2.3
category: opponent_identity_continuity
severity: high
root_observation: Opening Cramorant misidentified as Quagsire.
downstream_effects:
  - Cramorant absent from reconstructed roster
  - charged moves attributed/missed
  - re-entry continuity lost
  - opponent shield accounting incomplete
video_ground_truth: Cramorant / Quagsire / Stunfisk
telemetry_observed: Quagsire / Stunfisk
review_impact: Requires opponent-state video patching; player timeline remains usable.
```

## Quality gates

Before drawing trajectory conclusions, report:

- telemetry versions/schemas present;
- unreliable/review-labelled records;
- missing result count;
- incomplete player rosters;
- incomplete opponent rosters when roster data exists;
- fields unavailable in older schemas.

Do not compare a metric across schema generations if its detector semantics changed materially without flagging the discontinuity.

## Known benchmark issue

`ScreenRecording_09-29-2026 23-27-17_1.mov` exposed a high-value opponent identity continuity failure. Player-side action timing remained strong, suggesting a telemetry-first review can still be efficient when opponent state is selectively patched from video.

## Canonical observation contract

Analysis skills should depend on a stable observation contract, not detector internals.

At minimum, each event should expose equivalent semantics for:

```yaml
schema_version: string
telemetry_version: string
timestamp_s: number
actor_side: player | opponent | unknown
actor_identity: string | null
event_type: string
value: any
confidence: 0..1
provenance: observed | reconciled | inferred
source_detector: string | null
identity_confidence: 0..1 | null
```

Exact storage shape may evolve, but these semantics should remain stable or be versioned explicitly.

### Contract rules

- Keep raw/observed events available separately from derived classifications.
- Preserve `null`/unknown distinctly from an observed zero or false.
- Version schema and detector semantics explicitly.
- Attach confidence/provenance at the event level where practical.
- Emit match-level coverage metrics by observable family: identities, charged moves, shields, switches, fast moves, HP/damage, and energy.
- Consumer skills should gate analyses on coverage/confidence rather than infer completeness from field presence.
- Derived labels such as recovery, sacrifice, catch, farming, alignment preservation, and opponent-model exploitation should reference the observations that support them.

This contract is what makes telemetry reusable: a trajectory skill, matchup-learning skill, review skill, or future model can consume the same evidence without embedding knowledge of OCR/CV implementation details.
