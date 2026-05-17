"""
Peak hour detection.

Owner: Taha (Analysis & Prediction - DM Module 3).

Identifies the hours of the day with the highest token-issuance volume.
This is the single most actionable insight an admin can get - it tells them
exactly when to schedule extra staff.

Approach: pandas groupby on hour_of_day with size() (count of tokens
issued), then a ranking. We also compute a "load index" - load relative to
the dataset's median hour - which is more intuitive for non-technical
stakeholders ("hour 11 is 2.4x busier than the median hour").
"""
from __future__ import annotations
import pandas as pd


def hourly_volume(tokens: pd.DataFrame) -> pd.DataFrame:
    """
    Count of tokens ISSUED per hour of day (0..23). Includes hours with
    zero activity so the resulting frame is always 24 rows - this keeps
    bar charts visually consistent across datasets.
    """
    if len(tokens) == 0:
        return pd.DataFrame({"hour_of_day": range(24), "tokens_issued": 0})

    counts = tokens.groupby("hour_of_day").size()
    full = pd.Series(0, index=range(24), name="tokens_issued")
    full.update(counts)
    out = full.to_frame().reset_index().rename(columns={"index": "hour_of_day"})
    out["hour_of_day"] = out["hour_of_day"].astype(int)
    return out


def rank_peak_hours(tokens: pd.DataFrame, top_n: int = 5) -> pd.DataFrame:
    """
    Returns the top_n hours ranked by token volume, with each hour's share of
    total daily volume and its load relative to the median active hour.
    """
    volume = hourly_volume(tokens)
    total = volume["tokens_issued"].sum() or 1  # avoid div-by-zero
    active = volume[volume["tokens_issued"] > 0]
    median_active = active["tokens_issued"].median() if len(active) else 1

    volume = volume.assign(
        share_of_total=volume["tokens_issued"] / total,
        load_vs_median=volume["tokens_issued"] / median_active,
    )
    return (volume.sort_values("tokens_issued", ascending=False)
                  .head(top_n)
                  .reset_index(drop=True))


def hour_volume_by_weekday(tokens: pd.DataFrame) -> pd.DataFrame:
    """
    24x7 matrix of token volume by (weekday_name x hour_of_day).
    Useful for a heatmap visualization that exposes weekly patterns
    invisible in the simple hour-of-day view.
    """
    if len(tokens) == 0:
        return pd.DataFrame()
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday",
                     "Friday", "Saturday", "Sunday"]
    matrix = (tokens.groupby(["weekday_name", "hour_of_day"])
                    .size()
                    .unstack(fill_value=0))
    matrix = matrix.reindex([d for d in weekday_order if d in matrix.index])
    # Ensure all 24 hour columns exist.
    for h in range(24):
        if h not in matrix.columns:
            matrix[h] = 0
    matrix = matrix[sorted(matrix.columns)]
    return matrix


def queue_length_distribution(tokens: pd.DataFrame) -> pd.Series:
    """
    Distribution of queue_length_at_issue. Tells us "how long is the line
    when most tokens are taken" - a different lens from raw arrival count.
    """
    if "queue_length_at_issue" not in tokens.columns:
        return pd.Series(dtype=int)
    return tokens["queue_length_at_issue"].dropna().astype(int).value_counts().sort_index()
