"""
Data cleaning and preprocessing.

Owner: Sufiyan (Data Cleaning & Preprocessing - DM Module 2).

The raw events CSV is in *long format* - one row per state transition
(token_issued, token_called, token_served, etc.). For analysis it's far
easier to work in *wide format* - one row per token with all its lifecycle
timestamps in one place.

This module:
  1. Loads the raw CSV with strict type coercion.
  2. Detects and handles missing values, malformed rows, and outliers.
  3. Pivots events into a tokens-level DataFrame.
  4. Derives analytical columns: hour_of_day, day_of_week, weekday_name,
     waiting_minutes, service_minutes, etc.
  5. Returns BOTH the cleaned events frame and the tokens frame.

Usage:
    from data_cleaning.preprocess import load_and_preprocess
    events, tokens = load_and_preprocess('data/queue_events.csv')
"""
from __future__ import annotations
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

EVENT_TYPES = {
    "token_issued", "token_called", "token_served", "token_expired",
    "queue_paused", "queue_resumed", "queue_reset",
}
LIFECYCLE_EVENTS = {"token_issued", "token_called", "token_served", "token_expired"}

EXPECTED_COLUMNS = [
    "event_type", "token_id", "token_number", "service",
    "timestamp", "iso_timestamp", "queue_length",
    "wait_duration_seconds", "service_duration_seconds",
]


# ---------------------------------------------------------------------------
# Load & coerce
# ---------------------------------------------------------------------------

def load_events(csv_path: str | Path) -> pd.DataFrame:
    """
    Load the raw event log with strict type coercion. Missing files raise
    FileNotFoundError so callers fail loud, not silent.
    """
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Events CSV not found at {path}. "
            f"Run the simulator first: "
            f"`python -m data_collection.data_simulator`"
        )
    df = pd.read_csv(path)

    missing = set(EXPECTED_COLUMNS) - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing expected columns: {missing}")

    # Type coercion - pandas infers loosely from CSV; we want strict types.
    df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce").astype("Int64")
    df["token_number"] = pd.to_numeric(df["token_number"], errors="coerce").astype("Int64")
    df["queue_length"] = pd.to_numeric(df["queue_length"], errors="coerce").astype("Int64")
    df["wait_duration_seconds"] = pd.to_numeric(df["wait_duration_seconds"], errors="coerce")
    df["service_duration_seconds"] = pd.to_numeric(df["service_duration_seconds"], errors="coerce")
    df["datetime"] = pd.to_datetime(df["iso_timestamp"], errors="coerce")

    return df


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

def clean_events(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Remove rows that are unusable. Returns the cleaned frame and a report
    dict so callers can log what was dropped.

    Drop conditions:
      - event_type not in our known vocabulary
      - lifecycle events missing token_id, token_number, or timestamp
      - parsed datetime is null (malformed iso_timestamp)
    """
    n_before = len(df)
    report = {"rows_in": n_before}

    # Unknown event types
    bad_type_mask = ~df["event_type"].isin(EVENT_TYPES)
    report["bad_event_type"] = int(bad_type_mask.sum())
    df = df[~bad_type_mask].copy()

    # Lifecycle rows must have identity + time
    is_lifecycle = df["event_type"].isin(LIFECYCLE_EVENTS)
    incomplete = is_lifecycle & (
        df["token_id"].isna() | df["token_number"].isna() | df["timestamp"].isna()
    )
    report["lifecycle_missing_identity"] = int(incomplete.sum())
    df = df[~incomplete].copy()

    bad_dt = df["datetime"].isna()
    report["unparseable_datetime"] = int(bad_dt.sum())
    df = df[~bad_dt].copy()

    df = df.sort_values("datetime").reset_index(drop=True)
    report["rows_out"] = len(df)
    report["rows_dropped"] = n_before - len(df)
    return df, report


# ---------------------------------------------------------------------------
# Pivot to tokens-level frame
# ---------------------------------------------------------------------------

def build_tokens_frame(events: pd.DataFrame) -> pd.DataFrame:
    """
    Reshape the long events frame into a per-token wide frame:
        token_id, token_number, service,
        issued_at, called_at, served_at, expired_at,
        queue_length_at_issue, wait_seconds, service_seconds, final_status

    Tokens that never reached terminal state (still waiting, still called)
    are kept with NaT in the relevant columns.
    """
    lifecycle = events[events["event_type"].isin(LIFECYCLE_EVENTS)].copy()

    # Pivot timestamps by event_type.
    pivot = lifecycle.pivot_table(
        index=["token_id", "token_number", "service"],
        columns="event_type",
        values="datetime",
        aggfunc="first",
    ).reset_index()

    # Pivot may not produce all columns if the dataset lacks some events.
    for col in ("token_issued", "token_called", "token_served", "token_expired"):
        if col not in pivot.columns:
            pivot[col] = pd.NaT

    pivot = pivot.rename(columns={
        "token_issued":  "issued_at",
        "token_called":  "called_at",
        "token_served":  "served_at",
        "token_expired": "expired_at",
    })

    # Pull queue_length at issue time and service_duration / wait_duration
    # from the lifecycle frame.
    issue_meta = (lifecycle[lifecycle["event_type"] == "token_issued"]
                  [["token_id", "queue_length"]]
                  .rename(columns={"queue_length": "queue_length_at_issue"}))

    call_meta = (lifecycle[lifecycle["event_type"] == "token_called"]
                 [["token_id", "wait_duration_seconds"]])

    serve_meta = (lifecycle[lifecycle["event_type"] == "token_served"]
                  [["token_id", "service_duration_seconds"]])

    pivot = (pivot
             .merge(issue_meta, on="token_id", how="left")
             .merge(call_meta,  on="token_id", how="left")
             .merge(serve_meta, on="token_id", how="left"))

    # Final status: terminal column wins (served > expired > called > issued).
    def status_for(row):
        if pd.notna(row["served_at"]):  return "served"
        if pd.notna(row["expired_at"]): return "expired"
        if pd.notna(row["called_at"]):  return "called"
        if pd.notna(row["issued_at"]):  return "waiting"
        return "unknown"
    pivot["final_status"] = pivot.apply(status_for, axis=1)

    return pivot


# ---------------------------------------------------------------------------
# Derived analytical columns
# ---------------------------------------------------------------------------

def add_derived_columns(tokens: pd.DataFrame) -> pd.DataFrame:
    """
    Adds: hour_of_day, day_of_week (0=Mon), weekday_name, date,
          waiting_minutes, service_minutes, total_minutes_in_system.

    These are the features used by all downstream analyses and the
    optional linear regression predictor.
    """
    df = tokens.copy()

    df["hour_of_day"] = df["issued_at"].dt.hour.astype("Int64")
    df["day_of_week"] = df["issued_at"].dt.dayofweek.astype("Int64")
    df["weekday_name"] = df["issued_at"].dt.day_name()
    df["date"] = df["issued_at"].dt.date

    # Waiting time: prefer the recorded value if present, otherwise compute.
    computed_wait = (df["called_at"] - df["issued_at"]).dt.total_seconds()
    df["waiting_seconds"] = df["wait_duration_seconds"].fillna(computed_wait)
    df["waiting_minutes"] = df["waiting_seconds"] / 60.0

    computed_svc = (df["served_at"] - df["called_at"]).dt.total_seconds()
    df["service_seconds"] = df["service_duration_seconds"].fillna(computed_svc)
    df["service_minutes"] = df["service_seconds"] / 60.0

    df["total_seconds_in_system"] = (df["served_at"] - df["issued_at"]).dt.total_seconds()
    df["total_minutes_in_system"] = df["total_seconds_in_system"] / 60.0

    return df


# ---------------------------------------------------------------------------
# Outlier handling
# ---------------------------------------------------------------------------

def flag_outliers(tokens: pd.DataFrame, iqr_multiplier: float = 3.0) -> pd.DataFrame:
    """
    Add boolean `is_outlier` column using Tukey's IQR rule on waiting_minutes
    among SERVED tokens. We use 3x IQR (not the textbook 1.5x) because queue
    waits are naturally right-skewed and 1.5x flags too many legitimate values.

    We do NOT remove outliers automatically - the caller decides whether to
    filter them. Some analyses (peak hour detection) actually want to see
    outliers; others (mean wait time) should exclude them.
    """
    df = tokens.copy()
    df["is_outlier"] = False
    served = df[df["final_status"] == "served"]
    if len(served) >= 8:
        q1, q3 = served["waiting_minutes"].quantile([0.25, 0.75])
        iqr = q3 - q1
        upper = q3 + iqr_multiplier * iqr
        df.loc[df["waiting_minutes"] > upper, "is_outlier"] = True
    return df


# ---------------------------------------------------------------------------
# Top-level orchestrator
# ---------------------------------------------------------------------------

def load_and_preprocess(csv_path: str | Path,
                        verbose: bool = True) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    End-to-end: raw CSV in, (events, tokens) out. The two frames represent
    the same data at different grains:
      - events: one row per state transition  (good for time-series view)
      - tokens: one row per token             (good for per-user analytics)
    """
    raw = load_events(csv_path)
    cleaned, report = clean_events(raw)
    tokens = build_tokens_frame(cleaned)
    tokens = add_derived_columns(tokens)
    tokens = flag_outliers(tokens)

    if verbose:
        print(f"[preprocess] Loaded {report['rows_in']} raw rows.")
        if report["rows_dropped"]:
            print(f"[preprocess] Dropped {report['rows_dropped']} rows: "
                  f"unknown_event_type={report['bad_event_type']}, "
                  f"missing_identity={report['lifecycle_missing_identity']}, "
                  f"unparseable_datetime={report['unparseable_datetime']}.")
        print(f"[preprocess] Built tokens frame: {len(tokens)} tokens "
              f"({(tokens['final_status'] == 'served').sum()} served, "
              f"{(tokens['final_status'] == 'expired').sum()} expired, "
              f"{tokens['is_outlier'].sum()} outliers).")

    return cleaned, tokens


def export_processed(tokens: pd.DataFrame, out_path: str | Path) -> None:
    """Write the tokens frame to CSV for downstream consumers."""
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tokens.to_csv(p, index=False)
