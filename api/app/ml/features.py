"""Shared feature engineering + the grounded generative ('ground truth') model.

This module is the single source of truth used by BOTH:
  * generate.py  -> to synthesise the training dataset (uses ``ground_truth``)
  * forecast.py  -> to build the exact same feature rows at inference time

Design note: the trained ML model only ever sees RAW, knowable-in-advance event
& junction features (attendance, type, distance, clock time, weather, ...). The
internal physics of ``ground_truth`` (spatial decay, dispersal humps) are NOT
fed to the model -- it has to *learn* that mapping, which is what makes the
forecast a real prediction with honest error, not an identity lookup.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.data.graph import JUNCTIONS_BY_ID, build_graph, haversine_km
from app.data.venues import Venue, get_venue


# --- Event taxonomy --------------------------------------------------------

@dataclass(frozen=True)
class EventType:
    key: str
    label: str
    intensity: float        # crowd -> roadway pressure multiplier
    dispersal: float        # how synchronised the exit surge is
    during: float           # sustained pressure while the event is on


EVENT_TYPES: dict[str, EventType] = {
    "cricket": EventType("cricket", "Cricket Match", 1.00, 1.50, 0.35),
    "concert": EventType("concert", "Concert", 1.10, 1.45, 0.40),
    "football": EventType("football", "Football Match", 0.90, 1.30, 0.35),
    "athletics": EventType("athletics", "Athletics Meet", 0.70, 1.10, 0.30),
    "rally": EventType("rally", "Political Rally", 1.20, 0.90, 0.55),
    "protest": EventType("protest", "Protest / March", 1.15, 0.85, 0.60),
    "festival": EventType("festival", "Festival", 0.90, 0.80, 0.60),
    "exhibition": EventType("exhibition", "Exhibition / Expo", 0.60, 0.70, 0.50),
    "marathon": EventType("marathon", "Marathon (road closures)", 1.20, 0.65, 0.85),
    "vip_movement": EventType("vip_movement", "VIP Movement", 0.80, 0.50, 0.60),
    "kabaddi": EventType("kabaddi", "Kabaddi / Indoor", 0.55, 1.10, 0.30),
    "badminton": EventType("badminton", "Badminton / Indoor", 0.50, 1.00, 0.30),
    "construction": EventType("construction", "Construction Activity", 0.65, 0.30, 0.90),
}

# Stable ordering -> integer codes for the model.
EVENT_TYPE_KEYS: list[str] = sorted(EVENT_TYPES.keys())
EVENT_TYPE_CODE: dict[str, int] = {k: i for i, k in enumerate(EVENT_TYPE_KEYS)}

WEATHER_LABELS = {0: "Clear", 1: "Light Rain", 2: "Heavy Rain"}
_WEATHER_MULT = {0: 1.00, 1: 1.15, 2: 1.35}


# --- Event container -------------------------------------------------------

@dataclass(frozen=True)
class Event:
    venue_id: str
    event_type: str
    attendance: int
    start_hour: float       # 0-23 (clock hour the event starts)
    dow: int                # 0=Mon ... 6=Sun
    is_holiday: bool
    rain: int               # 0 clear / 1 light / 2 heavy
    temp_c: float
    duration_min: int

    @property
    def is_weekend(self) -> int:
        return 1 if self.dow >= 5 else 0


# --- Time axis -------------------------------------------------------------

PRE_MIN = 180     # how long before start we begin forecasting
POST_MIN = 120    # how long after the event ends
STEP_MIN = 15


def timeline_offsets(duration_min: int) -> list[int]:
    """Minute offsets relative to event start, e.g. -180 .. duration+120."""
    end = duration_min + POST_MIN
    return list(range(-PRE_MIN, end + 1, STEP_MIN))


def phase_for(minutes: int, duration_min: int) -> str:
    if minutes < 0:
        return "arrival"
    if minutes <= duration_min:
        return "during"
    return "dispersal"


_PHASE_CODE = {"arrival": 0, "during": 1, "dispersal": 2}


def clock_hour(start_hour: float, minutes: int) -> float:
    return (start_hour + minutes / 60.0) % 24.0


# --- Generative physics (ground truth) -------------------------------------

def _tod_profile(hour: float) -> float:
    """Time-of-day baseline congestion factor in ~[0.25, 1.0]."""
    morning = 0.65 * math.exp(-(((hour - 9.5) / 2.2) ** 2))
    evening = 0.78 * math.exp(-(((hour - 19.0) / 2.4) ** 2))
    val = 0.25 + morning + evening
    return min(val, 1.05) / 1.05


def _temporal_multiplier(minutes: int, duration_min: int, et: EventType) -> float:
    """Envelope of arrival surge, sustained load, and dispersal surge."""
    arrival = math.exp(-(((minutes + 25) / 45.0) ** 2))
    during = et.during if 0 <= minutes <= duration_min else 0.0
    dispersal = et.dispersal * math.exp(-(((minutes - (duration_min + 15)) / 35.0) ** 2))
    return max(arrival, during, dispersal)


def baseline_congestion(base_volume: int, hour: float, is_weekend: int, rain: int) -> float:
    base = (base_volume / 14000.0)
    weekend_factor = 0.78 if is_weekend else 1.0
    val = 100.0 * base * _tod_profile(hour) * weekend_factor
    val *= (1.0 + 0.08 * rain)
    return float(min(max(val, 5.0), 82.0))


def ground_truth(event: Event, junction_id: str, minutes: int, rng=None) -> tuple[float, float]:
    """Return (congestion_index 0-100, delay_min) for one junction at one time.

    This is the synthetic 'reality' the model is trained to approximate.
    """
    j = JUNCTIONS_BY_ID[junction_id]
    venue: Venue = get_venue(event.venue_id)
    et = EVENT_TYPES[event.event_type]

    hour = clock_hour(event.start_hour, minutes)
    base = baseline_congestion(j.base_volume, hour, event.is_weekend, event.rain)

    intensity = min(max(event.attendance / venue.capacity, 0.10), 1.20)
    dist = haversine_km(j.lat, j.lng, venue.lat, venue.lng)
    spatial = math.exp(-((dist / venue.base_radius_km) ** 1.25))
    # Centrality (structural funnel effect) lives on the graph, not the dataclass.
    centrality = build_graph().nodes[junction_id].get("centrality", 0.0)
    funnel = 0.8 + 1.6 * centrality
    temporal = _temporal_multiplier(minutes, event.duration_min, et)
    weather = _WEATHER_MULT[event.rain]

    surcharge = 75.0 * intensity * et.intensity * spatial * funnel * temporal * weather

    congestion = base + surcharge
    if rng is not None:
        congestion += rng.normal(0.0, 3.0)
    congestion = float(min(max(congestion, 0.0), 100.0))

    c = congestion / 100.0
    lane_factor = min(max(4.0 / j.lanes, 0.5), 2.0)
    delay = 0.4 + 15.0 * (c ** 2.2) * lane_factor
    if rng is not None:
        delay += rng.normal(0.0, 0.5)
    delay = float(max(delay, 0.0))

    return congestion, delay


# --- Feature row (model input) ---------------------------------------------

FEATURE_COLUMNS: list[str] = [
    "attendance",
    "attendance_ratio",
    "event_type_code",
    "venue_capacity",
    "dist_km",
    "base_volume",
    "lanes",
    "centrality",
    "hour",
    "dow",
    "is_weekend",
    "is_holiday",
    "rain",
    "temp_c",
    "minutes_rel",
    "duration_min",
    "phase_code",
]

# Columns HGB should treat as categorical (by index into FEATURE_COLUMNS).
CATEGORICAL_FEATURES = [
    FEATURE_COLUMNS.index("event_type_code"),
    FEATURE_COLUMNS.index("dow"),
    FEATURE_COLUMNS.index("phase_code"),
]


def build_feature_row(event: Event, junction_id: str, minutes: int) -> list[float]:
    """Build the raw model-input row (must match FEATURE_COLUMNS order)."""
    j = JUNCTIONS_BY_ID[junction_id]
    venue = get_venue(event.venue_id)
    g = build_graph()
    centrality = g.nodes[junction_id].get("centrality", 0.0)

    dist = haversine_km(j.lat, j.lng, venue.lat, venue.lng)
    hour = clock_hour(event.start_hour, minutes)
    phase = _PHASE_CODE[phase_for(minutes, event.duration_min)]

    return [
        float(event.attendance),
        float(event.attendance / venue.capacity),
        float(EVENT_TYPE_CODE[event.event_type]),
        float(venue.capacity),
        float(dist),
        float(j.base_volume),
        float(j.lanes),
        float(centrality),
        float(hour),
        float(event.dow),
        float(event.is_weekend),
        float(1 if event.is_holiday else 0),
        float(event.rain),
        float(event.temp_c),
        float(minutes),
        float(event.duration_min),
        float(phase),
    ]
