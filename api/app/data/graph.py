"""Curated road network for central + arterial Bengaluru.

A hand-built graph of major junctions and the corridors that connect them.
Coordinates are real (approximate); ``base_volume`` is the typical weekday peak
throughput (veh/hr) at the junction and anchors the baseline-congestion model.
Edge capacity is derived from lane count. Betweenness centrality is computed at
load time with NetworkX and used to prioritise enforcement/manpower.

This is a prototype network (~40 junctions) focused on the central districts
where the supported event venues cluster, with arterial reaches (ORR, OMR,
Hosur Rd, Bellary Rd, Tumkur Rd) so diversion routing is meaningful.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache

import networkx as nx


@dataclass(frozen=True)
class Junction:
    id: str
    name: str
    lat: float
    lng: float
    lanes: int          # typical approach lanes
    base_volume: int    # weekday peak throughput, veh/hr


# --- Junctions -------------------------------------------------------------

JUNCTIONS: list[Junction] = [
    Junction("trinity_circle", "Trinity Circle", 12.9728, 77.6195, 6, 7200),
    Junction("anil_kumble_circle", "Anil Kumble Circle (MG Rd)", 12.9748, 77.6065, 6, 6800),
    Junction("brigade_residency", "Brigade / Residency Rd", 12.9685, 77.6045, 4, 5400),
    Junction("cubbon_park", "Cubbon Park Jn", 12.9763, 77.5928, 4, 4800),
    Junction("corporation_circle", "Corporation Circle", 12.9655, 77.5905, 6, 6600),
    Junction("town_hall", "Town Hall", 12.9664, 77.5846, 4, 5200),
    Junction("kr_market", "KR Market", 12.9610, 77.5793, 6, 7800),
    Junction("richmond_circle", "Richmond Circle", 12.9612, 77.5980, 6, 7000),
    Junction("shivajinagar", "Shivajinagar", 12.9846, 77.6052, 4, 6200),
    Junction("cantonment", "Cantonment", 12.9930, 77.6000, 4, 4600),
    Junction("majestic", "Majestic (Kempegowda)", 12.9774, 77.5715, 6, 9000),
    Junction("city_railway", "City Railway Stn", 12.9784, 77.5680, 4, 5800),
    Junction("minerva_circle", "Minerva Circle", 12.9533, 77.5803, 4, 4400),
    Junction("lalbagh_west", "Lalbagh West Gate", 12.9507, 77.5848, 4, 4200),
    Junction("kh_double_road", "KH Rd / Double Rd", 12.9568, 77.5968, 6, 6400),
    Junction("ulsoor", "Ulsoor", 12.9820, 77.6210, 4, 5000),
    Junction("indiranagar_100ft", "Indiranagar 100ft Rd", 12.9719, 77.6412, 4, 5600),
    Junction("domlur", "Domlur Flyover", 12.9609, 77.6387, 6, 6800),
    Junction("koramangala", "Koramangala Jn", 12.9352, 77.6245, 4, 6000),
    Junction("silk_board", "Central Silk Board", 12.9172, 77.6230, 8, 11000),
    Junction("madiwala", "Madiwala", 12.9229, 77.6190, 6, 7400),
    Junction("dairy_circle", "Dairy Circle (Hosur Rd)", 12.9352, 77.6030, 6, 6600),
    Junction("mekhri_circle", "Mekhri Circle", 13.0098, 77.5800, 8, 9400),
    Junction("cauvery_jn", "Cauvery Jn (Bellary Rd)", 13.0066, 77.5930, 6, 6200),
    Junction("windsor_manor", "Windsor Manor Jn", 12.9932, 77.5868, 4, 5400),
    Junction("hebbal", "Hebbal Flyover", 13.0358, 77.5912, 8, 12000),
    Junction("yeshwanthpur", "Yeshwanthpur", 13.0280, 77.5400, 6, 7600),
    Junction("rajajinagar", "Rajajinagar", 12.9910, 77.5550, 4, 5200),
    Junction("okalipuram", "Okalipuram Jn", 12.9870, 77.5610, 6, 6400),
    Junction("kr_puram", "KR Puram (TIN/ORR)", 13.0079, 77.6960, 8, 11500),
    Junction("tin_factory", "Tin Factory", 13.0090, 77.6680, 6, 8200),
    Junction("marathahalli", "Marathahalli", 12.9568, 77.7011, 6, 8600),
    Junction("jayanagar", "Jayanagar 4th Block", 12.9250, 77.5938, 4, 5600),
    Junction("south_end_circle", "South End Circle", 12.9355, 77.5807, 4, 4800),
    Junction("basavanagudi", "Basavanagudi", 12.9420, 77.5730, 4, 4400),
    Junction("national_college", "National College Jn", 12.9405, 77.5710, 4, 5000),
    Junction("ejipura", "Ejipura (IRR)", 12.9430, 77.6300, 4, 5200),
    Junction("vidhana_soudha_jn", "Ambedkar Veedhi (Vidhana Soudha)", 12.9794, 77.5930, 4, 4600),
]

JUNCTIONS_BY_ID: dict[str, Junction] = {j.id: j for j in JUNCTIONS}


# --- Corridors (edges): (a, b, road_name, lanes) ---------------------------

_EDGES: list[tuple[str, str, str, int]] = [
    # MG Road / central spine
    ("trinity_circle", "anil_kumble_circle", "MG Road", 6),
    ("anil_kumble_circle", "cubbon_park", "Kasturba Road", 4),
    ("anil_kumble_circle", "brigade_residency", "Brigade Road", 4),
    ("brigade_residency", "richmond_circle", "Residency Road", 4),
    ("cubbon_park", "vidhana_soudha_jn", "Ambedkar Veedhi", 4),
    ("cubbon_park", "shivajinagar", "Cubbon Road", 4),
    ("vidhana_soudha_jn", "corporation_circle", "Bhagwan Mahaveer Rd", 4),
    # CBD west
    ("corporation_circle", "town_hall", "JC Road", 4),
    ("corporation_circle", "richmond_circle", "Kasturba / Hudson", 4),
    ("town_hall", "kr_market", "Avenue Road", 4),
    ("kr_market", "majestic", "KG Road", 6),
    ("corporation_circle", "kh_double_road", "NR Road", 4),
    # Richmond / Hosur corridor
    ("richmond_circle", "kh_double_road", "Richmond Road", 4),
    ("kh_double_road", "lalbagh_west", "KH (Double) Road", 6),
    ("lalbagh_west", "minerva_circle", "Lalbagh Road", 4),
    ("minerva_circle", "kr_market", "Minerva Rd", 4),
    ("richmond_circle", "dairy_circle", "Hosur Road", 6),
    ("dairy_circle", "madiwala", "Hosur Road", 6),
    ("madiwala", "silk_board", "Hosur Road", 8),
    ("dairy_circle", "jayanagar", "BTM Link Rd", 4),
    # South
    ("lalbagh_west", "jayanagar", "Lalbagh Fort Rd", 4),
    ("jayanagar", "south_end_circle", "South End Road", 4),
    ("south_end_circle", "basavanagudi", "DVG Road", 4),
    ("basavanagudi", "national_college", "Bull Temple Road", 4),
    ("national_college", "kr_market", "KR Road", 4),
    ("jayanagar", "koramangala", "Sarjapur Link", 4),
    # East / Old Madras Road / Indiranagar
    ("trinity_circle", "ulsoor", "Ulsoor Road", 4),
    ("ulsoor", "indiranagar_100ft", "CMH Road", 4),
    ("indiranagar_100ft", "domlur", "100ft / Domlur", 4),
    ("trinity_circle", "domlur", "Old Airport Road", 6),
    ("domlur", "koramangala", "Inner Ring Road", 6),
    ("koramangala", "ejipura", "Inner Ring Road", 4),
    ("ejipura", "domlur", "IRR Link", 4),
    ("koramangala", "madiwala", "Sarjapur Road", 4),
    ("indiranagar_100ft", "tin_factory", "Old Madras Road", 6),
    ("tin_factory", "kr_puram", "Old Madras Road", 8),
    ("kr_puram", "marathahalli", "Outer Ring Road", 8),
    ("marathahalli", "silk_board", "Outer Ring Road", 8),
    # North / Bellary Road
    ("shivajinagar", "cantonment", "Queens Road", 4),
    ("cantonment", "windsor_manor", "Cunningham Road", 4),
    ("windsor_manor", "cauvery_jn", "Bellary Road", 6),
    ("cauvery_jn", "mekhri_circle", "Bellary Road", 6),
    ("mekhri_circle", "hebbal", "Bellary Road", 8),
    ("cubbon_park", "windsor_manor", "Race Course Road", 4),
    ("shivajinagar", "ulsoor", "Assaye Road", 4),
    # West / Tumkur Road
    ("majestic", "okalipuram", "Magadi Road", 6),
    ("okalipuram", "rajajinagar", "Chord Road", 4),
    ("rajajinagar", "yeshwanthpur", "Tumkur Road", 6),
    ("yeshwanthpur", "mekhri_circle", "CV Raman Road", 6),
    ("okalipuram", "majestic", "Goods Shed Rd", 4),
    ("majestic", "city_railway", "Station Road", 4),
    ("majestic", "cubbon_park", "Sheshadri Road", 4),
    ("cantonment", "shivajinagar", "Infantry Road", 4),
    ("hebbal", "kr_puram", "Outer Ring Road", 8),
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# Per-lane saturation flow (veh/hr) used to convert lanes -> capacity.
_LANE_CAPACITY = 850


@lru_cache(maxsize=1)
def build_graph() -> nx.Graph:
    """Build the undirected road graph with geometry + capacity + centrality."""
    g = nx.Graph()
    for j in JUNCTIONS:
        g.add_node(
            j.id,
            name=j.name,
            lat=j.lat,
            lng=j.lng,
            lanes=j.lanes,
            base_volume=j.base_volume,
        )

    seen: set[tuple[str, str]] = set()
    for a, b, road, lanes in _EDGES:
        if a not in JUNCTIONS_BY_ID or b not in JUNCTIONS_BY_ID:
            raise ValueError(f"Edge references unknown junction: {a} -> {b}")
        key = tuple(sorted((a, b)))
        if key in seen:
            continue
        seen.add(key)
        ja, jb = JUNCTIONS_BY_ID[a], JUNCTIONS_BY_ID[b]
        length = _haversine_km(ja.lat, ja.lng, jb.lat, jb.lng)
        capacity = lanes * _LANE_CAPACITY
        # Free-flow travel time (min) assuming ~35 km/h urban arterial speed.
        ff_time = length / 35.0 * 60.0
        g.add_edge(
            a,
            b,
            road=road,
            lanes=lanes,
            length_km=round(length, 3),
            capacity=capacity,
            ff_time_min=round(ff_time, 2),
        )

    # Betweenness centrality (weighted by free-flow time) -> structural importance.
    bc = nx.betweenness_centrality(g, weight="ff_time_min", normalized=True)
    for node_id, val in bc.items():
        g.nodes[node_id]["centrality"] = round(val, 4)

    return g


def graph_to_dict() -> dict:
    """Serialise the graph for the frontend (nodes + edges with geometry)."""
    g = build_graph()
    nodes = []
    for nid, data in g.nodes(data=True):
        nodes.append(
            {
                "id": nid,
                "name": data["name"],
                "lat": data["lat"],
                "lng": data["lng"],
                "lanes": data["lanes"],
                "baseVolume": data["base_volume"],
                "centrality": data["centrality"],
            }
        )
    edges = []
    for a, b, data in g.edges(data=True):
        edges.append(
            {
                "from": a,
                "to": b,
                "road": data["road"],
                "lanes": data["lanes"],
                "lengthKm": data["length_km"],
                "capacity": data["capacity"],
            }
        )
    return {"nodes": nodes, "edges": edges}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Public haversine helper (km)."""
    return _haversine_km(lat1, lng1, lat2, lng2)
