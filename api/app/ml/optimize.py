"""Recommendation / optimisation engine.

Turns a forecast into an actionable deployment plan:
  * manpower   -> greedy marginal-utility allocation of officers to junctions
  * barricades -> inflow-restriction points on the worst corridors near the venue
  * diversions -> congestion-aware reroutes for cross-city through traffic

All three consume the per-junction *peak* event-attributable impact (delta) so
the plan is sized for the worst moment, which is how field deployment is planned.
"""

from __future__ import annotations

import networkx as nx

from app.data.graph import JUNCTIONS_BY_ID, build_graph, haversine_km
from app.ml.forecast import AFFECTED_DELTA

# Officer effectiveness: each successive officer at a junction yields less
# marginal relief (diminishing returns); total mitigation is capped.
_RELIEF_DECAY = 0.80
_MAX_MITIGATION = 0.62
_MAX_PER_JUNCTION = 12

# Peripheral "gateway" junctions for cross-city through-traffic OD pairs.
_GATEWAY_PAIRS = [
    ("hebbal", "silk_board"),
    ("yeshwanthpur", "marathahalli"),
    ("kr_puram", "majestic"),
    ("mekhri_circle", "jayanagar"),
    ("hebbal", "koramangala"),
    ("tin_factory", "majestic"),
]


def _coords(node_id: str) -> list[float]:
    j = JUNCTIONS_BY_ID[node_id]
    return [j.lat, j.lng]


# --- Manpower --------------------------------------------------------------

def allocate_manpower(per_junction: list[dict], budget: int) -> dict:
    affected = [p for p in per_junction if p["delta"] >= AFFECTED_DELTA]
    if not affected:
        return {"officers": [], "totalDeployed": 0, "junctionsStaffed": 0}

    priority = {}
    for p in affected:
        priority[p["id"]] = (
            (p["delta"] / 100.0)
            * (0.5 + p["congestion"] / 100.0)
            * (0.5 + 2.0 * p.get("centrality", 0.0))
        )

    officers = {p["id"]: 0 for p in affected}

    # Greedy: each officer goes to the junction with the highest marginal benefit.
    for _ in range(budget):
        best_id, best_gain = None, 0.0
        for jid in officers:
            if officers[jid] >= _MAX_PER_JUNCTION:
                continue
            gain = priority[jid] * (_RELIEF_DECAY ** officers[jid])
            if gain > best_gain:
                best_gain, best_id = gain, jid
        if best_id is None:
            break
        officers[best_id] += 1

    by_id = {p["id"]: p for p in affected}
    result = []
    for jid, n in officers.items():
        if n == 0:
            continue
        p = by_id[jid]
        mitigation = min(_MAX_MITIGATION, 1 - _RELIEF_DECAY ** n)
        result.append(
            {
                "junctionId": jid,
                "junctionName": p["name"],
                "lat": p["lat"],
                "lng": p["lng"],
                "officers": n,
                "priority": round(priority[jid], 3),
                "peakCongestion": p["congestion"],
                "eventDelta": p["delta"],
                "expectedDelayBefore": p["delay"],
                "expectedDelayAfter": round(p["delay"] * (1 - mitigation), 2),
                "mitigationPct": round(mitigation * 100, 0),
                "reason": _manpower_reason(p),
            }
        )
    result.sort(key=lambda x: x["officers"], reverse=True)
    return {
        "officers": result,
        "totalDeployed": sum(r["officers"] for r in result),
        "junctionsStaffed": len(result),
    }


def _manpower_reason(p: dict) -> str:
    bits = [f"+{p['delta']:.0f} pts event surge"]
    if p.get("centrality", 0) >= 0.12:
        bits.append("high network centrality")
    if p["congestion"] >= 80:
        bits.append("near-gridlock")
    elif p["congestion"] >= 65:
        bits.append("severe congestion")
    return ", ".join(bits)


# --- Barricades ------------------------------------------------------------

def recommend_barricades(per_junction: list[dict], venue_lat: float, venue_lng: float,
                         max_points: int = 5) -> list[dict]:
    g = build_graph()
    delta = {p["id"]: p["delta"] for p in per_junction}
    cong = {p["id"]: p["congestion"] for p in per_junction}

    candidates = []
    for a, b, data in g.edges(data=True):
        da, db = delta.get(a, 0.0), delta.get(b, 0.0)
        impact = (da + db) / 2.0
        if impact < AFFECTED_DELTA:
            continue
        ja, jb = JUNCTIONS_BY_ID[a], JUNCTIONS_BY_ID[b]
        mid_lat, mid_lng = (ja.lat + jb.lat) / 2, (ja.lng + jb.lng) / 2
        dist_to_venue = haversine_km(mid_lat, mid_lng, venue_lat, venue_lng)
        # Bias toward corridors close to the venue (inflow control).
        proximity = 1.0 / (1.0 + dist_to_venue)
        score = impact * (0.4 + 0.6 * proximity * 3)
        candidates.append((score, impact, dist_to_venue, a, b, data))

    candidates.sort(reverse=True, key=lambda x: x[0])

    chosen = []
    used_junctions: dict[str, int] = {}
    for score, impact, dist, a, b, data in candidates:
        if len(chosen) >= max_points:
            break
        # Avoid stacking >2 barricades on the same junction.
        if used_junctions.get(a, 0) >= 2 or used_junctions.get(b, 0) >= 2:
            continue
        used_junctions[a] = used_junctions.get(a, 0) + 1
        used_junctions[b] = used_junctions.get(b, 0) + 1
        worst = a if cong.get(a, 0) >= cong.get(b, 0) else b
        action = "Hard barricade + diversion" if impact >= 25 else "One-way / inflow metering"
        chosen.append(
            {
                "edge": f"{a}__{b}",
                "road": data["road"],
                "from": JUNCTIONS_BY_ID[a].name,
                "to": JUNCTIONS_BY_ID[b].name,
                "route": [_coords(a), _coords(b)],
                "action": action,
                "impact": round(impact, 1),
                "distToVenueKm": round(dist, 2),
                "reason": f"{data['road']} feeds {JUNCTIONS_BY_ID[worst].name} "
                          f"(peak {cong.get(worst, 0):.0f}/100); restrict inflow toward venue.",
            }
        )
    return chosen


# --- Diversions ------------------------------------------------------------

def recommend_diversions(per_junction: list[dict], max_routes: int = 4) -> list[dict]:
    g = build_graph()
    delta = {p["id"]: p["delta"] for p in per_junction}

    def cong_weight(u, v, data):
        d = (delta.get(u, 0.0) + delta.get(v, 0.0)) / 2.0
        return data["ff_time_min"] * (1.0 + 3.5 * (d / 100.0))

    def path_time(path) -> float:
        t = 0.0
        for u, v in zip(path[:-1], path[1:]):
            t += g[u][v]["ff_time_min"]
        return t

    diversions = []
    seen = set()
    for o, d in _GATEWAY_PAIRS:
        if o not in g or d not in g:
            continue
        try:
            normal = nx.shortest_path(g, o, d, weight="ff_time_min")
            diverted = nx.shortest_path(g, o, d, weight=cong_weight)
        except nx.NetworkXNoPath:
            continue
        if normal == diverted:
            continue
        hit = [n for n in normal if delta.get(n, 0.0) >= AFFECTED_DELTA]
        avoided = [n for n in hit if n not in diverted]
        if not avoided:
            continue

        key = tuple(diverted)
        if key in seen:
            continue
        seen.add(key)

        t_normal = path_time(normal)
        t_divert = path_time(diverted)
        diversions.append(
            {
                "from": JUNCTIONS_BY_ID[o].name,
                "to": JUNCTIONS_BY_ID[d].name,
                "avoids": [JUNCTIONS_BY_ID[n].name for n in avoided],
                "originalRoute": [_coords(n) for n in normal],
                "suggestedRoute": [_coords(n) for n in diverted],
                "normalTimeMin": round(t_normal, 1),
                "divertedTimeMin": round(t_divert, 1),
                "extraDistanceMin": round(t_divert - t_normal, 1),
                "reason": f"Through-traffic {JUNCTIONS_BY_ID[o].name} → {JUNCTIONS_BY_ID[d].name} "
                          f"normally crosses {', '.join(JUNCTIONS_BY_ID[n].name for n in avoided)}; "
                          f"reroute to keep the event corridor clear.",
            }
        )
        if len(diversions) >= max_routes:
            break
    return diversions


# --- Top-level plan --------------------------------------------------------

def build_plan(forecast: dict, manpower_budget: int = 60) -> dict:
    per_junction = forecast["perJunction"]
    event = forecast["event"]
    manpower = allocate_manpower(per_junction, manpower_budget)
    barricades = recommend_barricades(per_junction, event["venueLat"], event["venueLng"])
    diversions = recommend_diversions(per_junction)

    return {
        "manpower": manpower,
        "barricades": barricades,
        "diversions": diversions,
        "summary": {
            "officersDeployed": manpower["totalDeployed"],
            "junctionsStaffed": manpower["junctionsStaffed"],
            "barricadePoints": len(barricades),
            "diversionRoutes": len(diversions),
            "manpowerBudget": manpower_budget,
        },
    }
