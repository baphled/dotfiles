#!/usr/bin/env python3
"""Portable Pokémon GO PvP trajectory analyser.

Stdlib only. Supports historical matches.json lists and current battle.json objects.
It intentionally separates mechanical telemetry extraction from strategic interpretation.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import pathlib
import statistics
import sys
from collections import Counter, defaultdict
from typing import Any, Iterable


def num(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def parse_time(v: Any) -> str | None:
    if not v:
        return None
    return str(v)


def event_list_from_historical(m: dict[str, Any]) -> list[dict[str, Any]]:
    x = m.get("extracted") or {}
    tl = x.get("timeline")
    return tl if isinstance(tl, list) else []


def events_from_battle(m: dict[str, Any]) -> list[dict[str, Any]]:
    ev = m.get("events")
    return ev if isinstance(ev, list) else []


def count_charged(events: Iterable[dict[str, Any]], actor: str = "player") -> int:
    return sum(1 for e in events if e.get("type") == "charged_move" and e.get("actor") == actor)


def shield_times(events: Iterable[dict[str, Any]], actor: str = "player") -> list[float]:
    out = []
    for e in events:
        if e.get("type") == "shield_used" and e.get("actor") == actor:
            t = num(e.get("t"))
            if t is not None:
                out.append(t)
    return out


def event_count(events: Iterable[dict[str, Any]], kind: str, actor: str | None = None) -> int:
    return sum(1 for e in events if e.get("type") == kind and (actor is None or e.get("actor") == actor))


def current_player_derived(m: dict[str, Any]) -> dict[str, Any]:
    d = m.get("derived") or {}
    # telemetry-next 0.2.x stores most state under derived.state and may add actor summaries elsewhere.
    if isinstance(d.get("player"), dict):
        return d["player"]
    return {}


def transitions_from_battle(m: dict[str, Any]) -> list[dict[str, Any]]:
    d = m.get("derived") or {}
    state = d.get("state") or {}
    ts = state.get("transitions")
    return ts if isinstance(ts, list) else []


def historical_record(m: dict[str, Any], source: str) -> dict[str, Any]:
    tel = m.get("telemetry") or {}
    ext = m.get("extracted") or {}
    der = ((ext.get("derived") or {}).get("player") or {})
    events = event_list_from_historical(m)
    duration = num(tel.get("duration_s")) or num(ext.get("duration_s"))
    st = shield_times(events)
    shields = der.get("shields_used", tel.get("shields_used"))
    charged = sum((der.get("charged_moves") or {}).values()) if isinstance(der.get("charged_moves"), dict) else count_charged(events)
    first_switch = num(der.get("first_switch_s")) or num(tel.get("my_first_switch_s"))
    voluntary = der.get("likely_voluntary_switches", tel.get("my_voluntary_switches"))
    free_entries = der.get("likely_free_entries", tel.get("my_free_entries"))
    catches = der.get("catch_candidates", tel.get("my_catch_candidates"))
    banked = der.get("banked_energy_candidates", tel.get("my_banked_energy"))
    counter = der.get("counter_switches", tel.get("my_counter_switches"))
    team = m.get("my_team") or ext.get("player_team") or der.get("team_seen") or []
    opp = m.get("opponent_team") or ext.get("opponent_team") or []
    return {
        "source_file": source,
        "video": m.get("video_filename") or ext.get("video"),
        "match_time": parse_time(m.get("match_time") or m.get("extracted_at")),
        "schema": ext.get("schema_version") or m.get("source"),
        "telemetry_version": None,
        "data_quality": m.get("data_quality"),
        "result": m.get("result") or ext.get("result"),
        "duration_s": duration,
        "player_team": team,
        "opponent_team": opp,
        "player_roster_count": len(team) if isinstance(team, list) else None,
        "opponent_roster_count": len(opp) if isinstance(opp, list) else None,
        "shields_used": shields if isinstance(shields, int) else None,
        "shield_times_s": st,
        "shield_normalized": [(t / duration) for t in st] if duration else [],
        "charged_moves": charged,
        "first_switch_s": first_switch,
        "voluntary_switches": voluntary if isinstance(voluntary, int) else None,
        "forced_or_free_entries": free_entries if isinstance(free_entries, int) else None,
        "catch_candidates": catches if isinstance(catches, int) else None,
        "banked_energy_candidates": banked if isinstance(banked, int) else None,
        "counter_switches": counter if isinstance(counter, int) else None,
        "forced_switches": event_count(events, "forced_switch", "player"),
    }


def battle_record(m: dict[str, Any], source: str) -> dict[str, Any]:
    events = events_from_battle(m)
    duration = num((m.get("video") or {}).get("duration"))
    st = shield_times(events)
    transitions = transitions_from_battle(m)
    player_ts = [t for t in transitions if t.get("actor") == "player"]
    voluntary_ts = [t for t in player_ts if str(t.get("kind", "")).startswith("voluntary")]
    forced_ts = [t for t in player_ts if "forced" in str(t.get("kind", "")) or "free_entry" in str(t.get("kind", ""))]
    first_switch = None
    if player_ts:
        first_switch = min((num(t.get("t")) for t in player_ts if num(t.get("t")) is not None), default=None)
    d = m.get("derived") or {}
    # Search derived recursively for known scalar names without assuming a specific 0.2.x nesting layout.
    def find_scalar(obj: Any, names: set[str]) -> int | None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in names and isinstance(v, int):
                    return v
            for v in obj.values():
                r = find_scalar(v, names)
                if r is not None:
                    return r
        elif isinstance(obj, list):
            for v in obj:
                r = find_scalar(v, names)
                if r is not None:
                    return r
        return None
    team = m.get("player_team") or []
    opp = m.get("opponent_seen") or []
    tel = m.get("telemetry") or {}
    return {
        "source_file": source,
        "video": (m.get("video") or {}).get("path"),
        "match_time": None,
        "schema": "battle.json",
        "telemetry_version": tel.get("version"),
        "data_quality": None,
        "result": m.get("result"),
        "duration_s": duration,
        "player_team": team,
        "opponent_team": opp,
        "player_roster_count": len(team) if isinstance(team, list) else None,
        "opponent_roster_count": len(opp) if isinstance(opp, list) else None,
        "shields_used": len(st),
        "shield_times_s": st,
        "shield_normalized": [(t / duration) for t in st] if duration else [],
        "charged_moves": count_charged(events),
        "first_switch_s": first_switch,
        "voluntary_switches": len(voluntary_ts),
        "forced_or_free_entries": len(forced_ts),
        "catch_candidates": find_scalar(d, {"catch_candidates"}),
        "banked_energy_candidates": find_scalar(d, {"banked_energy_candidates"}),
        "counter_switches": find_scalar(d, {"counter_switches"}),
        "forced_switches": len(forced_ts),
    }


def identify_and_expand(path: pathlib.Path) -> list[tuple[dict[str, Any], str]]:
    out: list[tuple[dict[str, Any], str]] = []
    if path.is_dir():
        for p in sorted(path.rglob("*.json")):
            try:
                out.extend(identify_and_expand(p))
            except Exception:
                continue
        return out
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list) and (not data or isinstance(data[0], dict)):
        for item in data:
            if isinstance(item, dict) and ("result" in item or "extracted" in item):
                out.append((item, str(path)))
    elif isinstance(data, dict) and "events" in data and "video" in data and "telemetry" in data:
        out.append((data, str(path)))
    elif isinstance(data, dict) and ("result" in data and ("extracted" in data or "my_team" in data)):
        out.append((data, str(path)))
    return out


def dedupe(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    out = []
    for r in records:
        key = r.get("video") or (r.get("source_file"), r.get("match_time"))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def median(vals: list[float]) -> float | None:
    return statistics.median(vals) if vals else None


def mean(vals: list[float]) -> float | None:
    return statistics.fmean(vals) if vals else None


def roundn(v: Any, n: int = 3) -> Any:
    return round(v, n) if isinstance(v, float) and math.isfinite(v) else v


def recovery_candidate(r: dict[str, Any]) -> dict[str, Any]:
    """Mechanical candidate, deliberately conservative and explainable."""
    reasons = []
    fs = r.get("first_switch_s")
    duration = r.get("duration_s")
    if isinstance(fs, (int, float)) and fs <= 30:
        reasons.append("early_player_switch")
    if (r.get("forced_switches") or 0) > 0 or (r.get("forced_or_free_entries") or 0) > 0:
        reasons.append("forced_or_free_entry")
    # A catch is often evidence of active damage/alignment management under pressure.
    if (r.get("catch_candidates") or 0) > 0:
        reasons.append("catch_candidate")
    adverse = bool(reasons)
    converted = adverse and r.get("result") == "win"
    return {"adverse_candidate": adverse, "converted": converted, "reasons": reasons}


def summarize_block(chunk: list[dict[str, Any]], index: int) -> dict[str, Any]:
    known = [r for r in chunk if r.get("result") in {"win", "loss"}]
    wins = sum(r.get("result") == "win" for r in known)
    shields = [float(r["shields_used"]) for r in chunk if isinstance(r.get("shields_used"), int)]
    norm_shields = [v for r in chunk for v in (r.get("shield_normalized") or []) if isinstance(v, (int, float))]
    charges = [float(r["charged_moves"]) for r in chunk if isinstance(r.get("charged_moves"), int)]
    cpm = [60 * r["charged_moves"] / r["duration_s"] for r in chunk if isinstance(r.get("charged_moves"), int) and r.get("duration_s")]
    vol = [float(r["voluntary_switches"]) for r in chunk if isinstance(r.get("voluntary_switches"), int)]
    forced = [float(r["forced_or_free_entries"]) for r in chunk if isinstance(r.get("forced_or_free_entries"), int)]
    catches = [float(r["catch_candidates"]) for r in chunk if isinstance(r.get("catch_candidates"), int)]
    banked = [float(r["banked_energy_candidates"]) for r in chunk if isinstance(r.get("banked_energy_candidates"), int)]
    recovery = [r["recovery"] for r in chunk if r.get("recovery")]
    adverse = [x for x in recovery if x["adverse_candidate"]]
    conversions = [x for x in adverse if x["converted"]]
    return {
        "block": index,
        "matches": len(chunk),
        "known_results": len(known),
        "wins": wins,
        "win_rate": roundn(wins / len(known)) if known else None,
        "avg_shields_used": roundn(mean(shields)),
        "median_normalized_shield_time": roundn(median(norm_shields)),
        "avg_charged_moves": roundn(mean(charges)),
        "avg_charged_moves_per_minute": roundn(mean(cpm)),
        "avg_voluntary_switches": roundn(mean(vol)),
        "avg_forced_or_free_entries": roundn(mean(forced)),
        "avg_catch_candidates": roundn(mean(catches)),
        "avg_banked_energy_candidates": roundn(mean(banked)),
        "recovery_candidates": len(adverse),
        "recovery_conversions": len(conversions),
        "recovery_conversion_rate": roundn(len(conversions) / len(adverse)) if adverse else None,
    }



def clean_species_name(v: Any) -> str | None:
    if isinstance(v, str):
        x = v.strip()
        return x or None
    if isinstance(v, dict):
        for k in ("species", "name", "pokemon", "id"):
            x = v.get(k)
            if isinstance(x, str) and x.strip():
                return x.strip()
    return None


def normalize_team(team: Any) -> list[str]:
    if not isinstance(team, list):
        return []
    out = []
    for v in team:
        x = clean_species_name(v)
        if x and x not in out:
            out.append(x)
    return out


def opponent_archetype_summary(records: list[dict[str, Any]], min_samples: int = 3) -> dict[str, Any]:
    """Empirical corpus archetypes only; no external meta labels are assumed."""
    species = defaultdict(lambda: {"matches": 0, "known_results": 0, "wins": 0, "losses": 0})
    pairs = defaultdict(lambda: {"matches": 0, "known_results": 0, "wins": 0, "losses": 0})
    teams = defaultdict(lambda: {"matches": 0, "known_results": 0, "wins": 0, "losses": 0})

    for r in records:
        team = sorted(normalize_team(r.get("opponent_team")))
        result = r.get("result")
        known = result in {"win", "loss"}
        for mon in team:
            row = species[mon]
            row["matches"] += 1
            if known:
                row["known_results"] += 1
                row["wins"] += int(result == "win")
                row["losses"] += int(result == "loss")
        for i in range(len(team)):
            for j in range(i + 1, len(team)):
                key = f"{team[i]} + {team[j]}"
                row = pairs[key]
                row["matches"] += 1
                if known:
                    row["known_results"] += 1
                    row["wins"] += int(result == "win")
                    row["losses"] += int(result == "loss")
        if len(team) >= 2:
            key = " / ".join(team)
            row = teams[key]
            row["matches"] += 1
            if known:
                row["known_results"] += 1
                row["wins"] += int(result == "win")
                row["losses"] += int(result == "loss")

    def finish(d: dict[str, dict[str, int]], *, breaker: bool = False) -> list[dict[str, Any]]:
        out = []
        for name, row in d.items():
            x = {"name": name, **row}
            x["win_rate"] = roundn(row["wins"] / row["known_results"]) if row["known_results"] else None
            out.append(x)
        if breaker:
            out = [x for x in out if x["known_results"] >= min_samples]
            out.sort(key=lambda x: ((x["win_rate"] if x["win_rate"] is not None else 1.0), -x["known_results"], x["name"]))
        else:
            out.sort(key=lambda x: (-x["matches"], x["name"]))
        return out

    return {
        "classification": "empirical_corpus_only",
        "min_samples_for_breaker_candidate": min_samples,
        "species_frequency": finish(species),
        "pair_frequency": finish(pairs),
        "team_frequency": finish(teams),
        "core_breaker_candidates_by_species": finish(species, breaker=True),
        "core_breaker_candidates_by_pair": finish(pairs, breaker=True),
        "note": "Meta/anti-meta labels require an explicit external ranking or cup snapshot; corpus frequency is not treated as current meta status.",
    }

def quality_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "records": len(records),
        "schemas": dict(Counter(str(r.get("schema")) for r in records)),
        "telemetry_versions": dict(Counter(str(r.get("telemetry_version")) for r in records if r.get("telemetry_version"))),
        "data_quality": dict(Counter(str(r.get("data_quality")) for r in records if r.get("data_quality") is not None)),
        "missing_result": sum(r.get("result") not in {"win", "loss"} for r in records),
        "incomplete_player_roster": sum(isinstance(r.get("player_roster_count"), int) and r["player_roster_count"] < 3 for r in records),
        "incomplete_opponent_roster": sum(isinstance(r.get("opponent_roster_count"), int) and r["opponent_roster_count"] < 3 for r in records),
    }


def markdown(report: dict[str, Any]) -> str:
    q = report["quality"]
    lines = [
        "# PvP improvement trajectory",
        "",
        f"Matches: **{len(report['matches'])}**  ",
        f"Block size: **{report['block_size']}**",
        "",
        "## Telemetry quality",
        "",
        f"- Explicitly unreliable records excluded: {q.get('excluded_unreliable', 0)}",
        f"- Missing result: {q['missing_result']}",
        f"- Incomplete player roster: {q['incomplete_player_roster']}",
        f"- Incomplete opponent roster: {q['incomplete_opponent_roster']}",
        f"- Schemas: `{json.dumps(q['schemas'], sort_keys=True)}`",
        f"- Telemetry versions: `{json.dumps(q['telemetry_versions'], sort_keys=True)}`",
        "",
        "## Rolling blocks",
        "",
        "| Block | Matches | Win rate | Shields/match | Median shield position | Charged/min | Voluntary switches | Recovery conversions |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for b in report["blocks"]:
        wr = "—" if b["win_rate"] is None else f"{100*b['win_rate']:.1f}%"
        ms = "—" if b["median_normalized_shield_time"] is None else f"{100*b['median_normalized_shield_time']:.1f}%"
        rc = "—" if not b["recovery_candidates"] else f"{b['recovery_conversions']}/{b['recovery_candidates']}"
        def f(v: Any) -> str:
            return "—" if v is None else f"{v:.2f}" if isinstance(v, float) else str(v)
        lines.append(f"| {b['block']} | {b['matches']} | {wr} | {f(b['avg_shields_used'])} | {ms} | {f(b['avg_charged_moves_per_minute'])} | {f(b['avg_voluntary_switches'])} | {rc} |")
    arche = report.get("opponent_archetypes") or {}
    lines += ["", "## Opponent composition", ""]
    common_species = (arche.get("species_frequency") or [])[:8]
    breakers = (arche.get("core_breaker_candidates_by_species") or [])[:8]
    if common_species:
        lines.append("Most frequently encountered opponent species: " + ", ".join(f"{x['name']} ({x['matches']})" for x in common_species) + ".")
    if breakers:
        lines.append("")
        lines.append("Empirical core-breaker candidates (minimum sample applied):")
        for x in breakers:
            wr = "—" if x["win_rate"] is None else f"{100*x['win_rate']:.1f}%"
            lines.append(f"- {x['name']}: {x['known_results']} known results, player win rate {wr}")
    lines += [
        "",
        "## Interpretation notes",
        "",
        "- Recovery values are **candidate classifications**, not strategic ground truth.",
        "- Compare telemetry versions before interpreting detector-dependent fields such as catches or banked energy.",
        "- Use targeted video review for opponent identity, move awareness, alignment quality, and dynamic role transitions.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", help="matches.json, battle.json, or directories")
    ap.add_argument("--block-size", type=int, default=10)
    ap.add_argument("--json-out")
    ap.add_argument("--markdown-out")
    ap.add_argument("--include-unreliable", action="store_true", help="Include historical records explicitly labelled unreliable")
    args = ap.parse_args()
    if args.block_size < 1:
        ap.error("--block-size must be >= 1")

    raw: list[tuple[dict[str, Any], str]] = []
    for s in args.inputs:
        raw.extend(identify_and_expand(pathlib.Path(s)))
    records = []
    for m, src in raw:
        if "events" in m and "video" in m and "telemetry" in m:
            r = battle_record(m, src)
        else:
            r = historical_record(m, src)
        r["recovery"] = recovery_candidate(r)
        records.append(r)
    records = dedupe(records)
    excluded_unreliable = 0
    if not args.include_unreliable:
        before = len(records)
        records = [r for r in records if r.get("data_quality") != "unreliable"]
        excluded_unreliable = before - len(records)
    # Timestamped historical records first; unknown/current individual battle files retain input order at end.
    records.sort(key=lambda r: (r.get("match_time") is None, r.get("match_time") or ""))
    blocks = [summarize_block(records[i:i+args.block_size], 1+i//args.block_size) for i in range(0, len(records), args.block_size)]
    report = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "block_size": args.block_size,
        "quality": {**quality_summary(records), "excluded_unreliable": excluded_unreliable},
        "matches": records,
        "blocks": blocks,
        "opponent_archetypes": opponent_archetype_summary(records),
    }
    js = json.dumps(report, indent=2, ensure_ascii=False)
    md = markdown(report)
    if args.json_out:
        pathlib.Path(args.json_out).write_text(js + "\n", encoding="utf-8")
    if args.markdown_out:
        pathlib.Path(args.markdown_out).write_text(md, encoding="utf-8")
    if not args.json_out and not args.markdown_out:
        print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
