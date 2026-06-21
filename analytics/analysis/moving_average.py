"""
Moving average predictor.

The simplest possible wait-time estimator: take the rolling average of the
last N served tokens' waiting times, multiply by the current queue length,
and that's your prediction for the next user.

Why this is academically valuable
---------------------------------
- It's fully explainable - no model weights, no black box.
- It needs zero training - works on the first day a system is deployed.
- It's robust - one outlier wait time doesn't poison the prediction.
- It's a strong baseline that any ML model must beat to justify the
  added complexity.

Why it's practically useful
---------------------------
- The "average service time" parameter the backend uses for live ETA
  computation can be set FROM this predictor's output, closing the loop
  between the analytics system and the live system.
"""
from __future__ import annotations
import pandas as pd


# ---------------------------------------------------------------------------
# Rolling average over recent service times
# ---------------------------------------------------------------------------

def rolling_service_seconds(tokens: pd.DataFrame, window: int = 10) -> pd.Series:
    """
    Returns a per-token rolling average of service_seconds over the previous
    `window` SERVED tokens (in chronological order of served_at).
    Tokens with fewer than `window` predecessors get a partial window.
    """
    served = (tokens[tokens["final_status"] == "served"]
              .sort_values("served_at")
              .copy())
    if len(served) == 0:
        return pd.Series(dtype=float)
    served["rolling_service_seconds"] = (
        served["service_seconds"].rolling(window=window, min_periods=1).mean()
    )
    return served.set_index("token_id")["rolling_service_seconds"]


def latest_avg_service_seconds(tokens: pd.DataFrame, window: int = 10) -> float:
    """
    Single number: the rolling average of the most recent `window` served
    tokens. This is what you'd plug into the backend's
    AVG_SERVICE_TIME_SECONDS env var to keep the live ETA accurate.
    """
    series = rolling_service_seconds(tokens, window=window)
    if len(series) == 0:
        return float("nan")
    return float(series.iloc[-1])


# ---------------------------------------------------------------------------
# Wait-time prediction
# ---------------------------------------------------------------------------

def predict_wait_seconds(queue_length: int,
                         avg_service_seconds: float) -> float:
    """
    The headline prediction: a new user arriving to find `queue_length`
    people ahead can expect to wait approximately
    queue_length * avg_service_seconds.
    """
    if queue_length < 0:
        raise ValueError("queue_length must be >= 0")
    return float(queue_length) * float(avg_service_seconds)


def predict_wait_minutes(queue_length: int,
                         avg_service_seconds: float) -> float:
    return predict_wait_seconds(queue_length, avg_service_seconds) / 60.0


# ---------------------------------------------------------------------------
# Backtest - "what would we have predicted vs. what actually happened"
# ---------------------------------------------------------------------------

def backtest(tokens: pd.DataFrame, window: int = 10) -> pd.DataFrame:
    """
    For each served token, compute:
      - the predicted wait based on queue_length_at_issue and the rolling
        average available BEFORE that token's served_at (to avoid leakage),
      - the actual wait,
      - the absolute error in minutes.

    Returns a DataFrame with prediction, actual, error, and the cumulative
    Mean Absolute Error - the same MAE that the linear regression module
    reports, so the two can be compared apples-to-apples.
    """
    served = (tokens[tokens["final_status"] == "served"]
              .sort_values("served_at")
              .reset_index(drop=True)
              .copy())
    if len(served) == 0:
        return pd.DataFrame()

    # Lagged rolling average - .shift(1) ensures the window for token k uses
    # only tokens 0..k-1, preventing target leakage.
    served["rolling_service_sec"] = (
        served["service_seconds"]
              .rolling(window=window, min_periods=1)
              .mean()
              .shift(1)
    )
    # The first token has no history; fall back to the dataset mean.
    served["rolling_service_sec"] = served["rolling_service_sec"].fillna(
        served["service_seconds"].mean()
    )

    served["predicted_wait_min"] = (
        served["queue_length_at_issue"].fillna(0) *
        served["rolling_service_sec"] / 60.0
    )
    served["abs_error_min"] = (served["waiting_minutes"] - served["predicted_wait_min"]).abs()
    served["mae_so_far"] = served["abs_error_min"].expanding(min_periods=1).mean()

    return served[[
        "token_number", "issued_at", "queue_length_at_issue",
        "rolling_service_sec", "predicted_wait_min",
        "waiting_minutes", "abs_error_min", "mae_so_far",
    ]]


def overall_mae_minutes(tokens: pd.DataFrame, window: int = 10) -> float:
    """Single Mean Absolute Error number for the moving-average baseline."""
    bt = backtest(tokens, window=window)
    if len(bt) == 0:
        return float("nan")
    return float(bt["abs_error_min"].mean())
