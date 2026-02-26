from uuid import uuid4

from fastapi.testclient import TestClient

from app.csv_io import PLANNED_WORKOUT_COLUMNS, WORKOUT_LOG_COLUMNS
from app.main import app


def test_csv_export_endpoint_returns_csv_strings_with_headers_and_rows():
    client = TestClient(app)

    payload = {
        "planned_workouts": [
            {
                "id": str(uuid4()),
                "date": "2026-02-28",
                "type": "easy run",
                "locked": False,
                "target_distance_km": 5.0,
                "target_duration_min": 30,
                "target_pace_min_per_km_low": None,
                "target_pace_min_per_km_high": None,
                "structure_text": "Warmup",
                "race_id": str(uuid4()),
                "route_id": None,
            }
        ],
        "workout_logs": [
            {
                "id": str(uuid4()),
                "date": "2026-02-28",
                "type": "easy run",
                "actual_distance_km": 5.0,
                "actual_duration_min": 30,
                "notes": "Felt good",
                "linked_planned_workout_id": None,
            }
        ],
    }

    resp = client.post("/csv/export", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "planned_workouts_csv" in data
    assert "workout_logs_csv" in data

    pw_csv = data["planned_workouts_csv"]
    wl_csv = data["workout_logs_csv"]

    # headers exist
    assert pw_csv.splitlines()[0] == ",".join(PLANNED_WORKOUT_COLUMNS)
    assert wl_csv.splitlines()[0] == ",".join(WORKOUT_LOG_COLUMNS)

    # at least one data row (header + 1)
    assert len(pw_csv.splitlines()) >= 2
    assert len(wl_csv.splitlines()) >= 2