"""
Visualization module.

Produces the matplotlib charts that go into the analytics report. Every function:
  - Takes a DataFrame produced by the analysis modules.
  - Returns a matplotlib Figure (not just `plt.show()`-ing) so the caller
    can decide whether to display, save, or both.
  - Uses a consistent style so charts feel like a single report, not seven
    different ones.

Style notes
-----------
We deliberately avoid the default matplotlib look (which is fine but
forgettable). The custom palette mirrors the QueueLess frontend:
  - paper-cream background
  - deep ink for axes and labels
  - terracotta for the main data series
  - graphite for secondary series
"""
from __future__ import annotations
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Style
# ---------------------------------------------------------------------------

PAPER    = "#F7F3EC"
INK      = "#171615"
GRAPHITE = "#5C5854"
ACCENT   = "#C84B26"
SUCCESS  = "#3F6F4F"
RULE     = "#E5DFD3"


def apply_style() -> None:
    """Idempotent - safe to call repeatedly. Sets global matplotlib defaults."""
    mpl.rcParams.update({
        "figure.facecolor": PAPER,
        "axes.facecolor": PAPER,
        "axes.edgecolor": INK,
        "axes.labelcolor": INK,
        "axes.titlecolor": INK,
        "axes.titleweight": "semibold",
        "axes.titlesize": 13,
        "axes.labelsize": 10,
        "axes.labelweight": "regular",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.color": RULE,
        "grid.linewidth": 0.7,
        "xtick.color": GRAPHITE,
        "ytick.color": GRAPHITE,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "font.family": "DejaVu Sans",  # widely available; nb falls back gracefully
        "font.size": 10,
        "savefig.facecolor": PAPER,
        "savefig.dpi": 130,
        "savefig.bbox": "tight",
    })


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------

def chart_peak_hours(hourly_volume_df: pd.DataFrame, *,
                     title: str = "Token volume by hour of day") -> plt.Figure:
    """
    Bar chart of token issuance volume per hour. Highlights the top-3 peak
    hours in accent color so they pop out at a glance.
    """
    apply_style()
    df = hourly_volume_df.copy()
    df = df.sort_values("hour_of_day")

    top_threshold = df["tokens_issued"].nlargest(3).min() if len(df) >= 3 else float("inf")
    colors = [ACCENT if v >= top_threshold and v > 0 else GRAPHITE
              for v in df["tokens_issued"]]

    fig, ax = plt.subplots(figsize=(10, 4.2))
    ax.bar(df["hour_of_day"], df["tokens_issued"], color=colors, width=0.7,
           edgecolor=INK, linewidth=0.5)
    ax.set_xticks(range(0, 24))
    ax.set_xlabel("Hour of day (24h)")
    ax.set_ylabel("Tokens issued")
    ax.set_title(title, loc="left")

    # Subtle annotation for the absolute peak.
    peak_row = df.loc[df["tokens_issued"].idxmax()] if len(df) else None
    if peak_row is not None and peak_row["tokens_issued"] > 0:
        ax.annotate(
            f"Peak: {int(peak_row['tokens_issued'])} tokens at {int(peak_row['hour_of_day']):02d}:00",
            xy=(peak_row["hour_of_day"], peak_row["tokens_issued"]),
            xytext=(8, 8), textcoords="offset points",
            fontsize=9, color=ACCENT, fontweight="medium",
        )

    fig.tight_layout()
    return fig


def chart_waiting_time_trend(by_date_df: pd.DataFrame, *,
                             title: str = "Mean waiting time across observation window") -> plt.Figure:
    """Line chart of daily mean waiting time over the dataset's date range."""
    apply_style()
    df = by_date_df.dropna(subset=["mean_wait_min"]).copy()

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["date"], df["mean_wait_min"], color=ACCENT, linewidth=2,
            marker="o", markerfacecolor=PAPER, markeredgecolor=ACCENT,
            markeredgewidth=1.5, markersize=6)
    ax.fill_between(df["date"], df["mean_wait_min"], alpha=0.08, color=ACCENT)
    ax.set_xlabel("Date")
    ax.set_ylabel("Mean wait (minutes)")
    ax.set_title(title, loc="left")
    fig.autofmt_xdate()
    fig.tight_layout()
    return fig


def chart_waiting_distribution(tokens: pd.DataFrame, *,
                               bins: int = 30,
                               title: str = "Distribution of waiting time (served tokens)") -> plt.Figure:
    """Histogram with median and 95th percentile guide lines."""
    apply_style()
    served = tokens[(tokens["final_status"] == "served") & (~tokens.get("is_outlier", False))]
    if len(served) == 0:
        fig, ax = plt.subplots()
        ax.text(0.5, 0.5, "No served tokens to plot.", ha="center", va="center")
        return fig

    waits = served["waiting_minutes"].dropna()
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.hist(waits, bins=bins, color=GRAPHITE, edgecolor=PAPER, linewidth=0.7, alpha=0.85)
    median = float(waits.median())
    p95 = float(waits.quantile(0.95))
    ax.axvline(median, color=ACCENT, linewidth=2, linestyle="-", label=f"Median: {median:.1f} min")
    ax.axvline(p95, color=INK, linewidth=1.2, linestyle="--", label=f"95th pct: {p95:.1f} min")
    ax.set_xlabel("Waiting time (minutes)")
    ax.set_ylabel("Number of tokens")
    ax.set_title(title, loc="left")
    ax.legend(frameon=False, loc="upper right")
    fig.tight_layout()
    return fig


def chart_queue_length_scatter(tokens: pd.DataFrame, *,
                               title: str = "Queue length at issue vs. waiting time") -> plt.Figure:
    """Scatter showing the relationship between line length and eventual wait."""
    apply_style()
    served = tokens[(tokens["final_status"] == "served") & (~tokens.get("is_outlier", False))].copy()
    if len(served) == 0:
        fig, ax = plt.subplots()
        ax.text(0.5, 0.5, "No served tokens to plot.", ha="center", va="center")
        return fig

    fig, ax = plt.subplots(figsize=(8.5, 5))
    ax.scatter(served["queue_length_at_issue"].fillna(0),
               served["waiting_minutes"],
               s=28, color=ACCENT, edgecolor=INK, linewidth=0.4, alpha=0.55)

    # Linear best-fit overlay - just for visual reference.
    x = served["queue_length_at_issue"].fillna(0).astype(float).values
    y = served["waiting_minutes"].astype(float).values
    if len(x) >= 2 and np.std(x) > 0:
        slope, intercept = np.polyfit(x, y, 1)
        xs = np.linspace(x.min(), x.max(), 100)
        ax.plot(xs, slope * xs + intercept, color=INK, linewidth=1.5,
                linestyle="--", label=f"linear fit: y = {slope:.2f}x + {intercept:.2f}")
        ax.legend(frameon=False, loc="upper left")

    ax.set_xlabel("Queue length when token was issued")
    ax.set_ylabel("Actual waiting time (minutes)")
    ax.set_title(title, loc="left")
    fig.tight_layout()
    return fig


def chart_weekday_heatmap(matrix_df: pd.DataFrame, *,
                          title: str = "Token volume by weekday × hour") -> plt.Figure:
    """
    Heatmap of (weekday x hour) volume. Reveals weekly patterns invisible
    in the simple hour-of-day bar chart.
    """
    apply_style()
    if matrix_df.empty:
        fig, ax = plt.subplots()
        ax.text(0.5, 0.5, "Not enough data for heatmap.", ha="center", va="center")
        return fig

    fig, ax = plt.subplots(figsize=(11, 4.2))
    cmap = mpl.colors.LinearSegmentedColormap.from_list(
        "queueless_heat", [PAPER, "#E8C7B7", ACCENT, "#7A2A14"]
    )
    im = ax.imshow(matrix_df.values, aspect="auto", cmap=cmap)
    ax.set_xticks(range(matrix_df.shape[1]))
    ax.set_xticklabels([str(c).zfill(2) for c in matrix_df.columns])
    ax.set_yticks(range(matrix_df.shape[0]))
    ax.set_yticklabels(matrix_df.index)
    ax.set_xlabel("Hour of day")
    ax.set_title(title, loc="left")

    cbar = fig.colorbar(im, ax=ax, fraction=0.025, pad=0.02)
    cbar.set_label("Tokens issued", color=GRAPHITE, fontsize=9)
    cbar.outline.set_visible(False)

    fig.tight_layout()
    return fig


def chart_predictor_comparison(backtest_df: pd.DataFrame,
                               linreg_metrics: dict | None = None, *,
                               title: str = "Predicted vs. actual waiting time") -> plt.Figure:
    """
    Diagnostic scatter: predicted vs. actual for the moving-average backtest,
    with the y=x reference line. If linear regression metrics are passed,
    annotate the chart with both MAEs for direct comparison.
    """
    apply_style()
    if backtest_df.empty:
        fig, ax = plt.subplots()
        ax.text(0.5, 0.5, "No backtest data.", ha="center", va="center")
        return fig

    fig, ax = plt.subplots(figsize=(7, 6.5))
    ax.scatter(backtest_df["predicted_wait_min"], backtest_df["waiting_minutes"],
               s=28, color=ACCENT, edgecolor=INK, linewidth=0.4, alpha=0.5,
               label="Moving-average prediction")

    lim = max(backtest_df["predicted_wait_min"].max(), backtest_df["waiting_minutes"].max()) * 1.1
    ax.plot([0, lim], [0, lim], color=INK, linewidth=1.2, linestyle="--",
            label="Perfect prediction (y = x)")
    ax.set_xlim(0, lim)
    ax.set_ylim(0, lim)
    ax.set_xlabel("Predicted wait (minutes)")
    ax.set_ylabel("Actual wait (minutes)")
    ax.set_title(title, loc="left")
    ax.legend(frameon=False, loc="upper left")

    mae_ma = float(backtest_df["abs_error_min"].mean())
    text_lines = [f"Moving-average MAE: {mae_ma:.2f} min"]
    if linreg_metrics:
        text_lines.append(f"Linear regression MAE: {linreg_metrics['mae_minutes']:.2f} min")
        text_lines.append(f"Linear regression R²: {linreg_metrics['r2']:.3f}")
    ax.text(0.98, 0.02, "\n".join(text_lines),
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=9, color=INK,
            bbox=dict(facecolor=PAPER, edgecolor=RULE, boxstyle="round,pad=0.5"))

    fig.tight_layout()
    return fig


# ---------------------------------------------------------------------------
# Save helper
# ---------------------------------------------------------------------------

def save_figure(fig: plt.Figure, path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(p)
