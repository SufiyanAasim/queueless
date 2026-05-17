"""
MongoDB Atlas connector.

Owner: Sufiyan (Data Collection & Storage - DM Module 1).

Optional cloud-database backend for queue events. The backend (Node.js) can
be configured to dual-write into MongoDB instead of CSV by setting
ANALYTICS_SINK=mongo. This Python module then reads those documents into a
pandas DataFrame for the rest of the pipeline.

Demonstrates: cloud-hosted NoSQL document store, the pymongo driver, and
read-side integration with pandas.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import Iterable, Mapping

try:
    import pandas as pd
except ImportError:
    pd = None  # pandas is optional at import time so unit tests can import this without pandas.


def _get_collection(uri: str | None = None, db_name: str = "queueless",
                    collection: str = "queue_events"):
    """Lazy import + connect. Raises a clear error if pymongo is missing."""
    try:
        from pymongo import MongoClient
    except ImportError as e:
        raise ImportError(
            "pymongo is required for MongoDB sink. Install with: pip install pymongo"
        ) from e
    uri = uri or os.environ.get("MONGO_URI")
    if not uri:
        raise ValueError("MONGO_URI not provided. Pass uri=... or set MONGO_URI env var.")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return client, client[db_name][collection]


def insert_event(event: Mapping, **kwargs) -> str:
    """Insert a single event. Returns the inserted _id as a string."""
    client, col = _get_collection(**kwargs)
    try:
        result = col.insert_one(dict(event))
        return str(result.inserted_id)
    finally:
        client.close()


def insert_many(events: Iterable[Mapping], **kwargs) -> int:
    """Bulk insert. Returns the number of documents inserted."""
    client, col = _get_collection(**kwargs)
    try:
        docs = list(events)
        if not docs:
            return 0
        result = col.insert_many(docs)
        return len(result.inserted_ids)
    finally:
        client.close()


def fetch_all_as_dataframe(**kwargs):
    """
    Pull every event document into a pandas DataFrame.
    Drops the Mongo-internal _id column for cleanliness.
    """
    if pd is None:
        raise ImportError("pandas is required. Install with: pip install pandas")
    client, col = _get_collection(**kwargs)
    try:
        docs = list(col.find({}, {"_id": 0}))
        return pd.DataFrame(docs)
    finally:
        client.close()


def export_to_csv(out_path: str | Path, **kwargs) -> int:
    """Convenience: pull from Mongo and write a CSV mirror. Returns row count."""
    df = fetch_all_as_dataframe(**kwargs)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    return len(df)
