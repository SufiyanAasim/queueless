"""
Waiting time analysis.

Owner: Taha (Analysis & Prediction - DM Module 3).

Computes the foundational waiting-time metrics that every other analysis
builds on top of. Uses pandas groupby aggregations exclusively - no ML, no
heuristics, just clean descriptive statistics with proper handling of
missing values and outliers.

Outputs are ALL pandas objects (DataFrames or Series) so the caller decides
how to render them - print, plot, or export.
"""
from __future__ import annotations
import pandas as pd


# ---------------------------------------------------------------------------
# Helper - filter to served tokens only, optionally excluding outliers.
# Wait-time stats only make sense on tokens that actually got served.
# ---------------------------------------------------------------------------

def _served_only(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.DataFrame:
    df = tokens[tokens["final_status"] == "served"].copy()
    if exclude_outliers and "is_outlier" in df.columns:
        df = df[~df["is_outlier"]]
    return df


# ---------------------------------------------------------------------------
# Top-line summary
# ---------------------------------------------------------------------------

def overall_summary(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.Series:
    """
    Single Series summarizing waiting time across the entire dataset.
    Returns mean, median, std, p25, p75, p95, min, max, and the count
    of tokens included.
    """
    served = _served_only(tokens, exclude_outliers)
    if len(served) == 0:
        return pd.Series(dtype=float)
    w = served["waiting_minutes"]
    return pd.Series({
        "n_tokens":       int(len(served)),
        "mean_minutes":   float(w.mean()),
        "median_minutes": float(w.median()),
        "std_minutes":    float(w.std()),
        "p25_minutes":    float(w.quantile(0.25)),
        "p75_minutes":    float(w.quantile(0.75)),
        "p95_minutes":    float(w.quantile(0.95)),
        "min_minutes":    float(w.min()),
        "max_minutes":    float(w.max()),
    })


# ---------------------------------------------------------------------------
# Grouped views
# ---------------------------------------------------------------------------

def by_hour(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.DataFrame:
    """Mean and median waiting time grouped by hour-of-day. Index = hour 0..23."""
    served = _served_only(tokens, exclude_outliers)
    if len(served) == 0:
        return pd.DataFrame(columns=["mean_minutes", "median_minutes", "n_tokens"])
    grouped = served.groupby("hour_of_day")["waiting_minutes"]
    out = pd.DataFrame({
        "mean_minutes":   grouped.mean(),
        "median_minutes": grouped.median(),
        "n_tokens":       grouped.count(),
    })
    return out.sort_index()


def by_weekday(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.DataFrame:
    """Mean and median waiting time by day of week (Mon..Sun ordered)."""
    served = _served_only(tokens, exclude_outliers)
    if len(served) == 0:
        return pd.DataFrame()
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday",
                     "Friday", "Saturday", "Sunday"]
    grouped = served.groupby("weekday_name")["waiting_minutes"]
    out = pd.DataFrame({
        "mean_minutes":   grouped.mean(),
        "median_minutes": grouped.median(),
        "n_tokens":       grouped.count(),
    })
    out = out.reindex([d for d in weekday_order if d in out.index])
    return out


def by_service(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.DataFrame:
    """Waiting time and service time by service category."""
    served = _served_only(tokens, exclude_outliers)
    if len(served) == 0:
        return pd.DataFrame()
    grouped = served.groupby("service")
    return pd.DataFrame({
        "mean_wait_min":    grouped["waiting_minutes"].mean(),
        "median_wait_min":  grouped["waiting_minutes"].median(),
        "mean_service_min": grouped["service_minutes"].mean(),
        "n_tokens":         grouped["waiting_minutes"].count(),
    }).sort_values("n_tokens", ascending=False)


def by_date(tokens: pd.DataFrame, exclude_outliers: bool = True) -> pd.DataFrame:
    """
    Daily trend - one row per calendar date with mean wait, count, and
    served-share. Useful for spotting whether wait times are trending up
    or down across the observation window.
    """
    df = tokens.copy()
    df_served = _served_only(df, exclude_outliers)
    if len(df) == 0:
        return pd.DataFrame()

    daily_total = df.groupby("date").size().rename("tokens_issued")
    daily_served = df_served.groupby("date").agg(
        mean_wait_min=("waiting_minutes", "mean"),
        median_wait_min=("waiting_minutes", "median"),
        tokens_served=("waiting_minutes", "count"),
    )
    out = daily_total.to_frame().join(daily_served, how="left").reset_index()
    out["served_share"] = out["tokens_served"] / out["tokens_issued"]
    return out
