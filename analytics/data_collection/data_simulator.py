"""
Synthetic queue-event generator.

Owner: Sufiyan (Data Collection & Storage - DM Module 1).

Why this exists
---------------
The Data Mining project must not be blocked by the Cloud Computing project.
If the backend isn't deployed yet, or if it hasn't accumulated enough events
to mine meaningfully, the analytics team should still be able to develop and
demo the full pipeline.

This simulator produces a CSV in EXACTLY the same schema the backend writes,
so any downstream code (cleaning, analysis, visualization) is identical
whether the source is real or simulated.

Modeling choices
----------------
- Arrival rate varies by hour using a piecewise-linear "demand curve" with
  two peaks (one mid-morning around 11:00, one mid-afternoon around 15:00),
  which is what we'd realistically see in a clinic or admin office.
- Inter-arrival times within each hour follow an exponential distribution,
  consistent with a Poisson arrival process (textbook queueing theory).
- Service time follows a lognormal distribution - service tasks have a long
  right tail (most are quick, a few are slow), which lognormal captures
  better than a normal distribution.
- Service is single-channel FIFO with realistic wait times computed by
  simulating the queue forward in time (not just adding random numbers).

Run:
    python -m data_collection.data_simulator --days 14 --avg-per-day 80
"""

from __future__ import annotations
import argparse
import csv
import os
import random
import math
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, time
from pathlib import Path
from typing import Iterable

# CSV column order MUST match backend/src/services/analytics.service.js CSV_COLUMNS.
CSV_COLUMNS = [
    "event_type",
    "token_id",
    "token_number",
    "service",
    "timestamp",
    "iso_timestamp",
    "queue_length",
    "wait_duration_seconds",
    "service_duration_seconds",
]

SERVICES = ["general", "consultation", "transaction"]
SERVICE_WEIGHTS = [0.55, 0.25, 0.20]  # general is most common

# Operating hours (24h). Arrivals outside this window are clipped.
OPEN_HOUR = 9
CLOSE_HOUR = 17  # last token issued no later than this


# ---------------------------------------------------------------------------
# Demand curve
# ---------------------------------------------------------------------------

def hourly_demand_weight(hour: int) -> float:
    """
    Returns a relative weight for the given hour-of-day. Weights are not
    probabilities; they're scaled later. Two peaks: 11:00 and 15:00.
    Outside operating hours -> 0.
    """
    if hour < OPEN_HOUR or hour >= CLOSE_HOUR:
        return 0.0
    # Bimodal curve: two Gaussian-ish bumps.
    def bump(center, height, width):
        return height * math.exp(-((hour - center) ** 2) / (2 * width ** 2))
    return bump(11, 1.0, 1.2) + bump(15, 0.8, 1.4) + 0.15  # 0.15 baseline


# ---------------------------------------------------------------------------
# Event record
# ---------------------------------------------------------------------------

@dataclass
class Event:
    event_type: str
    token_id: str
    token_number: int
    service: str
    timestamp: int       # ms epoch
    iso_timestamp: str
    queue_length: int | None = None
    wait_duration_seconds: int | None = None
    service_duration_seconds: int | None = None

    def to_row(self) -> list:
        return [getattr(self, c) if getattr(self, c) is not None else "" for c in CSV_COLUMNS]


# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------

def generate_arrival_times(day: datetime, n_tokens: int, rng: random.Random) -> list[datetime]:
    """
    Sample n_tokens arrival timestamps within a single business day, weighted
    by the hourly demand curve. We do this by:
      1. Computing per-minute weights from the hourly curve.
      2. Sampling n_tokens minutes (with replacement) using those weights.
      3. Adding a uniform 0..59 second jitter so two arrivals are never
         simultaneous to the second.
    """
    minutes = []
    weights = []
    for hour in range(OPEN_HOUR, CLOSE_HOUR):
        w = hourly_demand_weight(hour)
        for minute in range(60):
            minutes.append((hour, minute))
            weights.append(w)
    if sum(weights) == 0:
        return []
    sampled = rng.choices(minutes, weights=weights, k=n_tokens)
    arrivals = [day.replace(hour=h, minute=m, second=rng.randint(0, 59), microsecond=0)
                for (h, m) in sampled]
    arrivals.sort()
    return arrivals


def lognormal_service_seconds(rng: random.Random, mean_seconds: float = 180,
                              sigma: float = 0.55) -> int:
    """
    Lognormal service-time draw. mean_seconds is the *desired* arithmetic
    mean; we back out the underlying mu so that exp(mu + sigma^2/2) == mean.
    """
    mu = math.log(mean_seconds) - (sigma ** 2) / 2.0
    val = rng.lognormvariate(mu, sigma)
    # Clamp to a sane range so the simulation doesn't get derailed by an
    # extreme tail draw (a 30-minute service event for a routine query).
    return int(max(20, min(val, 900)))


def simulate_day(day: datetime, n_tokens: int, starting_token_number: int,
                 rng: random.Random) -> list[Event]:
    """
    Generate a full event log for one business day. Events emitted:
        token_issued -> token_called -> token_served
    plus some token_expired events for the ~3% of tokens that no-show.

    Queue length is tracked correctly in simulation time: at the moment a new
    token arrives, we count how many previously-issued tokens have NOT YET
    been called by that moment. This is what the live frontend would also
    show as "people ahead of you".
    """
    events: list[Event] = []
    arrivals = generate_arrival_times(day, n_tokens, rng)
    service_close = day.replace(hour=CLOSE_HOUR, minute=0, second=0, microsecond=0)

    # Single-channel queue simulation: the next "free" moment for the server.
    server_free_at = arrivals[0] if arrivals else day
    token_no = starting_token_number

    # Parallel arrays of called_at times for prior tokens, used to compute
    # the queue length at each new arrival without rescanning the events list.
    prior_called_times: list[datetime] = []

    for arrival in arrivals:
        token_no += 1
        token_id = str(uuid.uuid4())
        service = rng.choices(SERVICES, weights=SERVICE_WEIGHTS, k=1)[0]

        # How many prior tokens have NOT been called by `arrival`? Those are
        # the people ahead of this new arrival in the line.
        queue_len_at_issue = sum(1 for ct in prior_called_times if ct > arrival)

        # Issuance event
        events.append(Event(
            event_type="token_issued",
            token_id=token_id,
            token_number=token_no,
            service=service,
            timestamp=int(arrival.timestamp() * 1000),
            iso_timestamp=arrival.isoformat(),
            queue_length=queue_len_at_issue,
        ))

        # No-show simulation: 3% of tokens never get called.
        if rng.random() < 0.03:
            expire_at = arrival + timedelta(seconds=3600)
            events.append(Event(
                event_type="token_expired",
                token_id=token_id,
                token_number=token_no,
                service=service,
                timestamp=int(expire_at.timestamp() * 1000),
                iso_timestamp=expire_at.isoformat(),
            ))
            continue

        # Determine call time: max(arrival, server_free_at)
        called_at = max(arrival, server_free_at)
        if called_at >= service_close:
            # Day ended before this token could be called - simulate as expired.
            expire_at = service_close
            events.append(Event(
                event_type="token_expired",
                token_id=token_id,
                token_number=token_no,
                service=service,
                timestamp=int(expire_at.timestamp() * 1000),
                iso_timestamp=expire_at.isoformat(),
            ))
            continue

        wait_seconds = int((called_at - arrival).total_seconds())
        events.append(Event(
            event_type="token_called",
            token_id=token_id,
            token_number=token_no,
            service=service,
            timestamp=int(called_at.timestamp() * 1000),
            iso_timestamp=called_at.isoformat(),
            wait_duration_seconds=wait_seconds,
        ))
        prior_called_times.append(called_at)

        # Service duration depends loosely on service type.
        base_mean = {"general": 150, "consultation": 240, "transaction": 200}[service]
        service_dur = lognormal_service_seconds(rng, mean_seconds=base_mean)
        served_at = called_at + timedelta(seconds=service_dur)
        server_free_at = served_at

        events.append(Event(
            event_type="token_served",
            token_id=token_id,
            token_number=token_no,
            service=service,
            timestamp=int(served_at.timestamp() * 1000),
            iso_timestamp=served_at.isoformat(),
            service_duration_seconds=service_dur,
        ))

    return events


def simulate(days: int, avg_per_day: int, start_date: datetime,
             seed: int) -> list[Event]:
    """
    Run the simulator across `days` business days starting at `start_date`.
    Returns a flat chronologically-ordered list of events.
    """
    rng = random.Random(seed)
    all_events: list[Event] = []
    next_token_number = 0

    for d in range(days):
        day = (start_date + timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        # Daily volume varies +/-25% from the average, weekends lighter.
        weekend_factor = 0.4 if day.weekday() >= 5 else 1.0
        n = max(0, int(avg_per_day * weekend_factor * rng.uniform(0.75, 1.25)))
        if n == 0:
            continue
        day_events = simulate_day(day, n, next_token_number, rng)
        all_events.extend(day_events)
        next_token_number += n

    all_events.sort(key=lambda e: e.timestamp)
    return all_events


# ---------------------------------------------------------------------------
# CSV writer
# ---------------------------------------------------------------------------

def write_csv(events: Iterable[Event], path: Path, append: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = path.exists() and path.stat().st_size > 0
    mode = "a" if (append and file_exists) else "w"
    with path.open(mode, newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if mode == "w":
            writer.writerow(CSV_COLUMNS)
        count = 0
        for e in events:
            writer.writerow(e.to_row())
            count += 1
    return count


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(description="Simulate QueueLess queue events.")
    p.add_argument("--days", type=int, default=14,
                   help="Number of business days to simulate (default: 14).")
    p.add_argument("--avg-per-day", type=int, default=130,
                   help="Average tokens issued per business day (default: 130 - tuned to exceed single-channel capacity at peak hours).")
    p.add_argument("--start-date", type=str, default=None,
                   help="ISO date YYYY-MM-DD. Default: 14 days ago.")
    p.add_argument("--out", type=str, default="data/queue_events.csv",
                   help="Output CSV path (default: data/queue_events.csv).")
    p.add_argument("--seed", type=int, default=42,
                   help="Random seed for reproducibility (default: 42).")
    p.add_argument("--append", action="store_true",
                   help="Append to existing CSV instead of overwriting.")
    return p.parse_args()


def main():
    args = parse_args()
    if args.start_date:
        start = datetime.fromisoformat(args.start_date)
    else:
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) \
                - timedelta(days=args.days)

    print(f"[simulate] Generating ~{args.days * args.avg_per_day} events "
          f"across {args.days} day(s) starting {start.date()}...")
    events = simulate(args.days, args.avg_per_day, start, args.seed)

    out = Path(__file__).resolve().parent.parent / args.out
    n = write_csv(events, out, append=args.append)

    issued = sum(1 for e in events if e.event_type == "token_issued")
    served = sum(1 for e in events if e.event_type == "token_served")
    expired = sum(1 for e in events if e.event_type == "token_expired")
    print(f"[simulate] Wrote {n} events to {out}")
    print(f"[simulate] Breakdown - issued: {issued}, served: {served}, expired: {expired}")


if __name__ == "__main__":
    main()
