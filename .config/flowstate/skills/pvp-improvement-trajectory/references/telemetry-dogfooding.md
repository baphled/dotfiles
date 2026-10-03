# Telemetry dogfooding scratch note

Keep this note append-only during review sessions. Consolidate duplicates only when a root cause is confirmed.

## Benchmark: 2026-09-29 23:27:17

Recording: `ScreenRecording_09-29-2026 23-27-17_1.mov`  
Telemetry: `pogo-telemetry-next 0.2.3`

### Opponent identity continuity — high priority

Root issue:
- Opening Cramorant was misidentified as Quagsire and then disappeared from opponent identity continuity.

Observed downstream effects:
- opponent roster reconstructed as 2/3;
- all three Cramorant Flys missed;
- both later Cramorant re-entries missed;
- both opponent shields missed.

Review impact:
- player-side recovery reconstruction remained useful;
- opponent-state analysis required video verification.

Engineering interpretation:
- treat the missed moves, re-entries, and shields as a likely causal cluster from identity continuity rather than four unrelated detector failures.

### Player switch continuity — medium priority

Root issue:
- early Rillaboom -> Skeledirge switch at approximately 24s was not represented in the derived switch sequence.

What worked:
- remaining detected player switch times were effectively aligned with video ground truth;
- forced Empoleon entry around 58s was correct;
- Empoleon -> Rillaboom around 85.8s was correct;
- Rillaboom -> Empoleon around 157s was correct.

### Strong signals in this benchmark

- result correct;
- player roster 3/3;
- player charged moves 5/5;
- player shield use correct;
- Rillaboom farming/overfarming signal useful;
- player-side recovery arc reconstructed well enough for telemetry-first review.

## Telemetry standards / reusable observation contract

Goal: improve fidelity without coupling analysis skills to detector implementation details.

Required standards:
- keep **observed facts** separate from **derived interpretation**;
- emit stable, versioned event records with timestamp, actor/side, event type, value, confidence, and provenance;
- retain identity confidence/continuity so downstream consumers can detect uncertain actor attribution;
- preserve unknown/missing values as unknown — never silently coerce missing observations to zero;
- report per-match coverage/completeness for player identity, opponent identity, charged moves, shields, switches, fast moves, HP/damage state, and energy reconstruction;
- keep detector/schema version in every battle artifact;
- preserve backwards compatibility for consumer-facing fields where practical, and flag semantic changes explicitly;
- make raw observations reusable independently of higher-level classifiers such as recovery, catch, sacrifice, farming, or alignment preservation.

Why this matters:
- trajectory analysis can consume the same telemetry contract across detector revisions;
- future skills can reuse the event stream without knowing OCR/CV internals;
- low-confidence dimensions can be excluded automatically instead of contaminating analysis;
- detector improvements can be validated against the same ground-truth benchmarks.

Current fidelity priorities:
1. opponent identity continuity;
2. opponent charged-move and shield detection;
3. switch completeness;
4. fast-move attribution, not only pulse timing;
5. HP/damage-state snapshots;
6. per-event confidence/provenance and per-match coverage metrics.

## Current telemetry gaps from trajectory dogfooding

These are gaps in observable coverage, not requests to infer unknowable opponent intent.

- **Opponent identity continuity:** highest-priority gap; actor identity loss contaminates move, shield, re-entry, and alignment analysis.
- **Opponent charged moves and shields:** directly observable, currently less complete than player-side events.
- **Switch completeness:** all player/opponent transitions should be captured with timestamps and forced/voluntary status kept as a derived classification.
- **Fast-move attribution:** preserve species/move attribution and count where observable, not only pulse timing.
- **HP/damage state:** add coarse or estimated HP snapshots with confidence so tank/sacrifice decisions can be validated.
- **Per-event confidence/provenance:** retain whether an event was observed, reconciled, or inferred.
- **Per-match coverage:** expose completeness by observable family so downstream skills can reject weak dimensions automatically.

Scope boundary:
- capture what is present on screen or can be derived reproducibly from it;
- leave genuinely unknowable state unknown (for example an unrevealed back line after an early forfeit);
- do not encode speculative opponent intent as telemetry fact.

## Opponent move / energy reconstruction improvements

### Opponent charged-move detection — high priority

Current benchmark accuracy is not sufficient to treat opponent charged moves as ground truth:
- Quagsire Mud Bomb was detected correctly;
- Cramorant Fly was missed 3/3 times in the benchmark;
- benchmark opponent charged-move completeness was therefore 1/4.

Required improvement:
- keep charged-move detection independent from a single identity/OCR path where possible;
- use move-name/banner text, active-species identity, animation/timing, shield/damage response, and move legality as mutually reinforcing evidence;
- if identity continuity is weak, keep move attribution uncertain rather than dropping the event entirely.

### Fast-move confidence fusion

Fast-move identification should be scored from multiple observable/derivable constraints rather than one detector:
- legal fast moves for the identified species;
- observed turn duration / pulse timing;
- HP-bar delta caused by repeated hits;
- target species and known battle state;
- known buffs/debuffs derived from move metadata where deterministic;
- observed charged-move timing and energy feasibility;
- repetition across the same active segment.

Use these signals to maintain candidate probabilities/confidence rather than forcing an early binary fast-move ID.

### Whole-sequence / post-hoc reconciliation

Later battle events should be allowed to revise earlier move and energy confidence.

Examples:
- two charged moves thrown close together establish a lower bound on stored energy;
- a Pokemon switching out and later returning with an immediate charged move constrains how much energy it must have banked;
- candidate fast moves that could not have generated enough energy for the observed charged-move sequence should lose confidence or be eliminated;
- overfarming means charge timing should be modeled as a feasible interval, not an exact expected timestamp.

This should be treated as a whole-battle constraint problem, not a series of independent frame-level guesses.

### HP delta as an identification signal

HP-bar trajectories are useful beyond tank/sacrifice analysis. Repeated damage deltas can help distinguish candidate fast moves when combined with timing, species, move metadata, and battle state.

Because GO damage is discrete and breakpoints/rounding can produce overlap, HP delta should weight confidence rather than be treated as a unique identifier by itself.

### Player vs opponent energy observability

- Player charged-energy state is partially visible through charged-move button fill/readiness and can be used to anchor or validate inferred energy intervals.
- Opponent charged energy is not directly visible and should be reconstructed from fast moves, charged moves, switches, and post-hoc constraints.
- Existing player energy banking/overfarm inference is useful; the next major unlock is bringing opponent fast-move attribution and energy reconstruction to comparable confidence.
