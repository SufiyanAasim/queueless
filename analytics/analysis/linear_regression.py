"""
Linear regression wait-time predictor.

Owner: Taha (Analysis & Prediction - DM Module 3).

The optional ML-flavored predictor called for in the proposal. We train a
plain ordinary-least-squares LinearRegression on two features:
    - queue_length_at_issue
    - hour_of_day (cyclical encoding via sin/cos so 23h and 0h are close)

Target: waiting_minutes.

Why a linear model and not something fancier
--------------------------------------------
- Fully explainable - the coefficients tell us exactly how much each minute
  of queue length / each hour of day contributes to the wait.
- Trains in milliseconds on the dataset sizes we'll have (100..5000 rows).
- Easy to compare honestly with the moving-average baseline using MAE.
- Stays inside the proposal's scope ("simple linear regression" is the
  exact phrase used).

If MAE is meaningfully lower than the moving-average baseline, the linear
model is worth deploying. If it's not, the simpler baseline wins - and
that's a legitimate finding to report in the academic submission.
"""
from __future__ import annotations
from pathlib import Path
import math

import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


FEATURE_COLS = ["queue_length_at_issue", "hour_sin", "hour_cos"]
TARGET_COL = "waiting_minutes"


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def _add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cyclical encoding of hour-of-day. Without this, the model would treat
    hour=0 and hour=23 as 23 units apart even though they're 1 hour apart
    in real time.
    """
    out = df.copy()
    out["hour_of_day"] = out["hour_of_day"].fillna(out["issued_at"].dt.hour)
    out["hour_sin"] = np.sin(2 * math.pi * out["hour_of_day"] / 24)
    out["hour_cos"] = np.cos(2 * math.pi * out["hour_of_day"] / 24)
    out["queue_length_at_issue"] = out["queue_length_at_issue"].fillna(0).astype(float)
    return out


def _prepare_training_frame(tokens: pd.DataFrame) -> pd.DataFrame:
    """Pick served tokens, drop outliers, attach features."""
    df = tokens[tokens["final_status"] == "served"].copy()
    if "is_outlier" in df.columns:
        df = df[~df["is_outlier"]]
    df = df.dropna(subset=[TARGET_COL])
    df = _add_features(df)
    return df[FEATURE_COLS + [TARGET_COL]]


# ---------------------------------------------------------------------------
# Train / evaluate
# ---------------------------------------------------------------------------

def train_model(tokens: pd.DataFrame,
                test_size: float = 0.2,
                random_state: int = 42):
    """
    Trains the linear regression and returns (model, metrics_dict).
    metrics_dict contains MAE, R^2, the trained coefficients, and the
    train/test split sizes.

    Raises ValueError if there aren't enough served tokens to train.
    """
    df = _prepare_training_frame(tokens)
    if len(df) < 20:
        raise ValueError(
            f"Need at least 20 served tokens to train; got {len(df)}. "
            f"Run the simulator with more days/tokens or wait for more "
            f"real data to accumulate."
        )

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    model = LinearRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    metrics = {
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae_minutes": float(mean_absolute_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
        "intercept": float(model.intercept_),
        "coefficients": dict(zip(FEATURE_COLS, [float(c) for c in model.coef_])),
    }
    return model, metrics


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_model(model, path: str | Path) -> None:
    """Serialize the fitted model with joblib."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, p)


def load_model(path: str | Path):
    """Load a previously saved model."""
    return joblib.load(path)


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def predict_wait_minutes(model, queue_length: int, hour_of_day: int) -> float:
    """
    Run a single prediction. Convenient wrapper that handles the cyclical
    encoding so callers don't have to remember the feature contract.
    """
    h_sin = math.sin(2 * math.pi * hour_of_day / 24)
    h_cos = math.cos(2 * math.pi * hour_of_day / 24)
    X = pd.DataFrame([[float(queue_length), h_sin, h_cos]], columns=FEATURE_COLS)
    return float(model.predict(X)[0])
