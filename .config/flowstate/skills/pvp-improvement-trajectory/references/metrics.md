# Trajectory metrics

The skill reports mechanical telemetry features and interprets them cautiously.

## 1. Move awareness

Useful evidence:

- fewer clearly impossible/unsafe move responses in video review;
- correct shield/no-shield decisions given known move ranges;
- fewer panic switches into known super-effective charged moves;
- increasingly accurate anticipation of opponent charged-move timing.

Telemetry alone usually cannot score this reliably. Treat it as `needs_review` unless enriched matchup/move knowledge is available.

## 2. Shield management

Mechanical indicators:

- shields used per match;
- normalized shield timing (`shield_time / duration`);
- shield outcomes when present;
- preservation of shields into later battle states.

Interpretation: later proportional shield use can indicate patience, but is not intrinsically better.

## 3. Energy management

Mechanical indicators:

- charged moves per minute;
- banked-energy candidates;
- farming/overcharge flags when exposed by current telemetry;
- charged moves after re-entry.

Treat energy-bank counters as detector-dependent. Compare schema versions before using them longitudinally.

## 4. Switching / alignment

Mechanical indicators:

- first switch time;
- voluntary switches;
- forced/free entries;
- counter-switches;
- catches;
- re-entries.

Interpretation should distinguish reactive panic switching from intentional preservation or realignment.

## 5. Recovery

Recovery is the ability to stabilize and create a viable win path after an adverse state.

### Candidate adverse-state signals

- forced player entry before the opponent is forced;
- player loses a Pokémon early;
- player uses the first voluntary switch very early;
- shield deficit;
- explicit catch/counter-switch sequence under pressure;
- video-verified bad lead or alignment loss.

### Candidate recovery signals

- win after an adverse-state signal;
- later voluntary realignment;
- preserved/re-entered Pokémon;
- energy banking or farming before re-entry;
- shield expenditure on the piece that later performs multiple actions;
- transition from forced entry into controlled voluntary switching.

The script emits `recovery_candidate`, not a definitive strategic grade.

## 6. Dynamic role flexibility

This is primarily an interpretation layer.

Look for the same Pokémon serving different functions across matches or within one match, for example:

- pressure lead -> preserved hard counter;
- stabilizer -> shield converter;
- closer -> early disruptor;
- nominal win condition -> deliberate sacrifice.

Use event timelines and targeted video review. Do not reduce this to one scalar score unless a later classifier is explicitly validated.

## Recommended trajectory report

For each rolling block include:

- match count and known results;
- win rate;
- telemetry quality/missingness;
- shields per match and normalized shield timing;
- charged moves per match and per minute;
- voluntary/forced switching indicators;
- catch and energy-bank candidates;
- recovery-candidate count and conversion rate;
- concise interpretation plus limitations.

## 7. Opponent composition / archetypes

Use the corpus itself for a first-pass empirical classification:

- opponent species frequency;
- recurring opponent pairs/cores;
- recurring full team compositions where roster coverage is complete;
- player win rate against each species/pair, with minimum sample thresholds;
- repeated low-win-rate species/pairs as **core-breaker candidates**;
- team-specific learning when the player's own composition is stable enough to compare.

Do **not** equate corpus frequency with current meta status. `meta`, `anti-meta`, `spice`, and cup-specific rankings require an explicit external snapshot (for example a supplied PvPoke ranking/team list) with league/cup/date provenance. If such a source is available, enrich the empirical groups rather than replacing them.

Useful questions:

- Does the player perform better against common/meta-like structures or unusual teams?
- Which opposing species/pairs repeatedly destabilize otherwise different player teams?
- Are losses concentrated around a small set of core breakers?
- Does repeated exposure reduce the effect of a core breaker?
- Do particular player teams fail against the same archetype for structural reasons, or does performance improve with familiarity?
