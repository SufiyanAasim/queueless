"""
CSV writer utility.

Owner: Sufiyan (Data Collection & Storage - DM Module 1).

The backend is the primary writer of the events CSV in production. This
helper exists for two cases:
  1. Test fixtures - notebooks that need to seed a small CSV programmatically.
  2. Standalone Python data-entry tools (e.g., a TA logging tokens by hand).

The schema mirrors backend/src/services/analytics.service.js exactly, so a
file written here is fully readable by the same preprocessing pipeline that
consumes the backend's output.
"""
from __future__ import annotations
import csv
from datetime import datetime
from pathlib import Path
from typing import Mapping

COLUMNS = [
    "event_type", "token_id", "token_number", "service",
    "timestamp", "iso_timestamp", "queue_length",
    "wait_duration_seconds", "service_duration_seconds",
]


def _ensure_header(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.stat().st_size == 0:
        with path.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(COLUMNS)


def append_event(path: str | Path, event: Mapping) -> None:
    """
    Append a single event to the CSV. Missing fields are written as blanks.
    The `timestamp` field accepts an int (ms epoch) or a datetime.
    """
    p = Path(path)
    _ensure_header(p)

    ts = event.get("timestamp")
    if isinstance(ts, datetime):
        ts_ms = int(ts.timestamp() * 1000)
        iso = ts.isoformat()
    elif isinstance(ts, (int, float)):
        ts_ms = int(ts)
        iso = datetime.fromtimestamp(ts_ms / 1000).isoformat()
    else:
        now = datetime.now()
        ts_ms = int(now.timestamp() * 1000)
        iso = now.isoformat()

    row = [
        event.get("event_type", ""),
        event.get("token_id", ""),
        event.get("token_number", ""),
        event.get("service", ""),
        ts_ms,
        iso,
        event.get("queue_length", ""),
        event.get("wait_duration_seconds", ""),
        event.get("service_duration_seconds", ""),
    ]
    with p.open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(row)
