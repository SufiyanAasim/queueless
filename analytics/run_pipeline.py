"""
End-to-end pipeline runner.

Executes the full DM workflow in one shot:
  1. Generate synthetic events (skipped if --skip-simulate and CSV exists).
  2. Load + clean + preprocess the events into a tokens frame.
  3. Compute analytics summaries.
  4. Train the linear regression predictor.
  5. Generate all charts as PNGs.

This script is what you run to regenerate the entire `data/` and chart
output for the academic submission. The Jupyter notebook reuses the same
modules, so anything verified here is verified for the notebook.

Run:
    cd analytics
    python run_pipeline.py
    python run_pipeline.py --days 21 --avg-per-day 100
    python run_pipeline.py --skip-simulate    # use existing CSV
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

# Make the analytics package importable when running as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from data_collection import data_simulator
from data_cleaning.preprocess import load_and_preprocess, export_processed
from analysis import waiting_time, peak_hours, moving_average, linear_regression
from visualization import charts as viz


HERE = Path(__file__).resolve().parent
RAW_CSV = HERE / "data" / "queue_events.csv"
PROCESSED_CSV = HERE / "data" / "tokens_processed.csv"
CHARTS_DIR = HERE / "data" / "charts"
MODEL_PATH = HERE / "models" / "linreg_wait_predictor.joblib"


def _section(title: str) -> None:
    bar = "=" * 70
    print(f"\n{bar}\n  {title}\n{bar}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=14)
    p.add_argument("--avg-per-day", type=int, default=130)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--skip-simulate", action="store_true",
                   help="Reuse the existing data/queue_events.csv if present.")
    p.add_argument("--skip-charts", action="store_true",
                   help="Skip PNG generation (faster CI smoke test).")
    args = p.parse_args()

    # 1. Simulate
    _section("Step 1: Generate synthetic events")
    if args.skip_simulate and RAW_CSV.exists():
        print(f"Skipping simulation; using existing {RAW_CSV}")
    else:
        from datetime import datetime, timedelta
        start = (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                 - timedelta(days=args.days))
        events = data_simulator.simulate(args.days, args.avg_per_day, start, args.seed)
        n = data_simulator.write_csv(events, RAW_CSV, append=False)
        print(f"Wrote {n} events -> {RAW_CSV}")

    # 2. Preprocess
    _section("Step 2: Clean and preprocess")
    events_df, tokens_df = load_and_preprocess(RAW_CSV)
    export_processed(tokens_df, PROCESSED_CSV)
    print(f"Wrote tokens frame ({len(tokens_df)} rows) -> {PROCESSED_CSV}")

    # 3. Analytics summaries
    _section("Step 3: Descriptive analytics")
    summary = waiting_time.overall_summary(tokens_df)
    if not summary.empty:
        print("Overall waiting-time summary (served tokens, outliers excluded):")
        for k, v in summary.items():
            if k == "n_tokens":
                print(f"  {k:18s}: {int(v)}")
            else:
                print(f"  {k:18s}: {v:.2f}")

    peaks = peak_hours.rank_peak_hours(tokens_df, top_n=3)
    if len(peaks) > 0:
        print("\nTop-3 peak hours (by tokens issued):")
        for _, row in peaks.iterrows():
            h = int(row["hour_of_day"])
            print(f"  {h:02d}:00 - {int(row['tokens_issued'])} tokens "
                  f"({row['share_of_total']*100:.1f}% of total, "
                  f"{row['load_vs_median']:.1f}x median hour)")

    by_svc = waiting_time.by_service(tokens_df)
    if len(by_svc) > 0:
        print("\nMean wait by service category:")
        for service, row in by_svc.iterrows():
            print(f"  {service:14s}: {row['mean_wait_min']:.2f} min "
                  f"({int(row['n_tokens'])} tokens)")

    # 4. Predictors
    _section("Step 4: Train predictors")
    mae_ma = moving_average.overall_mae_minutes(tokens_df, window=10)
    print(f"Moving-average baseline MAE: {mae_ma:.2f} min")

    avg_svc = moving_average.latest_avg_service_seconds(tokens_df, window=10)
    print(f"Latest rolling avg service time: {avg_svc:.0f} s "
          f"(use this as backend AVG_SERVICE_TIME_SECONDS)")

    try:
        model, metrics = linear_regression.train_model(tokens_df)
        linear_regression.save_model(model, MODEL_PATH)
        print(f"\nLinear regression trained -> {MODEL_PATH}")
        print(f"  train/test split: {metrics['n_train']}/{metrics['n_test']}")
        print(f"  MAE: {metrics['mae_minutes']:.2f} min")
        print(f"  R^2: {metrics['r2']:.3f}")
        print(f"  intercept: {metrics['intercept']:.3f}")
        for feat, coef in metrics["coefficients"].items():
            print(f"  coef({feat}): {coef:+.3f}")
    except ValueError as e:
        print(f"Skipping linear regression: {e}")
        metrics = None

    # 5. Charts
    if args.skip_charts:
        print("\n[--skip-charts] Charts skipped.")
        return

    _section("Step 5: Generate charts")
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)

    fig = viz.chart_peak_hours(peak_hours.hourly_volume(tokens_df))
    viz.save_figure(fig, CHARTS_DIR / "01_peak_hours.png")
    print(f"  -> {CHARTS_DIR / '01_peak_hours.png'}")

    fig = viz.chart_waiting_time_trend(waiting_time.by_date(tokens_df))
    viz.save_figure(fig, CHARTS_DIR / "02_waiting_trend.png")
    print(f"  -> {CHARTS_DIR / '02_waiting_trend.png'}")

    fig = viz.chart_waiting_distribution(tokens_df)
    viz.save_figure(fig, CHARTS_DIR / "03_waiting_distribution.png")
    print(f"  -> {CHARTS_DIR / '03_waiting_distribution.png'}")

    fig = viz.chart_queue_length_scatter(tokens_df)
    viz.save_figure(fig, CHARTS_DIR / "04_queue_vs_wait_scatter.png")
    print(f"  -> {CHARTS_DIR / '04_queue_vs_wait_scatter.png'}")

    fig = viz.chart_weekday_heatmap(peak_hours.hour_volume_by_weekday(tokens_df))
    viz.save_figure(fig, CHARTS_DIR / "05_weekday_heatmap.png")
    print(f"  -> {CHARTS_DIR / '05_weekday_heatmap.png'}")

    bt = moving_average.backtest(tokens_df, window=10)
    fig = viz.chart_predictor_comparison(bt, metrics)
    viz.save_figure(fig, CHARTS_DIR / "06_predictor_comparison.png")
    print(f"  -> {CHARTS_DIR / '06_predictor_comparison.png'}")

    print("\nAll done.")


if __name__ == "__main__":
    main()
