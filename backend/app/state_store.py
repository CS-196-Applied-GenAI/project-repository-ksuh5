from __future__ import annotations

import os
import sqlite3
from pathlib import Path

# Default location: backend/.local/state.db (relative to this file)
_DB_PATH = Path(__file__).resolve().parents[1] / ".local" / "state.db"


def _ensure_db(db_path: Path = _DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS state_snapshot (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                snapshot_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_snapshot(snapshot_json: str, db_path: Path = _DB_PATH) -> None:
    _ensure_db(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO state_snapshot (id, snapshot_json)
            VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json
            """,
            (snapshot_json,),
        )
        conn.commit()


def load_snapshot(db_path: Path = _DB_PATH) -> str | None:
    _ensure_db(db_path)
    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT snapshot_json FROM state_snapshot WHERE id = 1"
        ).fetchone()
        if row is None:
            return None
        return row[0]