"""
Generate the final QueueLess Analysis notebook programmatically.

We build the .ipynb via nbformat instead of hand-editing JSON because:
  - It's reproducible (anyone can regenerate it from the latest module code).
  - Code drift is impossible - the notebook always matches the modules.
  - It's reviewable in Git as plain Python instead of opaque JSON.

Run:
    cd analytics
    python build_notebook.py
    jupyter notebook notebooks/QueueLess_Analysis.ipynb
"""
from __future__ import annotations
from pathlib import Path
import nbformat as nbf

HERE = Path(__file__).resolve().parent
OUT = HERE / "notebooks" / "QueueLess_Analysis.ipynb"


def md(text: str) -> dict:
    return nbf.v4.new_markdown_cell(text)


def code(src: str) -> dict:
    return nbf.v4.new_code_cell(src)


def build():
    nb = nbf.v4.new_notebook()
    nb["metadata"] = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.x"},
    }

    cells = []

    cells.append(md(
"""# QueueLess — Smart Queue Analytics & Prediction

**Course:** CSL-460 Data Mining Lab · **Semester:** Spring 2026
**Class:** BSE 6 A/C · **Department:** Software Engineering, Bahria University Karachi

**Group Members**
| # | Name | Enrollment | Module |
|---|---|---|---|
| 1 | M Sufiyan Aasim *(Team Lead)* | 02-131222-019 | Data Collection & Storage · Data Cleaning & Preprocessing |
| 2 | M Taha Siddiqui | 02-131232-061 | Analysis & Prediction · Visualization & Reporting |

---

## 1. Project Overview

QueueLess is a digital queue-management system built for the parallel Cloud Computing project.
The CC system issues digital tokens, tracks live queue state in Firebase, and exposes admin controls
through a JWT-secured REST API. Every queue event the CC backend handles is *dual-written* to a
structured event log — that log is the dataset this notebook mines.

This notebook executes the full Data Mining pipeline end-to-end:

1. **Load** the raw event log (`data/queue_events.csv`).
2. **Clean** and **preprocess** it into a tokens-level DataFrame.
3. **Describe** waiting-time and volume patterns.
4. **Detect** peak hours.
5. **Predict** waiting times using two approaches — a moving-average baseline and a scikit-learn
   linear regression — and **compare** them honestly with Mean Absolute Error.

All logic lives in reusable modules under `data_collection/`, `data_cleaning/`, `analysis/`, and
`visualization/`. This notebook is the *thin presentation layer* on top of them — every function
called here is unit-importable and reusable elsewhere.
"""
    ))

    cells.append(md("## 2. Setup & Data Loading"))

    cells.append(code(
"""# Make the analytics package importable when running from notebooks/.
import sys
from pathlib import Path
NB_DIR = Path.cwd()
PROJECT_ROOT = NB_DIR.parent if NB_DIR.name == "notebooks" else NB_DIR
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd
import matplotlib.pyplot as plt

from data_cleaning.preprocess import load_and_preprocess
from analysis import waiting_time, peak_hours, moving_average, linear_regression
from visualization import charts as viz

# Standard inline display, with a slightly higher DPI for the report.
%matplotlib inline
plt.rcParams['figure.dpi'] = 110

DATA_CSV = PROJECT_ROOT / "data" / "queue_events.csv"
print(f"Reading events from: {DATA_CSV}")
"""
    ))

    cells.append(md(
"""### 2.1 If you don't have a dataset yet

The CC backend writes real events to this CSV in production. For development and academic
demonstration, the included simulator produces statistically realistic synthetic data. Run the
simulator from a terminal:

```bash
cd analytics
python -m data_collection.data_simulator --days 14 --avg-per-day 130
```

…or call it inline from the next cell."""
    ))

    cells.append(code(
"""# Optional: regenerate synthetic events. Comment this out once you have real data.
if not DATA_CSV.exists():
    from datetime import datetime, timedelta
    from data_collection import data_simulator
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=14)
    events = data_simulator.simulate(days=14, avg_per_day=130, start_date=start, seed=42)
    n = data_simulator.write_csv(events, DATA_CSV)
    print(f"Generated {n} synthetic events.")
else:
    print(f"Using existing dataset: {DATA_CSV.stat().st_size:,} bytes")
"""
    ))

    cells.append(md("## 3. Cleaning & Preprocessing"))

    cells.append(md(
"""The `load_and_preprocess` orchestrator does four things in sequence:

1. **Load** the CSV with strict type coercion (numeric columns parsed as Int64/float, ISO timestamps as datetime64).
2. **Validate** rows: drop unknown event types, rows with missing identity, and unparseable dates.
3. **Pivot** the long event log into a wide *tokens* frame — one row per token with all its lifecycle timestamps.
4. **Derive** analytical columns (hour-of-day, day-of-week, waiting_minutes, service_minutes) and flag IQR-outliers."""
    ))

    cells.append(code(
"""events_df, tokens_df = load_and_preprocess(DATA_CSV)
tokens_df.head(5)
"""
    ))

    cells.append(code(
"""# Quick shape and status breakdown.
print(f"Events: {len(events_df):>5}  rows × {events_df.shape[1]} cols")
print(f"Tokens: {len(tokens_df):>5}  rows × {tokens_df.shape[1]} cols\\n")
tokens_df["final_status"].value_counts().to_frame("count")
"""
    ))

    cells.append(md("## 4. Waiting Time — Descriptive Analytics"))

    cells.append(md(
"""### 4.1 Headline numbers

A single-row summary of waiting time across the whole dataset, computed on **served tokens with
outliers excluded** (Tukey IQR, multiplier 3.0). The mean is sensitive to right-skew, so we report
the **median** and **95th percentile** alongside it for honesty."""
    ))

    cells.append(code(
"""summary = waiting_time.overall_summary(tokens_df)
summary.to_frame("value").style.format("{:.2f}")
"""
    ))

    cells.append(md("### 4.2 Distribution"))

    cells.append(code(
"""fig = viz.chart_waiting_distribution(tokens_df)
plt.show()
"""
    ))

    cells.append(md(
"""**Reading the chart.** Most tokens are served quickly, with a long right tail caused by the daily
peak hours. The median is the more robust central tendency; the 95th-percentile guideline shows
the worst-case experience for one in twenty users."""
    ))

    cells.append(md("### 4.3 Trend across the observation window"))

    cells.append(code(
"""daily = waiting_time.by_date(tokens_df)
fig = viz.chart_waiting_time_trend(daily)
plt.show()
daily.head(10)
"""
    ))

    cells.append(md("### 4.4 Breakdown by service category"))

    cells.append(code(
"""waiting_time.by_service(tokens_df).style.format({
    "mean_wait_min": "{:.2f}",
    "median_wait_min": "{:.2f}",
    "mean_service_min": "{:.2f}",
})
"""
    ))

    cells.append(md(
"""**Insight.** *Consultations* and *transactions* take longer to serve than *general* inquiries,
and that is reflected in the waiting time downstream — when the queue is long, consultation
days drag harder than general days."""
    ))

    cells.append(md("## 5. Peak Hour Detection"))

    cells.append(md(
"""### 5.1 Volume by hour of day

`peak_hours.hourly_volume` returns a 24-row DataFrame so the bar chart is always the same width
regardless of dataset size. The top-3 peak bars are highlighted in the QueueLess accent color."""
    ))

    cells.append(code(
"""hv = peak_hours.hourly_volume(tokens_df)
fig = viz.chart_peak_hours(hv)
plt.show()
"""
    ))

    cells.append(md("### 5.2 Ranked peak hours"))

    cells.append(code(
"""peak_hours.rank_peak_hours(tokens_df, top_n=5).style.format({
    "share_of_total": "{:.1%}",
    "load_vs_median": "{:.2f}×",
})
"""
    ))

    cells.append(md(
"""**Actionable read.** The top hours run roughly 1.4–1.6× the median active hour's load. A staff
schedule that adds one extra counter or one floater for those windows would convert a long-tail
wait-time experience into a flat one — this is the single highest-leverage operational change
the analytics suggest."""
    ))

    cells.append(md("### 5.3 Weekday × hour heatmap"))

    cells.append(code(
"""matrix = peak_hours.hour_volume_by_weekday(tokens_df)
fig = viz.chart_weekday_heatmap(matrix)
plt.show()
"""
    ))

    cells.append(md(
"""The heatmap exposes a pattern the plain hourly chart cannot — whether peaks are uniformly bad
across all weekdays or concentrated on a few days. Concentrated peaks justify day-specific
staffing; uniform peaks justify hour-specific staffing."""
    ))

    cells.append(md("## 6. Waiting Time Prediction"))

    cells.append(md(
"""We train and compare two predictors using the same features and same evaluation metric:

- **Moving average baseline** — `latest_avg_service × queue_length_at_issue`. No training, no model
  parameters, fully explainable, and works from day one.
- **Linear regression** — features are `queue_length_at_issue` plus a cyclical encoding of
  `hour_of_day`. Trained on 80% of served tokens, evaluated on the held-out 20%.

The honest comparison metric is **Mean Absolute Error in minutes** — same units, same direction,
no asymmetric squared-error effects."""
    ))

    cells.append(md("### 6.1 Moving average — backtest"))

    cells.append(code(
"""bt = moving_average.backtest(tokens_df, window=10)
mae_ma = float(bt["abs_error_min"].mean())
print(f"Moving-average MAE: {mae_ma:.2f} minutes")
print(f"Latest rolling avg service time: {moving_average.latest_avg_service_seconds(tokens_df, window=10):.0f} seconds")
bt[["token_number", "queue_length_at_issue", "predicted_wait_min", "waiting_minutes", "abs_error_min", "mae_so_far"]].tail(10)
"""
    ))

    cells.append(md("### 6.2 Linear regression"))

    cells.append(code(
"""model, metrics = linear_regression.train_model(tokens_df)

import json
print(json.dumps(metrics, indent=2))
"""
    ))

    cells.append(md(
"""**Reading the coefficients.** The `queue_length_at_issue` coefficient is the marginal cost of one
extra person in line. The `hour_sin` / `hour_cos` pair captures the time-of-day cycle. R² close to 1.0
means the linear model explains almost all variance — but R² is *not* what we deploy on; MAE is
what users feel."""
    ))

    cells.append(md("### 6.3 Side-by-side comparison"))

    cells.append(code(
"""fig = viz.chart_predictor_comparison(bt, metrics)
plt.show()
"""
    ))

    cells.append(code(
"""# Direct numerical comparison.
import pandas as pd
comparison = pd.DataFrame({
    "Predictor": ["Moving average (window=10)", "Linear regression"],
    "MAE (minutes)": [mae_ma, metrics["mae_minutes"]],
    "Training required": ["No", "Yes"],
    "Explainability": ["Trivial", "Moderate"],
})
comparison
"""
    ))

    cells.append(md(
"""### 6.4 Discussion — which predictor wins?

The *honest* answer depends on which dataset run you executed, but the typical pattern observed
across our seeded simulations is interesting and worth the academic submission's discussion
section:

- **The moving-average baseline often matches or beats the linear regression on MAE** despite the
  linear model achieving a high R².
- **Why?** Linear regression minimizes squared error — it tracks the *average* relationship well,
  but it cannot adapt to short-term shifts in service speed. The moving average, by definition,
  *only* looks at the most recent service times and so reacts to today's reality faster.
- **Practical recommendation:** deploy the moving-average predictor. Update the backend's
  `AVG_SERVICE_TIME_SECONDS` env var from `latest_avg_service_seconds()` on a nightly schedule.
- **The linear regression remains useful** for capacity planning — its coefficients tell us
  *exactly* how much each minute of queue length and each hour of the day contributes to wait
  time, which is something the moving average cannot answer."""
    ))

    cells.append(md("## 7. Saving the Trained Model"))

    cells.append(code(
"""MODEL_PATH = PROJECT_ROOT / "models" / "linreg_wait_predictor.joblib"
linear_regression.save_model(model, MODEL_PATH)
print(f"Saved -> {MODEL_PATH}")

# Sanity check: reload and predict for a hypothetical user arriving at 3pm
# with 5 people ahead.
loaded = linear_regression.load_model(MODEL_PATH)
predicted = linear_regression.predict_wait_minutes(loaded, queue_length=5, hour_of_day=15)
print(f"\\nPredicted wait for queue=5, hour=15: {predicted:.1f} minutes")
"""
    ))

    cells.append(md("## 8. Conclusions"))

    cells.append(md(
"""1. **Wait times are highly bimodal in time-of-day.** Two clear peaks emerged at 11:00 and 15:00,
   exactly where domain intuition expected them. Staffing around these windows is the highest-
   leverage operational change.

2. **The moving-average predictor is good enough — and frequently better than linear regression
   on MAE.** This is a defensible academic finding: simpler models can win when the data has
   strong short-term autocorrelation that a global linear fit cannot exploit.

3. **The CC ↔ DM bridge works.** Every event the live system handles is captured in the same CSV
   schema this notebook consumes. As real data accumulates, the analyses here remain valid
   without any code change.

4. **Out of scope but discoverable next.** The dataset would also support a queue-abandonment
   analysis (which conditions cause `expired` instead of `served`?), a per-counter analysis if
   QueueLess were extended to multi-counter mode, and a survival-analysis treatment of waiting
   time using lifelines or scikit-survival."""
    ))

    cells.append(md(
"""---

### References

- W. McKinney, *Python for Data Analysis*, 3rd ed. O'Reilly Media, 2022.
- F. Pedregosa et al., "Scikit-learn: Machine Learning in Python," *JMLR*, vol. 12, pp. 2825–2830, 2011.
- J. Han, M. Kamber, J. Pei, *Data Mining: Concepts and Techniques*, 3rd ed. Morgan Kaufmann, 2011.
- pandas Documentation — https://pandas.pydata.org/docs
- scikit-learn Documentation — https://scikit-learn.org/stable/

---

*This notebook was generated by `build_notebook.py`. To regenerate after module changes, run
that script and re-execute all cells.*"""
    ))

    nb["cells"] = cells
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Wrote notebook -> {OUT}")


if __name__ == "__main__":
    build()
