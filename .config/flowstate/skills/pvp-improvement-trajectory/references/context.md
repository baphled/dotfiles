# Project context

## Purpose

This skill is intended to remain portable across agent harnesses. This file stores project context that would otherwise be trapped in conversation history.

## Current Pokémon GO workflow

- Focus: Great League PvP improvement, anti-meta/spicy team construction, and repeatable review.
- Battle recordings originate from iPhone screen recordings.
- Telemetry implementation: `scripts/telemetry-next` (`pogo-telemetry-next`).
- Historical aggregate telemetry may contain older schema/source labels and must not be assumed to represent the current extractor.
- The Obsidian plugin is a controller/view layer around the telemetry and collection workflow.
- Review strategy: telemetry-first, then targeted video verification only where telemetry is incomplete, ambiguous, or strategically important.

## Named teams

### Fire Fairy Fuxur

- Rillaboom
- Empoleon
- Skeledirge

Roles are conditional rather than fixed lead/pivot/closer assignments. A Pokémon may become expendable, protected, or the win condition depending on alignment, energy, shields, remaining counters, and opponent behaviour.

### Dragon Bait

- Kingdra
- Jellicent
- Cradily

Historically viewed as stable, bulky, and forgiving of imperfect alignment.

## Improvement dimensions

Track these consistently over time:

1. move awareness;
2. shield management;
3. energy management;
4. switching/alignment;
5. recovery;
6. dynamic role flexibility.

Win rate is contextual evidence, not the primary skill metric.

## Player-development hypothesis

Recent play suggests progression from basic matchup/move recognition toward future-board-state valuation: preserving resources for later matchups, tolerating an initially adverse board, banking energy, and allowing roles to change during a battle.

Do not assume that hypothesis is true. Test it against telemetry and video evidence.

## Current telemetry dogfooding benchmark

Benchmark recording: `ScreenRecording_09-29-2026 23-27-17_1.mov`.

Verified against video:

- telemetry correctly captured the result;
- player roster: 3/3;
- player charged moves: 5/5;
- player shield use: correct;
- player switches: 3/4, with detected switch timing very accurate;
- early Rillaboom -> Skeledirge switch was missed;
- opening Cramorant was misidentified as Quagsire and then lost from opponent identity continuity;
- opponent roster reconstructed as 2/3;
- this cascaded into missed Cramorant Flys, re-entries, and opponent shields;
- recovery structure on the player side remained usable despite incomplete opponent reconstruction.

Engineering priority from this benchmark: opponent identity continuity. Treat downstream misses caused by one identity failure as a causal cluster rather than independent defects.

## Current review convention

Use telemetry to reconstruct the player action/resource timeline first. Inspect video selectively for:

- opponent identity/state;
- missing opponent charged moves;
- shield events;
- missing or ambiguous switches;
- suspected catches or energy banks;
- strategically pivotal decisions.

When a discrepancy is verified, add it to the telemetry dogfooding note rather than silently correcting the telemetry in analysis.
