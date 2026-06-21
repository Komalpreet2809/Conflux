"""Conflux API — Predictive Event Traffic Command Center for Bengaluru.

FastAPI service exposing the forecasting model, recommendation engine, the road
network, venues, and the post-event learning (predicted-vs-actual) endpoints.
"""

from __future__ import annotations

import json
import zlib
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.data.graph import graph_to_dict
from app.data.venues import VENUES, get_venue
from app.ml.features import EVENT_TYPES, WEATHER_LABELS
from app.ml.forecast import Forecaster
from app.ml.generate import HISTORICAL_EVENTS, simulate_actuals
from app.ml.optimize import build_plan
from app.schemas import SimulateRequest

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"

_HIST_BY_ID = {h["id"]: h for h in HISTORICAL_EVENTS}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the models so the first /simulate call is snappy during the demo.
    try:
        Forecaster.get()
    except FileNotFoundError:
        # Model not trained yet; endpoints will surface a clear 503.
        pass
    yield


app = FastAPI(
    title="Conflux API",
    version="1.0.0",
    description="Predictive event-traffic forecasting + deployment planning for Bengaluru.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _forecaster() -> Forecaster:
    try:
        return Forecaster.get()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


# --- Meta ------------------------------------------------------------------

@app.get("/")
def root():
    return {"service": "Conflux API", "status": "ok", "docs": "/docs"}


@app.get("/health")
def health():
    trained = (ARTIFACT_DIR / "model_congestion.joblib").exists()
    return {"status": "ok", "modelTrained": trained}


@app.get("/api/venues")
def venues():
    return [
        {**v.to_dict(), "typicalEvents": list(v.typical_events)}
        for v in VENUES
    ]


@app.get("/api/event-types")
def event_types():
    return [
        {"key": et.key, "label": et.label}
        for et in EVENT_TYPES.values()
    ]


@app.get("/api/weather-options")
def weather_options():
    return [{"value": k, "label": v} for k, v in WEATHER_LABELS.items()]


@app.get("/api/graph")
def graph():
    return graph_to_dict()


@app.get("/api/metrics")
def metrics():
    path = ARTIFACT_DIR / "metrics.json"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Model not trained. Run python -m app.ml.train")
    return json.loads(path.read_text())


# --- Core: simulate a scenario ---------------------------------------------

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    f = _forecaster()
    event = req.to_event()
    forecast = f.forecast(event)
    plan = build_plan(forecast, manpower_budget=req.manpowerBudget)
    return {"forecast": forecast, "plan": plan}


# --- Historical events + post-event learning -------------------------------

@app.get("/api/events")
def events():
    out = []
    for h in HISTORICAL_EVENTS:
        e = h["event"]
        venue = get_venue(e.venue_id)
        out.append(
            {
                "id": h["id"],
                "name": h["name"],
                "date": h["date"],
                "venueId": e.venue_id,
                "venueName": venue.name,
                "eventType": e.event_type,
                "eventTypeLabel": EVENT_TYPES[e.event_type].label,
                "attendance": e.attendance,
                "startHour": e.start_hour,
                "durationMin": e.duration_min,
                "rain": e.rain,
            }
        )
    return out


@app.get("/api/events/{event_id}/replay")
def replay(event_id: str):
    """Predicted-vs-actual for a historical event (post-event learning loop)."""
    if event_id not in _HIST_BY_ID:
        raise HTTPException(status_code=404, detail=f"Unknown event '{event_id}'")
    f = _forecaster()
    h = _HIST_BY_ID[event_id]
    event = h["event"]

    forecast = f.forecast(event)
    plan = build_plan(forecast)

    # Simulated 'observed' peaks. crc32 gives a STABLE seed across processes
    # (Python's hash() is per-process randomised) so the demo is reproducible.
    seed = zlib.crc32(event_id.encode())
    actuals = simulate_actuals(event, seed=seed)

    comparison = []
    errs = []
    for p in forecast["perJunction"]:
        act = actuals.get(p["id"])
        if not act:
            continue
        pred_c = p["peakCongestion"]
        act_c = act["congestion"]
        errs.append(abs(pred_c - act_c))
        comparison.append(
            {
                "id": p["id"],
                "name": p["name"],
                "predicted": pred_c,
                "actual": act_c,
                "error": round(pred_c - act_c, 1),
                "delta": p["delta"],
            }
        )

    comparison.sort(key=lambda x: x["actual"], reverse=True)
    errs_arr = np.array(errs) if errs else np.array([0.0])
    accuracy = {
        "mae": round(float(errs_arr.mean()), 2),
        "rmse": round(float(np.sqrt((errs_arr ** 2).mean())), 2),
        "within5pts": round(float((errs_arr <= 5).mean()) * 100, 1),
        "within10pts": round(float((errs_arr <= 10).mean()) * 100, 1),
        "nJunctions": len(comparison),
    }

    return {
        "meta": {"id": h["id"], "name": h["name"], "date": h["date"]},
        "forecast": forecast,
        "plan": plan,
        "comparison": comparison,
        "accuracy": accuracy,
    }
