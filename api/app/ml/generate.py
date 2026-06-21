"""Synthetic-but-grounded historical event dataset.

Samples plausible Bengaluru events, expands each into (junction x time) rows,
and labels them with the ``ground_truth`` physics model. Also defines a curated
set of named historical events used for the "post-event learning" / predicted-
vs-actual demo.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.data.graph import JUNCTIONS
from app.data.venues import VENUES
from app.ml.features import (
    EVENT_TYPES,
    Event,
    FEATURE_COLUMNS,
    build_feature_row,
    ground_truth,
    timeline_offsets,
)


def sample_event(rng: np.random.Generator) -> Event:
    """Draw one plausible event scenario."""
    venue = VENUES[rng.integers(len(VENUES))]
    # 40% of the time explore ANY event type so the model covers the full
    # venue x type space the UI exposes (marathon, construction, vip_movement,
    # ...). Otherwise pick a type the venue plausibly hosts.
    all_types = list(EVENT_TYPES.keys())
    if rng.random() < 0.50:
        candidates = all_types
    else:
        candidates = [t for t in venue.typical_events if t in EVENT_TYPES] or all_types
    event_type = candidates[rng.integers(len(candidates))]

    # Attendance: ~15%-125% of capacity (allow oversold/standing), fuller-skewed.
    ratio = float(np.clip(rng.beta(3.0, 2.0) * 1.25, 0.15, 1.25))
    attendance = int(venue.capacity * ratio)

    # Continuous start time across the day so the model is robust to any hour
    # the UI exposes (early-morning marathons through late-night concerts),
    # with a mild bias toward typical event windows.
    if rng.random() < 0.7:
        start_hour = float(round(rng.uniform(9.0, 21.0), 2))
    else:
        start_hour = float(round(rng.uniform(5.5, 23.0), 2))
    dow = int(rng.integers(0, 7))
    is_holiday = bool(rng.random() < 0.12)
    rain = int(rng.choice([0, 0, 0, 1, 1, 2], p=[0.4, 0.15, 0.1, 0.18, 0.1, 0.07]))
    temp_c = float(round(rng.normal(26, 3), 1))
    duration_min = int(rng.choice([120, 150, 180, 210, 240, 300]))

    return Event(
        venue_id=venue.id,
        event_type=event_type,
        attendance=attendance,
        start_hour=start_hour,
        dow=dow,
        is_holiday=is_holiday,
        rain=rain,
        temp_c=temp_c,
        duration_min=duration_min,
    )


def expand_event(event: Event, rng: np.random.Generator | None) -> list[list[float]]:
    """Expand one event into labelled feature rows over all junctions & times."""
    rows: list[list[float]] = []
    offsets = timeline_offsets(event.duration_min)
    for j in JUNCTIONS:
        for m in offsets:
            feats = build_feature_row(event, j.id, m)
            cong, delay = ground_truth(event, j.id, m, rng=rng)
            rows.append(feats + [cong, delay])
    return rows


def generate_dataset(n_events: int = 220, seed: int = 7) -> pd.DataFrame:
    """Generate the full training frame (features + congestion + delay + event_idx).

    ``event_idx`` tags every row with its source event so the trainer can split
    by event (evaluating generalisation to *unseen* events, not leaked rows).
    """
    rng = np.random.default_rng(seed)
    all_rows: list[list[float]] = []
    for idx in range(n_events):
        event = sample_event(rng)
        for row in expand_event(event, rng):
            all_rows.append(row + [float(idx)])

    cols = FEATURE_COLUMNS + ["congestion", "delay", "event_idx"]
    return pd.DataFrame(all_rows, columns=cols)


# --- Curated historical events (for the "Learn" / replay demo) --------------
# Deterministic, named past events. Actual outcomes are simulated once (seeded)
# so the dashboard can show predicted-vs-actual error.

HISTORICAL_EVENTS = [
    {
        "id": "hist_rcb_ipl",
        "name": "RCB vs CSK — IPL Night Match",
        "date": "2025-04-26",
        "event": Event("chinnaswamy", "cricket", 38000, 19.5, 5, False, 0, 28.0, 210),
    },
    {
        "id": "hist_palace_concert",
        "name": "Arijit Singh Live @ Palace Grounds",
        "date": "2025-02-15",
        "event": Event("palace_grounds", "concert", 65000, 19.0, 5, False, 1, 24.0, 180),
    },
    {
        "id": "hist_freedom_rally",
        "name": "Farmers' Rally @ Freedom Park",
        "date": "2025-03-10",
        "event": Event("freedom_park", "rally", 42000, 10.0, 0, False, 0, 30.0, 240),
    },
    {
        "id": "hist_kanteerava_derby",
        "name": "Bengaluru FC Derby @ Kanteerava",
        "date": "2025-01-18",
        "event": Event("kanteerava", "football", 22000, 19.5, 5, False, 0, 25.0, 150),
    },
    {
        "id": "hist_marathon",
        "name": "TCS World 10K Marathon",
        "date": "2025-05-25",
        "event": Event("kanteerava", "marathon", 28000, 6.0, 6, True, 0, 23.0, 240),
    },
    {
        "id": "hist_vidhana_protest",
        "name": "Mass Protest @ Vidhana Soudha",
        "date": "2025-06-02",
        "event": Event("vidhana_soudha", "protest", 25000, 11.0, 2, False, 2, 27.0, 180),
    },
]


def simulate_actuals(event: Event, seed: int) -> dict:
    """Simulate the 'observed' peak congestion/delay per junction for an event.

    The peak time is found on the deterministic curve, then a single measurement
    noise term is added (avoiding the upward bias of taking max-over-noisy-samples),
    so it is a fair comparison against the model's predicted peak.
    """
    rng = np.random.default_rng(seed)
    offsets = timeline_offsets(event.duration_min)
    peak: dict[str, dict] = {}
    for j in JUNCTIONS:
        best_c = 0.0
        for m in offsets:
            c, _ = ground_truth(event, j.id, m, rng=None)  # deterministic curve
            best_c = max(best_c, c)
        obs_c = float(np.clip(best_c + rng.normal(0.0, 3.5), 0.0, 100.0))
        cfrac = obs_c / 100.0
        lane_factor = min(max(4.0 / j.lanes, 0.5), 2.0)
        obs_d = max(0.0, 0.4 + 15.0 * (cfrac ** 2.2) * lane_factor + rng.normal(0.0, 0.5))
        peak[j.id] = {"congestion": round(obs_c, 1), "delay": round(obs_d, 2)}
    return peak
