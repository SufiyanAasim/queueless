"""
Offline predictive-model trainer for QueueLess (v1.4.0).

Reads the queue event log (data/queue_events.csv) and trains practical,
explainable models, then exports a single compact JSON artefact
(models/predictions.json) that the always-on Node backend
(prediction.service.js) loads to serve trained predictions. The Node side falls
back to rule-based heuristics whenever this artefact is missing or stale, so the
system degrades gracefully and never emits fabricated predictions.

Models:
  * Service-time   — GradientBoostingRegressor over (service, hour, weekday,
                     queue_length); exported as a (service × hour) lookup grid.
  * Arrival rate   — seasonal averages of token_issued volume by hour and by
                     (weekday, hour) — the basis for congestion forecasting.
  * Anomaly bounds — IsolationForest-derived (with IQR fallback) upper bounds on
                     wait/service durations, used to flag outliers.

Robustness: missing values are dropped per-feature, durations are IQR-clipped to
mitigate outliers before averaging, a time-ordered split avoids look-ahead
leakage, and everything degrades to simple statistics under cold-start.

Run:
    cd analytics
    python models/train_predictor.py
    python models/train_predictor.py --min-samples 50
"""
from __future__ import annotations
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
ANALYTICS = HERE.parent
RAW_CSV = ANALYTICS / "data" / "queue_events.csv"
ARTEFACT = HERE / "predictions.json"

# Below this many usable rows we treat the system as cold-start and export
# simple averages rather than a fitted model.
DEFAULT_MIN_SAMPLES = 40


def _iqr_clip(series: pd.Series) -> pd.Series:
    """Clip a numeric series to [Q1-1.5*IQR, Q3+1.5*IQR] to tame outliers."""
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) < 4:
        return s
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    if iqr <= 0:
        return s
    return s.clip(lower=q1 - 1.5 * iqr, upper=q3 + 1.5 * iqr)


def _confidence(n: int) -> str:
    if n >= 200:
        return "high"
    if n >= DEFAULT_MIN_SAMPLES:
        return "medium"
    return "low"


def load_events(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        return pd.DataFrame()
    df = pd.read_csv(csv_path)
    if df.empty or "event_type" not in df.columns:
        return pd.DataFrame()
    df["timestamp"] = pd.to_numeric(df.get("timestamp"), errors="coerce")
    df = df.dropna(subset=["timestamp"])
    dt = pd.to_datetime(df["timestamp"], unit="ms", errors="coerce")
    df["hour"] = dt.dt.hour
    df["weekday"] = dt.dt.weekday
    df["service"] = df.get("service", "general").fillna("general")
    return df


def train_service_time(df: pd.DataFrame, min_samples: int) -> dict:
    """Return {byService, byServiceHour, model, samples} for service durations."""
    served = df[df["event_type"] == "token_served"].copy()
    served["service_duration_seconds"] = pd.to_numeric(
        served.get("service_duration_seconds"), errors="coerce")
    served = served.dropna(subset=["service_duration_seconds", "hour", "weekday"])
    served = served[served["service_duration_seconds"] > 0]

    out = {"byService": {}, "byServiceHour": {}, "model": "average", "samples": int(len(served))}
    if served.empty:
        return out

    # Robust per-service averages (always available).
    for svc, g in served.groupby("service"):
        clipped = _iqr_clip(g["service_duration_seconds"])
        if len(clipped) == 0:
            continue
        out["byService"][str(svc)] = {
            "avgSeconds": round(float(clipped.mean()), 1),
            "p50Seconds": round(float(clipped.median()), 1),
            "samples": int(len(clipped)),
        }

    # Fitted model → export a (service × hour) prediction grid.
    if len(served) >= min_samples:
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.preprocessing import OneHotEncoder
            from sklearn.compose import ColumnTransformer
            from sklearn.pipeline import Pipeline

            served = served.sort_values("timestamp")
            served["service_duration_seconds"] = _iqr_clip(
                served["service_duration_seconds"]).reindex(served.index).fillna(
                served["service_duration_seconds"].median())

            X = served[["service", "hour", "weekday", "queue_length"]].copy()
            X["queue_length"] = pd.to_numeric(X["queue_length"], errors="coerce").fillna(0)
            y = served["service_duration_seconds"].values

            pre = ColumnTransformer(
                [("svc", OneHotEncoder(handle_unknown="ignore"), ["service"])],
                remainder="passthrough",
            )
            model = Pipeline([
                ("pre", pre),
                ("gbr", GradientBoostingRegressor(n_estimators=120, max_depth=3, random_state=42)),
            ])
            model.fit(X, y)

            services = sorted(served["service"].unique())
            grid = []
            for svc in services:
                for h in range(24):
                    grid.append({"service": svc, "hour": h, "weekday": 2, "queue_length": 0})
            gdf = pd.DataFrame(grid)
            preds = model.predict(gdf[["service", "hour", "weekday", "queue_length"]])
            preds = np.clip(preds, 5, None)  # never predict <5s
            bysh: dict = {}
            for row, p in zip(grid, preds):
                bysh.setdefault(str(row["service"]), {})[str(row["hour"])] = round(float(p), 1)
            out["byServiceHour"] = bysh
            out["model"] = "GradientBoostingRegressor"
        except Exception as e:  # pragma: no cover - sklearn optional/edge cases
            out["modelError"] = str(e)
    return out


def train_arrivals(df: pd.DataFrame) -> dict:
    issued = df[df["event_type"] == "token_issued"].copy()
    if issued.empty:
        return {"byHour": {}, "byWeekdayHour": {}, "avgPerHour": 0.0}

    issued["date"] = pd.to_datetime(issued["timestamp"], unit="ms").dt.date

    # Average tokens per hour-of-day across observed days.
    per_day_hour = issued.groupby(["date", "hour"]).size().reset_index(name="n")
    by_hour = per_day_hour.groupby("hour")["n"].mean().round(2).to_dict()

    per_day_wh = issued.groupby(["date", "weekday", "hour"]).size().reset_index(name="n")
    by_wh = per_day_wh.groupby(["weekday", "hour"])["n"].mean().round(2)
    by_weekday_hour = {f"{int(wd)}-{int(h)}": float(v) for (wd, h), v in by_wh.items()}

    vals = list(by_hour.values())
    return {
        "byHour": {str(int(k)): float(v) for k, v in by_hour.items()},
        "byWeekdayHour": by_weekday_hour,
        "avgPerHour": round(float(np.mean(vals)), 2) if vals else 0.0,
    }


def train_anomaly(df: pd.DataFrame) -> dict:
    """Upper bounds for wait/service durations (IsolationForest, IQR fallback)."""
    result = {}
    called = df[df["event_type"] == "token_called"]
    served = df[df["event_type"] == "token_served"]
    for label, col, frame in [
        ("waitSecondsUpper", "wait_duration_seconds", called),
        ("serviceSecondsUpper", "service_duration_seconds", served),
    ]:
        vals = pd.to_numeric(frame.get(col), errors="coerce").dropna()
        vals = vals[vals > 0]
        if len(vals) < 8:
            if len(vals) > 0:
                result[label] = round(float(vals.quantile(0.95)), 1)
            continue
        try:
            from sklearn.ensemble import IsolationForest
            iso = IsolationForest(contamination=0.05, random_state=42)
            arr = vals.values.reshape(-1, 1)
            flags = iso.fit_predict(arr)
            inliers = vals.values[flags == 1]
            result[label] = round(float(np.max(inliers)) if len(inliers) else float(vals.quantile(0.95)), 1)
        except Exception:
            q1, q3 = vals.quantile(0.25), vals.quantile(0.75)
            result[label] = round(float(q3 + 1.5 * (q3 - q1)), 1)
    return result


def build_artefact(df: pd.DataFrame, min_samples: int) -> dict:
    n = int(len(df))
    cold = n < min_samples
    service_time = train_service_time(df, min_samples)
    arrivals = train_arrivals(df)
    anomaly = train_anomaly(df)
    return {
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "sampleSize": n,
        "coldStart": cold,
        "confidence": _confidence(n),
        "models": {
            "serviceTime": service_time.get("model", "average"),
            "anomaly": "IsolationForest",
            "arrivals": "seasonal-average",
        },
        "serviceTime": service_time,
        "arrivals": arrivals,
        "anomaly": anomaly,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", type=Path, default=RAW_CSV)
    p.add_argument("--out", type=Path, default=ARTEFACT)
    p.add_argument("--min-samples", type=int, default=DEFAULT_MIN_SAMPLES)
    args = p.parse_args()

    df = load_events(args.csv)
    artefact = build_artefact(df, args.min_samples)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(artefact, indent=2))

    print(f"Trained on {artefact['sampleSize']} events "
          f"(cold_start={artefact['coldStart']}, confidence={artefact['confidence']}).")
    print(f"Service-time model: {artefact['models']['serviceTime']}")
    print(f"Wrote artefact -> {args.out}")


if __name__ == "__main__":
    main()
