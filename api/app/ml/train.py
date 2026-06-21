"""Train the event-traffic forecasting models.

Two gradient-boosted regressors (congestion index + delay) trained on the
grounded synthetic dataset, evaluated on a held-out set of *unseen events*.
Artifacts (models + metrics + a predicted-vs-actual sample) are written to
``app/artifacts/`` and loaded by the API at startup.

Run:  python -m app.ml.train   (from the api/ directory)
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

from app.ml.features import CATEGORICAL_FEATURES, FEATURE_COLUMNS
from app.ml.generate import generate_dataset

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"


def _make_model() -> HistGradientBoostingRegressor:
    cat_mask = [i in CATEGORICAL_FEATURES for i in range(len(FEATURE_COLUMNS))]
    return HistGradientBoostingRegressor(
        loss="squared_error",
        max_iter=400,
        learning_rate=0.06,
        max_depth=None,
        max_leaf_nodes=63,
        min_samples_leaf=40,
        l2_regularization=0.5,
        categorical_features=cat_mask,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=7,
    )


def train(n_events: int = 440, test_frac: float = 0.18, seed: int = 7) -> dict:
    t0 = time.time()
    print(f"[train] generating dataset ({n_events} events)...")
    df = generate_dataset(n_events=n_events, seed=seed)
    print(f"[train] dataset: {len(df):,} rows over {df['event_idx'].nunique()} events")

    # --- Split by EVENT so we measure generalisation to unseen events ---
    rng = np.random.default_rng(seed)
    event_ids = df["event_idx"].unique()
    rng.shuffle(event_ids)
    n_test = max(1, int(len(event_ids) * test_frac))
    test_ids = set(event_ids[:n_test].tolist())
    is_test = df["event_idx"].isin(test_ids)

    X = df[FEATURE_COLUMNS].to_numpy(dtype=float)
    X_train, X_test = X[~is_test], X[is_test]

    metrics: dict = {"targets": {}, "n_rows": int(len(df)),
                     "n_events": int(df["event_idx"].nunique()),
                     "n_test_events": int(len(test_ids)),
                     "features": FEATURE_COLUMNS}

    models = {}
    for target in ("congestion", "delay"):
        y = df[target].to_numpy(dtype=float)
        y_train, y_test = y[~is_test], y[is_test]
        print(f"[train] fitting model: {target} ...")
        model = _make_model()
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        mae = float(mean_absolute_error(y_test, pred))
        r2 = float(r2_score(y_test, pred))
        # Baseline = predict the global mean (so R2/MAE have context).
        base_mae = float(mean_absolute_error(y_test, np.full_like(y_test, y_train.mean())))
        models[target] = model
        metrics["targets"][target] = {
            "mae": round(mae, 3),
            "r2": round(r2, 4),
            "baseline_mae": round(base_mae, 3),
            "skill_vs_baseline_pct": round((1 - mae / base_mae) * 100, 1),
            "n_test_rows": int(len(y_test)),
        }
        print(f"[train]   {target}: MAE={mae:.3f}  R2={r2:.4f}  (baseline MAE={base_mae:.3f})")

    # --- Predicted-vs-actual scatter sample (congestion, held-out rows) ---
    y_cong = df["congestion"].to_numpy(dtype=float)[is_test]
    pred_cong = models["congestion"].predict(X_test)
    sidx = rng.choice(len(y_cong), size=min(240, len(y_cong)), replace=False)
    scatter = [
        {"actual": round(float(y_cong[i]), 1), "predicted": round(float(pred_cong[i]), 1)}
        for i in sidx
    ]

    metrics["trained_seconds"] = round(time.time() - t0, 1)
    metrics["scatter"] = scatter

    # --- Persist ---
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(models["congestion"], ARTIFACT_DIR / "model_congestion.joblib")
    joblib.dump(models["delay"], ARTIFACT_DIR / "model_delay.joblib")
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"[train] done in {metrics['trained_seconds']}s -> {ARTIFACT_DIR}")
    return metrics


if __name__ == "__main__":
    train()
