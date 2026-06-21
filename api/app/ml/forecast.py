"""Forecast inference: turn an event scenario into a space-time congestion forecast.

Loads the trained models once, predicts congestion + delay for every junction
across the event timeline, isolates the *event-attributable* impact (predicted
total minus the deterministic baseline), and rolls everything up into a timeline
+ per-junction peaks + headline KPIs.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np

from app.data.graph import JUNCTIONS, JUNCTIONS_BY_ID, build_graph, haversine_km
from app.data.venues import get_venue
from app.ml.features import (
    Event,
    FEATURE_COLUMNS,
    baseline_congestion,
    build_feature_row,
    clock_hour,
    phase_for,
    timeline_offsets,
)

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"

# A junction is "affected" once the event adds at least this many congestion
# points over its normal baseline at peak.
AFFECTED_DELTA = 8.0


def _fmt_time(minutes: int) -> str:
    sign = "+" if minutes >= 0 else "−"
    m = abs(minutes)
    return f"T{sign}{m // 60}:{m % 60:02d}"


class Forecaster:
    """Singleton-ish wrapper around the trained models."""

    _instance: "Forecaster | None" = None

    def __init__(self) -> None:
        cong_path = ARTIFACT_DIR / "model_congestion.joblib"
        delay_path = ARTIFACT_DIR / "model_delay.joblib"
        if not cong_path.exists() or not delay_path.exists():
            raise FileNotFoundError(
                "Model artifacts not found. Run `python -m app.ml.train` first."
            )
        self.model_congestion = joblib.load(cong_path)
        self.model_delay = joblib.load(delay_path)

    @classmethod
    def get(cls) -> "Forecaster":
        if cls._instance is None:
            cls._instance = Forecaster()
        return cls._instance

    def forecast(self, event: Event) -> dict:
        venue = get_venue(event.venue_id)
        offsets = timeline_offsets(event.duration_min)
        junction_ids = [j.id for j in JUNCTIONS]
        n_j, n_t = len(junction_ids), len(offsets)

        # Build the full (junction x time) feature matrix in one shot.
        rows = np.empty((n_j * n_t, len(FEATURE_COLUMNS)), dtype=float)
        baseline = np.empty(n_j * n_t, dtype=float)
        k = 0
        for j in JUNCTIONS:
            for m in offsets:
                rows[k] = build_feature_row(event, j.id, m)
                hour = clock_hour(event.start_hour, m)
                baseline[k] = baseline_congestion(
                    j.base_volume, hour, event.is_weekend, event.rain
                )
                k += 1

        pred_c = np.clip(self.model_congestion.predict(rows), 0, 100)
        pred_d = np.clip(self.model_delay.predict(rows), 0, None)
        pred_c = pred_c.reshape(n_j, n_t)
        pred_d = pred_d.reshape(n_j, n_t)
        baseline = baseline.reshape(n_j, n_t)
        delta = np.clip(pred_c - baseline, 0, None)

        # --- Timeline (per time bucket) ---
        timeline = []
        for ti, m in enumerate(offsets):
            cong_col = pred_c[:, ti]
            delay_col = pred_d[:, ti]
            delta_col = delta[:, ti]
            affected_mask = delta_col >= AFFECTED_DELTA
            timeline.append(
                {
                    "minutes": int(m),
                    "label": _fmt_time(m),
                    "phase": phase_for(m, event.duration_min),
                    "clockHour": round(clock_hour(event.start_hour, m), 2),
                    "avgCongestion": round(float(cong_col.mean()), 1),
                    "maxCongestion": round(float(cong_col.max()), 1),
                    "totalDelay": round(float(delay_col[affected_mask].sum()), 1),
                    "junctionsAffected": int(affected_mask.sum()),
                    "congestion": {
                        jid: round(float(cong_col[ji]), 1)
                        for ji, jid in enumerate(junction_ids)
                    },
                    "delta": {
                        jid: round(float(delta_col[ji]), 1)
                        for ji, jid in enumerate(junction_ids)
                    },
                    "delay": {
                        jid: round(float(delay_col[ji]), 2)
                        for ji, jid in enumerate(junction_ids)
                    },
                }
            )

        # Peak = bucket with highest event-attributable load.
        peak_index = int(np.argmax([delta[:, ti].sum() for ti in range(n_t)]))

        # --- Per-junction peak (over the whole timeline) ---
        per_junction = []
        for ji, jid in enumerate(junction_ids):
            j = JUNCTIONS_BY_ID[jid]
            ti = int(np.argmax(delta[ji]))
            dist = haversine_km(j.lat, j.lng, venue.lat, venue.lng)
            per_junction.append(
                {
                    "id": jid,
                    "name": j.name,
                    "lat": j.lat,
                    "lng": j.lng,
                    "congestion": round(float(pred_c[ji, ti]), 1),
                    "peakCongestion": round(float(pred_c[ji].max()), 1),
                    "baseline": round(float(baseline[ji, ti]), 1),
                    "delta": round(float(delta[ji, ti]), 1),
                    "delay": round(float(pred_d[ji, ti]), 2),
                    "peakMinutes": int(offsets[ti]),
                    "distanceKm": round(dist, 2),
                    "centrality": build_graph().nodes[jid].get("centrality", 0.0),
                }
            )
        per_junction.sort(key=lambda x: x["delta"], reverse=True)

        affected = [p for p in per_junction if p["delta"] >= AFFECTED_DELTA]

        kpis = {
            "peakCongestion": round(float(pred_c.max()), 1),
            "peakTimeLabel": timeline[peak_index]["label"],
            "peakPhase": timeline[peak_index]["phase"],
            "junctionsAffected": len(affected),
            "worstJunction": per_junction[0]["name"] if per_junction else None,
            "impactRadiusKm": round(max((p["distanceKm"] for p in affected), default=0.0), 1),
            "avgDelayAtPeak": round(
                float(np.mean([p["delay"] for p in affected])) if affected else 0.0, 1
            ),
            "totalDelayAtPeak": round(float(timeline[peak_index]["totalDelay"]), 1),
        }

        return {
            "event": _event_summary(event, venue),
            "timeline": timeline,
            "peakIndex": peak_index,
            "perJunction": per_junction,
            "kpis": kpis,
        }


def _event_summary(event: Event, venue) -> dict:
    return {
        "venueId": event.venue_id,
        "venueName": venue.name,
        "venueLat": venue.lat,
        "venueLng": venue.lng,
        "venueCapacity": venue.capacity,
        "eventType": event.event_type,
        "attendance": event.attendance,
        "attendanceRatio": round(event.attendance / venue.capacity, 2),
        "startHour": event.start_hour,
        "dow": event.dow,
        "isWeekend": bool(event.is_weekend),
        "isHoliday": event.is_holiday,
        "rain": event.rain,
        "tempC": event.temp_c,
        "durationMin": event.duration_min,
    }
